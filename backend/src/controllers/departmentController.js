// Department pages.
//
// GESoM is the umbrella; each department has a page on the public site that
// its own chair head curates. Three things are written once — a title, a
// description and a cover picture — and everything else is an entry filed
// under one of the fourteen categories, each with its own document or
// picture.
//
// Who may do what:
//   ADMIN / HOD     create departments, appoint chair heads, and may edit,
//                   hide or delete anything on any department.
//   The chair head  everything on their own department's page, including
//                   hiding an entry that is not ready to be read.
//   Everyone else   the public page, which shows only what is not hidden.

const { Op } = require('sequelize');
const {
  Department,
  DepartmentEntry,
  DEPARTMENT_CATEGORIES,
  DEPARTMENT_CATEGORY_KEYS,
  User,
} = require('../models');
const { uploadToS3 } = require('../utils/s3Upload');

// COORDINATOR is an ADMIN alias elsewhere in the portal, but the landing
// page is not theirs to rewrite — the same line the landing editor draws.
const isAdminish = (user) => ['ADMIN', 'HOD'].includes(user?.role) && user?.rawRole !== 'COORDINATOR';
const canCurate = (dept, user) => isAdminish(user) || (!!dept.chairHeadId && dept.chairHeadId === user?.id);

const fullName = (u) => (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || '' : '');
const CHAIR_ROLES = ['CHAIR_HEAD', 'FACULTY', 'HOD', 'ADMIN'];
const MAX_IMAGE_MB = 10;
const MAX_FILE_MB = 25;

