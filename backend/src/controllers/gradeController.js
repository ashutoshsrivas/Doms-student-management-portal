const XLSX = require('xlsx');
const { Op } = require('sequelize');
const {
  sequelize,
  GradeSheet,
  StudentGrade,
  GRADE_VALUES,
  StudentSession,
  AcademicSession,
  User,
} = require('../models');

// Points behind the average shown to students. UNAVAILABLE is skipped, never
// counted as a zero.
const GRADE_POINTS = { A: 4, B: 3, C: 2, D: 1 };
const LETTER_FOR = (avg) => (avg >= 3.5 ? 'A' : avg >= 2.5 ? 'B' : avg >= 1.5 ? 'C' : 'D');

const ORG_ADMIN_ROLES = ['ADMIN', 'HOD'];
const isOrgAdmin = (role) => ORG_ADMIN_ROLES.includes(role);
const canManageSheet = (sheet, req) => sheet.createdBy === req.user.id || isOrgAdmin(req.user.role);

const fullName = (u) => (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '');
const normaliseGrade = (v) => {
  const g = String(v ?? '').trim().toUpperCase();
  if (!g) return null;
  if (GRADE_VALUES.includes(g)) return g;
  if (['UNAVAILABLE', 'NA', 'N/A', 'U', '-'].includes(g)) return 'UNAVAILABLE';
  return null;
};

const shapeSheet = (s, gradeCount) => ({
  id: s.id,
  title: s.title,
  description: s.description || '',
  academicSessionId: s.academicSessionId,
  sessionName: s.AcademicSession?.name || '',
  createdBy: s.createdBy,
  createdByName: fullName(s.Creator),
  createdAt: s.createdAt,
  gradeCount: gradeCount ?? (s.StudentGrades ? s.StudentGrades.length : 0),
});

const shapeGrade = (g) => ({
  id: g.id,
  studentSessionId: g.studentSessionId,
  grade: g.grade,
  remark: g.remark || '',
  gradedAt: g.gradedAt,
  gradedByName: fullName(g.Grader),
  student: g.StudentSession?.Student
    ? {
      id: g.StudentSession.Student.id,
      name: fullName(g.StudentSession.Student),
      email: g.StudentSession.Student.email,
      registrationNumber: g.StudentSession.Student.registrationNumber || '',
    }
    : null,
});

