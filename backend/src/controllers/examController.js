const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle, TabStopType, TabStopPosition,
} = require('docx');
const { effectiveRole } = require('../middleware/auth');
const {
  sequelize,
  ExamCourse,
  ExamCourseAssignee,
  CourseOutcome,
  ExamQuestion,
  QUESTION_DIFFICULTIES,
  QUESTION_TYPES,
  AcademicSession,
  User,
} = require('../models');

// The /exams sub-portal is staff-only. Admin/HOD (and coordinators, who are
// aliased to ADMIN) run it; assigned staff fill in outcomes and questions.
const isExamAdmin = (user) => ['ADMIN', 'HOD'].includes(user.role);
const isStudent = (user) => user.role === 'STUDENT';
const fullName = (u) => (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '');

// The portal issues its own tokens. Same secret and payload as the DOMS
// sign-in, so one set of credentials works in both places.
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
const signAccessToken = (user) => jwt.sign(
  { id: user.id, email: user.email, role: user.approvedRole, status: user.status },
  process.env.JWT_SECRET,
  { expiresIn: '24h' },
);
const signRefreshToken = (user) => jwt.sign(
  { id: user.id, email: user.email, typ: 'refresh' },
  REFRESH_SECRET,
  { expiresIn: '7d' },
);
const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  name: fullName(user),
  role: effectiveRole(user.approvedRole),
  approvedRole: user.approvedRole,
  isAdmin: ['ADMIN', 'HOD'].includes(effectiveRole(user.approvedRole)),
});

async function assignedCourseIds(userId) {
  const rows = await ExamCourseAssignee.findAll({ where: { userId }, attributes: ['courseId'] });
  return rows.map((r) => r.courseId);
}

// Admin: any course. Others: only courses they are assigned to.
async function loadCourseFor(req, courseId) {
  const course = await ExamCourse.findByPk(courseId, {
    include: [
      { model: AcademicSession, attributes: ['id', 'name'] },
      { model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName'] },
    ],
  });
  if (!course) return { error: { code: 404, message: 'Course not found' } };
  if (isExamAdmin(req.user)) return { course, canManageCourse: true };
  const mine = await ExamCourseAssignee.findOne({ where: { courseId, userId: req.user.id } });
  if (!mine) return { error: { code: 403, message: 'You are not assigned to this course' } };
  return { course, canManageCourse: false };
}

const shapeCourse = (c, extra = {}) => ({
  id: c.id,
  title: c.title,
  code: c.code,
  trimester: c.trimester || '',
  academicSessionId: c.academicSessionId,
  sessionName: c.AcademicSession?.name || '',
  createdByName: fullName(c.Creator),
  createdAt: c.createdAt,
  ...extra,
});

const shapeQuestion = (q) => ({
  id: q.id,
  text: q.text,
  difficulty: q.difficulty,
  type: q.type,
  courseOutcomeId: q.courseOutcomeId,
  outcomeCode: q.Outcome?.code || '',
  authorName: fullName(q.Author),
  createdAt: q.createdAt,
});

// ---------- question paper (.docx) ----------

const EMPTY_BOX = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

const line = (text, opts = {}) => new Paragraph({
  alignment: opts.align || AlignmentType.LEFT,
  spacing: { after: opts.after ?? 0 },
  children: [new TextRun({ text, bold: !!opts.bold, size: opts.size || 22 })],
});

// "Q1.<tab>10x2 Marks" — right-aligned marks via a tab stop at the margin.
const questionHeading = (label, marks) => new Paragraph({
  tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
  spacing: { before: 160, after: 60 },
  children: [new TextRun({ text: label, bold: true, size: 22 }), new TextRun({ text: `\t${marks}`, bold: true, size: 22 })],
});

function rollNoTable(paperCode) {
  const box = () => new TableCell({
    width: { size: 5, type: WidthType.PERCENTAGE },
    borders: { top: EMPTY_BOX, bottom: EMPTY_BOX, left: EMPTY_BOX, right: EMPTY_BOX },
    children: [new Paragraph('')],
  });
  const plain = (text, width, align = AlignmentType.LEFT) => new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
    children: [new Paragraph({ alignment: align, children: [new TextRun({ text, bold: true, size: 22 })] })],
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER,
      insideHorizontal: NO_BORDER, insideVertical: NO_BORDER,
    },
    rows: [new TableRow({
      children: [
        plain('Roll No.', 15),
        ...Array.from({ length: 7 }, box),
        plain(`Paper Code: ${paperCode}`, 30, AlignmentType.RIGHT),
      ],
    })],
  });
}

