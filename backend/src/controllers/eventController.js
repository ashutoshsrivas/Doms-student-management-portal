// Event Calendar — any assignable role (FACULTY/HOD/COORDINATOR/PLACEMENT_COORDINATOR/TRAINER/MENTOR)
// + ADMIN can create. Everyone authenticated can view. Admin can reschedule
// or delete any event. Only the creator can upload the post-event report,
// and only creator + admin can view it.

const { Op } = require('sequelize');
const { Event, User, BlockedDate } = require('../models');
const { uploadToS3, deleteFromS3 } = require('../utils/s3Upload');

const CREATOR_ROLES = ['ADMIN', 'HOD', 'FACULTY', 'COORDINATOR', 'PLACEMENT_COORDINATOR', 'TRAINER', 'MENTOR'];
const IMAGE_MAX = 10 * 1024 * 1024;   // 10 MB
const VIDEO_MAX = 80 * 1024 * 1024;   // 80 MB

const sanitiseTitle = (s) => (s || '').toString().trim().slice(0, 250);
const sanitiseText = (s, max = 5000) => (s == null ? null : String(s).slice(0, max));
const sanitiseUrl = (s) => {
  if (!s) return null;
  const v = String(s).trim().slice(0, 1024);
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) return null; // reject non-http(s)
  return v;
};

/** Returns blocked-date row if startAt falls on a blocked date, else null. */
async function findBlockingDate(startAt) {
  if (!startAt) return null;
  const d = new Date(startAt);
  const isoDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return BlockedDate.findOne({ where: { date: isoDay } });
}

function canEdit(user, event) {
  if (!user) return false;
  if (user.role === 'ADMIN' || user.role === 'HOD') return true;
  return event.createdBy === user.id;
}
function canSeeReport(user, event) {
  if (!user) return false;
  if (user.role === 'ADMIN' || user.role === 'HOD') return true;
  return event.createdBy === user.id;
}

