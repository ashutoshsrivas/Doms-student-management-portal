const { Op } = require('sequelize');
const fs = require('fs');
const { sequelize, WorkBlock, User, FacultyAchievement, FacultyAchievementMedia } = require('../models');
const { uploadFileToS3, deleteFromS3 } = require('../utils/s3Upload');

const MAX_MEDIA_PER_ACHIEVEMENT = 10;

// Grid bounds
const GRID_START = 8 * 60;        // 8:00 → minute 480
const GRID_END = 18 * 60;         // 18:00 → minute 1080
const SLOT_MIN = 15;

// Lunch window and duration cap
const LUNCH_WINDOW_START = 12 * 60 + 30;   // 12:30
const LUNCH_WINDOW_END = 15 * 60;          // 15:00
const LUNCH_MAX = 60;                      // 60 minutes

const BLOCK_TYPES = new Set([
  'ACADEMIC', 'ADMINISTRATIVE', 'RESEARCH',
  'MENTOR_MENTEE', 'LUNCH', 'CUSTOM',
]);

// Everyone with a schedule (i.e. everyone except students)
const SCHEDULE_ROLES = [
  'ADMIN', 'HOD', 'FACULTY', 'CHAIR_HEAD',
  'COORDINATOR', 'PLACEMENT_COORDINATOR',
  'TRAINER', 'MENTOR',
];

const isAdmin = (role) => role === 'ADMIN' || role === 'HOD';
// Admins, HODs and whoever holds social-media responsibility may also manage
// other people's contributions.
const canManageAny = (user) => isAdmin(user.role) || !!user.socialMediaManager;
const mediaInclude = { model: FacultyAchievementMedia, as: 'Media' };

function validateBlocks(raw) {
  if (!Array.isArray(raw)) throw new Error('blocks must be an array');
  const clean = [];
  const byDay = new Map();

  for (const b of raw) {
    if (!b || typeof b !== 'object') throw new Error('invalid block');
    const dayOfWeek = Number(b.dayOfWeek);
    const startMinutes = Number(b.startMinutes);
    const endMinutes = Number(b.endMinutes);
    const blockType = String(b.blockType || '').toUpperCase();

    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 6) {
      throw new Error(`dayOfWeek must be 1..6 (got ${b.dayOfWeek})`);
    }
    if (!BLOCK_TYPES.has(blockType)) throw new Error(`invalid blockType: ${b.blockType}`);
    if (!Number.isInteger(startMinutes) || !Number.isInteger(endMinutes)) {
      throw new Error('start/end must be integers');
    }
    if (startMinutes < GRID_START || endMinutes > GRID_END) {
      throw new Error(`block outside 8:00–18:00 window`);
    }
    if (endMinutes - startMinutes < SLOT_MIN) {
      throw new Error('block must be at least 15 minutes');
    }
    if (startMinutes % SLOT_MIN !== 0 || endMinutes % SLOT_MIN !== 0) {
      throw new Error('block edges must snap to 15-minute grid');
    }

    if (blockType === 'LUNCH') {
      if (startMinutes < LUNCH_WINDOW_START || endMinutes > LUNCH_WINDOW_END) {
        throw new Error('lunch must be inside 12:30–15:00');
      }
      if (endMinutes - startMinutes > LUNCH_MAX) {
        throw new Error('lunch cannot exceed 1 hour');
      }
    }

    const title = String(b.title || '').trim().slice(0, 250);
    const details = b.details == null ? null : String(b.details).slice(0, 4000);
    const customLabel = blockType === 'CUSTOM'
      ? (b.customLabel ? String(b.customLabel).trim().slice(0, 120) : null)
      : null;

    clean.push({ dayOfWeek, startMinutes, endMinutes, blockType, title, details, customLabel });

    if (!byDay.has(dayOfWeek)) byDay.set(dayOfWeek, []);
    byDay.get(dayOfWeek).push({ startMinutes, endMinutes });
  }

  // Overlap + at-most-one-lunch checks per day
  for (const [day, list] of byDay.entries()) {
    list.sort((a, b) => a.startMinutes - b.startMinutes);
    for (let i = 1; i < list.length; i++) {
      if (list[i].startMinutes < list[i - 1].endMinutes) {
        throw new Error(`overlapping blocks on day ${day}`);
      }
    }
  }
  const lunchesPerDay = new Map();
  for (const b of clean) {
    if (b.blockType === 'LUNCH') {
      lunchesPerDay.set(b.dayOfWeek, (lunchesPerDay.get(b.dayOfWeek) || 0) + 1);
    }
  }
  for (const [day, count] of lunchesPerDay.entries()) {
    if (count > 1) throw new Error(`only one lunch allowed on day ${day}`);
  }

  return clean;
}

