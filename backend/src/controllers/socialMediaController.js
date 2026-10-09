const { Op } = require('sequelize');
const {
  User,
  FacultyAchievement,
  FacultyAchievementMedia,
  Event,
} = require('../models');

// Who may see the social-media view: admins/HOD, plus anyone an admin has
// given social-media responsibility on /admin/access.
const canView = (user) => ['ADMIN', 'HOD'].includes(user.role) || !!user.socialMediaManager;
const isAdmin = (user) => ['ADMIN', 'HOD'].includes(user.role);
const fullName = (u) => (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '');

// Inclusive date window; blank means "no bound".
const windowFor = (from, to, field) => {
  const where = {};
  if (from && to) where[field] = { [Op.between]: [from, to] };
  else if (from) where[field] = { [Op.gte]: from };
  else if (to) where[field] = { [Op.lte]: to };
  return where;
};

const socialMediaController = {
  // GET /api/social-media/overview?from=&to=
  overview: async (req, res) => {
    try {
      if (!canView(req.user)) return res.status(403).json({ message: 'Not authorized' });
      const { from, to } = req.query;

      const contributions = await FacultyAchievement.findAll({
        where: windowFor(from, to, 'achievedOn'),
        include: [
          { model: User, as: 'Owner', attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole', 'department'] },
          { model: FacultyAchievementMedia, as: 'Media' },
        ],
        order: [['achievedOn', 'DESC'], ['createdAt', 'DESC']],
      });

      const events = await Event.findAll({
        where: windowFor(from, to ? `${to} 23:59:59` : to, 'startAt'),
        order: [['startAt', 'DESC']],
      });

      res.json({
        range: { from: from || null, to: to || null },
        contributions: contributions.map((c) => {
          const p = c.toJSON();
          return {
            id: p.id,
            title: p.title,
            category: p.category || '',
            description: p.description || '',
            achievedOn: p.achievedOn,
            ownerId: p.Owner?.id || null,
            ownerName: fullName(p.Owner),
            ownerEmail: p.Owner?.email || '',
            ownerRole: p.Owner?.approvedRole || '',
            department: p.Owner?.department || '',
            media: (p.Media || []).map((m) => ({
              id: m.id, url: m.url, kind: m.kind, fileName: m.fileName || '', sizeBytes: m.sizeBytes,
            })),
          };
        }),
        events: events.map((e) => {
          const p = e.toJSON();
          return {
            id: p.id,
            title: p.title,
            startAt: p.startAt,
            endAt: p.endAt,
            venue: p.venue || '',
            description: p.description || '',
            status: p.status || '',
            imageUrl: p.imageUrl || null,
            videoUrl: p.videoUrl || null,
            reportUrl: p.postReportUrl || null,
          };
        }),
        canEdit: true,
      });
    } catch (error) {
      console.error('socialMedia.overview error:', error);
      res.status(500).json({ message: 'Failed to load the social media overview' });
    }
  },

  // GET /api/social-media/managers — admin view of who holds the duty.
  listManagers: async (req, res) => {
    try {
      if (!isAdmin(req.user)) return res.status(403).json({ message: 'Not authorized' });
      const holders = await User.findAll({
        where: { socialMediaManager: true },
        attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole', 'department', 'status'],
        order: [['firstName', 'ASC']],
      });
      const candidates = await User.findAll({
        where: { approvedRole: { [Op.ne]: 'STUDENT' }, status: 'ACTIVE' },
        attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole', 'department', 'socialMediaManager'],
        order: [['firstName', 'ASC']],
      });
      res.json({
        managers: holders.map((u) => ({ id: u.id, name: fullName(u), email: u.email, role: u.approvedRole, department: u.department || '' })),
        candidates: candidates.map((u) => ({
          id: u.id, name: fullName(u), email: u.email, role: u.approvedRole,
          department: u.department || '', hasDuty: !!u.socialMediaManager,
        })),
      });
    } catch (error) {
      console.error('socialMedia.listManagers error:', error);
      res.status(500).json({ message: 'Failed to load access list' });
    }
  },

  // POST /api/social-media/managers { userId, enabled }
  setManager: async (req, res) => {
    try {
      if (!isAdmin(req.user)) return res.status(403).json({ message: 'Not authorized' });
      const { userId, enabled } = req.body;
      if (!userId) return res.status(400).json({ message: 'userId is required' });
      const user = await User.findByPk(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (user.approvedRole === 'STUDENT') {
        return res.status(400).json({ message: 'Students cannot hold social-media responsibility' });
      }
      await user.update({ socialMediaManager: !!enabled });
      res.json({
        message: enabled
          ? `${fullName(user)} can now see and export all contributions and events`
          : `${fullName(user)} no longer has social-media responsibility`,
        user: { id: user.id, name: fullName(user), hasDuty: !!user.socialMediaManager },
      });
    } catch (error) {
      console.error('socialMedia.setManager error:', error);
      res.status(500).json({ message: 'Failed to update access' });
    }
  },
};

module.exports = socialMediaController;