const includeCreator = { model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole'] };

// Strip the post-event report fields from rows the viewer isn't allowed to see.
function scrubReportFor(viewer, eventOrJson) {
  const isPlain = !eventOrJson.toJSON;
  const obj = isPlain ? { ...eventOrJson } : eventOrJson.toJSON();
  if (!canSeeReport(viewer, obj)) {
    obj.postReportUrl = null;
    obj.postReportName = null;
    obj.postReportMime = null;
    obj.postReportUploadedAt = null;
  }
  return obj;
}

const eventController = {
  // GET /api/events?from=ISO&to=ISO
  // All authenticated users can list. Defaults to a wide range.
  list: async (req, res) => {
    try {
      const where = {};
      if (req.query.from || req.query.to) {
        const range = {};
        if (req.query.from) range[Op.gte] = new Date(req.query.from);
        if (req.query.to) range[Op.lte] = new Date(req.query.to);
        where.startAt = range;
      }
      const rows = await Event.findAll({
        where,
        include: [includeCreator],
        order: [['startAt', 'ASC']],
      });
      res.json({ events: rows.map((r) => scrubReportFor(req.user, r)) });
    } catch (error) {
      console.error('Event list error:', error);
      res.status(500).json({ message: 'Failed to load events' });
    }
  },

  // GET /api/events/:id
  get: async (req, res) => {
    try {
      const e = await Event.findByPk(req.params.id, { include: [includeCreator] });
      if (!e) return res.status(404).json({ message: 'Event not found' });
      res.json({ event: scrubReportFor(req.user, e) });
    } catch (error) {
      console.error('Event get error:', error);
      res.status(500).json({ message: 'Failed to load event' });
    }
  },

  // POST /api/events  (CREATOR_ROLES)
  // Multipart: fields 'image' (≤10MB), 'video' (≤80MB). Both optional.
  create: async (req, res) => {
    try {
      if (!CREATOR_ROLES.includes(req.user.role)) {
        return res.status(403).json({ message: 'Not allowed to create events' });
      }
      const title = sanitiseTitle(req.body?.title);
      if (!title) return res.status(400).json({ message: 'Title is required' });
      const startAt = req.body?.startAt ? new Date(req.body.startAt) : null;
      if (!startAt || isNaN(startAt.getTime())) {
        return res.status(400).json({ message: 'Valid startAt is required' });
      }
      const endAt = req.body?.endAt ? new Date(req.body.endAt) : null;
      if (endAt && (isNaN(endAt.getTime()) || endAt < startAt)) {
        return res.status(400).json({ message: 'endAt must be after startAt' });
      }

      // Block-list check (admin can still create on a blocked date)
      if (!['ADMIN', 'HOD'].includes(req.user.role)) {
        const blocked = await findBlockingDate(startAt);
        if (blocked) {
          return res.status(400).json({
            message: `${startAt.toDateString()} is blocked${blocked.reason ? `: ${blocked.reason}` : ''}`,
          });
        }
      }

      // Files
      const imageFile = req.files?.image?.[0] || null;
      const videoFile = req.files?.video?.[0] || null;
      if (imageFile && imageFile.size > IMAGE_MAX) {
        return res.status(400).json({ message: 'Image exceeds 10 MB limit' });
      }
      if (videoFile && videoFile.size > VIDEO_MAX) {
        return res.status(400).json({ message: 'Video exceeds 80 MB limit' });
      }
      let imageUrl = null;
      let videoUrl = null;
      try {
        if (imageFile) {
          imageUrl = await uploadToS3(imageFile.buffer, imageFile.originalname, imageFile.mimetype, 'events/images');
        }
        if (videoFile) {
          videoUrl = await uploadToS3(videoFile.buffer, videoFile.originalname, videoFile.mimetype, 'events/videos');
        }
      } catch (e) {
        console.error('Event upload error:', e);
        // Clean up partial upload
        if (imageUrl) { try { await deleteFromS3(imageUrl); } catch { /* noop */ } }
        return res.status(500).json({ message: 'Failed to upload media' });
      }

      const event = await Event.create({
        title,
        description: sanitiseText(req.body?.description, 5000),
        venue: sanitiseText(req.body?.venue, 500),
        startAt,
        endAt,
        imageUrl,
        videoUrl,
        registrationUrl: sanitiseUrl(req.body?.registrationUrl),
        createdBy: req.user.id,
      });

      const full = await Event.findByPk(event.id, { include: [includeCreator] });
      res.status(201).json({ event: scrubReportFor(req.user, full) });
    } catch (error) {
      console.error('Event create error:', error);
      res.status(500).json({ message: 'Failed to create event' });
    }
  },

  // PATCH /api/events/:id  (creator or admin)
  // Multipart-aware: replacement image/video allowed. NOT for the report
  // (separate endpoint).
  update: async (req, res) => {
    try {
      const event = await Event.findByPk(req.params.id);
      if (!event) return res.status(404).json({ message: 'Event not found' });
      if (!canEdit(req.user, event)) return res.status(403).json({ message: 'Forbidden' });

      const patch = {};
      if (req.body?.title !== undefined) {
        const t = sanitiseTitle(req.body.title);
        if (!t) return res.status(400).json({ message: 'Title cannot be empty' });
        patch.title = t;
      }
      if (req.body?.description !== undefined) patch.description = sanitiseText(req.body.description, 5000);
      if (req.body?.venue !== undefined) patch.venue = sanitiseText(req.body.venue, 500);
      if (req.body?.startAt !== undefined) {
        const d = req.body.startAt ? new Date(req.body.startAt) : null;
        if (!d || isNaN(d.getTime())) return res.status(400).json({ message: 'Invalid startAt' });
        if (!['ADMIN', 'HOD'].includes(req.user.role)) {
          const blocked = await findBlockingDate(d);
          if (blocked) {
            return res.status(400).json({
              message: `${d.toDateString()} is blocked${blocked.reason ? `: ${blocked.reason}` : ''}`,
            });
          }
        }
        patch.startAt = d;
      }
      if (req.body?.endAt !== undefined) {
        if (req.body.endAt === null || req.body.endAt === '') patch.endAt = null;
        else {
          const d = new Date(req.body.endAt);
          if (isNaN(d.getTime())) return res.status(400).json({ message: 'Invalid endAt' });
          patch.endAt = d;
        }
      }
      if (req.body?.registrationUrl !== undefined) patch.registrationUrl = sanitiseUrl(req.body.registrationUrl);
      if (req.body?.status !== undefined) {
        if (!['SCHEDULED', 'CANCELLED'].includes(req.body.status)) {
          return res.status(400).json({ message: 'Invalid status' });
        }
        patch.status = req.body.status;
      }

      // Media replacement
      const imageFile = req.files?.image?.[0] || null;
      const videoFile = req.files?.video?.[0] || null;
      if (imageFile) {
        if (imageFile.size > IMAGE_MAX) return res.status(400).json({ message: 'Image exceeds 10 MB' });
        try {
          if (event.imageUrl) { try { await deleteFromS3(event.imageUrl); } catch { /* noop */ } }
          patch.imageUrl = await uploadToS3(imageFile.buffer, imageFile.originalname, imageFile.mimetype, 'events/images');
        } catch (e) { console.error(e); return res.status(500).json({ message: 'Failed to upload image' }); }
      }
      if (videoFile) {
        if (videoFile.size > VIDEO_MAX) return res.status(400).json({ message: 'Video exceeds 80 MB' });
        try {
          if (event.videoUrl) { try { await deleteFromS3(event.videoUrl); } catch { /* noop */ } }
          patch.videoUrl = await uploadToS3(videoFile.buffer, videoFile.originalname, videoFile.mimetype, 'events/videos');
        } catch (e) { console.error(e); return res.status(500).json({ message: 'Failed to upload video' }); }
      }

      await event.update(patch);
      const full = await Event.findByPk(event.id, { include: [includeCreator] });
      res.json({ event: scrubReportFor(req.user, full) });
    } catch (error) {
      console.error('Event update error:', error);
      res.status(500).json({ message: 'Failed to update event' });
    }
  },

  // DELETE /api/events/:id  (creator or admin)
  remove: async (req, res) => {
    try {
      const event = await Event.findByPk(req.params.id);
      if (!event) return res.status(404).json({ message: 'Event not found' });
      if (!canEdit(req.user, event)) return res.status(403).json({ message: 'Forbidden' });
      // Best-effort: remove S3 assets
      for (const url of [event.imageUrl, event.videoUrl, event.postReportUrl]) {
        if (url) { try { await deleteFromS3(url); } catch { /* noop */ } }
      }
      await event.destroy();
      res.json({ message: 'Event deleted', id: req.params.id });
    } catch (error) {
      console.error('Event delete error:', error);
      res.status(500).json({ message: 'Failed to delete event' });
    }
  },

  // POST /api/events/:id/report  (creator only)
  // Multipart 'report' field (PDF/DOC/DOCX, ≤25 MB enforced by multer)
  uploadReport: async (req, res) => {
    try {
      const event = await Event.findByPk(req.params.id);
      if (!event) return res.status(404).json({ message: 'Event not found' });
      if (req.user.id !== event.createdBy && !['ADMIN', 'HOD'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Only the event creator can upload the report' });
      }
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

      try {
        if (event.postReportUrl) { try { await deleteFromS3(event.postReportUrl); } catch { /* noop */ } }
        const url = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype, 'events/reports');
        await event.update({
          postReportUrl: url,
          postReportName: req.file.originalname,
          postReportMime: req.file.mimetype,
          postReportUploadedAt: new Date(),
        });
      } catch (e) {
        console.error('Report upload error:', e);
        return res.status(500).json({ message: 'Failed to upload report' });
      }

      const full = await Event.findByPk(event.id, { include: [includeCreator] });
      res.json({ event: scrubReportFor(req.user, full) });
    } catch (error) {
      console.error('Event uploadReport error:', error);
      res.status(500).json({ message: 'Failed to upload report' });
    }
  },

  // GET /api/events/report?start=ISO&end=ISO  (ADMIN only)
  // Returns the data needed to build a PDF export of events in a date range.
  // Admin always sees the post-event report metadata (no scrub).
  report: async (req, res) => {
    try {
      if (!['ADMIN', 'HOD'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Admin only' });
      }
      const start = req.query.start ? new Date(req.query.start) : null;
      const end = req.query.end ? new Date(req.query.end) : null;
      const where = {};
      if ((start && !isNaN(start.getTime())) || (end && !isNaN(end.getTime()))) {
        where.startAt = {};
        if (start && !isNaN(start.getTime())) where.startAt[Op.gte] = start;
        if (end && !isNaN(end.getTime())) where.startAt[Op.lte] = end;
      }

      const rows = await Event.findAll({
        where,
        include: [includeCreator],
        order: [['startAt', 'ASC']],
      });

      // Per-status counts
      const byStatus = { SCHEDULED: 0, CANCELLED: 0 };
      const byCreatorRole = {};
      for (const r of rows) {
        byStatus[r.status] = (byStatus[r.status] || 0) + 1;
        const role = r.Creator?.approvedRole || 'UNKNOWN';
        byCreatorRole[role] = (byCreatorRole[role] || 0) + 1;
      }

      const now = Date.now();
      const events = rows.map((r) => {
        const startTs = new Date(r.startAt).getTime();
        const endTs = r.endAt ? new Date(r.endAt).getTime() : startTs;
        const isPast = endTs < now;
        return {
          id: r.id,
          title: r.title,
          venue: r.venue || '',
          description: r.description || '',
          startAt: r.startAt,
          endAt: r.endAt || null,
          status: r.status,
          isPast,
          creatorName: r.Creator ? `${r.Creator.firstName} ${r.Creator.lastName || ''}`.trim() : '—',
          creatorEmail: r.Creator?.email || '',
          creatorRole: r.Creator?.approvedRole || '',
          hasImage: !!r.imageUrl,
          hasVideo: !!r.videoUrl,
          imageUrl: r.imageUrl || '',
          videoUrl: r.videoUrl || '',
          registrationUrl: r.registrationUrl || '',
          hasRegistration: !!r.registrationUrl,
          reportUploaded: !!r.postReportUrl,
          reportName: r.postReportName || '',
          reportUrl: r.postReportUrl || '',
          reportUploadedAt: r.postReportUploadedAt || null,
        };
      });

      res.json({
        meta: {
          start: start && !isNaN(start.getTime()) ? start.toISOString() : null,
          end: end && !isNaN(end.getTime()) ? end.toISOString() : null,
          generatedAt: new Date().toISOString(),
          generatedBy: req.user?.email || 'admin',
          totalEvents: rows.length,
          byStatus,
          byCreatorRole,
          pastCount: events.filter((e) => e.isPast).length,
          upcomingCount: events.filter((e) => !e.isPast).length,
          reportsUploaded: events.filter((e) => e.reportUploaded).length,
        },
        events,
      });
    } catch (error) {
      console.error('Event report error:', error);
      res.status(500).json({ message: 'Failed to generate events report' });
    }
  },

  // DELETE /api/events/:id/report  (creator or admin) — removes the report file
  removeReport: async (req, res) => {
    try {
      const event = await Event.findByPk(req.params.id);
      if (!event) return res.status(404).json({ message: 'Event not found' });
      if (!canSeeReport(req.user, event)) return res.status(403).json({ message: 'Forbidden' });
      if (!event.postReportUrl) return res.status(400).json({ message: 'No report to remove' });
      try { await deleteFromS3(event.postReportUrl); } catch { /* noop */ }
      await event.update({
        postReportUrl: null,
        postReportName: null,
        postReportMime: null,
        postReportUploadedAt: null,
      });
      res.json({ message: 'Report removed' });
    } catch (error) {
      console.error('Event removeReport error:', error);
      res.status(500).json({ message: 'Failed to remove report' });
    }
  },
};

// === BLOCKED DATES ========================================================
// Stored as date-only rows (one per blocked day). Admin only for write.

eventController.listBlockedDates = async (req, res) => {
  try {
    const rows = await BlockedDate.findAll({
      include: [{ model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['date', 'ASC']],
    });
    res.json({ blockedDates: rows });
  } catch (error) {
    console.error('BlockedDate list error:', error);
    res.status(500).json({ message: 'Failed to load blocked dates' });
  }
};

eventController.blockDate = async (req, res) => {
  try {
    if (!['ADMIN', 'HOD'].includes(req.user.role)) return res.status(403).json({ message: 'Admin only' });
    const date = (req.body?.date || '').toString().trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'date must be YYYY-MM-DD' });
    }
    const reason = req.body?.reason ? String(req.body.reason).slice(0, 500) : null;

    // Refuse if there's already an event on that date
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59.999`);
    const existing = await Event.count({ where: { startAt: { [Op.gte]: dayStart, [Op.lte]: dayEnd } } });
    if (existing > 0) {
      return res.status(400).json({
        message: `Cannot block ${date}: ${existing} event(s) are already scheduled on that day. Delete or reschedule them first.`,
      });
    }

    const [row, created] = await BlockedDate.findOrCreate({
      where: { date },
      defaults: { date, reason, createdBy: req.user.id },
    });
    if (!created && (reason !== row.reason)) {
      await row.update({ reason, createdBy: req.user.id });
    }
    const full = await BlockedDate.findByPk(row.id, {
      include: [{ model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName', 'email'] }],
    });
    res.status(created ? 201 : 200).json({ blockedDate: full });
  } catch (error) {
    console.error('BlockedDate block error:', error);
    res.status(500).json({ message: 'Failed to block date' });
  }
};

// POST /api/events/blocked-dates/bulk
// body: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', reason?: string }
// Blocks every date inclusive in the range. Skips dates that already have
// events (with a reason in the skipped[] list) and dates already blocked.
eventController.bulkBlockDates = async (req, res) => {
  try {
    if (!['ADMIN', 'HOD'].includes(req.user.role)) return res.status(403).json({ message: 'Admin only' });
    const from = (req.body?.from || '').toString().trim();
    const to = (req.body?.to || '').toString().trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ message: 'from and to must be YYYY-MM-DD' });
    }
    if (from > to) return res.status(400).json({ message: 'from must be before or equal to to' });
    const reason = req.body?.reason ? String(req.body.reason).slice(0, 500) : null;

    // Build the date list (inclusive)
    const dates = [];
    const cursor = new Date(`${from}T00:00:00`);
    const last = new Date(`${to}T00:00:00`);
    // Hard cap to avoid abuse (e.g. accidentally blocking 50 years)
    const MAX_DAYS = 366 * 2;
    while (cursor <= last) {
      if (dates.length >= MAX_DAYS) {
        return res.status(400).json({ message: `Range too large (max ${MAX_DAYS} days)` });
      }
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, '0');
      const d = String(cursor.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
      cursor.setDate(cursor.getDate() + 1);
    }

    // Pre-load: any events already in any of those days?
    const dayStart = new Date(`${dates[0]}T00:00:00`);
    const dayEnd = new Date(`${dates[dates.length - 1]}T23:59:59.999`);
    const eventsInRange = await Event.findAll({
      where: { startAt: { [Op.gte]: dayStart, [Op.lte]: dayEnd } },
      attributes: ['startAt'],
    });
    const datesWithEvents = new Set(eventsInRange.map((e) => {
      const dt = new Date(e.startAt);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    }));

    // Already-blocked
    const existing = await BlockedDate.findAll({ where: { date: { [Op.in]: dates } }, attributes: ['date'] });
    const alreadyBlocked = new Set(existing.map((b) => {
      // DATEONLY columns come back as 'YYYY-MM-DD' strings in MySQL but in some
      // builds may be Date objects. Normalize.
      if (typeof b.date === 'string') return b.date;
      const d = new Date(b.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }));

    const blocked = [];
    const skipped = [];
    for (const date of dates) {
      if (alreadyBlocked.has(date)) { skipped.push({ date, reason: 'already blocked' }); continue; }
      if (datesWithEvents.has(date)) { skipped.push({ date, reason: 'event scheduled on this day' }); continue; }
      blocked.push({ date, reason, createdBy: req.user.id });
    }

    if (blocked.length) {
      await BlockedDate.bulkCreate(blocked, { ignoreDuplicates: true });
    }

    res.status(201).json({
      blockedCount: blocked.length,
      skippedCount: skipped.length,
      blocked: blocked.map((b) => b.date),
      skipped,
    });
  } catch (error) {
    console.error('BlockedDate bulkBlockDates error:', error);
    res.status(500).json({ message: 'Failed to bulk block' });
  }
};

eventController.unblockDate = async (req, res) => {
  try {
    if (!['ADMIN', 'HOD'].includes(req.user.role)) return res.status(403).json({ message: 'Admin only' });
    const row = await BlockedDate.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Not blocked' });
    await row.destroy();
    res.json({ message: 'Date unblocked', id: req.params.id });
  } catch (error) {
    console.error('BlockedDate unblock error:', error);
    res.status(500).json({ message: 'Failed to unblock' });
  }
};

module.exports = eventController;
module.exports.CREATOR_ROLES = CREATOR_ROLES;
