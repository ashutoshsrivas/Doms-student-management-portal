const {
  sequelize,
  Class,
  ClassRepresentative,
  ClassAttendance,
  AcademicSession,
  User,
} = require('../models');
const { Op } = require('sequelize');

const MAX_CRS = 4;
const COORDINATOR_ROLES = ['FACULTY', 'CHAIR_HEAD', 'PLACEMENT_COORDINATOR', 'COORDINATOR'];
const ORG_WIDE_ROLES = ['ADMIN', 'HOD'];

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

function shapeAttendanceRow(row, includeATR) {
  const plain = row.toJSON ? row.toJSON() : row;
  const out = {
    id: plain.id,
    classId: plain.classId,
    date: plain.date,
    presentCount: plain.presentCount,
    bunkedCount: plain.bunkedCount,
    leaveCount: plain.leaveCount,
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
      const { sessionId, name, description, coordinatorId, crStudentIds } = req.body;
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
      const cls = await Class.create({
        sessionId, name, description, coordinatorId,
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
      if (req.body.coordinatorId !== undefined) {
        if (!ORG_WIDE_ROLES.includes(req.user.role)) {
          return res.status(403).json({ message: 'Only ADMIN/HOD can change the coordinator' });
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
        order: [['date', 'DESC']],
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

      const { date, presentCount, bunkedCount, leaveCount } = req.body;
      if (!date) return res.status(400).json({ message: 'date is required (YYYY-MM-DD)' });
      const p = Math.max(0, parseInt(presentCount, 10) || 0);
      const b = Math.max(0, parseInt(bunkedCount, 10) || 0);
      const l = Math.max(0, parseInt(leaveCount, 10) || 0);

      const existing = await ClassAttendance.findOne({ where: { classId: cls.id, date } });
      if (existing) {
        await existing.update({
          presentCount: p, bunkedCount: b, leaveCount: l,
          submittedBy: userId, submittedAt: new Date(),
        });
        return res.json({ attendance: shapeAttendanceRow(existing, isAdmin || isCoord) });
      }
      const created = await ClassAttendance.create({
        classId: cls.id, date,
        presentCount: p, bunkedCount: b, leaveCount: l,
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
