// Admin-assigned tasks for faculty / HOD / mentors / coordinators / trainers.
// - Admin creates, edits, deletes, reopens, and views everything.
// - Assignee sees their own tasks, marks them done, and can attach a
//   supporting document (uploaded to S3 via uploadToS3).

const { Op } = require('sequelize');
const { FacultyTask, User } = require('../models');
const { uploadToS3, deleteFromS3 } = require('../utils/s3Upload');

const ASSIGNABLE_ROLES = ['HOD', 'FACULTY', 'COORDINATOR', 'PLACEMENT_COORDINATOR', 'TRAINER', 'MENTOR'];

const sanitiseTitle = (s) => (s || '').toString().trim().slice(0, 250);
const sanitiseText = (s, max = 5000) => (s == null ? null : String(s).slice(0, max));

function canViewTask(user, task) {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return task.assigneeId === user.id;
}

const facultyTaskController = {
  // POST /api/faculty-tasks  (ADMIN)
  // body: { assigneeId, title, description?, deadline? }
  create: async (req, res) => {
    try {
      const { assigneeId, title, description, deadline } = req.body || {};
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
      });

      const created = await FacultyTask.findByPk(task.id, {
        include: [
          { model: User, as: 'Assignee', attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole'] },
          { model: User, as: 'Assigner', attributes: ['id', 'firstName', 'lastName', 'email'] },
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
      if (req.user.role === 'ADMIN') {
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
        ],
        order: [
          ['status', 'ASC'],   // PENDING < COMPLETED alphabetically — pending first
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
        attributes: ['assigneeId', 'status', 'deadline'],
      });

      const now = Date.now();
      const map = new Map();
      for (const u of users) {
        map.set(u.id, {
          user: u.toJSON(),
          pendingCount: 0,
          completedCount: 0,
          overdueCount: 0,
        });
      }
      for (const t of tasks) {
        const row = map.get(t.assigneeId);
        if (!row) continue;
        if (t.status === 'COMPLETED') {
          row.completedCount += 1;
        } else {
          row.pendingCount += 1;
          if (t.deadline && new Date(t.deadline).getTime() < now) row.overdueCount += 1;
        }
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

      if (req.user.role !== 'ADMIN' && task.assigneeId !== req.user.id) {
        return res.status(403).json({ message: 'Only the assignee or an admin can complete this task' });
      }

      const patch = { status: 'COMPLETED' };
      if (task.status !== 'COMPLETED') patch.completedAt = new Date();

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

      const updated = await FacultyTask.findByPk(task.id, {
        include: [
          { model: User, as: 'Assignee', attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole'] },
          { model: User, as: 'Assigner', attributes: ['id', 'firstName', 'lastName', 'email'] },
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
      await task.update({ status: 'PENDING', completedAt: null });
      res.json({ task });
    } catch (error) {
      console.error('FacultyTask reopen error:', error);
      res.status(500).json({ message: 'Failed to reopen task' });
    }
  },

  // DELETE /api/faculty-tasks/:id  (ADMIN)
  remove: async (req, res) => {
    try {
      const task = await FacultyTask.findByPk(req.params.id);
      if (!task) return res.status(404).json({ message: 'Task not found' });
      if (task.documentUrl) {
        try { await deleteFromS3(task.documentUrl); } catch (e) { /* best effort */ }
      }
      await task.destroy();
      res.json({ message: 'Task deleted', id: req.params.id });
    } catch (error) {
      console.error('FacultyTask delete error:', error);
      res.status(500).json({ message: 'Failed to delete task' });
    }
  },
};

module.exports = facultyTaskController;
module.exports.ASSIGNABLE_ROLES = ASSIGNABLE_ROLES;