// GET /api/schedule/me
exports.getMine = async (req, res) => {
  const rows = await WorkBlock.findAll({
    where: { userId: req.user.id },
    order: [['dayOfWeek', 'ASC'], ['startMinutes', 'ASC']],
  });
  res.json({ blocks: rows });
};

// PUT /api/schedule/me — replace all
exports.replaceMine = async (req, res) => {
  const blocks = validateBlocks(req.body?.blocks || []);
  await sequelize.transaction(async (t) => {
    await WorkBlock.destroy({ where: { userId: req.user.id }, transaction: t });
    if (blocks.length) {
      await WorkBlock.bulkCreate(
        blocks.map((b) => ({ ...b, userId: req.user.id })),
        { transaction: t },
      );
    }
  });
  const rows = await WorkBlock.findAll({
    where: { userId: req.user.id },
    order: [['dayOfWeek', 'ASC'], ['startMinutes', 'ASC']],
  });
  res.json({ blocks: rows });
};

// GET /api/schedule/users — admin/HOD picker list
exports.listUsers = async (req, res) => {
  if (!isAdmin(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
  const users = await User.findAll({
    where: {
      approvedRole: { [Op.in]: SCHEDULE_ROLES },
      status: { [Op.in]: ['ACTIVE', 'APPROVED'] },
    },
    attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole', 'department', 'employeeId'],
    order: [['firstName', 'ASC'], ['lastName', 'ASC']],
  });
  res.json({ users });
};

// GET /api/schedule/user/:userId
exports.getForUser = async (req, res) => {
  if (!isAdmin(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
  const user = await User.findByPk(req.params.userId, {
    attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole', 'department', 'employeeId'],
  });
  if (!user) return res.status(404).json({ message: 'User not found' });
  const [blocks, achievements] = await Promise.all([
    WorkBlock.findAll({
      where: { userId: user.id },
      order: [['dayOfWeek', 'ASC'], ['startMinutes', 'ASC']],
    }),
    FacultyAchievement.findAll({
      where: { userId: user.id },
      order: [['achievedOn', 'DESC'], ['createdAt', 'DESC']],
    }),
  ]);
  res.json({ user, blocks, achievements });
};

// GET /api/schedule/all — every schedule at once (for the "download all" PDF flow).
// Payload can be large; kept flat and role-scoped.
exports.getAll = async (req, res) => {
  if (!isAdmin(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
  const users = await User.findAll({
    where: {
      approvedRole: { [Op.in]: SCHEDULE_ROLES },
      status: { [Op.in]: ['ACTIVE', 'APPROVED'] },
    },
    attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole', 'department', 'employeeId'],
    include: [
      { model: WorkBlock, as: 'WorkBlocks', required: false },
      { model: FacultyAchievement, as: 'Achievements', required: false },
    ],
    order: [['firstName', 'ASC'], ['lastName', 'ASC']],
  });
  const payload = users.map((u) => ({
    user: {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      approvedRole: u.approvedRole,
      department: u.department,
      employeeId: u.employeeId,
    },
    blocks: (u.WorkBlocks || [])
      .map((b) => ({
        id: b.id,
        dayOfWeek: b.dayOfWeek,
        startMinutes: b.startMinutes,
        endMinutes: b.endMinutes,
        blockType: b.blockType,
        title: b.title,
        details: b.details,
        customLabel: b.customLabel,
      }))
      .sort((a, b) => (a.dayOfWeek - b.dayOfWeek) || (a.startMinutes - b.startMinutes)),
    achievements: (u.Achievements || [])
      .map((a) => ({
        id: a.id,
        title: a.title,
        category: a.category,
        description: a.description,
        achievedOn: a.achievedOn,
      }))
      .sort((a, b) => {
        const da = a.achievedOn || '';
        const db = b.achievedOn || '';
        return db.localeCompare(da);
      }),
  }));
  res.json({ schedules: payload });
};

// ---- Achievements CRUD ------------------------------------------------
function normaliseAchievement(body) {
  const title = String(body?.title || '').trim().slice(0, 250);
  if (!title) throw new Error('title is required');
  return {
    title,
    category: body.category ? String(body.category).trim().slice(0, 120) : null,
    description: body.description ? String(body.description).slice(0, 4000) : null,
    achievedOn: body.achievedOn ? String(body.achievedOn).slice(0, 10) : null,
  };
}

// GET /api/schedule/achievements/me
exports.listMyAchievements = async (req, res) => {
  const rows = await FacultyAchievement.findAll({
    where: { userId: req.user.id },
    include: [mediaInclude],
    order: [['achievedOn', 'DESC'], ['createdAt', 'DESC']],
  });
  res.json({ achievements: rows });
};

// POST /api/schedule/achievements/me
exports.addMyAchievement = async (req, res) => {
  const clean = normaliseAchievement(req.body || {});
  const row = await FacultyAchievement.create({ ...clean, userId: req.user.id });
  res.status(201).json({ achievement: row });
};

// PATCH /api/schedule/achievements/:id
exports.updateAchievement = async (req, res) => {
  const row = await FacultyAchievement.findByPk(req.params.id);
  if (!row) return res.status(404).json({ message: 'Not found' });
  if (row.userId !== req.user.id && !canManageAny(req.user)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const clean = normaliseAchievement(req.body || {});
  await row.update(clean);
  res.json({ achievement: row });
};

// DELETE /api/schedule/achievements/:id
exports.deleteAchievement = async (req, res) => {
  const row = await FacultyAchievement.findByPk(req.params.id);
  if (!row) return res.status(404).json({ message: 'Not found' });
  if (row.userId !== req.user.id && !canManageAny(req.user)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  // Remove the attached files too, so nothing is orphaned in storage.
  const media = await FacultyAchievementMedia.findAll({ where: { achievementId: row.id } });
  for (const m of media) {
    try { await deleteFromS3(m.url); } catch (e) { console.error('media cleanup failed:', e.message); }
  }
  await FacultyAchievementMedia.destroy({ where: { achievementId: row.id } });
  await row.destroy();
  res.json({ ok: true, mediaRemoved: media.length });
};

// POST /api/schedule/achievements/:id/media  (multipart, field "files")
exports.addAchievementMedia = async (req, res) => {
  const files = req.files || [];
  const cleanup = () => files.forEach((f) => { try { fs.unlinkSync(f.path); } catch { /* already gone */ } });
  try {
    const row = await FacultyAchievement.findByPk(req.params.id);
    if (!row) { cleanup(); return res.status(404).json({ message: 'Not found' }); }
    if (row.userId !== req.user.id && !canManageAny(req.user)) {
      cleanup();
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (files.length === 0) return res.status(400).json({ message: 'No files uploaded' });

    const existing = await FacultyAchievementMedia.count({ where: { achievementId: row.id } });
    if (existing + files.length > MAX_MEDIA_PER_ACHIEVEMENT) {
      cleanup();
      return res.status(400).json({
        message: `A contribution can hold ${MAX_MEDIA_PER_ACHIEVEMENT} files — it already has ${existing}.`,
      });
    }

    const saved = [];
    for (const f of files) {
      const url = await uploadFileToS3(f.path, f.originalname, f.mimetype, 'contributions');
      saved.push(await FacultyAchievementMedia.create({
        achievementId: row.id,
        url,
        fileName: f.originalname,
        mimeType: f.mimetype,
        kind: /^video\//.test(f.mimetype) ? 'VIDEO' : 'IMAGE',
        sizeBytes: f.size,
        uploadedBy: req.user.id,
      }));
    }
    cleanup();
    res.status(201).json({ message: `${saved.length} file(s) uploaded`, media: saved });
  } catch (error) {
    cleanup();
    console.error('addAchievementMedia error:', error);
    res.status(500).json({ message: error.message || 'Failed to upload files' });
  }
};

// DELETE /api/schedule/achievements/:id/media/:mediaId
exports.deleteAchievementMedia = async (req, res) => {
  const row = await FacultyAchievement.findByPk(req.params.id);
  if (!row) return res.status(404).json({ message: 'Not found' });
  if (row.userId !== req.user.id && !canManageAny(req.user)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const media = await FacultyAchievementMedia.findOne({
    where: { id: req.params.mediaId, achievementId: row.id },
  });
  if (!media) return res.status(404).json({ message: 'File not found' });
  try { await deleteFromS3(media.url); } catch (e) { console.error('media delete failed:', e.message); }
  await media.destroy();
  res.json({ ok: true });
};
