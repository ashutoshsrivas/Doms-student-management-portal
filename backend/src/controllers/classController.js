const {
  sequelize,
  Class,
  ClassRepresentative,
  ClassAttendance,
  AcademicSession,
  User,
} = require('../models');
const { Op } = require('sequelize');
const fs = require('fs/promises');
const path = require('path');

const MAX_CRS = 4;
// One download has to stay one download. Past this the admin is asked to
// narrow the range rather than being handed a file that will not open.
const MAX_REPORT_ROWS = 100000;
const WIPE_PHRASE = 'DELETE';
// Beside the nightly database dumps on the server, so a wipe lands in the
// same place an administrator already looks when something must come back.
const SNAPSHOT_DIR = process.env.CLASS_SNAPSHOT_DIR
  || path.resolve(__dirname, '../../../../_backups');
const COORDINATOR_ROLES = ['FACULTY', 'CHAIR_HEAD', 'PLACEMENT_COORDINATOR', 'COORDINATOR'];
// Roles that see and edit every class (create/delete stay ADMIN/HOD at the
// route level). TRAINER is aliased to PLACEMENT_COORDINATOR, so it's included.
const ORG_WIDE_ROLES = ['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR'];

// Whether the caller can see the ATR field on attendance rows.
const canReadATR = (role) => ORG_WIDE_ROLES.includes(role);

// Coordinator write access: their own class or admin/HOD.
const isOwnCoordinator = (cls, userId, role) =>
  ORG_WIDE_ROLES.includes(role) || cls.coordinatorId === userId;

// Whether a student is a CR on the given class.
async function isCROfClass(classId, userId) {
  const row = await ClassRepresentative.findOne({ where: { classId, studentId: userId } });
  return !!row;
}

const fullName = (u) => (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '');

// What a wipe of this scope would take, counted now.
async function wipeCounts(sessionId) {
  const where = sessionId ? { sessionId } : {};
  const classes = await Class.findAll({ where, attributes: ['id'], raw: true });
  const ids = classes.map((c) => c.id);
  const scoped = { classId: { [Op.in]: ids.length ? ids : [null] } };
  const [attendance, representatives] = await Promise.all([
    ids.length ? ClassAttendance.count({ where: scoped }) : 0,
    ids.length ? ClassRepresentative.count({ where: scoped }) : 0,
  ]);
  let first = null;
  let last = null;
  if (ids.length && attendance) {
    const range = await ClassAttendance.findAll({
      where: scoped,
      attributes: [
        [sequelize.fn('MIN', sequelize.col('date')), 'first'],
        [sequelize.fn('MAX', sequelize.col('date')), 'last'],
      ],
      raw: true,
    });
    first = range[0]?.first || null;
    last = range[0]?.last || null;
  }
  return { classes: ids.length, attendance, representatives, firstDate: first, lastDate: last };
}

// Every row about to be deleted, written out before any of it goes. The
// wipe is refused if this throws — a delete with no copy behind it is not
// something the portal should be able to do.
async function writeWipeSnapshot(payload) {
  await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(SNAPSHOT_DIR, `class-wipe-${stamp}.json`);
  await fs.writeFile(file, JSON.stringify({ takenAt: new Date().toISOString(), ...payload }, null, 2), 'utf8');
  return file;
}

function shapeAttendanceRow(row, includeATR) {
  const plain = row.toJSON ? row.toJSON() : row;
  const out = {
    id: plain.id,
    classId: plain.classId,
    date: plain.date,
    presentCount: plain.presentCount,
    absentCount: plain.absentCount ?? 0,
    bunkedCount: plain.bunkedCount,
    leaveCount: plain.leaveCount,
    classTiming: plain.classTiming || '',
    additionalInfo: plain.additionalInfo || '',
    submittedBy: plain.submittedBy,
    submittedAt: plain.submittedAt,
    submitter: plain.Submitter
      ? { id: plain.Submitter.id, name: `${plain.Submitter.firstName || ''} ${plain.Submitter.lastName || ''}`.trim() }
      : null,
    hasATR: !!plain.actionTakenReport,
  };
  if (includeATR) {
    out.actionTakenReport = plain.actionTakenReport;
    out.atrAt = plain.atrAt;
    out.atrBy = plain.atrBy;
    out.atrAuthor = plain.ATRAuthor
      ? { id: plain.ATRAuthor.id, name: `${plain.ATRAuthor.firstName || ''} ${plain.ATRAuthor.lastName || ''}`.trim() }
      : null;
  }
  return out;
}