const gradeController = {
  // GET /api/grades/sheets — own lists; ADMIN/HOD see everyone's.
  listSheets: async (req, res) => {
    try {
      if (req.user.role === 'STUDENT') return res.status(403).json({ message: 'Not authorized' });
      const where = isOrgAdmin(req.user.role) ? {} : { createdBy: req.user.id };
      if (req.query.sessionId) where.academicSessionId = req.query.sessionId;

      const sheets = await GradeSheet.findAll({
        where,
        include: [
          { model: AcademicSession, attributes: ['id', 'name'] },
          { model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName'] },
        ],
        order: [['createdAt', 'DESC']],
      });
      const counts = await StudentGrade.findAll({
        attributes: ['gradeSheetId', [sequelize.fn('COUNT', sequelize.col('id')), 'n']],
        where: { gradeSheetId: { [Op.in]: sheets.map((s) => s.id) } },
        group: ['gradeSheetId'],
        raw: true,
      });
      const countBy = new Map(counts.map((c) => [c.gradeSheetId, Number(c.n)]));
      res.json({ sheets: sheets.map((s) => shapeSheet(s, countBy.get(s.id) || 0)) });
    } catch (err) {
      console.error('grade.listSheets error:', err);
      res.status(500).json({ message: 'Failed to load grading lists' });
    }
  },

  // POST /api/grades/sheets
  createSheet: async (req, res) => {
    try {
      if (req.user.role === 'STUDENT') return res.status(403).json({ message: 'Not authorized' });
      const { title, description, academicSessionId } = req.body;
      if (!title || !String(title).trim()) return res.status(400).json({ message: 'Title is required' });
      if (!academicSessionId) return res.status(400).json({ message: 'Session is required' });
      const session = await AcademicSession.findByPk(academicSessionId);
      if (!session) return res.status(404).json({ message: 'Session not found' });

      const sheet = await GradeSheet.create({
        title: String(title).trim().slice(0, 250),
        description: description ? String(description).trim() : null,
        academicSessionId,
        createdBy: req.user.id,
      });
      res.status(201).json({ message: 'Grading list created', sheet: shapeSheet(sheet, 0) });
    } catch (err) {
      console.error('grade.createSheet error:', err);
      res.status(500).json({ message: 'Failed to create grading list' });
    }
  },

  // GET /api/grades/sheets/:id — the list plus its grades.
  getSheet: async (req, res) => {
    try {
      if (req.user.role === 'STUDENT') return res.status(403).json({ message: 'Not authorized' });
      const sheet = await GradeSheet.findByPk(req.params.id, {
        include: [
          { model: AcademicSession, attributes: ['id', 'name'] },
          { model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName'] },
        ],
      });
      if (!sheet) return res.status(404).json({ message: 'Grading list not found' });
      if (!canManageSheet(sheet, req) && !isOrgAdmin(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized to view this grading list' });
      }
      const grades = await StudentGrade.findAll({
        where: { gradeSheetId: sheet.id },
        include: [
          {
            model: StudentSession,
            include: [{ model: User, as: 'Student', attributes: ['id', 'firstName', 'lastName', 'email', 'registrationNumber'] }],
          },
          { model: User, as: 'Grader', attributes: ['id', 'firstName', 'lastName'] },
        ],
      });
      const shaped = grades.map(shapeGrade)
        .sort((a, b) => (a.student?.name || '').localeCompare(b.student?.name || ''));
      res.json({ sheet: shapeSheet(sheet, shaped.length), grades: shaped, canEdit: canManageSheet(sheet, req) });
    } catch (err) {
      console.error('grade.getSheet error:', err);
      res.status(500).json({ message: 'Failed to load grading list' });
    }
  },

  // PATCH /api/grades/sheets/:id
  updateSheet: async (req, res) => {
    try {
      const sheet = await GradeSheet.findByPk(req.params.id);
      if (!sheet) return res.status(404).json({ message: 'Grading list not found' });
      if (!canManageSheet(sheet, req)) return res.status(403).json({ message: 'Only the creator, ADMIN or HOD can edit this list' });

      const patch = {};
      if (req.body.title !== undefined) {
        if (!String(req.body.title).trim()) return res.status(400).json({ message: 'Title cannot be empty' });
        patch.title = String(req.body.title).trim().slice(0, 250);
      }
      if (req.body.description !== undefined) patch.description = req.body.description ? String(req.body.description).trim() : null;
      if (req.body.academicSessionId !== undefined) {
        const session = await AcademicSession.findByPk(req.body.academicSessionId);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        patch.academicSessionId = req.body.academicSessionId;
      }
      await sheet.update(patch);
      res.json({ message: 'Grading list updated', sheet: shapeSheet(sheet) });
    } catch (err) {
      console.error('grade.updateSheet error:', err);
      res.status(500).json({ message: 'Failed to update grading list' });
    }
  },

  // DELETE /api/grades/sheets/:id — removes the list and its grades.
  deleteSheet: async (req, res) => {
    try {
      const sheet = await GradeSheet.findByPk(req.params.id);
      if (!sheet) return res.status(404).json({ message: 'Grading list not found' });
      if (!canManageSheet(sheet, req)) return res.status(403).json({ message: 'Only the creator, ADMIN or HOD can delete this list' });

      const removed = await sequelize.transaction(async (t) => {
        const n = await StudentGrade.destroy({ where: { gradeSheetId: sheet.id }, transaction: t });
        await sheet.destroy({ transaction: t });
        return n;
      });
      res.json({ message: `Grading list deleted (${removed} grade(s) removed)`, gradesRemoved: removed });
    } catch (err) {
      console.error('grade.deleteSheet error:', err);
      res.status(500).json({ message: 'Failed to delete grading list' });
    }
  },

  // GET /api/grades/sheets/:id/students — students of the list's session,
  // with the grade they already have on this list (for the add/grade picker).
  sheetStudents: async (req, res) => {
    try {
      if (req.user.role === 'STUDENT') return res.status(403).json({ message: 'Not authorized' });
      const sheet = await GradeSheet.findByPk(req.params.id);
      if (!sheet) return res.status(404).json({ message: 'Grading list not found' });

      const rows = await StudentSession.findAll({
        where: { academicSessionId: sheet.academicSessionId },
        include: [{ model: User, as: 'Student', attributes: ['id', 'firstName', 'lastName', 'email', 'registrationNumber'] }],
      });
      const existing = await StudentGrade.findAll({ where: { gradeSheetId: sheet.id }, attributes: ['studentSessionId', 'grade'] });
      const gradeBy = new Map(existing.map((g) => [g.studentSessionId, g.grade]));

      const students = rows
        .filter((r) => r.Student)
        .map((r) => ({
          studentSessionId: r.id,
          id: r.Student.id,
          name: fullName(r.Student),
          email: r.Student.email,
          registrationNumber: r.Student.registrationNumber || '',
          grade: gradeBy.get(r.id) || null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      res.json({ students });
    } catch (err) {
      console.error('grade.sheetStudents error:', err);
      res.status(500).json({ message: 'Failed to load students' });
    }
  },

  // POST /api/grades/sheets/:id/grades — add or update one or many grades.
  // Body: { grades: [{ studentSessionId, grade, remark }] }
  saveGrades: async (req, res) => {
    try {
      const sheet = await GradeSheet.findByPk(req.params.id);
      if (!sheet) return res.status(404).json({ message: 'Grading list not found' });
      if (!canManageSheet(sheet, req)) return res.status(403).json({ message: 'Only the creator, ADMIN or HOD can grade on this list' });

      const input = Array.isArray(req.body.grades) ? req.body.grades : [req.body];
      const cleaned = [];
      for (const row of input) {
        const grade = normaliseGrade(row.grade);
        if (!row.studentSessionId || !grade) continue;
        cleaned.push({ studentSessionId: String(row.studentSessionId), grade, remark: row.remark ? String(row.remark).slice(0, 250) : null });
      }
      if (cleaned.length === 0) {
        return res.status(400).json({ message: `Provide studentSessionId and a grade (${GRADE_VALUES.join(', ')})` });
      }

      // Students must belong to this list's session.
      const valid = await StudentSession.findAll({
        where: { id: { [Op.in]: cleaned.map((c) => c.studentSessionId) }, academicSessionId: sheet.academicSessionId },
        attributes: ['id'],
      });
      const validIds = new Set(valid.map((v) => v.id));
      const usable = cleaned.filter((c) => validIds.has(c.studentSessionId));
      if (usable.length === 0) {
        return res.status(400).json({ message: 'None of those students belong to this list\'s session' });
      }

      let created = 0; let updated = 0;
      await sequelize.transaction(async (t) => {
        for (const c of usable) {
          const existing = await StudentGrade.findOne({
            where: { gradeSheetId: sheet.id, studentSessionId: c.studentSessionId },
            transaction: t,
          });
          if (existing) {
            await existing.update({ grade: c.grade, remark: c.remark, gradedBy: req.user.id, gradedAt: new Date() }, { transaction: t });
            updated += 1;
          } else {
            await StudentGrade.create({
              gradeSheetId: sheet.id,
              studentSessionId: c.studentSessionId,
              grade: c.grade,
              remark: c.remark,
              gradedBy: req.user.id,
              gradedAt: new Date(),
            }, { transaction: t });
            created += 1;
          }
        }
      });
      res.json({ message: `${created} added, ${updated} updated`, created, updated, skipped: cleaned.length - usable.length });
    } catch (err) {
      console.error('grade.saveGrades error:', err);
      res.status(500).json({ message: 'Failed to save grades' });
    }
  },

  // DELETE /api/grades/:gradeId — remove one student's grade from a list.
  deleteGrade: async (req, res) => {
    try {
      const grade = await StudentGrade.findByPk(req.params.gradeId);
      if (!grade) return res.status(404).json({ message: 'Grade not found' });
      const sheet = await GradeSheet.findByPk(grade.gradeSheetId);
      if (!sheet || !canManageSheet(sheet, req)) {
        return res.status(403).json({ message: 'Only the creator, ADMIN or HOD can remove a grade' });
      }
      await grade.destroy();
      res.json({ message: 'Grade removed' });
    } catch (err) {
      console.error('grade.deleteGrade error:', err);
      res.status(500).json({ message: 'Failed to remove grade' });
    }
  },

  // GET /api/grades/sheets/:id/template — .xlsx of the session's students with
  // an empty Grade column to fill in and upload back.
  template: async (req, res) => {
    try {
      if (req.user.role === 'STUDENT') return res.status(403).json({ message: 'Not authorized' });
      const sheet = await GradeSheet.findByPk(req.params.id, { include: [{ model: AcademicSession, attributes: ['name'] }] });
      if (!sheet) return res.status(404).json({ message: 'Grading list not found' });

      const rows = await StudentSession.findAll({
        where: { academicSessionId: sheet.academicSessionId },
        include: [{ model: User, as: 'Student', attributes: ['id', 'firstName', 'lastName', 'email', 'registrationNumber'] }],
      });
      const existing = await StudentGrade.findAll({ where: { gradeSheetId: sheet.id }, attributes: ['studentSessionId', 'grade'] });
      const gradeBy = new Map(existing.map((g) => [g.studentSessionId, g.grade]));

      const header = ['Student Session ID', 'Registration No', 'Name', 'Email', 'Grade (A/B/C/D/Unavailable)'];
      const data = rows
        .filter((r) => r.Student)
        .map((r) => ({
          'Student Session ID': r.id,
          'Registration No': r.Student.registrationNumber || '',
          'Name': fullName(r.Student),
          'Email': r.Student.email || '',
          'Grade (A/B/C/D/Unavailable)': gradeBy.get(r.id) || '',
        }))
        .sort((a, b) => a.Name.localeCompare(b.Name));

      const ws = XLSX.utils.json_to_sheet(data, { header });
      ws['!cols'] = [{ wch: 38 }, { wch: 18 }, { wch: 26 }, { wch: 30 }, { wch: 26 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Grades');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const safe = (sheet.title || 'grades').replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40);
      res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.set('Content-Disposition', `attachment; filename="${safe}-grades-template.xlsx"`);
      res.send(buf);
    } catch (err) {
      console.error('grade.template error:', err);
      res.status(500).json({ message: 'Failed to generate template' });
    }
  },

  // POST /api/grades/sheets/:id/upload — .xlsx back with the Grade column filled.
  uploadGrades: async (req, res) => {
    try {
      const sheet = await GradeSheet.findByPk(req.params.id);
      if (!sheet) return res.status(404).json({ message: 'Grading list not found' });
      if (!canManageSheet(sheet, req)) return res.status(403).json({ message: 'Only the creator, ADMIN or HOD can upload grades' });
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) return res.status(400).json({ message: 'The uploaded file has no sheets' });
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (!rows.length) return res.status(400).json({ message: 'The sheet has no rows' });

      const pick = (row, keys) => {
        for (const k of Object.keys(row)) {
          const name = k.trim().toLowerCase();
          if (keys.some((want) => name === want || name.startsWith(want))) return String(row[k]).trim();
        }
        return '';
      };

      // Resolve each row to a student session in this list's session.
      const sessionRows = await StudentSession.findAll({
        where: { academicSessionId: sheet.academicSessionId },
        include: [{ model: User, as: 'Student', attributes: ['id', 'email', 'registrationNumber'] }],
      });
      const byId = new Map(sessionRows.map((r) => [r.id, r.id]));
      const byEmail = new Map(sessionRows.filter((r) => r.Student?.email).map((r) => [r.Student.email.toLowerCase(), r.id]));
      const byReg = new Map(sessionRows.filter((r) => r.Student?.registrationNumber).map((r) => [String(r.Student.registrationNumber).trim(), r.id]));

      const toSave = [];
      let blankGrade = 0; let unmatched = 0; let badGrade = 0;
      for (const row of rows) {
        const ssId = pick(row, ['student session id', 'studentsessionid']);
        const email = pick(row, ['email', 'e-mail']);
        const reg = pick(row, ['registration no', 'registration number', 'reg no', 'registrationnumber']);
        const rawGrade = pick(row, ['grade']);
        if (!ssId && !email && !reg) continue;
        if (!rawGrade) { blankGrade += 1; continue; }

        const grade = normaliseGrade(rawGrade);
        if (!grade) { badGrade += 1; continue; }

        const studentSessionId = (ssId && byId.get(ssId))
          || (email && byEmail.get(email.toLowerCase()))
          || (reg && byReg.get(reg));
        if (!studentSessionId) { unmatched += 1; continue; }
        toSave.push({ studentSessionId, grade, remark: null });
      }

      if (toSave.length === 0) {
        return res.status(400).json({
          message: `No usable rows — ${blankGrade} without a grade, ${badGrade} with an unrecognised grade, ${unmatched} students not in this session.`,
        });
      }

      let created = 0; let updated = 0;
      await sequelize.transaction(async (t) => {
        for (const c of toSave) {
          const existing = await StudentGrade.findOne({
            where: { gradeSheetId: sheet.id, studentSessionId: c.studentSessionId },
            transaction: t,
          });
          if (existing) {
            await existing.update({ grade: c.grade, gradedBy: req.user.id, gradedAt: new Date() }, { transaction: t });
            updated += 1;
          } else {
            await StudentGrade.create({
              gradeSheetId: sheet.id,
              studentSessionId: c.studentSessionId,
              grade: c.grade,
              gradedBy: req.user.id,
              gradedAt: new Date(),
            }, { transaction: t });
            created += 1;
          }
        }
      });

      res.json({
        message: `${created} added, ${updated} updated`,
        created,
        updated,
        skippedNoGrade: blankGrade,
        skippedBadGrade: badGrade,
        skippedUnmatched: unmatched,
      });
    } catch (err) {
      console.error('grade.uploadGrades error:', err);
      res.status(500).json({ message: 'Failed to process the Excel file' });
    }
  },

  // GET /api/grades/me — the student's own grades and average.
  myGrades: async (req, res) => {
    try {
      const sessions = await StudentSession.findAll({ where: { userId: req.user.id }, attributes: ['id'] });
      const ids = sessions.map((s) => s.id);
      if (ids.length === 0) return res.json({ average: null, averageLetter: null, count: 0, grades: [] });

      const rows = await StudentGrade.findAll({
        where: { studentSessionId: { [Op.in]: ids } },
        include: [
          { model: GradeSheet, include: [{ model: AcademicSession, attributes: ['id', 'name'] }] },
          { model: User, as: 'Grader', attributes: ['id', 'firstName', 'lastName'] },
        ],
        order: [['gradedAt', 'DESC']],
      });

      const grades = rows.map((g) => ({
        id: g.id,
        title: g.GradeSheet?.title || '—',
        sessionName: g.GradeSheet?.AcademicSession?.name || '',
        grade: g.grade,
        remark: g.remark || '',
        gradedByName: fullName(g.Grader),
        gradedAt: g.gradedAt,
      }));

      const counted = grades.filter((g) => GRADE_POINTS[g.grade] !== undefined);
      const average = counted.length
        ? counted.reduce((sum, g) => sum + GRADE_POINTS[g.grade], 0) / counted.length
        : null;

      res.json({
        average: average === null ? null : Number(average.toFixed(3)),
        averageLetter: average === null ? null : LETTER_FOR(average),
        count: grades.length,
        countedForAverage: counted.length,
        grades,
      });
    } catch (err) {
      console.error('grade.myGrades error:', err);
      res.status(500).json({ message: 'Failed to load your grades' });
    }
  },
};

module.exports = gradeController;
