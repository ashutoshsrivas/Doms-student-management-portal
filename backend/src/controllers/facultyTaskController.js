// Admin-assigned tasks for faculty / HOD / mentors / coordinators / trainers.
// - Admin creates, edits, deletes, reopens, and views everything.
// - Assignee sees their own tasks, marks them done, and can attach a
//   supporting document (uploaded to S3 via uploadToS3).

const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { FacultyTask, User, FacultyGroup, FacultyGroupMember, FacultyTaskUpdate } = require('../models');
const { uploadToS3, deleteFromS3 } = require('../utils/s3Upload');

// ADMIN is included so HOD can hand admins tasks too (and vice versa).
const ASSIGNABLE_ROLES = ['ADMIN', 'HOD', 'FACULTY', 'CHAIR_HEAD', 'COORDINATOR', 'PLACEMENT_COORDINATOR', 'TRAINER', 'MENTOR'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const sanitiseTitle = (s) => (s || '').toString().trim().slice(0, 250);
const sanitiseText = (s, max = 5000) => (s == null ? null : String(s).slice(0, max));
const sanitisePriority = (p) => (PRIORITIES.includes(p) ? p : 'MEDIUM');

function canViewTask(user, task) {
  if (!user) return false;
  if (user.role === 'ADMIN' || user.role === 'HOD') return true;
  return task.assigneeId === user.id;
}

// === Accuracy scoring (delta-based, credit-score style) ===================
// Every faculty starts at a base of 100. Each live task contributes a delta:
//   completed on time  -> +5
//   ≤1 day late        -> +1
//   ≤7 days late       -> -1
//   >7 days late       -> -3
//   overdue & pending  -> -5
//   not-yet-due pending -> 0 (no effect yet)
// Floor at 0, no ceiling (a high performer can exceed 100%). Because only
// live (non-deleted) rows are fetched, deleting a task naturally removes
// its contribution on the next call.
const MS_PER_DAY = 86400000;
const SCORE_DELTAS = {
  onTime: 5,
  late1: 1,
  late7: -1,
  lateMore: -3,
  overdue: -5,
};
const SCORE_BASE = 100;

function computeAccuracy(tasks, now = Date.now()) {
  let score = SCORE_BASE;
  const breakdown = { onTime: 0, late1: 0, late7: 0, lateMore: 0, overdue: 0, notDueYet: 0 };
  for (const t of tasks) {
    if (t.status === 'COMPLETED') {
      const hasDeadline = !!t.deadline;
      if (!hasDeadline) { score += SCORE_DELTAS.onTime; breakdown.onTime += 1; continue; }
      const lateMs = new Date(t.completedAt).getTime() - new Date(t.deadline).getTime();
      if (lateMs <= 0) { score += SCORE_DELTAS.onTime; breakdown.onTime += 1; }
      else {
        const d = lateMs / MS_PER_DAY;
        if (d <= 1) { score += SCORE_DELTAS.late1; breakdown.late1 += 1; }
        else if (d <= 7) { score += SCORE_DELTAS.late7; breakdown.late7 += 1; }
        else { score += SCORE_DELTAS.lateMore; breakdown.lateMore += 1; }
      }
    } else {
      if (t.deadline && new Date(t.deadline).getTime() < now) {
        score += SCORE_DELTAS.overdue;
        breakdown.overdue += 1;
      } else {
        breakdown.notDueYet += 1;
      }
    }
  }
  return {
    percentage: Math.max(0, score),
    base: SCORE_BASE,
    deltas: SCORE_DELTAS,
    evaluable: tasks.length,
    sampleSize: tasks.length,
    breakdown,
  };
}

const facultyTaskController = {
  // POST /api/faculty-tasks  (ADMIN)
  // body: { assigneeId, title, description?, deadline? }
  create: async (req, res) => {
    try {
      const { assigneeId, title, description, deadline, priority } = req.body || {};
      const cleanTitle = sanitiseTitle(title);
      if (!assigneeId || !cleanTitle) {
        return res.status(400).json({ message: 'assigneeId and title are required' });
      }

      const assignee = await User.findByPk(assigneeId);
      if (!assignee) return res.status(404).json({ message: 'Assignee not found' });
      if (!ASSIGNABLE_ROLES.includes(assignee.approvedRole)) {
        return res.status(400).json({
          message: `Tasks can only be assigned to ${ASSIGNABLE_ROLES.join(', ')} accounts`,
        });
      }

      const task = await FacultyTask.create({
        assigneeId,
        assignedBy: req.user.id,
        title: cleanTitle,
        description: sanitiseText(description, 5000),
        deadline: deadline ? new Date(deadline) : null,
        priority: sanitisePriority(priority),
      });

      const created = await FacultyTask.findByPk(task.id, {
        include: [
          { model: User, as: 'Assignee', attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole'] },
          { model: User, as: 'Assigner', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'Remarker', attributes: ['id', 'firstName', 'lastName', 'email'] },
        ],
      });

      res.status(201).json({ task: created });
    } catch (error) {
      console.error('FacultyTask create error:', error);
      res.status(500).json({ message: 'Failed to create task' });
    }
  },

  // GET /api/faculty-tasks
  // ADMIN: all tasks (optional ?assigneeId, ?status filter).
  // Non-admin: only their own assigned tasks.
  list: async (req, res) => {
    try {
      const { assigneeId, status } = req.query;
      const where = {};
      if (req.user.role === 'ADMIN' || req.user.role === 'HOD') {
        if (assigneeId) where.assigneeId = String(assigneeId);
      } else {
        where.assigneeId = req.user.id;
      }
      if (status === 'PENDING' || status === 'COMPLETED') {
        where.status = status;
      }

      const tasks = await FacultyTask.findAll({
        where,
        include: [
          { model: User, as: 'Assignee', attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole', 'department'] },
          { model: User, as: 'Assigner', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'Remarker', attributes: ['id', 'firstName', 'lastName', 'email'] },
        ],
        order: [
          ['status', 'ASC'],   // PENDING < COMPLETED alphabetically — pending first
          ['priority', 'DESC'], // URGENT > MEDIUM > LOW alphabetically — bubble up urgent
          ['deadline', 'ASC'],
          ['createdAt', 'DESC'],
        ],
      });

      res.json({ tasks });
    } catch (error) {
      console.error('FacultyTask list error:', error);
      res.status(500).json({ message: 'Failed to list tasks' });
    }
  },

  // GET /api/faculty-tasks/summary  (ADMIN)
  // For each assignable user, returns pendingCount and completedCount.
  // Useful for the left-pane facilty list on the admin page.
  summary: async (req, res) => {
    try {
      const users = await User.findAll({
        where: {
          approvedRole: { [Op.in]: ASSIGNABLE_ROLES },
          status: 'ACTIVE',
        },
        attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole', 'department'],
        order: [['firstName', 'ASC']],
      });

      const tasks = await FacultyTask.findAll({
        attributes: ['assigneeId', 'status', 'deadline', 'completedAt', 'submittedLate'],
      });

      const now = Date.now();
      const map = new Map();
      const taskBuckets = new Map();
      for (const u of users) {
        map.set(u.id, {
          user: u.toJSON(),
          pendingCount: 0,
          completedCount: 0,
          overdueCount: 0,
          lateSubmittedCount: 0,
          accuracy: null,
        });
        taskBuckets.set(u.id, []);
      }
      for (const t of tasks) {
        const row = map.get(t.assigneeId);
        if (!row) continue;
        taskBuckets.get(t.assigneeId).push(t);
        if (t.status === 'COMPLETED') {
          row.completedCount += 1;
          if (t.submittedLate) row.lateSubmittedCount += 1;
        } else {
          row.pendingCount += 1;
          if (t.deadline && new Date(t.deadline).getTime() < now) row.overdueCount += 1;
        }
      }
      // Attach accuracy per-faculty using the shared scoring helper
      for (const [uid, row] of map.entries()) {
        const { percentage, evaluable } = computeAccuracy(taskBuckets.get(uid) || []);
        row.accuracy = percentage;
        row.evaluableCount = evaluable;
      }

      res.json({ faculty: Array.from(map.values()) });
    } catch (error) {
      console.error('FacultyTask summary error:', error);
      res.status(500).json({ message: 'Failed to load summary' });
    }
  },

  // GET /api/faculty-tasks/:id
  get: async (req, res) => {
    try {
      const task = await FacultyTask.findByPk(req.params.id, {
        include: [
          { model: User, as: 'Assignee', attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole', 'department'] },
          { model: User, as: 'Assigner', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'Remarker', attributes: ['id', 'firstName', 'lastName', 'email'] },
        ],
      });
      if (!task) return res.status(404).json({ message: 'Task not found' });
      if (!canViewTask(req.user, task)) return res.status(403).json({ message: 'Forbidden' });
      res.json({ task });
    } catch (error) {
      console.error('FacultyTask get error:', error);
      res.status(500).json({ message: 'Failed to load task' });
    }
  },

  // PATCH /api/faculty-tasks/:id  (ADMIN)
  // Body can include title, description, deadline, status (admin can reopen).
  update: async (req, res) => {
    try {
      const task = await FacultyTask.findByPk(req.params.id);
      if (!task) return res.status(404).json({ message: 'Task not found' });

      const patch = {};
      if (req.body.title !== undefined) patch.title = sanitiseTitle(req.body.title);
      if (req.body.description !== undefined) patch.description = sanitiseText(req.body.description, 5000);
      if (req.body.deadline !== undefined) patch.deadline = req.body.deadline ? new Date(req.body.deadline) : null;
      if (req.body.priority !== undefined) patch.priority = sanitisePriority(req.body.priority);
      if (req.body.status !== undefined) {
        if (!['PENDING', 'COMPLETED'].includes(req.body.status)) {
          return res.status(400).json({ message: 'Invalid status' });
        }
        patch.status = req.body.status;
        patch.completedAt = req.body.status === 'COMPLETED' ? new Date() : null;
      }
      if (patch.title === '') return res.status(400).json({ message: 'Title cannot be empty' });

      await task.update(patch);

      const updated = await FacultyTask.findByPk(task.id, {
        include: [
          { model: User, as: 'Assignee', attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole'] },
          { model: User, as: 'Assigner', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'Remarker', attributes: ['id', 'firstName', 'lastName', 'email'] },
        ],
      });
      res.json({ task: updated });
    } catch (error) {
      console.error('FacultyTask update error:', error);
      res.status(500).json({ message: 'Failed to update task' });
    }
  },

  // PATCH /api/faculty-tasks/:id/complete
  // Multipart-aware: optional `document` file. Assignee or admin may call.
  // Idempotent — if already COMPLETED, just refresh the document if a new
  // one is uploaded.
  complete: async (req, res) => {
    try {
      const task = await FacultyTask.findByPk(req.params.id);
      if (!task) return res.status(404).json({ message: 'Task not found' });

      if (!['ADMIN', 'HOD'].includes(req.user.role) && task.assigneeId !== req.user.id) {
        return res.status(403).json({ message: 'Only the assignee or an admin can complete this task' });
      }

      const patch = { status: 'COMPLETED' };
      const now = new Date();
      if (task.status !== 'COMPLETED') {
        patch.completedAt = now;
        // Set submittedLate if there's a deadline and we're past it.
        patch.submittedLate = !!(task.deadline && now.getTime() > new Date(task.deadline).getTime());
      }

      if (req.file) {
        try {
          // Delete previous doc (if any) before uploading the new one
          if (task.documentUrl) {
            try { await deleteFromS3(task.documentUrl); } catch (e) { /* best effort */ }
          }
          const url = await uploadToS3(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            'faculty-tasks',
          );
          patch.documentUrl = url;
          patch.documentName = req.file.originalname;
          patch.documentMime = req.file.mimetype;
        } catch (e) {
          console.error('FacultyTask upload error:', e);
          return res.status(500).json({ message: 'Failed to upload document' });
        }
      }

      await task.update(patch);

      // If this is a shared-completion (group) task, propagate to all siblings.
      // The submittedLate flag is computed per-sibling using each one's own
      // deadline (in practice they share the same deadline, but compute it
      // safely anyway).
      if (task.sharedCompletion && task.groupTaskId) {
        const siblings = await FacultyTask.findAll({
          where: { groupTaskId: task.groupTaskId, id: { [Op.ne]: task.id } },
        });
        for (const s of siblings) {
          const sPatch = {
            status: 'COMPLETED',
            completedAt: patch.completedAt || s.completedAt || now,
          };
          if (patch.documentUrl) {
            sPatch.documentUrl = patch.documentUrl;
            sPatch.documentName = patch.documentName;
            sPatch.documentMime = patch.documentMime;
          }
          sPatch.submittedLate = !!(s.deadline && sPatch.completedAt.getTime?.() > new Date(s.deadline).getTime());
          await s.update(sPatch);
        }
      }

      const updated = await FacultyTask.findByPk(task.id, {
        include: [
          { model: User, as: 'Assignee', attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole'] },
          { model: User, as: 'Assigner', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'Remarker', attributes: ['id', 'firstName', 'lastName', 'email'] },
        ],
      });
      res.json({ task: updated });
    } catch (error) {
      console.error('FacultyTask complete error:', error);
      res.status(500).json({ message: 'Failed to complete task' });
    }
  },

  // PATCH /api/faculty-tasks/:id/reopen  (ADMIN)
  reopen: async (req, res) => {
    try {
      const task = await FacultyTask.findByPk(req.params.id);
      if (!task) return res.status(404).json({ message: 'Task not found' });
      await task.update({ status: 'PENDING', completedAt: null, submittedLate: false });
      // Cascade to siblings if shared
      if (task.sharedCompletion && task.groupTaskId) {
        await FacultyTask.update(
          { status: 'PENDING', completedAt: null, submittedLate: false },
          { where: { groupTaskId: task.groupTaskId, id: { [Op.ne]: task.id } } },
        );
      }
      res.json({ task });
    } catch (error) {
      console.error('FacultyTask reopen error:', error);
      res.status(500).json({ message: 'Failed to reopen task' });
    }
  },

  // PATCH /api/faculty-tasks/:id/remark  (ADMIN)
  // Body: { remark } — pass null/empty string to clear.
  setRemark: async (req, res) => {
    try {
      const task = await FacultyTask.findByPk(req.params.id);
      if (!task) return res.status(404).json({ message: 'Task not found' });
      const incoming = req.body?.remark;
      const trimmed = incoming == null ? '' : String(incoming).trim();
      if (trimmed) {
        await task.update({
          adminRemark: trimmed.slice(0, 5000),
          remarkedAt: new Date(),
          remarkedBy: req.user.id,
        });
      } else {
        // Clear the remark
        await task.update({ adminRemark: null, remarkedAt: null, remarkedBy: null });
      }
      const updated = await FacultyTask.findByPk(task.id, {
        include: [
          { model: User, as: 'Assignee', attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole'] },
          { model: User, as: 'Assigner', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'Remarker', attributes: ['id', 'firstName', 'lastName', 'email'] },
        ],
      });
      res.json({ task: updated });
    } catch (error) {
      console.error('FacultyTask setRemark error:', error);
      res.status(500).json({ message: 'Failed to save remark' });
    }
  },

  // GET /api/faculty-tasks/report  (ADMIN)
  // Returns a ReportPayload-shaped JSON: { meta, columns, rows }
  // The frontend pipes this through exportToExcel / exportToPDF from
  // app/lib/reportExports.ts — same pattern as /api/reports/*.
  report: async (req, res) => {
    try {
      const tasks = await FacultyTask.findAll({
        include: [
          { model: User, as: 'Assignee', attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole', 'department'] },
          { model: User, as: 'Assigner', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'Remarker', attributes: ['id', 'firstName', 'lastName', 'email'] },
        ],
        order: [
          ['status', 'ASC'],
          ['priority', 'DESC'],
          ['deadline', 'ASC'],
          ['createdAt', 'DESC'],
        ],
      });

      const now = Date.now();
      const fullName = (u) => (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email : '');
      const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 19).replace('T', ' ') : '');

      const rows = tasks.map((t) => {
        const overdue = t.status !== 'COMPLETED' && t.deadline && new Date(t.deadline).getTime() < now;
        return {
          title: t.title,
          priority: t.priority,
          assignee: fullName(t.Assignee),
          assigneeEmail: t.Assignee?.email || '',
          assigneeRole: t.Assignee?.approvedRole || '',
          assigneeDepartment: t.Assignee?.department || '',
          assignedBy: fullName(t.Assigner),
          assignedAt: fmtDate(t.createdAt),
          deadline: fmtDate(t.deadline),
          status: overdue ? 'OVERDUE' : t.status,
          lateSubmission: t.submittedLate ? 'YES' : '',
          taskType: t.sharedCompletion ? 'GROUP-SHARED' : (t.groupTaskId ? 'GROUP-COPY' : 'INDIVIDUAL'),
          completedAt: fmtDate(t.completedAt),
          daysToComplete: t.completedAt && t.createdAt
            ? Math.round((new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()) / 86400000)
            : '',
          submissionDocument: t.documentName || '',
          submissionUrl: t.documentUrl || '',
          adminRemark: t.adminRemark || '',
          remarkedBy: fullName(t.Remarker),
          remarkedAt: fmtDate(t.remarkedAt),
          description: t.description || '',
        };
      });

      const payload = {
        meta: {
          reportType: 'faculty-tasks',
          title: 'Faculty Tasks Report',
          session: null,
          generatedAt: new Date().toISOString(),
          generatedBy: req.user?.email || 'admin',
          rowCount: rows.length,
        },
        columns: [
          { key: 'title', label: 'Title' },
          { key: 'priority', label: 'Priority' },
          { key: 'taskType', label: 'Type' },
          { key: 'status', label: 'Status' },
          { key: 'lateSubmission', label: 'Late?' },
          { key: 'assignee', label: 'Assignee' },
          { key: 'assigneeEmail', label: 'Email' },
          { key: 'assigneeRole', label: 'Role' },
          { key: 'assigneeDepartment', label: 'Department' },
          { key: 'assignedBy', label: 'Assigned By' },
          { key: 'assignedAt', label: 'Assigned At' },
          { key: 'deadline', label: 'Deadline' },
          { key: 'completedAt', label: 'Completed At' },
          { key: 'daysToComplete', label: 'Days To Complete' },
          { key: 'submissionDocument', label: 'Submission Document' },
          { key: 'submissionUrl', label: 'Submission URL' },
          { key: 'adminRemark', label: 'Admin Remark' },
          { key: 'remarkedBy', label: 'Remarked By' },
          { key: 'remarkedAt', label: 'Remarked At' },
          { key: 'description', label: 'Description' },
        ],
        rows,
      };

      res.json(payload);
    } catch (error) {
      console.error('FacultyTask report error:', error);
      res.status(500).json({ message: 'Failed to generate report' });
    }
  },

  // DELETE /api/faculty-tasks/:id  (ADMIN)
  // For SHARED tasks: deleting one row deletes ALL sibling rows (per user
  // choice: "delete from everyone"). For INDIVIDUAL: only this row.
  remove: async (req, res) => {
    try {
      const task = await FacultyTask.findByPk(req.params.id);
      if (!task) return res.status(404).json({ message: 'Task not found' });

      const siblings = task.sharedCompletion && task.groupTaskId
        ? await FacultyTask.findAll({ where: { groupTaskId: task.groupTaskId } })
        : [task];

      // Best-effort: delete uploaded documents from S3 before removing rows.
      for (const s of siblings) {
        if (s.documentUrl) {
          try { await deleteFromS3(s.documentUrl); } catch (e) { /* best effort */ }
        }
      }
      await FacultyTask.destroy({ where: { id: { [Op.in]: siblings.map((s) => s.id) } } });
      res.json({ message: 'Task deleted', deletedCount: siblings.length, shared: task.sharedCompletion });
    } catch (error) {
      console.error('FacultyTask delete error:', error);
      res.status(500).json({ message: 'Failed to delete task' });
    }
  },

  // POST /api/faculty-tasks/bulk  (ADMIN)
  // body: {
  //   assigneeIds: string[],            // direct user ids
  //   groupIds:    string[],            // expand to group members
  //   mode: 'INDIVIDUAL' | 'SHARED',    // default INDIVIDUAL
  //   title, description?, deadline?, priority?
  // }
  // INDIVIDUAL: creates N independent rows (no group_task_id).
  // SHARED: creates N rows sharing one new group_task_id, sharedCompletion=true.
  bulkCreate: async (req, res) => {
    try {
      const cleanTitle = sanitiseTitle(req.body?.title);
      if (!cleanTitle) return res.status(400).json({ message: 'title is required' });
      const mode = req.body?.mode === 'SHARED' ? 'SHARED' : 'INDIVIDUAL';
      const direct = Array.isArray(req.body?.assigneeIds) ? req.body.assigneeIds : [];
      const groups = Array.isArray(req.body?.groupIds) ? req.body.groupIds : [];

      // Resolve members of each requested group
      let groupMemberIds = [];
      if (groups.length) {
        const members = await FacultyGroupMember.findAll({
          where: { groupId: { [Op.in]: groups } },
          attributes: ['userId'],
        });
        groupMemberIds = members.map((m) => m.userId);
      }

      // Dedupe + validate role
      const allIds = Array.from(new Set([...direct, ...groupMemberIds]));
      if (allIds.length === 0) return res.status(400).json({ message: 'No assignees resolved' });

      const validUsers = await User.findAll({
        where: {
          id: { [Op.in]: allIds },
          approvedRole: { [Op.in]: ASSIGNABLE_ROLES },
          status: 'ACTIVE',
        },
        attributes: ['id', 'approvedRole'],
      });
      if (validUsers.length === 0) {
        return res.status(400).json({ message: `No valid assignees (must be ${ASSIGNABLE_ROLES.join(', ')} and ACTIVE)` });
      }

      const groupTaskId = mode === 'SHARED' ? crypto.randomUUID() : null;
      const sharedCompletion = mode === 'SHARED';
      const baseRow = {
        assignedBy: req.user.id,
        title: cleanTitle,
        description: sanitiseText(req.body?.description, 5000),
        deadline: req.body?.deadline ? new Date(req.body.deadline) : null,
        priority: sanitisePriority(req.body?.priority),
        groupTaskId,
        sharedCompletion,
      };

      const rows = validUsers.map((u) => ({ ...baseRow, assigneeId: u.id }));
      const created = await FacultyTask.bulkCreate(rows);
      res.status(201).json({
        created: created.length,
        mode,
        groupTaskId,
        skipped: allIds.length - validUsers.length,
      });
    } catch (error) {
      console.error('FacultyTask bulkCreate error:', error);
      res.status(500).json({ message: 'Failed to create bulk tasks' });
    }
  },

  // GET /api/faculty-tasks/accuracy?userId=X  (any authenticated user; non-admin
  //   may only query their own id)
  // Returns: { userId, percentage, evaluable, sampleSize, breakdown: {...} }
  accuracy: async (req, res) => {
    try {
      const requestedId = (req.query.userId || req.user.id).toString();
      if (!['ADMIN', 'HOD'].includes(req.user.role) && requestedId !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const tasks = await FacultyTask.findAll({
        where: { assigneeId: requestedId },
        attributes: ['id', 'status', 'deadline', 'completedAt', 'submittedLate'],
      });
      const result = computeAccuracy(tasks);

      // Breakdown for transparency / UI explanation
      const now = Date.now();
      const breakdown = {
        completedOnTime: 0,
        completedLate1: 0,   // ≤1 day
        completedLate7: 0,   // ≤7 days
        completedLateMore: 0,
        overduePending: 0,
        notDueYet: 0,
      };
      for (const t of tasks) {
        if (t.status === 'COMPLETED') {
          if (!t.deadline) { breakdown.completedOnTime += 1; continue; }
          const lateMs = new Date(t.completedAt).getTime() - new Date(t.deadline).getTime();
          if (lateMs <= 0) breakdown.completedOnTime += 1;
          else {
            const d = lateMs / 86400000;
            if (d <= 1) breakdown.completedLate1 += 1;
            else if (d <= 7) breakdown.completedLate7 += 1;
            else breakdown.completedLateMore += 1;
          }
        } else {
          if (t.deadline && new Date(t.deadline).getTime() < now) breakdown.overduePending += 1;
          else breakdown.notDueYet += 1;
        }
      }
      res.json({ userId: requestedId, ...result, breakdown });
    } catch (error) {
      console.error('FacultyTask accuracy error:', error);
      res.status(500).json({ message: 'Failed to compute accuracy' });
    }
  },

  // === TRAIL / UPDATES =====================================================
  // GET /api/faculty-tasks/:id/updates  (assignee or admin)
  listUpdates: async (req, res) => {
    try {
      const task = await FacultyTask.findByPk(req.params.id);
      if (!task) return res.status(404).json({ message: 'Task not found' });
      if (!canViewTask(req.user, task)) return res.status(403).json({ message: 'Forbidden' });
      const updates = await FacultyTaskUpdate.findAll({
        where: { taskId: task.id },
        order: [['createdAt', 'ASC']],
        include: [{ model: User, as: 'Author', attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole'] }],
      });
      res.json({ updates });
    } catch (error) {
      console.error('FacultyTask listUpdates error:', error);
      res.status(500).json({ message: 'Failed to load updates' });
    }
  },

  // POST /api/faculty-tasks/:id/updates  { message }
  postUpdate: async (req, res) => {
    try {
      const task = await FacultyTask.findByPk(req.params.id);
      if (!task) return res.status(404).json({ message: 'Task not found' });
      if (!canViewTask(req.user, task)) return res.status(403).json({ message: 'Forbidden' });
      const message = (req.body?.message || '').toString().trim();
      if (!message) return res.status(400).json({ message: 'message is required' });
      const row = await FacultyTaskUpdate.create({
        taskId: task.id,
        userId: req.user.id,
        message: message.slice(0, 4000),
        kind: 'USER',
      });
      // For shared-completion tasks, mirror the update to siblings so every
      // member of the group sees the same conversation thread.
      if (task.sharedCompletion && task.groupTaskId) {
        const siblings = await FacultyTask.findAll({
          where: { groupTaskId: task.groupTaskId, id: { [Op.ne]: task.id } },
          attributes: ['id'],
        });
        if (siblings.length) {
          await FacultyTaskUpdate.bulkCreate(siblings.map((s) => ({
            taskId: s.id, userId: req.user.id, message: message.slice(0, 4000), kind: 'USER',
          })));
        }
      }
      const created = await FacultyTaskUpdate.findByPk(row.id, {
        include: [{ model: User, as: 'Author', attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole'] }],
      });
      res.status(201).json({ update: created });
    } catch (error) {
      console.error('FacultyTask postUpdate error:', error);
      res.status(500).json({ message: 'Failed to post update' });
    }
  },

  // DELETE /api/faculty-tasks/updates/:updateId  (author or admin)
  removeUpdate: async (req, res) => {
    try {
      const row = await FacultyTaskUpdate.findByPk(req.params.updateId);
      if (!row) return res.status(404).json({ message: 'Update not found' });
      if (!['ADMIN', 'HOD'].includes(req.user.role) && row.userId !== req.user.id) {
        return res.status(403).json({ message: 'Only the author or an admin can delete this' });
      }
      await row.destroy();
      res.json({ message: 'Update deleted', id: req.params.updateId });
    } catch (error) {
      console.error('FacultyTask removeUpdate error:', error);
      res.status(500).json({ message: 'Failed to delete update' });
    }
  },

  // === EXTENSION REQUESTS =================================================
  // POST /api/faculty-tasks/:id/extension  (assignee only)
  // body: { requestedDeadline (ISO string), reason? }
  // Only one PENDING request at a time. Cascades to siblings for shared.
  requestExtension: async (req, res) => {
    try {
      const task = await FacultyTask.findByPk(req.params.id);
      if (!task) return res.status(404).json({ message: 'Task not found' });
      if (task.assigneeId !== req.user.id && !['ADMIN', 'HOD'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Only the assignee can request extension' });
      }
      if (task.status === 'COMPLETED') {
        return res.status(400).json({ message: 'Task is already completed' });
      }
      if (task.extensionStatus === 'PENDING') {
        return res.status(400).json({ message: 'An extension request is already pending for this task' });
      }
      const requestedDeadline = req.body?.requestedDeadline ? new Date(req.body.requestedDeadline) : null;
      if (!requestedDeadline || isNaN(requestedDeadline.getTime())) {
        return res.status(400).json({ message: 'requestedDeadline is required' });
      }
      const reason = sanitiseText(req.body?.reason, 2000);

      const patch = {
        extensionStatus: 'PENDING',
        extensionRequestedDeadline: requestedDeadline,
        extensionRequestReason: reason,
        extensionRequestedAt: new Date(),
        extensionRespondedBy: null,
        extensionRespondedAt: null,
        extensionResponseReason: null,
      };
      await task.update(patch);
      // Cascade for shared
      if (task.sharedCompletion && task.groupTaskId) {
        await FacultyTask.update(patch, {
          where: { groupTaskId: task.groupTaskId, id: { [Op.ne]: task.id } },
        });
      }
      // System trail entry
      await FacultyTaskUpdate.create({
        taskId: task.id,
        userId: req.user.id,
        kind: 'SYSTEM',
        message: `Extension requested to ${requestedDeadline.toISOString().slice(0, 16).replace('T', ' ')}${reason ? ` — "${reason.slice(0, 200)}"` : ''}`,
      });
      res.json({ message: 'Extension requested' });
    } catch (error) {
      console.error('FacultyTask requestExtension error:', error);
      res.status(500).json({ message: 'Failed to request extension' });
    }
  },

  // PATCH /api/faculty-tasks/:id/extension  (ADMIN)
  // body: { decision: 'APPROVE' | 'REJECT', responseReason? }
  // APPROVE: copy extensionRequestedDeadline -> deadline, clear request fields,
  // status -> APPROVED. REJECT: keep records, status -> REJECTED.
  respondExtension: async (req, res) => {
    try {
      const task = await FacultyTask.findByPk(req.params.id);
      if (!task) return res.status(404).json({ message: 'Task not found' });
      if (task.extensionStatus !== 'PENDING') {
        return res.status(400).json({ message: 'No pending extension request' });
      }
      const decision = req.body?.decision;
      if (decision !== 'APPROVE' && decision !== 'REJECT') {
        return res.status(400).json({ message: 'decision must be APPROVE or REJECT' });
      }
      const responseReason = sanitiseText(req.body?.responseReason, 2000);
      const now = new Date();
      const requested = task.extensionRequestedDeadline;

      const patch = {
        extensionStatus: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        extensionRespondedBy: req.user.id,
        extensionRespondedAt: now,
        extensionResponseReason: responseReason,
      };
      if (decision === 'APPROVE') {
        patch.deadline = requested;
        // submittedLate flag — if task is still pending, no change; only set on completion
      }
      await task.update(patch);
      // Cascade for shared
      if (task.sharedCompletion && task.groupTaskId) {
        const sibPatch = { ...patch };
        await FacultyTask.update(sibPatch, {
          where: { groupTaskId: task.groupTaskId, id: { [Op.ne]: task.id } },
        });
      }
      // System trail
      await FacultyTaskUpdate.create({
        taskId: task.id,
        userId: req.user.id,
        kind: 'SYSTEM',
        message: decision === 'APPROVE'
          ? `Extension APPROVED — new deadline ${requested.toISOString().slice(0, 16).replace('T', ' ')}${responseReason ? ` — "${responseReason.slice(0, 200)}"` : ''}`
          : `Extension REJECTED${responseReason ? ` — "${responseReason.slice(0, 200)}"` : ''}`,
      });
      res.json({ message: `Extension ${decision === 'APPROVE' ? 'approved' : 'rejected'}` });
    } catch (error) {
      console.error('FacultyTask respondExtension error:', error);
      res.status(500).json({ message: 'Failed to respond to extension' });
    }
  },

  // DELETE /api/faculty-tasks/:id/extension  (assignee cancels own pending)
  cancelExtension: async (req, res) => {
    try {
      const task = await FacultyTask.findByPk(req.params.id);
      if (!task) return res.status(404).json({ message: 'Task not found' });
      if (task.assigneeId !== req.user.id && !['ADMIN', 'HOD'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      if (task.extensionStatus !== 'PENDING') {
        return res.status(400).json({ message: 'No pending extension to cancel' });
      }
      const patch = {
        extensionStatus: null,
        extensionRequestedDeadline: null,
        extensionRequestReason: null,
        extensionRequestedAt: null,
      };
      await task.update(patch);
      if (task.sharedCompletion && task.groupTaskId) {
        await FacultyTask.update(patch, {
          where: { groupTaskId: task.groupTaskId, id: { [Op.ne]: task.id } },
        });
      }
      await FacultyTaskUpdate.create({
        taskId: task.id,
        userId: req.user.id,
        kind: 'SYSTEM',
        message: 'Extension request cancelled',
      });
      res.json({ message: 'Extension request cancelled' });
    } catch (error) {
      console.error('FacultyTask cancelExtension error:', error);
      res.status(500).json({ message: 'Failed to cancel extension' });
    }
  },

  // === PENDING QUEUE (ADMIN) ==============================================
  // GET /api/faculty-tasks/pending-queue
  // Returns all PENDING tasks bucketed: today / overdue / upcoming / undated
  // sorted by priority desc within each bucket.
  pendingQueue: async (req, res) => {
    try {
      const tasks = await FacultyTask.findAll({
        where: { status: 'PENDING' },
        include: [
          { model: User, as: 'Assignee', attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole', 'department'] },
          { model: User, as: 'Assigner', attributes: ['id', 'firstName', 'lastName', 'email'] },
        ],
      });

      // Priority rank for sort (higher = first)
      const pRank = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const endOfToday = startOfToday + MS_PER_DAY;

      const buckets = { overdue: [], today: [], upcoming: [], undated: [] };
      for (const t of tasks) {
        if (!t.deadline) buckets.undated.push(t);
        else {
          const d = new Date(t.deadline).getTime();
          if (d < startOfToday) buckets.overdue.push(t);
          else if (d < endOfToday) buckets.today.push(t);
          else buckets.upcoming.push(t);
        }
      }
      // Within each bucket: priority desc, then deadline asc (sooner first)
      const sortFn = (a, b) => {
        const pr = (pRank[b.priority] || 0) - (pRank[a.priority] || 0);
        if (pr !== 0) return pr;
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      };
      buckets.overdue.sort(sortFn);
      buckets.today.sort(sortFn);
      buckets.upcoming.sort(sortFn);
      buckets.undated.sort(sortFn);

      res.json({
        buckets,
        counts: {
          overdue: buckets.overdue.length,
          today: buckets.today.length,
          upcoming: buckets.upcoming.length,
          undated: buckets.undated.length,
          total: tasks.length,
        },
      });
    } catch (error) {
      console.error('FacultyTask pendingQueue error:', error);
      res.status(500).json({ message: 'Failed to load pending queue' });
    }
  },

  // === PERFORMANCE REPORT (ADMIN) =========================================
  // GET /api/faculty-tasks/performance-report?start=ISO&end=ISO&facultyId=optional
  // Returns per-faculty rows with their tasks + computed score in the range.
  // "In range" = task's createdAt within [start, end).
  performanceReport: async (req, res) => {
    try {
      const start = req.query.start ? new Date(req.query.start) : null;
      const end = req.query.end ? new Date(req.query.end) : null;
      const facultyId = req.query.facultyId ? String(req.query.facultyId) : null;

      const where = {};
      if (start && !isNaN(start.getTime())) where.createdAt = { ...(where.createdAt || {}), [Op.gte]: start };
      if (end && !isNaN(end.getTime())) where.createdAt = { ...(where.createdAt || {}), [Op.lt]: end };
      if (facultyId) where.assigneeId = facultyId;

      const tasks = await FacultyTask.findAll({
        where,
        include: [
          { model: User, as: 'Assignee', attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole', 'department'] },
          { model: User, as: 'Assigner', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'Remarker', attributes: ['id', 'firstName', 'lastName', 'email'] },
        ],
        order: [['createdAt', 'ASC']],
      });

      // Group by assignee
      const byFaculty = new Map();
      for (const t of tasks) {
        if (!byFaculty.has(t.assigneeId)) {
          byFaculty.set(t.assigneeId, {
            user: t.Assignee ? t.Assignee.toJSON() : { id: t.assigneeId, firstName: 'Unknown', lastName: '', email: '' },
            tasks: [],
          });
        }
        byFaculty.get(t.assigneeId).tasks.push(t);
      }

      // For score: per-faculty accuracy is computed across their LIVE tasks
      // overall (not just the range), to match the on-page accuracy display.
      // We do one query per faculty for live tasks.
      const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 19).replace('T', ' ') : '');
      const fullName = (u) => (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email : '');

      const faculty = [];
      for (const [uid, group] of byFaculty.entries()) {
        const liveTasks = await FacultyTask.findAll({
          where: { assigneeId: uid },
          attributes: ['id', 'status', 'deadline', 'completedAt'],
        });
        const score = computeAccuracy(liveTasks);
        const now = Date.now();
        const rangeTaskRows = group.tasks.map((t) => {
          const overdue = t.status !== 'COMPLETED' && t.deadline && new Date(t.deadline).getTime() < now;
          return {
            title: t.title,
            priority: t.priority,
            type: t.sharedCompletion ? 'GROUP-SHARED' : (t.groupTaskId ? 'GROUP-COPY' : 'INDIVIDUAL'),
            status: overdue ? 'OVERDUE' : t.status,
            assignedAt: fmtDate(t.createdAt),
            deadline: fmtDate(t.deadline),
            completedAt: fmtDate(t.completedAt),
            late: t.submittedLate ? 'YES' : '',
            documentName: t.documentName || '',
            adminRemark: t.adminRemark || '',
          };
        });
        faculty.push({
          user: group.user,
          fullName: fullName(group.user),
          taskCount: group.tasks.length,
          tasks: rangeTaskRows,
          score: score.percentage,
          scoreBreakdown: score.breakdown,
        });
      }

      // Sort by score desc, then name asc
      faculty.sort((a, b) => (b.score - a.score) || a.fullName.localeCompare(b.fullName));

      res.json({
        meta: {
          start: start && !isNaN(start.getTime()) ? start.toISOString() : null,
          end: end && !isNaN(end.getTime()) ? end.toISOString() : null,
          facultyId,
          generatedAt: new Date().toISOString(),
          generatedBy: req.user?.email || 'admin',
          totalTasks: tasks.length,
          totalFaculty: faculty.length,
        },
        faculty,
      });
    } catch (error) {
      console.error('FacultyTask performanceReport error:', error);
      res.status(500).json({ message: 'Failed to generate performance report' });
    }
  },
};

module.exports = facultyTaskController;
module.exports.ASSIGNABLE_ROLES = ASSIGNABLE_ROLES;