const slugify = (text) => String(text || '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 150);

// Slugs are the public address of a page, so a clash is resolved here
// rather than surfacing as a database error.
async function uniqueSlug(base, ignoreId) {
  const root = slugify(base) || 'department';
  let candidate = root;
  for (let n = 2; n < 200; n += 1) {
    const where = { slug: candidate };
    if (ignoreId) where.id = { [Op.ne]: ignoreId };
    const taken = await Department.findOne({ where });
    if (!taken) return candidate;
    candidate = `${root}-${n}`.slice(0, 160);
  }
  return `${root}-${Date.now().toString(36)}`.slice(0, 160);
}

// Our own bucket, or a path on this site. Anything else is refused: a
// department page is public, and an image hotlinked from elsewhere is
// someone else's to change. Same rule the forms media uses.
function isOwnFileUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return false;
  if (raw.startsWith('/') && !raw.startsWith('//')) return true;
  let parsed;
  try { parsed = new URL(raw); } catch { return false; }
  if (parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase();
  const bucket = String(process.env.S3_BUCKET || '').toLowerCase();
  if (bucket && (host === `${bucket}.s3.amazonaws.com` || host.startsWith(`${bucket}.s3.`))) return true;
  return host === 's3.amazonaws.com' || /(^|\.)s3[.-][a-z0-9-]+\.amazonaws\.com$/.test(host);
}

const shapeEntry = (e) => ({
  id: e.id,
  departmentId: e.departmentId,
  category: e.category,
  title: e.title,
  details: e.details || '',
  fileUrl: e.fileUrl || null,
  fileName: e.fileName || null,
  fileKind: e.fileKind || null,
  linkUrl: e.linkUrl || null,
  isHidden: !!e.isHidden,
  position: e.position,
  createdByName: fullName(e.Creator),
  createdAt: e.createdAt,
  updatedAt: e.updatedAt,
});

const shapeDepartment = (d, { entries, counts } = {}) => ({
  id: d.id,
  name: d.name,
  slug: d.slug,
  title: d.title || '',
  description: d.description || '',
  coverImageUrl: d.coverImageUrl || null,
  chairHeadId: d.chairHeadId || null,
  chairHeadName: fullName(d.ChairHead),
  chairHeadEmail: d.ChairHead ? d.ChairHead.email : '',
  isHidden: !!d.isHidden,
  position: d.position,
  updatedAt: d.updatedAt,
  ...(entries ? { entries } : {}),
  ...(counts ? { counts } : {}),
});

// Entries arranged the way a page reads them: by category, in order.
const groupByCategory = (rows) => {
  const groups = {};
  for (const key of DEPARTMENT_CATEGORY_KEYS) groups[key] = [];
  for (const row of rows) {
    if (!groups[row.category]) groups[row.category] = [];
    groups[row.category].push(shapeEntry(row));
  }
  return groups;
};

const chairHeadInclude = {
  model: User, as: 'ChairHead', attributes: ['id', 'firstName', 'lastName', 'email'], required: false,
};

module.exports = {
  categories: (req, res) => res.json({ categories: DEPARTMENT_CATEGORIES }),

  // GET /api/departments — the cards on the landing page. Public.
  publicList: async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    try {
      const rows = await Department.findAll({
        where: { isHidden: false },
        include: [chairHeadInclude],
        order: [['position', 'ASC'], ['name', 'ASC']],
      });
      const counts = await DepartmentEntry.findAll({
        where: { isHidden: false },
        attributes: ['departmentId', [DepartmentEntry.sequelize.fn('COUNT', '*'), 'n']],
        group: ['departmentId'],
        raw: true,
      });
      const byId = new Map(counts.map((c) => [c.departmentId, Number(c.n) || 0]));
      res.json({
        departments: rows.map((d) => ({
          ...shapeDepartment(d),
          entryCount: byId.get(d.id) || 0,
        })),
      });
    } catch (err) {
      console.error('department.publicList error:', err);
      // The landing page must still render.
      res.json({ departments: [] });
    }
  },

  // GET /api/departments/:slug — one department's public page.
  publicOne: async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    try {
      const dept = await Department.findOne({
        where: { slug: String(req.params.slug || ''), isHidden: false },
        include: [chairHeadInclude],
      });
      if (!dept) return res.status(404).json({ message: 'This department page does not exist.' });
      const rows = await DepartmentEntry.findAll({
        where: { departmentId: dept.id, isHidden: false },
        order: [['position', 'ASC'], ['createdAt', 'ASC']],
      });
      res.json({
        department: shapeDepartment(dept),
        categories: DEPARTMENT_CATEGORIES,
        entries: groupByCategory(rows),
      });
    } catch (err) {
      console.error('department.publicOne error:', err);
      res.status(500).json({ message: 'Failed to load this department page' });
    }
  },

  // GET /api/departments/manage — what this account may curate.
  manageList: async (req, res) => {
    try {
      const mine = !isAdminish(req.user);
      const where = mine ? { chairHeadId: req.user.id } : {};
      const rows = await Department.findAll({
        where,
        include: [chairHeadInclude],
        order: [['position', 'ASC'], ['name', 'ASC']],
      });
      const counts = await DepartmentEntry.findAll({
        attributes: [
          'departmentId',
          [DepartmentEntry.sequelize.fn('COUNT', '*'), 'n'],
          [DepartmentEntry.sequelize.fn('SUM', DepartmentEntry.sequelize.col('is_hidden')), 'hidden'],
        ],
        group: ['departmentId'],
        raw: true,
      });
      const byId = new Map(counts.map((c) => [c.departmentId, { total: Number(c.n) || 0, hidden: Number(c.hidden) || 0 }]));
      res.json({
        canCreate: isAdminish(req.user),
        departments: rows.map((d) => shapeDepartment(d, { counts: byId.get(d.id) || { total: 0, hidden: 0 } })),
      });
    } catch (err) {
      console.error('department.manageList error:', err);
      res.status(500).json({ message: 'Failed to list departments' });
    }
  },

  // GET /api/departments/manage/:id — one department, hidden rows included.
  manageOne: async (req, res) => {
    try {
      const dept = await Department.findByPk(req.params.id, { include: [chairHeadInclude] });
      if (!dept) return res.status(404).json({ message: 'Department not found' });
      if (!canCurate(dept, req.user)) return res.status(403).json({ message: 'This is not your department page' });
      const rows = await DepartmentEntry.findAll({
        where: { departmentId: dept.id },
        include: [{ model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName', 'email'], required: false }],
        order: [['position', 'ASC'], ['createdAt', 'ASC']],
      });
      res.json({
        department: shapeDepartment(dept),
        categories: DEPARTMENT_CATEGORIES,
        entries: groupByCategory(rows),
        canAdmin: isAdminish(req.user),
      });
    } catch (err) {
      console.error('department.manageOne error:', err);
      res.status(500).json({ message: 'Failed to load the department' });
    }
  },

  // GET /api/departments/chair-heads — the picker when appointing one.
  chairHeads: async (req, res) => {
    try {
      if (!isAdminish(req.user)) return res.status(403).json({ message: 'Not authorized' });
      const users = await User.findAll({
        where: { approvedRole: { [Op.in]: ['CHAIR_HEAD', 'FACULTY'] }, status: 'ACTIVE' },
        attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole'],
        order: [['approvedRole', 'ASC'], ['firstName', 'ASC']],
      });
      res.json({ users });
    } catch (err) {
      console.error('department.chairHeads error:', err);
      res.status(500).json({ message: 'Failed to list chair heads' });
    }
  },

  // POST /api/departments — ADMIN/HOD only.
  create: async (req, res) => {
    try {
      if (!isAdminish(req.user)) return res.status(403).json({ message: 'Only an admin or HOD can add a department' });
      const name = String(req.body?.name || '').trim().slice(0, 160);
      if (!name) return res.status(400).json({ message: 'Give the department a name' });

      const chairHeadId = req.body?.chairHeadId || null;
      if (chairHeadId) {
        const user = await User.findByPk(chairHeadId);
        if (!user || user.status !== 'ACTIVE' || !CHAIR_ROLES.includes(user.approvedRole)) {
          return res.status(400).json({ message: 'That person cannot be made a chair head' });
        }
      }

      const last = await Department.max('position');
      const dept = await Department.create({
        name,
        slug: await uniqueSlug(req.body?.slug || name),
        title: String(req.body?.title || '').trim().slice(0, 300) || null,
        description: String(req.body?.description || '').trim() || null,
        chairHeadId,
        isHidden: req.body?.isHidden === undefined ? true : !!req.body.isHidden,
        position: Number.isFinite(Number(last)) ? Number(last) + 1 : 0,
        createdBy: req.user.id,
      });
      const full = await Department.findByPk(dept.id, { include: [chairHeadInclude] });
      res.status(201).json({ message: 'Department added', department: shapeDepartment(full) });
    } catch (err) {
      console.error('department.create error:', err);
      res.status(500).json({ message: 'Failed to add the department' });
    }
  },

  // PATCH /api/departments/:id
  update: async (req, res) => {
    try {
      const dept = await Department.findByPk(req.params.id);
      if (!dept) return res.status(404).json({ message: 'Department not found' });
      if (!canCurate(dept, req.user)) return res.status(403).json({ message: 'This is not your department page' });
      const admin = isAdminish(req.user);
      const patch = {};

      // The chair head's three fields.
      if (req.body?.title !== undefined) patch.title = String(req.body.title).trim().slice(0, 300) || null;
      if (req.body?.description !== undefined) patch.description = String(req.body.description).trim() || null;
      if (req.body?.coverImageUrl !== undefined) {
        const url = String(req.body.coverImageUrl || '').trim();
        if (!url) patch.coverImageUrl = null;
        else if (!isOwnFileUrl(url)) return res.status(400).json({ message: 'That cover image is not one of ours — upload it here instead of linking to another site.' });
        else patch.coverImageUrl = url.slice(0, 1024);
      }

      // Who the department is, where it sits and whether it is published are
      // the institution's call, not the curator's.
      if (admin) {
        if (req.body?.name !== undefined) {
          const name = String(req.body.name).trim().slice(0, 160);
          if (!name) return res.status(400).json({ message: 'A department needs a name' });
          patch.name = name;
        }
        if (req.body?.slug !== undefined) patch.slug = await uniqueSlug(req.body.slug || patch.name || dept.name, dept.id);
        if (req.body?.isHidden !== undefined) patch.isHidden = !!req.body.isHidden;
        if (req.body?.position !== undefined) patch.position = parseInt(req.body.position, 10) || 0;
        if (req.body?.chairHeadId !== undefined) {
          const id = req.body.chairHeadId || null;
          if (id) {
            const user = await User.findByPk(id);
            if (!user || user.status !== 'ACTIVE' || !CHAIR_ROLES.includes(user.approvedRole)) {
              return res.status(400).json({ message: 'That person cannot be made a chair head' });
            }
          }
          patch.chairHeadId = id;
        }
      } else if (['name', 'slug', 'isHidden', 'chairHeadId', 'position'].some((k) => req.body?.[k] !== undefined)) {
        return res.status(403).json({ message: 'Only an admin or HOD can rename a department, publish it or change its chair head' });
      }

      await dept.update(patch);
      const full = await Department.findByPk(dept.id, { include: [chairHeadInclude] });
      res.json({ message: 'Department saved', department: shapeDepartment(full) });
    } catch (err) {
      console.error('department.update error:', err);
      res.status(500).json({ message: 'Failed to save the department' });
    }
  },

  // DELETE /api/departments/:id — ADMIN/HOD only. Takes its entries with it.
  remove: async (req, res) => {
    try {
      if (!isAdminish(req.user)) return res.status(403).json({ message: 'Only an admin or HOD can delete a department' });
      const dept = await Department.findByPk(req.params.id);
      if (!dept) return res.status(404).json({ message: 'Department not found' });
      const entries = await DepartmentEntry.count({ where: { departmentId: dept.id } });
      console.warn(`[department delete] ${req.user.email} deleted "${dept.name}" and its ${entries} entries`);
      await DepartmentEntry.destroy({ where: { departmentId: dept.id } });
      await dept.destroy();
      res.json({ message: `Deleted "${dept.name}" and ${entries} ${entries === 1 ? 'entry' : 'entries'}` });
    } catch (err) {
      console.error('department.remove error:', err);
      res.status(500).json({ message: 'Failed to delete the department' });
    }
  },

  // POST /api/departments/:id/upload — a cover image or an entry's file.
  upload: async (req, res) => {
    try {
      const dept = await Department.findByPk(req.params.id);
      if (!dept) return res.status(404).json({ message: 'Department not found' });
      if (!canCurate(dept, req.user)) return res.status(403).json({ message: 'This is not your department page' });
      if (!req.file) return res.status(400).json({ message: 'Choose a file to upload' });

      const isImage = req.file.mimetype.startsWith('image/');
      const limitMb = isImage ? MAX_IMAGE_MB : MAX_FILE_MB;
      if (req.file.size > limitMb * 1024 * 1024) {
        return res.status(400).json({ message: `Keep ${isImage ? 'pictures' : 'documents'} under ${limitMb} MB` });
      }
      const url = await uploadToS3(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        `departments/${dept.slug}`,
      );
      res.status(201).json({
        url,
        name: String(req.file.originalname || 'file').slice(0, 255),
        kind: isImage ? 'image' : 'document',
      });
    } catch (err) {
      console.error('department.upload error:', err);
      res.status(500).json({ message: 'That file could not be uploaded' });
    }
  },

  // POST /api/departments/:id/entries — add a row to one of the categories.
  createEntry: async (req, res) => {
    try {
      const dept = await Department.findByPk(req.params.id);
      if (!dept) return res.status(404).json({ message: 'Department not found' });
      if (!canCurate(dept, req.user)) return res.status(403).json({ message: 'This is not your department page' });

      const category = String(req.body?.category || '').trim();
      if (!DEPARTMENT_CATEGORY_KEYS.includes(category)) {
        return res.status(400).json({ message: 'That is not one of the department categories' });
      }
      const title = String(req.body?.title || '').trim().slice(0, 300);
      if (!title) return res.status(400).json({ message: 'Give the entry a title' });

      const file = cleanFile(req.body);
      if (file.error) return res.status(400).json({ message: file.error });

      const last = await DepartmentEntry.max('position', { where: { departmentId: dept.id, category } });
      const entry = await DepartmentEntry.create({
        departmentId: dept.id,
        category,
        title,
        details: String(req.body?.details || '').trim() || null,
        linkUrl: cleanLink(req.body?.linkUrl),
        ...file.values,
        isHidden: !!req.body?.isHidden,
        position: Number.isFinite(Number(last)) ? Number(last) + 1 : 0,
        createdBy: req.user.id,
      });
      res.status(201).json({ message: 'Entry added', entry: shapeEntry(entry) });
    } catch (err) {
      console.error('department.createEntry error:', err);
      res.status(500).json({ message: 'Failed to add the entry' });
    }
  },

  // PATCH /api/departments/:id/entries/:entryId
  updateEntry: async (req, res) => {
    try {
      const dept = await Department.findByPk(req.params.id);
      if (!dept) return res.status(404).json({ message: 'Department not found' });
      if (!canCurate(dept, req.user)) return res.status(403).json({ message: 'This is not your department page' });
      const entry = await DepartmentEntry.findOne({ where: { id: req.params.entryId, departmentId: dept.id } });
      if (!entry) return res.status(404).json({ message: 'Entry not found' });

      const patch = {};
      if (req.body?.title !== undefined) {
        const title = String(req.body.title).trim().slice(0, 300);
        if (!title) return res.status(400).json({ message: 'An entry needs a title' });
        patch.title = title;
      }
      if (req.body?.details !== undefined) patch.details = String(req.body.details).trim() || null;
      if (req.body?.linkUrl !== undefined) patch.linkUrl = cleanLink(req.body.linkUrl);
      if (req.body?.isHidden !== undefined) patch.isHidden = !!req.body.isHidden;
      if (req.body?.position !== undefined) patch.position = parseInt(req.body.position, 10) || 0;
      if (req.body?.category !== undefined) {
        const category = String(req.body.category).trim();
        if (!DEPARTMENT_CATEGORY_KEYS.includes(category)) {
          return res.status(400).json({ message: 'That is not one of the department categories' });
        }
        patch.category = category;
      }
      if (req.body?.fileUrl !== undefined) {
        const file = cleanFile(req.body);
        if (file.error) return res.status(400).json({ message: file.error });
        Object.assign(patch, file.values);
      }

      await entry.update(patch);
      res.json({ message: 'Entry saved', entry: shapeEntry(entry) });
    } catch (err) {
      console.error('department.updateEntry error:', err);
      res.status(500).json({ message: 'Failed to save the entry' });
    }
  },

  // DELETE /api/departments/:id/entries/:entryId
  removeEntry: async (req, res) => {
    try {
      const dept = await Department.findByPk(req.params.id);
      if (!dept) return res.status(404).json({ message: 'Department not found' });
      if (!canCurate(dept, req.user)) return res.status(403).json({ message: 'This is not your department page' });
      const entry = await DepartmentEntry.findOne({ where: { id: req.params.entryId, departmentId: dept.id } });
      if (!entry) return res.status(404).json({ message: 'Entry not found' });
      await entry.destroy();
      res.json({ message: 'Entry deleted' });
    } catch (err) {
      console.error('department.removeEntry error:', err);
      res.status(500).json({ message: 'Failed to delete the entry' });
    }
  },

  // PUT /api/departments/:id/entries/order — one category, reordered.
  reorderEntries: async (req, res) => {
    try {
      const dept = await Department.findByPk(req.params.id);
      if (!dept) return res.status(404).json({ message: 'Department not found' });
      if (!canCurate(dept, req.user)) return res.status(403).json({ message: 'This is not your department page' });
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean).slice(0, 500) : [];
      if (!ids.length) return res.status(400).json({ message: 'Send the order of the entries' });
      const rows = await DepartmentEntry.findAll({ where: { id: { [Op.in]: ids }, departmentId: dept.id } });
      const known = new Map(rows.map((r) => [r.id, r]));
      await Promise.all(ids.map((id, i) => (known.has(id) ? known.get(id).update({ position: i }) : null)));
      res.json({ message: 'Order saved' });
    } catch (err) {
      console.error('department.reorderEntries error:', err);
      res.status(500).json({ message: 'Failed to save the order' });
    }
  },
};

// A link the page will offer the reader. Only http(s), and never javascript:.
function cleanLink(raw) {
  const url = String(raw || '').trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return url.slice(0, 1024);
  } catch {
    return null;
  }
}

// The attachment, as the editor sends it back after uploading.
function cleanFile(body) {
  const url = String(body?.fileUrl || '').trim();
  if (!url) return { values: { fileUrl: null, fileName: null, fileKind: null } };
  if (!isOwnFileUrl(url)) {
    return { error: 'That file is not one of ours — upload it here instead of linking to another site.' };
  }
  const kind = body?.fileKind === 'image' ? 'image' : 'document';
  return {
    values: {
      fileUrl: url.slice(0, 1024),
      fileName: String(body?.fileName || 'file').slice(0, 255),
      fileKind: kind,
    },
  };
}
