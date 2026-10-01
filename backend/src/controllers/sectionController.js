const XLSX = require('xlsx');
const { Op } = require('sequelize');
const {
  sequelize,
  SessionSection,
  StudentSession,
  AcademicSession,
  User,
} = require('../models');

// ADMIN/HOD manage sections. COORDINATOR reaches this as an ADMIN alias.
const canManage = (role) => ['ADMIN', 'HOD'].includes(role);
const fullName = (u) => (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '');
const cleanName = (v) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, 100);

const studentInclude = {
  model: User,
  as: 'Student',
  attributes: ['id', 'firstName', 'lastName', 'email', 'registrationNumber'],
};

const sectionController = {
  // GET /api/sections?sessionId= — sections of a session with student counts.
  list: async (req, res) => {
    try {
      if (!canManage(req.user.role)) return res.status(403).json({ message: 'Not authorized' });
      const { sessionId } = req.query;
      if (!sessionId) return res.status(400).json({ message: 'sessionId is required' });

      const sections = await SessionSection.findAll({
        where: { academicSessionId: sessionId },
        order: [['name', 'ASC']],
      });
      const counts = await StudentSession.findAll({
        attributes: ['sectionId', [sequelize.fn('COUNT', sequelize.col('id')), 'n']],
        where: { academicSessionId: sessionId, sectionId: { [Op.ne]: null } },
        group: ['sectionId'],
        raw: true,
      });
      const countBy = new Map(counts.map((c) => [c.sectionId, Number(c.n)]));
      const total = await StudentSession.count({ where: { academicSessionId: sessionId } });
      const assigned = [...countBy.values()].reduce((a, b) => a + b, 0);

      res.json({
        sections: sections.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description || '',
          studentCount: countBy.get(s.id) || 0,
        })),
        totals: { students: total, assigned, unassigned: total - assigned },
      });
    } catch (err) {
      console.error('section.list error:', err);
      res.status(500).json({ message: 'Failed to load sections' });
    }
  },

  // POST /api/sections { academicSessionId, name }
  create: async (req, res) => {
    try {
      if (!canManage(req.user.role)) return res.status(403).json({ message: 'Not authorized' });
      const { academicSessionId } = req.body;
      const name = cleanName(req.body.name);
      if (!academicSessionId) return res.status(400).json({ message: 'academicSessionId is required' });
      if (!name) return res.status(400).json({ message: 'Section name is required' });
      const session = await AcademicSession.findByPk(academicSessionId);
      if (!session) return res.status(404).json({ message: 'Session not found' });

      const existing = await SessionSection.findOne({ where: { academicSessionId, name } });
      if (existing) return res.status(409).json({ message: `"${name}" already exists in this session` });

      const section = await SessionSection.create({
        academicSessionId,
        name,
        description: req.body.description ? String(req.body.description).trim() : null,
        createdBy: req.user.id,
      });
      res.status(201).json({ message: 'Section created', section: { id: section.id, name: section.name, studentCount: 0 } });
    } catch (err) {
      console.error('section.create error:', err);
      res.status(500).json({ message: 'Failed to create section' });
    }
  },

  // PATCH /api/sections/:id — rename / describe.
  update: async (req, res) => {
    try {
      if (!canManage(req.user.role)) return res.status(403).json({ message: 'Not authorized' });
      const section = await SessionSection.findByPk(req.params.id);
      if (!section) return res.status(404).json({ message: 'Section not found' });

      const patch = {};
      if (req.body.name !== undefined) {
        const name = cleanName(req.body.name);
        if (!name) return res.status(400).json({ message: 'Section name cannot be empty' });
        const clash = await SessionSection.findOne({
          where: { academicSessionId: section.academicSessionId, name, id: { [Op.ne]: section.id } },
        });
        if (clash) return res.status(409).json({ message: `"${name}" already exists in this session` });
        patch.name = name;
      }
      if (req.body.description !== undefined) {
        patch.description = req.body.description ? String(req.body.description).trim() : null;
      }
      await section.update(patch);
      res.json({ message: 'Section updated', section: { id: section.id, name: section.name } });
    } catch (err) {
      console.error('section.update error:', err);
      res.status(500).json({ message: 'Failed to update section' });
    }
  },

  // DELETE /api/sections/:id — students in it simply become unassigned.
  remove: async (req, res) => {
    try {
      if (!canManage(req.user.role)) return res.status(403).json({ message: 'Not authorized' });
      const section = await SessionSection.findByPk(req.params.id);
      if (!section) return res.status(404).json({ message: 'Section not found' });

      const freed = await sequelize.transaction(async (t) => {
        const [n] = await StudentSession.update(
          { sectionId: null },
          { where: { sectionId: section.id }, transaction: t },
        );
        await section.destroy({ transaction: t });
        return n;
      });
      res.json({ message: `Section deleted — ${freed} student(s) are now unassigned`, studentsUnassigned: freed });
    } catch (err) {
      console.error('section.remove error:', err);
      res.status(500).json({ message: 'Failed to delete section' });
    }
  },

  // GET /api/sections/students?sessionId=[&sectionId=|unassigned=1]
  students: async (req, res) => {
    try {
      if (!canManage(req.user.role)) return res.status(403).json({ message: 'Not authorized' });
      const { sessionId, sectionId, unassigned } = req.query;
      if (!sessionId) return res.status(400).json({ message: 'sessionId is required' });

      const where = { academicSessionId: sessionId };
      if (unassigned === '1') where.sectionId = null;
      else if (sectionId) where.sectionId = sectionId;

      const rows = await StudentSession.findAll({
        where,
        include: [studentInclude, { model: SessionSection, as: 'Section', attributes: ['id', 'name'] }],
      });
      const students = rows
        .filter((r) => r.Student)
        .map((r) => ({
          studentSessionId: r.id,
          userId: r.Student.id,
          name: fullName(r.Student),
          email: r.Student.email,
          registrationNumber: r.Student.registrationNumber || '',
          enrollmentStatus: r.status,
          sectionId: r.sectionId || null,
          sectionName: r.Section?.name || '',
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      res.json({ students });
    } catch (err) {
      console.error('section.students error:', err);
      res.status(500).json({ message: 'Failed to load students' });
    }
  },

  // POST /api/sections/assign { studentSessionIds: [], sectionId }  (null = unassign)
  assign: async (req, res) => {
    try {
      if (!canManage(req.user.role)) return res.status(403).json({ message: 'Not authorized' });
      const ids = Array.isArray(req.body.studentSessionIds) ? req.body.studentSessionIds.map(String) : [];
      const { sectionId } = req.body;
      if (ids.length === 0) return res.status(400).json({ message: 'Select at least one student' });

      let section = null;
      if (sectionId) {
        section = await SessionSection.findByPk(sectionId);
        if (!section) return res.status(404).json({ message: 'Section not found' });
      }

      // Only enrolments of the section's own session may be moved into it.
      const where = { id: { [Op.in]: ids } };
      if (section) where.academicSessionId = section.academicSessionId;
      const [updated] = await StudentSession.update({ sectionId: section ? section.id : null }, { where });

      res.json({
        message: section
          ? `${updated} student(s) moved to ${section.name}`
          : `${updated} student(s) removed from their section`,
        updated,
        skipped: ids.length - updated,
      });
    } catch (err) {
      console.error('section.assign error:', err);
      res.status(500).json({ message: 'Failed to assign students' });
    }
  },

  // GET /api/sections/template?sessionId= — .xlsx of the session's students
  // with their current section, ready to edit and upload back.
  template: async (req, res) => {
    try {
      if (!canManage(req.user.role)) return res.status(403).json({ message: 'Not authorized' });
      const { sessionId } = req.query;
      if (!sessionId) return res.status(400).json({ message: 'sessionId is required' });
      const session = await AcademicSession.findByPk(sessionId);
      if (!session) return res.status(404).json({ message: 'Session not found' });

      const rows = await StudentSession.findAll({
        where: { academicSessionId: sessionId },
        include: [studentInclude, { model: SessionSection, as: 'Section', attributes: ['name'] }],
      });
      const header = ['StudentID', 'Student Name', 'Email', 'Section'];
      const data = rows
        .filter((r) => r.Student)
        .map((r) => ({
          'StudentID': r.Student.registrationNumber || '',
          'Student Name': fullName(r.Student),
          'Email': r.Student.email || '',
          'Section': r.Section?.name || '',
        }))
        .sort((a, b) => a['Student Name'].localeCompare(b['Student Name']));

      const ws = XLSX.utils.json_to_sheet(data, { header });
      ws['!cols'] = [{ wch: 16 }, { wch: 28 }, { wch: 30 }, { wch: 14 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sections');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const safe = session.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.set('Content-Disposition', `attachment; filename="sections-${safe}.xlsx"`);
      res.send(buf);
    } catch (err) {
      console.error('section.template error:', err);
      res.status(500).json({ message: 'Failed to generate template' });
    }
  },

  // POST /api/sections/import?sessionId= — .xlsx with a Section column.
  // Creates any missing sections, then links each matched student. Rows that
  // don't match a student in this session are reported, never guessed at.
  importExcel: async (req, res) => {
    try {
      if (!canManage(req.user.role)) return res.status(403).json({ message: 'Not authorized' });
      const sessionId = req.query.sessionId || req.body.sessionId;
      if (!sessionId) return res.status(400).json({ message: 'sessionId is required' });
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
      const session = await AcademicSession.findByPk(sessionId);
      if (!session) return res.status(404).json({ message: 'Session not found' });

      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) return res.status(400).json({ message: 'The uploaded file has no sheets' });
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (!rows.length) return res.status(400).json({ message: 'The sheet has no rows' });

      const pick = (row, keys) => {
        for (const k of Object.keys(row)) {
          const name = k.trim().toLowerCase();
          if (keys.some((want) => name === want || name.replace(/[^a-z]/g, '') === want.replace(/[^a-z]/g, ''))) {
            return String(row[k]).trim();
          }
        }
        return '';
      };

      const enrolments = await StudentSession.findAll({
        where: { academicSessionId: sessionId },
        include: [studentInclude],
      });
      const byReg = new Map();
      const byEmail = new Map();
      for (const e of enrolments) {
        if (e.Student?.registrationNumber) byReg.set(String(e.Student.registrationNumber).trim(), e.id);
        if (e.Student?.email) byEmail.set(e.Student.email.toLowerCase(), e.id);
      }

      const wanted = new Map();   // sectionName -> [studentSessionId]
      const unmatched = [];
      let blankSection = 0;
      for (const row of rows) {
        const reg = pick(row, ['studentid', 'student id', 'registration no', 'registration number', 'reg no']);
        const email = pick(row, ['email', 'mail id', 'e-mail']);
        const name = pick(row, ['student name', 'name']);
        const sectionName = cleanName(pick(row, ['section']));
        if (!reg && !email && !name) continue;
        if (!sectionName) { blankSection += 1; continue; }

        const ssId = (reg && byReg.get(reg)) || (email && byEmail.get(email.toLowerCase()));
        if (!ssId) { unmatched.push({ studentId: reg, name, email, section: sectionName }); continue; }
        if (!wanted.has(sectionName)) wanted.set(sectionName, []);
        wanted.get(sectionName).push(ssId);
      }

      if (wanted.size === 0) {
        return res.status(400).json({
          message: `No usable rows — ${blankSection} without a section, ${unmatched.length} students not in this session.`,
          unmatched: unmatched.slice(0, 50),
        });
      }

      let sectionsCreated = 0; let assigned = 0;
      await sequelize.transaction(async (t) => {
        for (const [name, ids] of wanted) {
          let section = await SessionSection.findOne({
            where: { academicSessionId: sessionId, name },
            transaction: t,
          });
          if (!section) {
            section = await SessionSection.create({
              academicSessionId: sessionId, name, createdBy: req.user.id,
            }, { transaction: t });
            sectionsCreated += 1;
          }
          const [n] = await StudentSession.update(
            { sectionId: section.id },
            { where: { id: { [Op.in]: ids }, academicSessionId: sessionId }, transaction: t },
          );
          assigned += n;
        }
      });

      res.json({
        message: `${assigned} student(s) linked across ${wanted.size} section(s)`,
        sectionsCreated,
        assigned,
        skippedNoSection: blankSection,
        notInSession: unmatched.length,
        unmatched: unmatched.slice(0, 50),
      });
    } catch (err) {
      console.error('section.importExcel error:', err);
      res.status(500).json({ message: 'Failed to process the Excel file' });
    }
  },
};

module.exports = sectionController;
