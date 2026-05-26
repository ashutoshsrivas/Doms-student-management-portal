// Admin-only: manage faculty groups (bundles of HOD/FACULTY/etc. users
// that can be assigned tasks together).
//
// Groups are independent of tasks — they're just a saved bundle. When the
// admin assigns a task to a group in SHARED mode, the task controller
// fans out one row per member linked by group_task_id.

const { Op } = require('sequelize');
const { FacultyGroup, FacultyGroupMember, User } = require('../models');

const ASSIGNABLE_ROLES = ['HOD', 'FACULTY', 'COORDINATOR', 'PLACEMENT_COORDINATOR', 'TRAINER', 'MENTOR'];

const sanitiseName = (s) => (s || '').toString().trim().slice(0, 200);
const sanitiseText = (s, max = 2000) => (s == null ? null : String(s).slice(0, max));

const memberInclude = {
  model: FacultyGroupMember,
  as: 'Members',
  include: [{ model: User, as: 'User', attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole', 'department'] }],
};

const facultyGroupController = {
  // GET /api/faculty-groups
  list: async (req, res) => {
    try {
      const groups = await FacultyGroup.findAll({
        include: [memberInclude, { model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName', 'email'] }],
        order: [['name', 'ASC']],
      });
      res.json({ groups });
    } catch (error) {
      console.error('FacultyGroup list error:', error);
      res.status(500).json({ message: 'Failed to list groups' });
    }
  },

  // GET /api/faculty-groups/:id
  get: async (req, res) => {
    try {
      const group = await FacultyGroup.findByPk(req.params.id, {
        include: [memberInclude, { model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      });
      if (!group) return res.status(404).json({ message: 'Group not found' });
      res.json({ group });
    } catch (error) {
      console.error('FacultyGroup get error:', error);
      res.status(500).json({ message: 'Failed to load group' });
    }
  },

  // POST /api/faculty-groups   body: { name, description?, memberIds?: [] }
  create: async (req, res) => {
    try {
      const name = sanitiseName(req.body?.name);
      if (!name) return res.status(400).json({ message: 'Name is required' });

      const group = await FacultyGroup.create({
        name,
        description: sanitiseText(req.body?.description, 2000),
        createdBy: req.user.id,
      });

      // Optional initial member list
      const memberIds = Array.isArray(req.body?.memberIds) ? req.body.memberIds : [];
      if (memberIds.length) {
        const users = await User.findAll({
          where: {
            id: { [Op.in]: memberIds },
            approvedRole: { [Op.in]: ASSIGNABLE_ROLES },
          },
          attributes: ['id'],
        });
        await FacultyGroupMember.bulkCreate(
          users.map((u) => ({ groupId: group.id, userId: u.id })),
          { ignoreDuplicates: true },
        );
      }

      const full = await FacultyGroup.findByPk(group.id, {
        include: [memberInclude, { model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      });
      res.status(201).json({ group: full });
    } catch (error) {
      console.error('FacultyGroup create error:', error);
      res.status(500).json({ message: 'Failed to create group' });
    }
  },

  // PATCH /api/faculty-groups/:id   body: { name?, description? }
  update: async (req, res) => {
    try {
      const group = await FacultyGroup.findByPk(req.params.id);
      if (!group) return res.status(404).json({ message: 'Group not found' });
      const patch = {};
      if (req.body?.name !== undefined) {
        const n = sanitiseName(req.body.name);
        if (!n) return res.status(400).json({ message: 'Name cannot be empty' });
        patch.name = n;
      }
      if (req.body?.description !== undefined) patch.description = sanitiseText(req.body.description, 2000);
      await group.update(patch);
      res.json({ group });
    } catch (error) {
      console.error('FacultyGroup update error:', error);
      res.status(500).json({ message: 'Failed to update group' });
    }
  },

  // DELETE /api/faculty-groups/:id
  // Tasks previously assigned to this group via group_task_id are NOT
  // touched (they're independent siblings now) — they keep working.
  remove: async (req, res) => {
    try {
      const group = await FacultyGroup.findByPk(req.params.id);
      if (!group) return res.status(404).json({ message: 'Group not found' });
      await group.destroy();
      res.json({ message: 'Group deleted', id: req.params.id });
    } catch (error) {
      console.error('FacultyGroup delete error:', error);
      res.status(500).json({ message: 'Failed to delete group' });
    }
  },

  // POST /api/faculty-groups/:id/members   body: { userId }
  addMember: async (req, res) => {
    try {
      const group = await FacultyGroup.findByPk(req.params.id);
      if (!group) return res.status(404).json({ message: 'Group not found' });

      const user = await User.findByPk(req.body?.userId);
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (!ASSIGNABLE_ROLES.includes(user.approvedRole)) {
        return res.status(400).json({ message: `Group members must be one of ${ASSIGNABLE_ROLES.join(', ')}` });
      }

      await FacultyGroupMember.findOrCreate({
        where: { groupId: group.id, userId: user.id },
        defaults: { groupId: group.id, userId: user.id },
      });

      const full = await FacultyGroup.findByPk(group.id, {
        include: [memberInclude, { model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      });
      res.json({ group: full });
    } catch (error) {
      console.error('FacultyGroup addMember error:', error);
      res.status(500).json({ message: 'Failed to add member' });
    }
  },

  // DELETE /api/faculty-groups/:id/members/:userId
  removeMember: async (req, res) => {
    try {
      const removed = await FacultyGroupMember.destroy({
        where: { groupId: req.params.id, userId: req.params.userId },
      });
      if (!removed) return res.status(404).json({ message: 'Member not in group' });
      res.json({ message: 'Member removed' });
    } catch (error) {
      console.error('FacultyGroup removeMember error:', error);
      res.status(500).json({ message: 'Failed to remove member' });
    }
  },
};

module.exports = facultyGroupController;
module.exports.ASSIGNABLE_ROLES = ASSIGNABLE_ROLES;