function buildPaperDoc({ header, mains, caseStudy }) {
  const children = [
    rollNoTable(header.paperCode),
    line('', { after: 120 }),
    line(header.examName, { align: AlignmentType.CENTER, bold: true, after: 40 }),
    line(header.trimester, { align: AlignmentType.CENTER, bold: true, after: 40 }),
    line(header.courseTitle, { align: AlignmentType.CENTER, bold: true, after: 60 }),
    new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      spacing: { after: 160 },
      children: [new TextRun({ text: `Time: ${header.time}`, bold: true, size: 22 }), new TextRun({ text: `\tMM: ${header.maxMarks}`, bold: true, size: 22 })],
    }),
    line('Note:', { bold: true, after: 60 }),
    line('(i)     This question paper contains two Sections-Section A and B'),
    line('(ii)    Both Sections are compulsory'),
    line('(iii)   Answer any two sub questions among a, b & c in each main question of Section A.    Each question carries 10 marks.'),
    line('(iv)    Section B consisting of case study is compulsory. Section B is of 40 Marks.', { after: 200 }),
    line('Section A', { align: AlignmentType.CENTER, bold: true, after: 60 }),
  ];

  mains.forEach((subs, i) => {
    children.push(questionHeading(`Q${i + 1}.`, '10x2 Marks'));
    subs.forEach((q, j) => {
      children.push(new Paragraph({
        indent: { left: 420 },
        spacing: { after: 60 },
        children: [new TextRun({ text: `${'abc'[j]}) ${q ? q.text : ''}`, size: 22 })],
      }));
    });
  });

  children.push(line('', { after: 120 }));
  children.push(line('Section B', { align: AlignmentType.CENTER, bold: true, after: 60 }));
  children.push(questionHeading('Q4.  Case Study', '(40 Marks)'));
  if (caseStudy) {
    children.push(new Paragraph({
      indent: { left: 420 },
      children: [new TextRun({ text: caseStudy.text, size: 22 })],
    }));
  }

  return new Document({ sections: [{ properties: {}, children }] });
}

const pick = (pool, n) => {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
};

