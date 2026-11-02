const { Op } = require('sequelize');
const {
  GOAL_QUESTIONS,
  StudentGoal,
  RoadmapGoalNotice,
  RoadmapMilestone,
  RoadmapMilestoneResponse,
  StudentMilestone,
  StudentSession,
  AcademicSession,
  SessionSection,
  User,
} = require('../models');

// Every member of staff may read roadmaps, place milestones and approve a
// goal — the user asked for faculty, admin, coordinator and HOD alike.
const STAFF_ROLES = [
  'ADMIN', 'HOD', 'FACULTY', 'CHAIR_HEAD',
  'COORDINATOR', 'PLACEMENT_COORDINATOR', 'TRAINER', 'MENTOR',
];
const isStaff = (user) => STAFF_ROLES.includes(user.role);
const isAdminish = (user) => ['ADMIN', 'HOD', 'COORDINATOR'].includes(user.role);
const fullName = (u) => (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || '' : '');
// DATEONLY columns come back as 'YYYY-MM-DD', but DATE columns (a session's
// start/end) come back as a JS Date — stringifying that gives 'Fri Aug 07',
// which no date input or parser accepts. Always hand out 'YYYY-MM-DD'.
const dayOnly = (d) => {
  if (!d) return null;
  if (d instanceof Date) {
    if (Number.isNaN(d.getTime())) return null;
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return String(d).slice(0, 10);
};

// The session a student belongs to, newest enrolment first, with its dates —
// the timeline starts on the session start date.
async function sessionFor(userId) {
  const rows = await StudentSession.findAll({
    where: { userId },
    include: [
      { model: AcademicSession, attributes: ['id', 'name', 'startDate', 'endDate', 'isActive'] },
      { model: SessionSection, as: 'Section', attributes: ['id', 'name'] },
    ],
    order: [['createdAt', 'DESC']],
  });
  const withSession = rows.find((r) => r.AcademicSession);
  if (!withSession) return null;
  const s = withSession.AcademicSession;
  return {
    id: s.id,
    name: s.name,
    startDate: dayOnly(s.startDate),
    endDate: dayOnly(s.endDate),
    sectionName: withSession.Section?.name || '',
  };
}

const shapeJson = (value, fallback) => {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return value || fallback;
};

const shapeGoal = (g) => (g ? {
  id: g.id,
  title: g.title,
  answers: shapeJson(g.answers, {}),
  targetDate: dayOnly(g.targetDate),
  status: g.status,
  decisionNote: g.decisionNote || '',
  approvedByName: fullName(g.ApprovedByUser),
  approvedAt: g.approvedAt,
  createdAt: g.createdAt,
} : null);

const shapeMilestone = (m, extra = {}) => ({
  id: m.id,
  academicSessionId: m.academicSessionId,
  title: m.title,
  description: m.description || '',
  dueDate: dayOnly(m.dueDate),
  icon: m.icon || 'target',
  questions: shapeJson(m.questions, []),
  createdByName: fullName(m.Creator),
  createdBy: m.createdBy,
  ...extra,
});

const shapeSelf = (m) => ({
  id: m.id,
  title: m.title,
  description: m.description || '',
  date: dayOnly(m.date),
  type: m.type,
  createdAt: m.createdAt,
});

// Everything one student's timeline needs: the window it spans, the goal,
// the staff milestones for their session (with their own answers) and their
// own milestones.
async function roadmapFor(userId, { includeStudent = false } = {}) {
  const session = await sessionFor(userId);
  const goal = await StudentGoal.findOne({
    where: { userId },
    include: [{ model: User, as: 'ApprovedByUser', attributes: ['id', 'firstName', 'lastName', 'email'] }],
  });

  const milestones = session
    ? await RoadmapMilestone.findAll({
      where: { academicSessionId: session.id },
      include: [{ model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['dueDate', 'ASC']],
    })
    : [];
  const responses = milestones.length
    ? await RoadmapMilestoneResponse.findAll({
      where: { userId, milestoneId: { [Op.in]: milestones.map((m) => m.id) } },
    })
    : [];
  const responseBy = new Map(responses.map((r) => [r.milestoneId, r]));

  const own = await StudentMilestone.findAll({ where: { userId }, order: [['date', 'ASC']] });

  // The goal is reached at the end of the session, so the session end date
  // is what the timeline and the day count run to — even for goals saved
  // earlier with a date the student picked.
  const shaped = shapeGoal(goal);
  if (shaped && session?.endDate) shaped.targetDate = session.endDate;

  const payload = {
    session,
    questions: GOAL_QUESTIONS,
    goal: shaped,
    milestones: milestones.map((m) => {
      const mine = responseBy.get(m.id);
      return shapeMilestone(m, {
        myResponse: mine ? { id: mine.id, answers: shapeJson(mine.answers, {}), submittedAt: mine.submittedAt } : null,
      });
    }),
    selfMilestones: own.map(shapeSelf),
  };

  if (!includeStudent) {
    const notice = await RoadmapGoalNotice.findOne({
      where: { userId, acknowledgedAt: null },
      include: [{ model: User, as: 'DeletedByUser', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['createdAt', 'DESC']],
    });
    payload.notice = notice ? {
      id: notice.id,
      title: notice.title || '',
      reason: notice.reason || '',
      removedByName: fullName(notice.DeletedByUser),
      removedAt: notice.createdAt,
    } : null;
  }

  if (includeStudent) {
    const student = await User.findByPk(userId, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'registrationNumber'],
    });
    payload.student = student ? {
      id: student.id,
      name: fullName(student),
      email: student.email,
      registrationNumber: student.registrationNumber || '',
    } : null;
  }
  return payload;
}

const roadmapController = {
  // GET /api/roadmap/me — the signed-in student's own roadmap.
  myRoadmap: async (req, res) => {
    try {
      if (req.user.role !== 'STUDENT') {
        return res.status(403).json({ message: 'This view is for students' });
      }
      res.json(await roadmapFor(req.user.id));
    } catch (err) {
      console.error('roadmap.myRoadmap error:', err);
      res.status(500).json({ message: 'Failed to load your roadmap' });
    }
  },

  // POST /api/roadmap/goal — set or redraft the goal. Editable while it is
  // waiting or after a rejection; an approved goal stays put.
  saveGoal: async (req, res) => {
    try {
      if (req.user.role !== 'STUDENT') return res.status(403).json({ message: 'Only a student can set their goal' });
      const answers = req.body.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
      const title = String(req.body.title || answers.goal || '').trim();
      if (!title) return res.status(400).json({ message: 'Tell us your goal in one line' });

      for (const q of GOAL_QUESTIONS) {
        if (q.required && !String(answers[q.id] || (q.id === 'goal' ? title : '')).trim()) {
          return res.status(400).json({ message: `Please answer: ${q.label}` });
        }
      }

      // Not the student's choice: the goal is for the end of their session.
      const session = await sessionFor(req.user.id);
      const targetDate = session?.endDate || (req.body.targetDate ? dayOnly(req.body.targetDate) : null);

      const existing = await StudentGoal.findOne({ where: { userId: req.user.id } });
      if (existing && existing.status === 'APPROVED') {
        return res.status(400).json({ message: 'Your goal is already approved. Ask a faculty member if it needs to change.' });
      }

      if (existing) {
        await existing.update({
          title,
          answers,
          targetDate,
          academicSessionId: session?.id || null,
          status: 'PENDING',
          approvedBy: null,
          approvedAt: null,
          decisionNote: null,
        });
      } else {
        await StudentGoal.create({
          userId: req.user.id,
          academicSessionId: session?.id || null,
          title,
          answers,
          targetDate,
          status: 'PENDING',
        });
      }
      res.json({ message: 'Goal saved — a faculty member will review it', ...(await roadmapFor(req.user.id)) });
    } catch (err) {
      console.error('roadmap.saveGoal error:', err);
      res.status(500).json({ message: 'Failed to save your goal' });
    }
  },

  // ── Staff ───────────────────────────────────────────────────────
  // GET /api/roadmap/goals?sessionId=&status=PENDING|ALL
  listGoals: async (req, res) => {
    try {
      if (!isStaff(req.user)) return res.status(403).json({ message: 'Not authorized' });
      const where = {};
      if (req.query.sessionId) where.academicSessionId = req.query.sessionId;
      if (String(req.query.status || 'PENDING').toUpperCase() !== 'ALL') {
        where.status = String(req.query.status || 'PENDING').toUpperCase();
      }
      const rows = await StudentGoal.findAll({
        where,
        include: [
          { model: User, as: 'Student', attributes: ['id', 'firstName', 'lastName', 'email', 'registrationNumber'] },
          { model: User, as: 'ApprovedByUser', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: AcademicSession, as: 'Session', attributes: ['id', 'name', 'endDate'] },
        ],
        order: [['createdAt', 'DESC']],
        limit: 1000,
      });
      res.json({
        canManage: isAdminish(req.user),
        goals: rows.map((g) => ({
          ...shapeGoal(g),
          targetDate: dayOnly(g.Session?.endDate) || shapeGoal(g).targetDate,
          studentId: g.userId,
          studentName: fullName(g.Student),
          studentEmail: g.Student?.email || '',
          registrationNumber: g.Student?.registrationNumber || '',
          sessionName: g.Session?.name || '',
        })),
      });
    } catch (err) {
      console.error('roadmap.listGoals error:', err);
      res.status(500).json({ message: 'Failed to load goals' });
    }
  },

  // POST /api/roadmap/goals/:id/decide — { decision, note }
  decideGoal: async (req, res) => {
    try {
      if (!isStaff(req.user)) return res.status(403).json({ message: 'Not authorized' });
      const decision = String(req.body.decision || '').toUpperCase();
      if (!['APPROVE', 'REJECT'].includes(decision)) {
        return res.status(400).json({ message: 'decision must be APPROVE or REJECT' });
      }
      const goal = await StudentGoal.findByPk(req.params.id);
      if (!goal) return res.status(404).json({ message: 'Goal not found' });
      await goal.update({
        status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        approvedBy: req.user.id,
        approvedAt: new Date(),
        decisionNote: req.body.note ? String(req.body.note).slice(0, 2000) : null,
      });
      res.json({
        message: decision === 'APPROVE'
          ? 'Goal approved — the timeline is now live for the student'
          : 'Goal sent back to the student',
      });
    } catch (err) {
      console.error('roadmap.decideGoal error:', err);
      res.status(500).json({ message: 'Failed to record the decision' });
    }
  },

  // PATCH /api/roadmap/goals/:id — admin/HOD/coordinator may correct a goal
  // or put an approved one back in front of the student.
  updateGoal: async (req, res) => {
    try {
      if (!isAdminish(req.user)) {
        return res.status(403).json({ message: 'Only an admin, HOD or coordinator can change a goal' });
      }
      const goal = await StudentGoal.findByPk(req.params.id);
      if (!goal) return res.status(404).json({ message: 'Goal not found' });

      const patch = {};
      if (req.body.title !== undefined) {
        const title = String(req.body.title).trim();
        if (!title) return res.status(400).json({ message: 'The goal cannot be empty' });
        patch.title = title.slice(0, 500);
      }
      if (req.body.answers && typeof req.body.answers === 'object') patch.answers = req.body.answers;
      if (req.body.status !== undefined) {
        const status = String(req.body.status).toUpperCase();
        if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
          return res.status(400).json({ message: 'status must be PENDING, APPROVED or REJECTED' });
        }
        patch.status = status;
        patch.approvedBy = req.user.id;
        patch.approvedAt = new Date();
      }
      if (req.body.note !== undefined) patch.decisionNote = req.body.note ? String(req.body.note).slice(0, 2000) : null;

      await goal.update(patch);
      res.json({ message: 'Goal updated', goal: shapeGoal(goal) });
    } catch (err) {
      console.error('roadmap.updateGoal error:', err);
      res.status(500).json({ message: 'Failed to update the goal' });
    }
  },

  // DELETE /api/roadmap/goals/:id — removes it and leaves the student a note,
  // so they open the roadmap to a clean setup and know why.
  deleteGoal: async (req, res) => {
    try {
      if (!isAdminish(req.user)) {
        return res.status(403).json({ message: 'Only an admin, HOD or coordinator can delete a goal' });
      }
      const goal = await StudentGoal.findByPk(req.params.id);
      if (!goal) return res.status(404).json({ message: 'Goal not found' });

      await RoadmapGoalNotice.create({
        userId: goal.userId,
        title: goal.title,
        reason: req.body?.reason ? String(req.body.reason).slice(0, 2000) : null,
        deletedBy: req.user.id,
      });
      await goal.destroy();
      res.json({ message: 'Goal removed — the student will be asked to set a new one' });
    } catch (err) {
      console.error('roadmap.deleteGoal error:', err);
      res.status(500).json({ message: 'Failed to delete the goal' });
    }
  },

  // POST /api/roadmap/notices/:id/ack — the student has read the note.
  acknowledgeNotice: async (req, res) => {
    try {
      const notice = await RoadmapGoalNotice.findByPk(req.params.id);
      if (!notice) return res.status(404).json({ message: 'Not found' });
      if (notice.userId !== req.user.id) return res.status(403).json({ message: 'Not yours' });
      await notice.update({ acknowledgedAt: new Date() });
      res.json({ message: 'Noted' });
    } catch (err) {
      console.error('roadmap.acknowledgeNotice error:', err);
      res.status(500).json({ message: 'Failed to update' });
    }
  },

  // GET /api/roadmap/students?sessionId= — staff overview of one session.
  listStudents: async (req, res) => {
    try {
      if (!isStaff(req.user)) return res.status(403).json({ message: 'Not authorized' });
      const { sessionId } = req.query;
      if (!sessionId) return res.status(400).json({ message: 'sessionId is required' });

      const rows = await StudentSession.findAll({
        where: { academicSessionId: sessionId },
        include: [
          { model: User, as: 'Student', attributes: ['id', 'firstName', 'lastName', 'email', 'registrationNumber'] },
          { model: SessionSection, as: 'Section', attributes: ['id', 'name'] },
        ],
      });
      const students = rows.filter((r) => r.Student);
      const ids = students.map((r) => r.Student.id);

      const goals = ids.length ? await StudentGoal.findAll({ where: { userId: { [Op.in]: ids } } }) : [];
      const goalBy = new Map(goals.map((g) => [g.userId, g]));
      const own = ids.length ? await StudentMilestone.findAll({ where: { userId: { [Op.in]: ids } } }) : [];
      const ownCount = new Map();
      own.forEach((m) => ownCount.set(m.userId, (ownCount.get(m.userId) || 0) + 1));

      const milestoneIds = (await RoadmapMilestone.findAll({
        where: { academicSessionId: sessionId }, attributes: ['id'],
      })).map((m) => m.id);
      const answered = milestoneIds.length && ids.length
        ? await RoadmapMilestoneResponse.findAll({
          where: { userId: { [Op.in]: ids }, milestoneId: { [Op.in]: milestoneIds } },
          attributes: ['userId'],
        })
        : [];
      const answeredCount = new Map();
      answered.forEach((r) => answeredCount.set(r.userId, (answeredCount.get(r.userId) || 0) + 1));

      res.json({
        milestoneCount: milestoneIds.length,
        students: students.map((r) => {
          const goal = goalBy.get(r.Student.id);
          return {
            id: r.Student.id,
            name: fullName(r.Student),
            email: r.Student.email,
            registrationNumber: r.Student.registrationNumber || '',
            sectionName: r.Section?.name || '',
            goalStatus: goal ? goal.status : 'NONE',
            goalTitle: goal ? goal.title : '',
            goalId: goal ? goal.id : null,
            selfMilestones: ownCount.get(r.Student.id) || 0,
            answered: answeredCount.get(r.Student.id) || 0,
          };
        }).sort((a, b) => a.name.localeCompare(b.name)),
      });
    } catch (err) {
      console.error('roadmap.listStudents error:', err);
      res.status(500).json({ message: 'Failed to load students' });
    }
  },

  // GET /api/roadmap/student/:userId — one student's roadmap, for staff.
  studentRoadmap: async (req, res) => {
    try {
      if (!isStaff(req.user)) return res.status(403).json({ message: 'Not authorized' });
      res.json(await roadmapFor(req.params.userId, { includeStudent: true }));
    } catch (err) {
      console.error('roadmap.studentRoadmap error:', err);
      res.status(500).json({ message: 'Failed to load the roadmap' });
    }
  },

  // ── Staff milestones ────────────────────────────────────────────
  // GET /api/roadmap/milestones?sessionId=
  listMilestones: async (req, res) => {
    try {
      if (!isStaff(req.user)) return res.status(403).json({ message: 'Not authorized' });
      const where = {};
      if (req.query.sessionId) where.academicSessionId = req.query.sessionId;
      const rows = await RoadmapMilestone.findAll({
        where,
        include: [
          { model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: AcademicSession, as: 'Session', attributes: ['id', 'name'] },
        ],
        order: [['dueDate', 'ASC']],
      });
      const counts = rows.length
        ? await RoadmapMilestoneResponse.findAll({
          where: { milestoneId: { [Op.in]: rows.map((r) => r.id) } },
          attributes: ['milestoneId'],
        })
        : [];
      const byId = new Map();
      counts.forEach((c) => byId.set(c.milestoneId, (byId.get(c.milestoneId) || 0) + 1));
      res.json({
        milestones: rows.map((m) => shapeMilestone(m, {
          sessionName: m.Session?.name || '',
          responseCount: byId.get(m.id) || 0,
          canEdit: isAdminish(req.user) || m.createdBy === req.user.id,
        })),
      });
    } catch (err) {
      console.error('roadmap.listMilestones error:', err);
      res.status(500).json({ message: 'Failed to load milestones' });
    }
  },

  // POST /api/roadmap/milestones
  createMilestone: async (req, res) => {
    try {
      if (!isStaff(req.user)) return res.status(403).json({ message: 'Not authorized' });
      const { academicSessionId, title, description, dueDate, icon } = req.body;
      if (!academicSessionId) return res.status(400).json({ message: 'Pick a session' });
      if (!title || !String(title).trim()) return res.status(400).json({ message: 'Title is required' });
      if (!dueDate) return res.status(400).json({ message: 'Pick a date' });
      const session = await AcademicSession.findByPk(academicSessionId);
      if (!session) return res.status(404).json({ message: 'Session not found' });

      const questions = Array.isArray(req.body.questions)
        ? req.body.questions
          .filter((q) => q && String(q.label || '').trim())
          .map((q, i) => ({
            id: String(q.id || `q${i + 1}`),
            label: String(q.label).trim().slice(0, 500),
            type: ['text', 'textarea', 'choice'].includes(q.type) ? q.type : 'textarea',
            options: Array.isArray(q.options) ? q.options.map((o) => String(o).slice(0, 200)).filter(Boolean) : [],
            required: !!q.required,
          }))
        : [];

      const m = await RoadmapMilestone.create({
        academicSessionId,
        title: String(title).trim().slice(0, 300),
        description: description ? String(description).slice(0, 4000) : null,
        dueDate: dayOnly(dueDate),
        icon: icon ? String(icon).slice(0, 40) : 'target',
        questions,
        createdBy: req.user.id,
      });
      res.status(201).json({ message: 'Milestone added to the timeline', milestone: shapeMilestone(m) });
    } catch (err) {
      console.error('roadmap.createMilestone error:', err);
      res.status(500).json({ message: 'Failed to add the milestone' });
    }
  },

  // PATCH /api/roadmap/milestones/:id
  updateMilestone: async (req, res) => {
    try {
      if (!isStaff(req.user)) return res.status(403).json({ message: 'Not authorized' });
      const m = await RoadmapMilestone.findByPk(req.params.id);
      if (!m) return res.status(404).json({ message: 'Milestone not found' });
      if (!isAdminish(req.user) && m.createdBy !== req.user.id) {
        return res.status(403).json({ message: 'Only whoever added this milestone, or an admin, can change it' });
      }
      const patch = {};
      if (req.body.title !== undefined) patch.title = String(req.body.title).trim().slice(0, 300);
      if (req.body.description !== undefined) patch.description = req.body.description ? String(req.body.description).slice(0, 4000) : null;
      if (req.body.dueDate !== undefined) patch.dueDate = dayOnly(req.body.dueDate);
      if (req.body.icon !== undefined) patch.icon = String(req.body.icon).slice(0, 40);
      if (Array.isArray(req.body.questions)) {
        patch.questions = req.body.questions
          .filter((q) => q && String(q.label || '').trim())
          .map((q, i) => ({
            id: String(q.id || `q${i + 1}`),
            label: String(q.label).trim().slice(0, 500),
            type: ['text', 'textarea', 'choice'].includes(q.type) ? q.type : 'textarea',
            options: Array.isArray(q.options) ? q.options.map((o) => String(o).slice(0, 200)).filter(Boolean) : [],
            required: !!q.required,
          }));
      }
      await m.update(patch);
      res.json({ message: 'Milestone updated', milestone: shapeMilestone(m) });
    } catch (err) {
      console.error('roadmap.updateMilestone error:', err);
      res.status(500).json({ message: 'Failed to update the milestone' });
    }
  },

  // DELETE /api/roadmap/milestones/:id — takes its answers with it.
  deleteMilestone: async (req, res) => {
    try {
      if (!isStaff(req.user)) return res.status(403).json({ message: 'Not authorized' });
      const m = await RoadmapMilestone.findByPk(req.params.id);
      if (!m) return res.status(404).json({ message: 'Milestone not found' });
      if (!isAdminish(req.user) && m.createdBy !== req.user.id) {
        return res.status(403).json({ message: 'Only whoever added this milestone, or an admin, can delete it' });
      }
      const answers = await RoadmapMilestoneResponse.destroy({ where: { milestoneId: m.id } });
      await m.destroy();
      res.json({ message: `Milestone removed${answers ? ` along with ${answers} response(s)` : ''}` });
    } catch (err) {
      console.error('roadmap.deleteMilestone error:', err);
      res.status(500).json({ message: 'Failed to delete the milestone' });
    }
  },

  // GET /api/roadmap/milestones/:id/responses — staff: who answered what.
  milestoneResponses: async (req, res) => {
    try {
      if (!isStaff(req.user)) return res.status(403).json({ message: 'Not authorized' });
      const m = await RoadmapMilestone.findByPk(req.params.id, {
        include: [{ model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      });
      if (!m) return res.status(404).json({ message: 'Milestone not found' });

      const enrolled = await StudentSession.findAll({
        where: { academicSessionId: m.academicSessionId },
        include: [{ model: User, as: 'Student', attributes: ['id', 'firstName', 'lastName', 'email', 'registrationNumber'] }],
      });
      const rows = await RoadmapMilestoneResponse.findAll({ where: { milestoneId: m.id } });
      const byUser = new Map(rows.map((r) => [r.userId, r]));

      const students = enrolled.filter((e) => e.Student).map((e) => {
        const r = byUser.get(e.Student.id);
        return {
          studentId: e.Student.id,
          name: fullName(e.Student),
          email: e.Student.email,
          registrationNumber: e.Student.registrationNumber || '',
          answered: !!r,
          answers: r ? shapeJson(r.answers, {}) : {},
          submittedAt: r ? r.submittedAt : null,
        };
      }).sort((a, b) => Number(b.answered) - Number(a.answered) || a.name.localeCompare(b.name));

      res.json({
        milestone: shapeMilestone(m),
        answeredCount: students.filter((s) => s.answered).length,
        totalStudents: students.length,
        students,
      });
    } catch (err) {
      console.error('roadmap.milestoneResponses error:', err);
      res.status(500).json({ message: 'Failed to load responses' });
    }
  },

  // POST /api/roadmap/milestones/:id/response — the student's own answers.
  saveMilestoneResponse: async (req, res) => {
    try {
      if (req.user.role !== 'STUDENT') return res.status(403).json({ message: 'Only a student can answer a milestone' });
      const m = await RoadmapMilestone.findByPk(req.params.id);
      if (!m) return res.status(404).json({ message: 'Milestone not found' });

      // It has to be a milestone on this student's own timeline.
      const session = await sessionFor(req.user.id);
      if (!session || session.id !== m.academicSessionId) {
        return res.status(403).json({ message: 'This milestone is not on your timeline' });
      }

      const questions = shapeJson(m.questions, []);
      const given = req.body.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
      const answers = {};
      for (const q of questions) {
        const value = given[q.id];
        if (q.required && !String(value || '').trim()) {
          return res.status(400).json({ message: `Please answer: ${q.label}` });
        }
        answers[q.id] = value === undefined || value === null ? '' : String(value).slice(0, 4000);
      }

      const existing = await RoadmapMilestoneResponse.findOne({ where: { milestoneId: m.id, userId: req.user.id } });
      if (existing) await existing.update({ answers, submittedAt: new Date() });
      else await RoadmapMilestoneResponse.create({ milestoneId: m.id, userId: req.user.id, answers, submittedAt: new Date() });

      res.json({ message: 'Saved' });
    } catch (err) {
      console.error('roadmap.saveMilestoneResponse error:', err);
      res.status(500).json({ message: 'Failed to save your answers' });
    }
  },

  // ── The student's own milestones ────────────────────────────────
  // POST /api/roadmap/self-milestones
  createSelfMilestone: async (req, res) => {
    try {
      if (req.user.role !== 'STUDENT') return res.status(403).json({ message: 'Only a student can add their own milestone' });
      const { title, description, date } = req.body;
      if (!title || !String(title).trim()) return res.status(400).json({ message: 'Give it a title' });
      if (!date) return res.status(400).json({ message: 'Pick a date' });
      const type = String(req.body.type || 'MILESTONE').toUpperCase() === 'ACHIEVEMENT' ? 'ACHIEVEMENT' : 'MILESTONE';
      const session = await sessionFor(req.user.id);
      const m = await StudentMilestone.create({
        userId: req.user.id,
        academicSessionId: session?.id || null,
        title: String(title).trim().slice(0, 300),
        description: description ? String(description).slice(0, 2000) : null,
        date: dayOnly(date),
        type,
      });
      res.status(201).json({ message: type === 'ACHIEVEMENT' ? 'Achievement added' : 'Milestone added', milestone: shapeSelf(m) });
    } catch (err) {
      console.error('roadmap.createSelfMilestone error:', err);
      res.status(500).json({ message: 'Failed to add it' });
    }
  },

  // PATCH /api/roadmap/self-milestones/:id — the student's own only.
  updateSelfMilestone: async (req, res) => {
    try {
      const m = await StudentMilestone.findByPk(req.params.id);
      if (!m) return res.status(404).json({ message: 'Not found' });
      if (m.userId !== req.user.id) return res.status(403).json({ message: 'This is not yours to change' });
      const patch = {};
      if (req.body.title !== undefined) patch.title = String(req.body.title).trim().slice(0, 300);
      if (req.body.description !== undefined) patch.description = req.body.description ? String(req.body.description).slice(0, 2000) : null;
      if (req.body.date !== undefined) patch.date = dayOnly(req.body.date);
      if (req.body.type !== undefined) patch.type = String(req.body.type).toUpperCase() === 'ACHIEVEMENT' ? 'ACHIEVEMENT' : 'MILESTONE';
      await m.update(patch);
      res.json({ message: 'Updated', milestone: shapeSelf(m) });
    } catch (err) {
      console.error('roadmap.updateSelfMilestone error:', err);
      res.status(500).json({ message: 'Failed to update it' });
    }
  },

  // DELETE /api/roadmap/self-milestones/:id
  deleteSelfMilestone: async (req, res) => {
    try {
      const m = await StudentMilestone.findByPk(req.params.id);
      if (!m) return res.status(404).json({ message: 'Not found' });
      if (m.userId !== req.user.id) return res.status(403).json({ message: 'This is not yours to delete' });
      await m.destroy();
      res.json({ message: 'Removed' });
    } catch (err) {
      console.error('roadmap.deleteSelfMilestone error:', err);
      res.status(500).json({ message: 'Failed to remove it' });
    }
  },

  // GET /api/roadmap/sessions — sessions to choose from (staff).
  listSessions: async (req, res) => {
    try {
      if (!isStaff(req.user)) return res.status(403).json({ message: 'Not authorized' });
      const rows = await AcademicSession.findAll({
        attributes: ['id', 'name', 'startDate', 'endDate', 'isActive'],
        order: [['isActive', 'DESC'], ['startDate', 'DESC']],
      });
      res.json({
        sessions: rows.map((s) => ({
          id: s.id,
          name: s.name,
          startDate: dayOnly(s.startDate),
          endDate: dayOnly(s.endDate),
          isActive: !!s.isActive,
        })),
      });
    } catch (err) {
      console.error('roadmap.listSessions error:', err);
      res.status(500).json({ message: 'Failed to load sessions' });
    }
  },
};

module.exports = roadmapController;