module.exports = {
  // GET /api/classes — list classes visible to the caller. Admin/HOD see
  // everything; coordinators see classes they coordinate; students see
  // classes where they are a CR.
  list: async (req, res) => {
    try {
      const userId = req.user.id;
      const role = req.user.role;
      const { sessionId } = req.query;

      const where = {};
      if (sessionId) where.sessionId = sessionId;

      if (ORG_WIDE_ROLES.includes(role)) {
        // no additional filter
      } else if (COORDINATOR_ROLES.includes(role)) {
        where.coordinatorId = userId;
      } else if (role === 'STUDENT') {
        const crRows = await ClassRepresentative.findAll({
          where: { studentId: userId },
          attributes: ['classId'],
          raw: true,
        });
        const ids = crRows.map((r) => r.classId);
        if (!ids.length) return res.json({ classes: [] });
        where.id = { [Op.in]: ids };
      } else {
        return res.json({ classes: [] });
      }

      const classes = await Class.findAll({
        where,
        include: [
          { model: AcademicSession, as: 'Session', attributes: ['id', 'name'] },
          { model: User, as: 'Coordinator', attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole'] },
          {
            model: ClassRepresentative,
            as: 'Representatives',
            include: [{ model: User, as: 'Student', attributes: ['id', 'firstName', 'lastName', 'email'] }],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      res.json({ classes });
    } catch (err) {
      console.error('classController.list error:', err);
      res.status(500).json({ message: 'Failed to list classes' });
    }
  },

  // POST /api/classes — create. Admin/HOD only.
  create: async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { sessionId, name, description, coordinatorId, crStudentIds, totalStrength } = req.body;
      if (!sessionId || !name || !coordinatorId) {
        await t.rollback();
        return res.status(400).json({ message: 'sessionId, name, coordinatorId are required' });
      }
      const coordinator = await User.findByPk(coordinatorId);
      if (!coordinator || !COORDINATOR_ROLES.includes(coordinator.approvedRole)) {
        await t.rollback();
        return res.status(400).json({
          message: `Coordinator must have one of these roles: ${COORDINATOR_ROLES.join(', ')}`,
        });
      }
      const crs = Array.isArray(crStudentIds) ? crStudentIds.filter(Boolean).slice(0, MAX_CRS) : [];
      if (crs.length) {
        const students = await User.findAll({ where: { id: { [Op.in]: crs } } });
        const bad = students.find((s) => s.approvedRole !== 'STUDENT');
        if (bad) {
          await t.rollback();
          return res.status(400).json({ message: `CR ${bad.email} is not a student` });
        }
      }
      const strength = (totalStrength === undefined || totalStrength === null || totalStrength === '')
        ? null : Math.max(0, parseInt(totalStrength, 10) || 0);
      const cls = await Class.create({
        sessionId, name, description, coordinatorId,
        totalStrength: strength,
        createdBy: req.user.id,
      }, { transaction: t });
      if (crs.length) {
        await ClassRepresentative.bulkCreate(
          crs.map((sid) => ({ classId: cls.id, studentId: sid })),
          { transaction: t },
        );
      }
      await t.commit();
      const full = await Class.findByPk(cls.id, {
        include: [
          { model: AcademicSession, as: 'Session', attributes: ['id', 'name'] },
          { model: User, as: 'Coordinator', attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole'] },
          {
            model: ClassRepresentative, as: 'Representatives',
            include: [{ model: User, as: 'Student', attributes: ['id', 'firstName', 'lastName', 'email'] }],
          },
        ],
      });
      res.status(201).json({ class: full });
    } catch (err) {
      await t.rollback();
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: 'A class with this name already exists in this session' });
      }
      console.error('classController.create error:', err);
      res.status(500).json({ message: 'Failed to create class' });
    }
  },

  // PATCH /api/classes/:id — update fields. Admin/HOD only for
  // coordinator swap. Class coordinator can update name/description.
  update: async (req, res) => {
    try {
      const cls = await Class.findByPk(req.params.id);
      if (!cls) return res.status(404).json({ message: 'Class not found' });
      if (!isOwnCoordinator(cls, req.user.id, req.user.role)) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      const patch = {};
      if (req.body.name !== undefined) patch.name = req.body.name;
      if (req.body.description !== undefined) patch.description = req.body.description;
      if (req.body.status !== undefined) patch.status = req.body.status;
      if (req.body.totalStrength !== undefined) {
        const v = req.body.totalStrength;
        patch.totalStrength = (v === null || v === '') ? null : Math.max(0, parseInt(v, 10) || 0);
      }
      if (req.body.nocCount !== undefined) {
        const v = req.body.nocCount;
        patch.nocCount = (v === null || v === '') ? null : Math.max(0, parseInt(v, 10) || 0);
      }
      if (req.body.coordinatorId !== undefined) {
        if (!ORG_WIDE_ROLES.includes(req.user.role)) {
          return res.status(403).json({ message: 'Only ADMIN/HOD/Placement Coordinator can change the coordinator' });
        }
        const c = await User.findByPk(req.body.coordinatorId);
        if (!c || !COORDINATOR_ROLES.includes(c.approvedRole)) {
          return res.status(400).json({ message: 'Coordinator must be FACULTY/CHAIR_HEAD/PLACEMENT_COORDINATOR/COORDINATOR' });
        }
        patch.coordinatorId = req.body.coordinatorId;
      }
      await cls.update(patch);
      res.json({ class: cls });
    } catch (err) {
      console.error('classController.update error:', err);
      res.status(500).json({ message: 'Failed to update class' });
    }
  },


  // GET /api/classes/report?sessionId=&from=&to=
  //
  // Everything an admin needs to keep a record of what the classes did:
  // every daily punch, with the class, the coordinator, who submitted it and
  // any Action Taken Report. One request rather than one per class, because
  // the point of it is to be downloaded whole — not least before a wipe.
  report: async (req, res) => {
    try {
      if (!ORG_WIDE_ROLES.includes(req.user.role)) {
        return res.status(403).json({ message: 'Only an admin, HOD or placement coordinator can download the class report' });
      }
      const { sessionId, from, to } = req.query;
      const classWhere = {};
      if (sessionId) classWhere.sessionId = sessionId;

      const classes = await Class.findAll({
        where: classWhere,
        include: [
          { model: AcademicSession, as: 'Session', attributes: ['id', 'name'] },
          { model: User, as: 'Coordinator', attributes: ['id', 'firstName', 'lastName', 'email'] },
          {
            model: ClassRepresentative,
            as: 'Representatives',
            include: [{ model: User, as: 'Student', attributes: ['id', 'firstName', 'lastName', 'email'] }],
          },
        ],
        order: [['createdAt', 'ASC']],
      });

      const ids = classes.map((c) => c.id);
      const attWhere = { classId: { [Op.in]: ids.length ? ids : [null] } };
      if (from || to) {
        attWhere.date = {};
        if (from) attWhere.date[Op.gte] = from;
        if (to) attWhere.date[Op.lte] = to;
      }

      const total = ids.length ? await ClassAttendance.count({ where: attWhere }) : 0;
      if (total > MAX_REPORT_ROWS) {
        return res.status(413).json({
          message: `That comes to ${total.toLocaleString('en-IN')} attendance rows, which is more than one download can carry. Narrow it down by session or by date.`,
        });
      }

      const rows = ids.length ? await ClassAttendance.findAll({
        where: attWhere,
        include: [
          { model: User, as: 'Submitter', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'ATRAuthor', attributes: ['id', 'firstName', 'lastName'] },
        ],
        order: [['date', 'ASC'], ['classTiming', 'ASC']],
      }) : [];

      const byClass = new Map(classes.map((c) => [c.id, c]));
      const session = sessionId ? classes[0]?.Session : null;

      res.json({
        generatedAt: new Date().toISOString(),
        scope: {
          sessionId: sessionId || null,
          sessionName: session ? session.name : null,
          from: from || null,
          to: to || null,
        },
        classes: classes.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description || '',
          session: c.Session ? c.Session.name : '',
          coordinator: fullName(c.Coordinator),
          coordinatorEmail: c.Coordinator ? c.Coordinator.email : '',
          representatives: (c.Representatives || []).map((r) => fullName(r.Student)).filter(Boolean),
          totalStrength: c.totalStrength,
          nocCount: c.nocCount,
          status: c.status,
          createdAt: c.createdAt,
        })),
        attendance: rows.map((r) => {
          const cls = byClass.get(r.classId);
          return {
            classId: r.classId,
            className: cls ? cls.name : '',
            session: cls && cls.Session ? cls.Session.name : '',
            coordinator: cls ? fullName(cls.Coordinator) : '',
            date: r.date,
            classTiming: r.classTiming || '',
            totalStrength: cls ? cls.totalStrength : null,
            presentCount: r.presentCount,
            absentCount: r.absentCount ?? 0,
            bunkedCount: r.bunkedCount,
            leaveCount: r.leaveCount,
            additionalInfo: r.additionalInfo || '',
            submittedBy: fullName(r.Submitter),
            submittedAt: r.submittedAt,
            actionTakenReport: r.actionTakenReport || '',
            atrBy: fullName(r.ATRAuthor),
            atrAt: r.atrAt,
          };
        }),
      });
    } catch (err) {
      console.error('classController.report error:', err);
      res.status(500).json({ message: 'Failed to build the class report' });
    }
  },

  // GET /api/classes/wipe-preview?sessionId=
  //
  // Exactly what a wipe would take, counted now. The admin sees these
  // numbers before confirming, and sends them back — if they have moved by
  // the time they confirm, the wipe is refused rather than guessed at.
  wipePreview: async (req, res) => {
    try {
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Only an admin can clear classes' });
      }
      const counts = await wipeCounts(req.query.sessionId);
      res.json(counts);
    } catch (err) {
      console.error('classController.wipePreview error:', err);
      res.status(500).json({ message: 'Failed to count what would be cleared' });
    }
  },

  // DELETE /api/classes/bulk
  // Body: { sessionId?, confirm: 'DELETE', expectedClasses, expectedAttendance }
  //
  // Clears classes and their daily attendance so a new term can be set up.
  // This cannot be undone from the portal, so it is hedged three ways: admin
  // only, the counts must still match what the admin was shown, and every
  // row is written to a snapshot file on the server before anything is
  // deleted. If that snapshot cannot be written, nothing is deleted.
  wipe: async (req, res) => {
    try {
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Only an admin can clear classes' });
      }
      if (String(req.body?.confirm || '') !== WIPE_PHRASE) {
        return res.status(400).json({ message: `Type ${WIPE_PHRASE} to confirm` });
      }
      const sessionId = req.body?.sessionId || null;
      const counts = await wipeCounts(sessionId);
      if (!counts.classes) {
        return res.status(400).json({ message: 'There are no classes to clear in that scope.' });
      }

      // The admin confirmed a particular number of rows. If someone added a
      // class or punched attendance in between, that is a different wipe.
      const expectedClasses = Number(req.body?.expectedClasses);
      const expectedAttendance = Number(req.body?.expectedAttendance);
      if (expectedClasses !== counts.classes || expectedAttendance !== counts.attendance) {
        return res.status(409).json({
          message: 'The numbers changed while you were confirming — someone has added or punched something. Check the new counts and try again.',
          counts,
        });
      }

      const classRows = await Class.findAll({
        where: sessionId ? { sessionId } : {},
        include: [
          { model: AcademicSession, as: 'Session', attributes: ['id', 'name'] },
          { model: User, as: 'Coordinator', attributes: ['id', 'firstName', 'lastName', 'email'] },
        ],
      });
      const ids = classRows.map((c) => c.id);
      const attRows = await ClassAttendance.findAll({ where: { classId: { [Op.in]: ids } } });
      const crRows = await ClassRepresentative.findAll({ where: { classId: { [Op.in]: ids } } });

      let snapshot;
      try {
        snapshot = await writeWipeSnapshot({
          by: { id: req.user.id, email: req.user.email, role: req.user.role },
          scope: { sessionId, sessionName: sessionId ? (classRows[0]?.Session?.name || null) : 'every session' },
          classes: classRows.map((c) => c.toJSON()),
          attendance: attRows.map((r) => r.toJSON()),
          representatives: crRows.map((r) => r.toJSON()),
        });
      } catch (e) {
        console.error('classController.wipe snapshot failed:', e);
        return res.status(500).json({
          message: 'Nothing was deleted: the server could not write its backup copy of these records first.',
        });
      }

      const t = await sequelize.transaction();
      try {
        const attendance = await ClassAttendance.destroy({ where: { classId: { [Op.in]: ids } }, transaction: t });
        const representatives = await ClassRepresentative.destroy({ where: { classId: { [Op.in]: ids } }, transaction: t });
        const removed = await Class.destroy({ where: { id: { [Op.in]: ids } }, transaction: t });
        await t.commit();
        console.warn(`[class wipe] ${req.user.email} cleared ${removed} classes, ${attendance} attendance rows, ${representatives} CR links (scope: ${sessionId || 'all sessions'}); snapshot ${snapshot}`);
        res.json({
          message: `Cleared ${removed} ${removed === 1 ? 'class' : 'classes'} and ${attendance} attendance ${attendance === 1 ? 'row' : 'rows'}.`,
          deleted: { classes: removed, attendance, representatives },
          snapshot,
        });
      } catch (e) {
        await t.rollback();
        throw e;
      }
    } catch (err) {
      console.error('classController.wipe error:', err);
      res.status(500).json({ message: 'Failed to clear the classes' });
    }
  },

  // DELETE /api/classes/:id — Admin/HOD only.
  remove: async (req, res) => {
    try {
      const cls = await Class.findByPk(req.params.id);
      if (!cls) return res.status(404).json({ message: 'Class not found' });
      await cls.destroy();
      res.json({ message: 'Class deleted' });
    } catch (err) {
      console.error('classController.remove error:', err);
      res.status(500).json({ message: 'Failed to delete class' });
    }
  },

  // PUT /api/classes/:id/crs — replace CR list (max 4). Coordinator or admin.
  setCRs: async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const cls = await Class.findByPk(req.params.id);
      if (!cls) { await t.rollback(); return res.status(404).json({ message: 'Class not found' }); }
      if (!isOwnCoordinator(cls, req.user.id, req.user.role)) {
        await t.rollback();
        return res.status(403).json({ message: 'Not authorized' });
      }
      const ids = Array.isArray(req.body.studentIds) ? req.body.studentIds.filter(Boolean) : [];
      if (ids.length > MAX_CRS) {
        await t.rollback();
        return res.status(400).json({ message: `A class can have at most ${MAX_CRS} CRs` });
      }
      if (ids.length) {
        const students = await User.findAll({ where: { id: { [Op.in]: ids } } });
        const bad = students.find((s) => s.approvedRole !== 'STUDENT');
        if (bad) { await t.rollback(); return res.status(400).json({ message: `CR ${bad.email} is not a student` }); }
      }
      await ClassRepresentative.destroy({ where: { classId: cls.id }, transaction: t });
      if (ids.length) {
        await ClassRepresentative.bulkCreate(
          ids.map((sid) => ({ classId: cls.id, studentId: sid })),
          { transaction: t },
        );
      }
      await t.commit();
      const full = await ClassRepresentative.findAll({
        where: { classId: cls.id },
        include: [{ model: User, as: 'Student', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      });
      res.json({ representatives: full });
    } catch (err) {
      await t.rollback();
      console.error('classController.setCRs error:', err);
      res.status(500).json({ message: 'Failed to set CRs' });
    }
  },

  // GET /api/classes/:id/attendance?from=YYYY-MM-DD&to=YYYY-MM-DD
  listAttendance: async (req, res) => {
    try {
      const cls = await Class.findByPk(req.params.id);
      if (!cls) return res.status(404).json({ message: 'Class not found' });
      const role = req.user.role;
      const userId = req.user.id;
      // Access: admin/HOD any; coordinator of the class; any CR of the class.
      const isAdmin = ORG_WIDE_ROLES.includes(role);
      const isCoord = cls.coordinatorId === userId;
      const isCR = role === 'STUDENT' ? await isCROfClass(cls.id, userId) : false;
      if (!isAdmin && !isCoord && !isCR) return res.status(403).json({ message: 'Not authorized' });

      const where = { classId: cls.id };
      if (req.query.from || req.query.to) {
        where.date = {};
        if (req.query.from) where.date[Op.gte] = req.query.from;
        if (req.query.to) where.date[Op.lte] = req.query.to;
      }
      const rows = await ClassAttendance.findAll({
        where,
        include: [
          { model: User, as: 'Submitter', attributes: ['id', 'firstName', 'lastName'] },
          { model: User, as: 'ATRAuthor', attributes: ['id', 'firstName', 'lastName'] },
        ],
        order: [['date', 'DESC'], ['classTiming', 'ASC']],
      });
      // The coordinator wrote the ATR, so they can see their own writes.
      const includeATR = isAdmin || isCoord;
      res.json({ attendance: rows.map((r) => shapeAttendanceRow(r, includeATR)) });
    } catch (err) {
      console.error('classController.listAttendance error:', err);
      res.status(500).json({ message: 'Failed to list attendance' });
    }
  },

  // POST /api/classes/:id/attendance — CR (or coordinator/admin) submits/updates
  // { date, presentCount, bunkedCount, leaveCount }. Upsert on (classId, date).
  submitAttendance: async (req, res) => {
    try {
      const cls = await Class.findByPk(req.params.id);
      if (!cls) return res.status(404).json({ message: 'Class not found' });
      const role = req.user.role;
      const userId = req.user.id;
      const isAdmin = ORG_WIDE_ROLES.includes(role);
      const isCoord = cls.coordinatorId === userId;
      const isCR = role === 'STUDENT' ? await isCROfClass(cls.id, userId) : false;
      if (!isAdmin && !isCoord && !isCR) return res.status(403).json({ message: 'Not authorized' });

      const { date, presentCount, absentCount, bunkedCount, leaveCount, classTiming, additionalInfo } = req.body;
      if (!date) return res.status(400).json({ message: 'date is required (YYYY-MM-DD)' });
      const p = Math.max(0, parseInt(presentCount, 10) || 0);
      const b = Math.max(0, parseInt(bunkedCount, 10) || 0);
      const l = Math.max(0, parseInt(leaveCount, 10) || 0);
      // Absent is auto-derived from the class total strength when it's set
      // (absent = strength - present - leave, clamped at 0, so students on
      // leave/NOC aren't double-counted); otherwise fall back to any value the
      // client sent.
      const a = (cls.totalStrength !== null && cls.totalStrength !== undefined)
        ? Math.max(0, cls.totalStrength - p - l)
        : Math.max(0, parseInt(absentCount, 10) || 0);
      // Optional class timing / period. Empty string = untimed daily entry.
      const timing = typeof classTiming === 'string' ? classTiming.trim().slice(0, 100) : '';
      // Optional free-text note.
      const info = typeof additionalInfo === 'string' ? (additionalInfo.trim() || null) : null;

      // Upsert per (class, date, timing) so multiple periods can be logged per day.
      const existing = await ClassAttendance.findOne({ where: { classId: cls.id, date, classTiming: timing } });
      if (existing) {
        await existing.update({
          presentCount: p, absentCount: a, bunkedCount: b, leaveCount: l, additionalInfo: info,
          submittedBy: userId, submittedAt: new Date(),
        });
        return res.json({ attendance: shapeAttendanceRow(existing, isAdmin || isCoord) });
      }
      const created = await ClassAttendance.create({
        classId: cls.id, date, classTiming: timing, additionalInfo: info,
        presentCount: p, absentCount: a, bunkedCount: b, leaveCount: l,
        submittedBy: userId, submittedAt: new Date(),
      });
      res.status(201).json({ attendance: shapeAttendanceRow(created, isAdmin || isCoord) });
    } catch (err) {
      console.error('classController.submitAttendance error:', err);
      res.status(500).json({ message: 'Failed to submit attendance' });
    }
  },

  // PATCH /api/classes/:id/attendance/:attId/atr — coordinator writes ATR.
  // Body: { actionTakenReport }. Set to empty string to clear.
  setATR: async (req, res) => {
    try {
      const cls = await Class.findByPk(req.params.id);
      if (!cls) return res.status(404).json({ message: 'Class not found' });
      if (!isOwnCoordinator(cls, req.user.id, req.user.role)) {
        return res.status(403).json({ message: 'Only the class coordinator (or ADMIN/HOD) can post ATR' });
      }
      const att = await ClassAttendance.findOne({
        where: { id: req.params.attId, classId: cls.id },
      });
      if (!att) return res.status(404).json({ message: 'Attendance record not found' });
      const text = typeof req.body.actionTakenReport === 'string'
        ? req.body.actionTakenReport.trim()
        : '';
      await att.update({
        actionTakenReport: text || null,
        atrAt: text ? new Date() : null,
        atrBy: text ? req.user.id : null,
      });
      // Reload with author for the response
      const reloaded = await ClassAttendance.findByPk(att.id, {
        include: [
          { model: User, as: 'Submitter', attributes: ['id', 'firstName', 'lastName'] },
          { model: User, as: 'ATRAuthor', attributes: ['id', 'firstName', 'lastName'] },
        ],
      });
      res.json({ attendance: shapeAttendanceRow(reloaded, true) });
    } catch (err) {
      console.error('classController.setATR error:', err);
      res.status(500).json({ message: 'Failed to set ATR' });
    }
  },

  // GET /api/classes/eligible-crs?sessionId=... — list students eligible to
  // be CRs. Callable by any coordinator role (they need it to populate the
  // CR picker on their class). Optionally scoped to a session so the list
  // only shows students enrolled in that session; without sessionId every
  // student is returned. Only id/name/email so this stays minimal-PII.
  eligibleCRs: async (req, res) => {
    try {
      const where = { approvedRole: 'STUDENT', status: 'ACTIVE' };
      let students;
      if (req.query.sessionId) {
        const { StudentSession } = require('../models');
        const enrolled = await StudentSession.findAll({
          where: { academicSessionId: req.query.sessionId },
          attributes: ['userId'],
          raw: true,
        });
        const ids = [...new Set(enrolled.map((r) => r.userId).filter(Boolean))];
        if (!ids.length) return res.json({ users: [] });
        where.id = { [Op.in]: ids };
      }
      students = await User.findAll({
        where,
        attributes: ['id', 'firstName', 'lastName', 'email'],
        order: [['firstName', 'ASC'], ['lastName', 'ASC']],
        limit: 1000,
      });
      res.json({ users: students });
    } catch (err) {
      console.error('classController.eligibleCRs error:', err);
      res.status(500).json({ message: 'Failed to list students' });
    }
  },

  // GET /api/classes/eligible-coordinators — list users who can be assigned
  // as class coordinator (roles: FACULTY, CHAIR_HEAD, PLACEMENT_COORDINATOR,
  // COORDINATOR). Used by the admin create/edit modal.
  eligibleCoordinators: async (req, res) => {
    try {
      const users = await User.findAll({
        where: { approvedRole: { [Op.in]: COORDINATOR_ROLES }, status: 'ACTIVE' },
        attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole'],
        order: [['firstName', 'ASC'], ['lastName', 'ASC']],
      });
      res.json({ users });
    } catch (err) {
      console.error('classController.eligibleCoordinators error:', err);
      res.status(500).json({ message: 'Failed to list coordinators' });
    }
  },
};