const examController = {
  // ---------- courses ----------
  listCourses: async (req, res) => {
    try {
      if (isStudent(req.user)) return res.status(403).json({ message: 'Not authorized' });
      const where = {};
      if (req.query.sessionId) where.academicSessionId = req.query.sessionId;
      if (!isExamAdmin(req.user)) where.id = { [Op.in]: await assignedCourseIds(req.user.id) };

      const courses = await ExamCourse.findAll({
        where,
        include: [
          { model: AcademicSession, attributes: ['id', 'name'] },
          { model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName'] },
          { model: ExamCourseAssignee, as: 'Assignees', include: [{ model: User, as: 'User', attributes: ['id', 'firstName', 'lastName', 'email'] }] },
        ],
        order: [['createdAt', 'DESC']],
      });
      const counts = await ExamQuestion.findAll({
        attributes: ['courseId', [sequelize.fn('COUNT', sequelize.col('id')), 'n']],
        where: { courseId: { [Op.in]: courses.map((c) => c.id) } },
        group: ['courseId'],
        raw: true,
      });
      const byCourse = new Map(counts.map((c) => [c.courseId, Number(c.n)]));

      res.json({
        isAdmin: isExamAdmin(req.user),
        courses: courses.map((c) => shapeCourse(c, {
          questionCount: byCourse.get(c.id) || 0,
          assignees: (c.Assignees || []).map((a) => ({ id: a.userId, name: fullName(a.User), email: a.User?.email || '' })),
        })),
      });
    } catch (err) {
      console.error('exam.listCourses error:', err);
      res.status(500).json({ message: 'Failed to load courses' });
    }
  },

  createCourse: async (req, res) => {
    try {
      if (!isExamAdmin(req.user)) return res.status(403).json({ message: 'Only ADMIN/HOD can create courses' });
      const title = String(req.body.title || '').trim();
      const code = String(req.body.code || '').trim();
      const { academicSessionId } = req.body;
      if (!title || !code) return res.status(400).json({ message: 'Course title and code are required' });
      if (!academicSessionId) return res.status(400).json({ message: 'Session is required' });
      const session = await AcademicSession.findByPk(academicSessionId);
      if (!session) return res.status(404).json({ message: 'Session not found' });
      const clash = await ExamCourse.findOne({ where: { academicSessionId, code } });
      if (clash) return res.status(409).json({ message: `${code} already exists in ${session.name}` });

      const course = await ExamCourse.create({
        title: title.slice(0, 250),
        code: code.slice(0, 60),
        trimester: req.body.trimester ? String(req.body.trimester).trim().slice(0, 40) : null,
        academicSessionId,
        createdBy: req.user.id,
      });
      res.status(201).json({ message: 'Course created', course: shapeCourse(course, { questionCount: 0, assignees: [] }) });
    } catch (err) {
      console.error('exam.createCourse error:', err);
      res.status(500).json({ message: 'Failed to create course' });
    }
  },

  getCourse: async (req, res) => {
    try {
      if (isStudent(req.user)) return res.status(403).json({ message: 'Not authorized' });
      const { course, error, canManageCourse } = await loadCourseFor(req, req.params.id);
      if (error) return res.status(error.code).json({ message: error.message });

      const [outcomes, questions, assignees] = await Promise.all([
        CourseOutcome.findAll({ where: { courseId: course.id }, order: [['code', 'ASC']] }),
        ExamQuestion.findAll({
          where: { courseId: course.id },
          include: [
            { model: CourseOutcome, as: 'Outcome', attributes: ['id', 'code'] },
            { model: User, as: 'Author', attributes: ['id', 'firstName', 'lastName'] },
          ],
          order: [['createdAt', 'DESC']],
        }),
        ExamCourseAssignee.findAll({
          where: { courseId: course.id },
          include: [{ model: User, as: 'User', attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole'] }],
        }),
      ]);

      res.json({
        course: shapeCourse(course, { questionCount: questions.length }),
        canManageCourse,
        isAdmin: isExamAdmin(req.user),
        outcomes: outcomes.map((o) => ({ id: o.id, code: o.code, description: o.description || '' })),
        questions: questions.map(shapeQuestion),
        assignees: assignees.map((a) => ({
          id: a.userId, name: fullName(a.User), email: a.User?.email || '', role: a.User?.approvedRole || '',
        })),
      });
    } catch (err) {
      console.error('exam.getCourse error:', err);
      res.status(500).json({ message: 'Failed to load the course' });
    }
  },

  updateCourse: async (req, res) => {
    try {
      if (!isExamAdmin(req.user)) return res.status(403).json({ message: 'Only ADMIN/HOD can edit courses' });
      const course = await ExamCourse.findByPk(req.params.id);
      if (!course) return res.status(404).json({ message: 'Course not found' });
      const patch = {};
      if (req.body.title !== undefined) patch.title = String(req.body.title).trim().slice(0, 250);
      if (req.body.code !== undefined) patch.code = String(req.body.code).trim().slice(0, 60);
      if (req.body.trimester !== undefined) patch.trimester = req.body.trimester ? String(req.body.trimester).trim().slice(0, 40) : null;
      if (!patch.title && req.body.title !== undefined) return res.status(400).json({ message: 'Title cannot be empty' });
      await course.update(patch);
      res.json({ message: 'Course updated', course: shapeCourse(course) });
    } catch (err) {
      console.error('exam.updateCourse error:', err);
      res.status(500).json({ message: 'Failed to update the course' });
    }
  },

  deleteCourse: async (req, res) => {
    try {
      if (!isExamAdmin(req.user)) return res.status(403).json({ message: 'Only ADMIN/HOD can delete courses' });
      const course = await ExamCourse.findByPk(req.params.id);
      if (!course) return res.status(404).json({ message: 'Course not found' });
      const removed = await sequelize.transaction(async (t) => {
        const q = await ExamQuestion.destroy({ where: { courseId: course.id }, transaction: t });
        await CourseOutcome.destroy({ where: { courseId: course.id }, transaction: t });
        await ExamCourseAssignee.destroy({ where: { courseId: course.id }, transaction: t });
        await course.destroy({ transaction: t });
        return q;
      });
      res.json({ message: `Course deleted along with ${removed} question(s)` });
    } catch (err) {
      console.error('exam.deleteCourse error:', err);
      res.status(500).json({ message: 'Failed to delete the course' });
    }
  },

  // ---------- assignees ----------
  setAssignees: async (req, res) => {
    try {
      if (!isExamAdmin(req.user)) return res.status(403).json({ message: 'Only ADMIN/HOD can assign a course' });
      const course = await ExamCourse.findByPk(req.params.id);
      if (!course) return res.status(404).json({ message: 'Course not found' });
      const userIds = Array.isArray(req.body.userIds) ? req.body.userIds.map(String) : [];
      if (userIds.length === 0) return res.status(400).json({ message: 'Pick at least one person' });

      const users = await User.findAll({ where: { id: { [Op.in]: userIds }, approvedRole: { [Op.ne]: 'STUDENT' } } });
      if (users.length === 0) return res.status(400).json({ message: 'Students cannot be assigned to a course' });

      let added = 0;
      for (const u of users) {
        const [, created] = await ExamCourseAssignee.findOrCreate({
          where: { courseId: course.id, userId: u.id },
          defaults: { courseId: course.id, userId: u.id, assignedBy: req.user.id },
        });
        if (created) added += 1;
      }
      res.json({
        message: `${added} added${users.length - added > 0 ? `, ${users.length - added} already assigned` : ''}`,
        added,
        skippedStudents: userIds.length - users.length,
      });
    } catch (err) {
      console.error('exam.setAssignees error:', err);
      res.status(500).json({ message: 'Failed to assign the course' });
    }
  },

  removeAssignee: async (req, res) => {
    try {
      if (!isExamAdmin(req.user)) return res.status(403).json({ message: 'Only ADMIN/HOD can change assignments' });
      const n = await ExamCourseAssignee.destroy({ where: { courseId: req.params.id, userId: req.params.userId } });
      if (!n) return res.status(404).json({ message: 'That person is not assigned to this course' });
      res.json({ message: 'Removed from the course' });
    } catch (err) {
      console.error('exam.removeAssignee error:', err);
      res.status(500).json({ message: 'Failed to remove' });
    }
  },

  // ---------- course outcomes ----------
  addOutcome: async (req, res) => {
    try {
      if (isStudent(req.user)) return res.status(403).json({ message: 'Not authorized' });
      const { course, error } = await loadCourseFor(req, req.params.id);
      if (error) return res.status(error.code).json({ message: error.message });
      const code = String(req.body.code || '').trim().toUpperCase().slice(0, 20);
      if (!code) return res.status(400).json({ message: 'CO code is required (e.g. CO1)' });
      const clash = await CourseOutcome.findOne({ where: { courseId: course.id, code } });
      if (clash) return res.status(409).json({ message: `${code} already exists on this course` });
      const outcome = await CourseOutcome.create({
        courseId: course.id,
        code,
        description: req.body.description ? String(req.body.description).trim().slice(0, 2000) : null,
        createdBy: req.user.id,
      });
      res.status(201).json({ message: 'CO added', outcome: { id: outcome.id, code: outcome.code, description: outcome.description || '' } });
    } catch (err) {
      console.error('exam.addOutcome error:', err);
      res.status(500).json({ message: 'Failed to add the CO' });
    }
  },

  updateOutcome: async (req, res) => {
    try {
      const outcome = await CourseOutcome.findByPk(req.params.outcomeId);
      if (!outcome) return res.status(404).json({ message: 'CO not found' });
      const { error } = await loadCourseFor(req, outcome.courseId);
      if (error) return res.status(error.code).json({ message: error.message });
      const patch = {};
      if (req.body.code !== undefined) {
        const code = String(req.body.code).trim().toUpperCase().slice(0, 20);
        if (!code) return res.status(400).json({ message: 'CO code cannot be empty' });
        patch.code = code;
      }
      if (req.body.description !== undefined) {
        patch.description = req.body.description ? String(req.body.description).trim().slice(0, 2000) : null;
      }
      await outcome.update(patch);
      res.json({ message: 'CO updated', outcome: { id: outcome.id, code: outcome.code, description: outcome.description || '' } });
    } catch (err) {
      console.error('exam.updateOutcome error:', err);
      res.status(500).json({ message: 'Failed to update the CO' });
    }
  },

  deleteOutcome: async (req, res) => {
    try {
      const outcome = await CourseOutcome.findByPk(req.params.outcomeId);
      if (!outcome) return res.status(404).json({ message: 'CO not found' });
      const { error } = await loadCourseFor(req, outcome.courseId);
      if (error) return res.status(error.code).json({ message: error.message });
      // Questions keep their text; they just lose the CO tag.
      const [untagged] = await ExamQuestion.update({ courseOutcomeId: null }, { where: { courseOutcomeId: outcome.id } });
      await outcome.destroy();
      res.json({ message: `CO removed${untagged ? ` — ${untagged} question(s) no longer tagged` : ''}` });
    } catch (err) {
      console.error('exam.deleteOutcome error:', err);
      res.status(500).json({ message: 'Failed to remove the CO' });
    }
  },

  // ---------- question bank ----------
  addQuestion: async (req, res) => {
    try {
      if (isStudent(req.user)) return res.status(403).json({ message: 'Not authorized' });
      const { course, error } = await loadCourseFor(req, req.params.id);
      if (error) return res.status(error.code).json({ message: error.message });

      const text = String(req.body.text || '').trim();
      const difficulty = String(req.body.difficulty || '').toUpperCase();
      const type = String(req.body.type || '').toUpperCase();
      if (!text) return res.status(400).json({ message: 'Question text is required' });
      if (!QUESTION_DIFFICULTIES.includes(difficulty)) return res.status(400).json({ message: `Difficulty must be one of ${QUESTION_DIFFICULTIES.join(', ')}` });
      if (!QUESTION_TYPES.includes(type)) return res.status(400).json({ message: `Type must be one of ${QUESTION_TYPES.join(', ')}` });

      let courseOutcomeId = null;
      if (req.body.courseOutcomeId) {
        const co = await CourseOutcome.findOne({ where: { id: req.body.courseOutcomeId, courseId: course.id } });
        if (!co) return res.status(400).json({ message: 'That CO does not belong to this course' });
        courseOutcomeId = co.id;
      }

      const q = await ExamQuestion.create({
        courseId: course.id, text, difficulty, type, courseOutcomeId, createdBy: req.user.id,
      });
      const withRefs = await ExamQuestion.findByPk(q.id, {
        include: [
          { model: CourseOutcome, as: 'Outcome', attributes: ['id', 'code'] },
          { model: User, as: 'Author', attributes: ['id', 'firstName', 'lastName'] },
        ],
      });
      res.status(201).json({ message: 'Question added', question: shapeQuestion(withRefs) });
    } catch (err) {
      console.error('exam.addQuestion error:', err);
      res.status(500).json({ message: 'Failed to add the question' });
    }
  },

  updateQuestion: async (req, res) => {
    try {
      const q = await ExamQuestion.findByPk(req.params.questionId);
      if (!q) return res.status(404).json({ message: 'Question not found' });
      const { course, error } = await loadCourseFor(req, q.courseId);
      if (error) return res.status(error.code).json({ message: error.message });

      const patch = {};
      if (req.body.text !== undefined) {
        const text = String(req.body.text).trim();
        if (!text) return res.status(400).json({ message: 'Question text cannot be empty' });
        patch.text = text;
      }
      if (req.body.difficulty !== undefined) {
        const d = String(req.body.difficulty).toUpperCase();
        if (!QUESTION_DIFFICULTIES.includes(d)) return res.status(400).json({ message: 'Invalid difficulty' });
        patch.difficulty = d;
      }
      if (req.body.type !== undefined) {
        const t = String(req.body.type).toUpperCase();
        if (!QUESTION_TYPES.includes(t)) return res.status(400).json({ message: 'Invalid question type' });
        patch.type = t;
      }
      if (req.body.courseOutcomeId !== undefined) {
        if (!req.body.courseOutcomeId) patch.courseOutcomeId = null;
        else {
          const co = await CourseOutcome.findOne({ where: { id: req.body.courseOutcomeId, courseId: course.id } });
          if (!co) return res.status(400).json({ message: 'That CO does not belong to this course' });
          patch.courseOutcomeId = co.id;
        }
      }
      await q.update(patch);
      res.json({ message: 'Question updated' });
    } catch (err) {
      console.error('exam.updateQuestion error:', err);
      res.status(500).json({ message: 'Failed to update the question' });
    }
  },

  deleteQuestion: async (req, res) => {
    try {
      const q = await ExamQuestion.findByPk(req.params.questionId);
      if (!q) return res.status(404).json({ message: 'Question not found' });
      const { error } = await loadCourseFor(req, q.courseId);
      if (error) return res.status(error.code).json({ message: error.message });
      await q.destroy();
      res.json({ message: 'Question removed' });
    } catch (err) {
      console.error('exam.deleteQuestion error:', err);
      res.status(500).json({ message: 'Failed to remove the question' });
    }
  },

  // ---------- paper ----------
  // GET /api/exams/courses/:id/paper/preview?difficulty=MEDIUM
  // Picks 9 ten-mark questions (3 per main question) + 1 case study at random.
  previewPaper: async (req, res) => {
    try {
      if (!isExamAdmin(req.user)) return res.status(403).json({ message: 'Only ADMIN/HOD can generate a paper' });
      const course = await ExamCourse.findByPk(req.params.id, { include: [{ model: AcademicSession, attributes: ['name'] }] });
      if (!course) return res.status(404).json({ message: 'Course not found' });
      const difficulty = String(req.query.difficulty || '').toUpperCase();
      if (difficulty && !QUESTION_DIFFICULTIES.includes(difficulty)) {
        return res.status(400).json({ message: 'Invalid difficulty' });
      }

      const where = { courseId: course.id };
      if (difficulty) where.difficulty = difficulty;
      const all = await ExamQuestion.findAll({
        where,
        include: [{ model: CourseOutcome, as: 'Outcome', attributes: ['id', 'code'] }],
      });
      const tens = all.filter((q) => q.type === 'TEN_MARK');
      const cases = all.filter((q) => q.type === 'CASE_STUDY');

      const shortfall = [];
      if (tens.length < 9) shortfall.push(`${9 - tens.length} more 10-mark question(s)`);
      if (cases.length < 1) shortfall.push('1 case study');

      const chosenTens = pick(tens, 9).map(shapeQuestion);
      const chosenCase = pick(cases, 1).map(shapeQuestion)[0] || null;

      res.json({
        course: { id: course.id, title: course.title, code: course.code, trimester: course.trimester || '', sessionName: course.AcademicSession?.name || '' },
        difficulty: difficulty || 'ANY',
        available: { tenMark: tens.length, caseStudy: cases.length },
        shortfall,
        mains: [chosenTens.slice(0, 3), chosenTens.slice(3, 6), chosenTens.slice(6, 9)],
        caseStudy: chosenCase,
      });
    } catch (err) {
      console.error('exam.previewPaper error:', err);
      res.status(500).json({ message: 'Failed to build the paper' });
    }
  },

  // POST /api/exams/courses/:id/paper  { questionIds: [9], caseStudyId, header:{...} }
  downloadPaper: async (req, res) => {
    try {
      if (!isExamAdmin(req.user)) return res.status(403).json({ message: 'Only ADMIN/HOD can generate a paper' });
      const course = await ExamCourse.findByPk(req.params.id);
      if (!course) return res.status(404).json({ message: 'Course not found' });

      const ids = Array.isArray(req.body.questionIds) ? req.body.questionIds.map(String) : [];
      if (ids.length !== 9) return res.status(400).json({ message: 'A paper needs exactly 9 ten-mark questions' });

      const rows = await ExamQuestion.findAll({ where: { id: { [Op.in]: ids }, courseId: course.id } });
      if (rows.length !== 9) return res.status(400).json({ message: 'Some questions do not belong to this course' });
      const byId = new Map(rows.map((r) => [r.id, r]));
      const ordered = ids.map((id) => byId.get(id));

      let caseStudy = null;
      if (req.body.caseStudyId) {
        caseStudy = await ExamQuestion.findOne({ where: { id: req.body.caseStudyId, courseId: course.id, type: 'CASE_STUDY' } });
        if (!caseStudy) return res.status(400).json({ message: 'That case study does not belong to this course' });
      }

      const h = req.body.header || {};
      const header = {
        paperCode: String(h.paperCode || course.code),
        examName: String(h.examName || `MBA End Trimester Examination ${new Date().getFullYear()}`),
        trimester: String(h.trimester || course.trimester || ''),
        courseTitle: String(h.courseTitle || course.title),
        time: String(h.time || '3:00 Hours'),
        maxMarks: String(h.maxMarks || '100'),
      };

      const doc = buildPaperDoc({
        header,
        mains: [ordered.slice(0, 3), ordered.slice(3, 6), ordered.slice(6, 9)],
        caseStudy,
      });
      const buffer = await Packer.toBuffer(doc);
      const safe = `${course.code}-${course.title}`.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60);
      res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.set('Content-Disposition', `attachment; filename="${safe}-question-paper.docx"`);
      res.send(buffer);
    } catch (err) {
      console.error('exam.downloadPaper error:', err);
      res.status(500).json({ message: 'Failed to generate the question paper' });
    }
  },

  // GET /api/exams/staff — people who can be assigned a course (admin only)
  listStaff: async (req, res) => {
    try {
      if (!isExamAdmin(req.user)) return res.status(403).json({ message: 'Not authorized' });
      const users = await User.findAll({
        where: { approvedRole: { [Op.ne]: 'STUDENT' }, status: 'ACTIVE' },
        attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole', 'department'],
        order: [['firstName', 'ASC']],
      });
      res.json({
        staff: users.map((u) => ({
          id: u.id, name: fullName(u), email: u.email, role: u.approvedRole, department: u.department || '',
        })),
      });
    } catch (err) {
      console.error('exam.listStaff error:', err);
      res.status(500).json({ message: 'Failed to load staff' });
    }
  },

  // POST /api/exams/login — the exams portal signs people in itself.
  login: async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    try {
      const user = await User.findOne({ where: { email: String(email).trim() } });
      if (!user) return res.status(401).json({ message: 'Invalid credentials' });

      const ok = await user.comparePassword(password);
      if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

      if (user.status === 'PENDING') return res.status(403).json({ message: 'Your account is pending approval' });
      if (user.status === 'REJECTED') return res.status(403).json({ message: 'Your account request has been rejected' });
      if (user.status === 'INACTIVE') return res.status(403).json({ message: 'Your account is inactive' });
      if (!user.approvedRole) return res.status(403).json({ message: 'No role assigned to your account' });

      // Students have no business in the exams portal — refused at the door.
      if (effectiveRole(user.approvedRole) === 'STUDENT') {
        return res.status(403).json({ message: 'The exams portal is for faculty and staff only' });
      }

      await user.update({ lastLogin: new Date() });
      res.json({
        message: 'Login successful',
        token: signAccessToken(user),
        refreshToken: signRefreshToken(user),
        user: publicUser(user),
      });
    } catch (err) {
      console.error('exam.login error:', err);
      res.status(500).json({ message: 'Login failed' });
    }
  },

  // POST /api/exams/refresh — keep a portal session alive without the DOMS app.
  refresh: async (req, res) => {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token is required' });
    try {
      const payload = jwt.verify(refreshToken, REFRESH_SECRET);
      const user = await User.findByPk(payload.id);
      if (!user || user.status !== 'ACTIVE' || !user.approvedRole) {
        return res.status(401).json({ message: 'Session expired' });
      }
      if (effectiveRole(user.approvedRole) === 'STUDENT') {
        return res.status(403).json({ message: 'The exams portal is for faculty and staff only' });
      }
      res.json({ token: signAccessToken(user), user: publicUser(user) });
    } catch (err) {
      res.status(401).json({ message: 'Session expired' });
    }
  },

  // GET /api/exams/me — restore the signed-in user on reload.
  me: async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) return res.status(401).json({ message: 'Session expired' });
      res.json({ user: publicUser(user) });
    } catch (err) {
      console.error('exam.me error:', err);
      res.status(500).json({ message: 'Failed to load your account' });
    }
  },

  // GET /api/exams/sessions — sessions a course can belong to.
  listSessions: async (req, res) => {
    try {
      const sessions = await AcademicSession.findAll({
        attributes: ['id', 'name', 'isActive'],
        order: [['isActive', 'DESC'], ['startDate', 'DESC']],
      });
      res.json({ sessions: sessions.map((s) => ({ id: s.id, name: s.name, isActive: !!s.isActive })) });
    } catch (err) {
      console.error('exam.listSessions error:', err);
      res.status(500).json({ message: 'Failed to load sessions' });
    }
  },
};

module.exports = examController;
