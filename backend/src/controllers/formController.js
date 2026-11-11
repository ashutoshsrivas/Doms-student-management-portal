const crypto = require('crypto');
const { Op } = require('sequelize');
const {
  Form,
  FormResponse,
  FORM_FIELD_TYPES,
  FORM_THEMES,
  StudentSession,
  AcademicSession,
  User,
  sequelize,
} = require('../models');
const { cleanRich, richFromText } = require('../utils/formRichText');
const { uploadToS3 } = require('../utils/s3Upload');

// Building forms is an administrative job: ADMIN, HOD and — through the
// COORDINATOR alias — academic coordinators.
const isAdminish = (user) => ['ADMIN', 'HOD'].includes(user.role);
// Editing stays with whoever built the form, plus a full admin.
const canEdit = (form, user) => form.createdBy === user.id || user.role === 'ADMIN';
const fullName = (u) => (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || '' : '');

// The distance bands the security check reports, in metres.
const GREEN_UPTO = 50;
const YELLOW_UPTO = 200;
const bandFor = (metres) => {
  if (metres === null) return null;
  if (metres <= GREEN_UPTO) return 'GREEN';
  if (metres <= YELLOW_UPTO) return 'YELLOW';
  return 'RED';
};

// Great-circle distance in metres. Good to a fraction of a percent at the
// scales this check cares about, and far simpler than a geodesic solver.
function distanceMetres(lat1, lon1, lat2, lon2) {
  const R = 6371008.8;
  const toRad = (d) => (Number(d) * Math.PI) / 180;
  const p1 = toRad(lat1);
  const p2 = toRad(lat2);
  const dp = p2 - p1;
  const dl = toRad(lon2) - toRad(lon1);
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Unguessable, so a form that is published but unlisted stays unlisted.
const makeSlug = () => crypto.randomBytes(7).toString('hex');

// Choice options are stored as { label, rich, media } but older rows (and a
// bulk import) may hold plain strings, so everything that reads them goes
// through here.
const optionObjects = (field) => (Array.isArray(field?.options) ? field.options : [])
  .map((o) => (typeof o === 'string' ? { label: o } : o))
  .filter((o) => o && typeof o === 'object' && String(o.label || '').trim())
  .map((o) => ({ ...o, label: String(o.label).trim() }));
const optionLabels = (field) => optionObjects(field).map((o) => o.label);

// A question's picture or clip, and a responder's uploaded file, may only
// point at storage we own. A builder cannot aim a question at some other
// host — that would quietly hand every responder's IP address to a stranger.
function isOwnMediaUrl(url) {
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

const MEDIA_KINDS = ['image', 'video'];
function cleanMedia(raw) {
  if (!raw || typeof raw !== 'object') return undefined;
  const url = String(raw.url || '').trim();
  if (!url || !isOwnMediaUrl(url)) return undefined;
  return {
    kind: MEDIA_KINDS.includes(raw.kind) ? raw.kind : 'image',
    url: url.slice(0, 1024),
    name: String(raw.name || '').trim().slice(0, 255) || undefined,
  };
}

// What a file question will accept, and the MIME families behind each.
const FILE_ACCEPTS = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
  ],
};
FILE_ACCEPTS.any = [...FILE_ACCEPTS.image, ...FILE_ACCEPTS.document, 'application/zip', 'application/x-zip-compressed'];
const FILE_MAX_MB = 25;

// ---------------------------------------------------------------------------
// The rotating QR code.
//
// A code on screen is a URL carrying a token that expires, so a photograph of
// it is useless a few seconds later. Tokens are signed, not stored: an HMAC
// over the slug and the expiry, keyed on JWT_SECRET. Nothing to clean up, and
// a backend restart does not invalidate a code mid-scan.
//
// Two kinds. A `live` token is what the displayed code carries and lasts a
// couple of refresh windows. A `pass` is issued once a live code has been
// accepted and lasts long enough to actually fill the form in, so a responder
// is never thrown out half way through by a code rotating behind them.
// ---------------------------------------------------------------------------
const QR_PASS_SECONDS = 3 * 60 * 60;

const qrSign = (slug, exp, kind) => crypto
  .createHmac('sha256', String(process.env.JWT_SECRET || 'doms-forms'))
  .update(`formqr:${kind}:${slug}:${exp}`)
  .digest('hex')
  .slice(0, 32);

const makeQrToken = (slug, ttlSeconds, kind) => {
  const exp = Date.now() + ttlSeconds * 1000;
  return `${exp}.${qrSign(slug, exp, kind)}`;
};

function qrTokenValid(slug, token, kind) {
  const [expPart, sig] = String(token || '').split('.');
  const exp = Number(expPart);
  if (!Number.isFinite(exp) || !sig || exp < Date.now()) return false;
  const expected = qrSign(slug, exp, kind);
  if (sig.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

// A request may arrive with a live code (fresh scan) or with a pass (already
// scanned, still filling it in). Either opens the form.
const qrEntryOk = (form, token, pass) =>
  qrTokenValid(form.slug, token, 'live') || qrTokenValid(form.slug, pass, 'pass');

// A browser will not tell us a MAC address, so we hash what it does tell us.
// Same device, same browser, same screen -> same hash.
function fingerprint(signals, userAgent) {
  const s = signals && typeof signals === 'object' ? signals : {};
  const parts = [
    userAgent || '',
    s.platform || '',
    s.screen || '',
    s.timezone || '',
    s.language || '',
    String(s.cores || ''),
    String(s.memory || ''),
    s.canvas || '',
    s.webgl || '',
    String(s.touch || ''),
  ];
  if (!parts.some((p) => p)) return null;
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32);
}

// "Chrome 141 on Windows" — read off the signals the client sent, falling
// back to a crude user-agent sniff.
function deviceLabel(signals, userAgent) {
  const s = signals && typeof signals === 'object' ? signals : {};
  if (s.browser || s.os) return [s.browser, s.os].filter(Boolean).join(' on ').slice(0, 255);
  const ua = String(userAgent || '');
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari' : 'Unknown browser';
  const os = /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad/.test(ua) ? 'iOS'
    : /Mac OS X/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux' : 'unknown OS';
  return `${browser} on ${os}`;
}

const clientIp = (req) => {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return (fwd || req.ip || '').slice(0, 64) || null;
};

// Sanitise the field list a builder sends. Ids are kept when they come back
// unchanged, so answers already collected stay attached to their question.
//
// Every formatted value is stored twice: as the span tree the fill page
// renders, and as flattened plain text. The plain text is what a CSV header,
// a tally and a choice answer are matched on, so collected data never depends
// on how a question was styled.
function cleanFields(input) {
  if (!Array.isArray(input)) return { error: 'Add at least one question' };
  const out = [];
  const seen = new Set();
  for (const raw of input) {
    const labelRich = cleanRich(raw?.labelRich, 600);
    const label = (labelRich.text || String(raw?.label || '')).trim();
    if (!label) return { error: 'Every question needs a label' };
    const type = FORM_FIELD_TYPES.includes(raw?.type) ? raw.type : 'short_text';
    const id = String(raw?.id || '').trim() || crypto.randomBytes(4).toString('hex');
    if (seen.has(id)) return { error: `Two questions share the id "${id}"` };
    seen.add(id);

    const helpRich = cleanRich(raw?.helpRich, 600);
    const help = (helpRich.text || String(raw?.help || '')).trim();

    const field = {
      id,
      label: label.slice(0, 300),
      type,
      required: !!raw?.required,
      placeholder: String(raw?.placeholder || '').trim().slice(0, 200) || undefined,
      help: help.slice(0, 600) || undefined,
      labelRich: labelRich.rich || undefined,
      helpRich: helpRich.rich || undefined,
      media: cleanMedia(raw?.media),
    };

    if (['single_choice', 'multi_choice', 'dropdown'].includes(type)) {
      const options = [];
      for (const rawOption of (Array.isArray(raw?.options) ? raw.options : []).slice(0, 60)) {
        const asObject = typeof rawOption === 'string' ? { label: rawOption } : rawOption;
        if (!asObject || typeof asObject !== 'object') continue;
        const rich = cleanRich(asObject.rich, 300);
        const text = (rich.text || String(asObject.label || '')).trim();
        if (!text) continue;
        options.push({
          label: text.slice(0, 300),
          rich: rich.rich || undefined,
          media: cleanMedia(asObject.media),
        });
      }
      if (!options.length) return { error: `"${label}" needs at least one option` };
      const labels = options.map((o) => o.label);
      if (new Set(labels).size !== labels.length) return { error: `"${label}" has a repeated option` };
      field.options = options;
    }

    if (type === 'file') {
      field.accept = ['image', 'document', 'any'].includes(raw?.accept) ? raw.accept : 'any';
      const mb = Number(raw?.maxSizeMb);
      field.maxSizeMb = Number.isFinite(mb) ? Math.min(FILE_MAX_MB, Math.max(1, Math.round(mb))) : 10;
    }

    out.push(field);
  }
  if (!out.length) return { error: 'Add at least one question' };
  if (out.length > 100) return { error: 'A form can hold at most 100 questions' };
  return { fields: out };
}

// What a responder is allowed to see: never the security point, never who
// else has answered.
const publicForm = (form) => ({
  id: form.id,
  slug: form.slug,
  title: form.title,
  description: form.description || '',
  audience: form.audience,
  fields: form.fields || [],
  collectLocation: !!form.collectLocation,
  collectDevice: !!form.collectDevice,
  locationRequired: !!form.locationRequired,
  closesAt: form.closesAt,
  headerImageUrl: form.headerImageUrl || null,
  theme: form.theme || 'indigo',
});

const staffForm = (form, responseCount) => ({
  id: form.id,
  slug: form.slug,
  title: form.title,
  description: form.description || '',
  audience: form.audience,
  status: form.status,
  fields: form.fields || [],
  collectLocation: !!form.collectLocation,
  collectDevice: !!form.collectDevice,
  locationRequired: !!form.locationRequired,
  oneResponsePerUser: !!form.oneResponsePerUser,
  headerImageUrl: form.headerImageUrl || null,
  theme: form.theme || 'indigo',
  requireQrToken: !!form.requireQrToken,
  qrWindowSeconds: Number(form.qrWindowSeconds) || 20,
  securityPoint: form.checkLatitude === null || form.checkLatitude === undefined ? null : {
    latitude: Number(form.checkLatitude),
    longitude: Number(form.checkLongitude),
    label: form.checkLabel || '',
    setAt: form.checkSetAt,
  },
  publishedAt: form.publishedAt,
  closesAt: form.closesAt,
  createdAt: form.createdAt,
  updatedAt: form.updatedAt,
  createdBy: form.createdBy,
  createdByName: fullName(form.Creator),
  responseCount: responseCount ?? undefined,
});

// Details a signed-in responder should not have to type again.
async function autofillFor(user) {
  const row = await StudentSession.findOne({
    where: { userId: user.id },
    include: [{ model: AcademicSession, attributes: ['name'] }],
    order: [['createdAt', 'DESC']],
  });
  return {
    name: fullName(user),
    email: user.email || '',
    registrationNumber: user.registrationNumber || '',
    session: row?.AcademicSession?.name || '',
  };
}

// ---------------------------------------------------------------------------
// Staff side
// ---------------------------------------------------------------------------

exports.list = async (req, res, next) => {
  try {
    if (!isAdminish(req.user)) return res.status(403).json({ message: 'Only an admin, HOD or coordinator can manage forms' });
    const forms = await Form.findAll({
      include: [{ model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['createdAt', 'DESC']],
    });
    const counts = await FormResponse.findAll({
      attributes: ['formId', [sequelize.fn('COUNT', sequelize.col('id')), 'n']],
      group: ['formId'],
      raw: true,
    });
    const byForm = new Map(counts.map((c) => [c.formId, Number(c.n)]));
    res.json({ forms: forms.map((f) => staffForm(f, byForm.get(f.id) || 0)) });
  } catch (e) { next(e); }
};

exports.getOne = async (req, res, next) => {
  try {
    if (!isAdminish(req.user)) return res.status(403).json({ message: 'Only an admin, HOD or coordinator can manage forms' });
    const form = await Form.findByPk(req.params.id, {
      include: [{ model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName', 'email'] }],
    });
    if (!form) return res.status(404).json({ message: 'Form not found' });
    const responseCount = await FormResponse.count({ where: { formId: form.id } });
    res.json({ form: staffForm(form, responseCount), canEdit: canEdit(form, req.user) });
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    if (!isAdminish(req.user)) return res.status(403).json({ message: 'Only an admin, HOD or coordinator can manage forms' });
    const title = String(req.body?.title || '').trim();
    if (!title) return res.status(400).json({ message: 'Give the form a title' });
    const audience = req.body?.audience === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE';

    // A new form starts with one question so the builder is never empty.
    const seed = [{ id: crypto.randomBytes(4).toString('hex'), label: 'Your answer', type: 'short_text', required: true }];
    const form = await Form.create({
      title: title.slice(0, 300),
      description: String(req.body?.description || '').trim().slice(0, 5000) || null,
      slug: makeSlug(),
      audience,
      status: 'DRAFT',
      fields: seed,
      createdBy: req.user.id,
    });
    res.status(201).json({ message: 'Form created', form: staffForm(form, 0) });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    if (!isAdminish(req.user)) return res.status(403).json({ message: 'Only an admin, HOD or coordinator can manage forms' });
    const form = await Form.findByPk(req.params.id);
    if (!form) return res.status(404).json({ message: 'Form not found' });
    if (!canEdit(form, req.user)) return res.status(403).json({ message: 'Only the form owner or an admin can change this form' });

    const patch = {};
    if (req.body?.title !== undefined) {
      const title = String(req.body.title || '').trim();
      if (!title) return res.status(400).json({ message: 'Give the form a title' });
      patch.title = title.slice(0, 300);
    }
    if (req.body?.description !== undefined) {
      patch.description = String(req.body.description || '').trim().slice(0, 5000) || null;
    }
    if (req.body?.audience !== undefined) {
      const next_ = req.body.audience === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE';
      // Switching after people have answered would make the collected rows
      // mean something different, so that stays locked.
      const answered = await FormResponse.count({ where: { formId: form.id } });
      if (answered && next_ !== form.audience) {
        return res.status(400).json({ message: 'This form already has responses — public/private cannot be switched now' });
      }
      patch.audience = next_;
    }
    for (const key of ['collectLocation', 'collectDevice', 'locationRequired', 'oneResponsePerUser', 'requireQrToken']) {
      if (req.body?.[key] !== undefined) patch[key] = !!req.body[key];
    }
    if (req.body?.theme !== undefined) {
      patch.theme = FORM_THEMES.includes(req.body.theme) ? req.body.theme : 'indigo';
    }
    if (req.body?.headerImageUrl !== undefined) {
      const url = String(req.body.headerImageUrl || '').trim();
      if (!url) patch.headerImageUrl = null;
      else if (!isOwnMediaUrl(url)) return res.status(400).json({ message: 'That header image is not one of ours — upload it here instead of linking to another site.' });
      else patch.headerImageUrl = url.slice(0, 1024);
    }
    if (req.body?.qrWindowSeconds !== undefined) {
      const secs = Number(req.body.qrWindowSeconds);
      // Under ten seconds a code rotates faster than a phone can focus on it.
      patch.qrWindowSeconds = Number.isFinite(secs) ? Math.min(300, Math.max(10, Math.round(secs))) : 20;
    }
    if (req.body?.closesAt !== undefined) {
      const raw = req.body.closesAt;
      if (!raw) patch.closesAt = null;
      else {
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return res.status(400).json({ message: 'That closing date is not a date' });
        patch.closesAt = d;
      }
    }
    if (req.body?.fields !== undefined) {
      const { fields, error } = cleanFields(req.body.fields);
      if (error) return res.status(400).json({ message: error });
      patch.fields = fields;
    }

    await form.update(patch);
    const responseCount = await FormResponse.count({ where: { formId: form.id } });
    res.json({ message: 'Form saved', form: staffForm(form, responseCount) });
  } catch (e) { next(e); }
};

exports.setStatus = async (req, res, next) => {
  try {
    if (!isAdminish(req.user)) return res.status(403).json({ message: 'Only an admin, HOD or coordinator can manage forms' });
    const form = await Form.findByPk(req.params.id);
    if (!form) return res.status(404).json({ message: 'Form not found' });
    if (!canEdit(form, req.user)) return res.status(403).json({ message: 'Only the form owner or an admin can change this form' });

    const status = String(req.body?.status || '').toUpperCase();
    if (!['DRAFT', 'PUBLISHED', 'CLOSED'].includes(status)) {
      return res.status(400).json({ message: 'Status must be DRAFT, PUBLISHED or CLOSED' });
    }
    if (status === 'PUBLISHED' && !(form.fields || []).length) {
      return res.status(400).json({ message: 'Add a question before publishing' });
    }
    await form.update({
      status,
      publishedAt: status === 'PUBLISHED' && !form.publishedAt ? new Date() : form.publishedAt,
    });
    const messages = {
      PUBLISHED: 'Form published — the link is live',
      CLOSED: 'Form closed — it no longer accepts responses',
      DRAFT: 'Form moved back to draft',
    };
    res.json({ message: messages[status], form: staffForm(form) });
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    if (!isAdminish(req.user)) return res.status(403).json({ message: 'Only an admin, HOD or coordinator can manage forms' });
    const form = await Form.findByPk(req.params.id);
    if (!form) return res.status(404).json({ message: 'Form not found' });
    if (!canEdit(form, req.user)) return res.status(403).json({ message: 'Only the form owner or an admin can delete this form' });

    // Deleting a form throws away its responses, so say how many first: the
    // caller has to send ?confirm=1 once it has shown that number.
    const answered = await FormResponse.count({ where: { formId: form.id } });
    if (answered && req.query.confirm !== '1') {
      return res.status(409).json({
        message: `This form holds ${answered} response${answered === 1 ? '' : 's'}. Download them first — deleting the form deletes them too.`,
        responseCount: answered,
        needsConfirm: true,
      });
    }
    await FormResponse.destroy({ where: { formId: form.id } });
    await form.destroy();
    res.json({ message: 'Form deleted', removedResponses: answered });
  } catch (e) { next(e); }
};

// The reference point for the security check: wherever the member of staff
// running the check is standing.
exports.setSecurityPoint = async (req, res, next) => {
  try {
    if (!isAdminish(req.user)) return res.status(403).json({ message: 'Only an admin, HOD or coordinator can manage forms' });
    const form = await Form.findByPk(req.params.id);
    if (!form) return res.status(404).json({ message: 'Form not found' });

    const lat = Number(req.body?.latitude);
    const lng = Number(req.body?.longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return res.status(400).json({ message: 'That latitude is not a latitude' });
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) return res.status(400).json({ message: 'That longitude is not a longitude' });

    await form.update({
      checkLatitude: lat,
      checkLongitude: lng,
      checkLabel: String(req.body?.label || '').trim().slice(0, 255) || null,
      checkSetAt: new Date(),
      checkSetBy: req.user.id,
    });
    res.json({ message: 'Reference point set — distances are measured from here', form: staffForm(form) });
  } catch (e) { next(e); }
};

exports.clearSecurityPoint = async (req, res, next) => {
  try {
    if (!isAdminish(req.user)) return res.status(403).json({ message: 'Only an admin, HOD or coordinator can manage forms' });
    const form = await Form.findByPk(req.params.id);
    if (!form) return res.status(404).json({ message: 'Form not found' });
    await form.update({ checkLatitude: null, checkLongitude: null, checkLabel: null, checkSetAt: null, checkSetBy: null });
    res.json({ message: 'Reference point cleared', form: staffForm(form) });
  } catch (e) { next(e); }
};

// Everything the report needs: the rows, the tallies, which devices came
// back, and — when a reference point is set — how far away each answer was.
async function buildReport(form) {
  const rows = await FormResponse.findAll({
    where: { formId: form.id },
    order: [['createdAt', 'ASC']],
  });

  const seenDevice = new Map();
  for (const r of rows) {
    if (!r.deviceFingerprint) continue;
    seenDevice.set(r.deviceFingerprint, (seenDevice.get(r.deviceFingerprint) || 0) + 1);
  }

  const hasPoint = form.checkLatitude !== null && form.checkLatitude !== undefined;
  const responses = rows.map((r, i) => {
    const hasFix = r.latitude !== null && r.latitude !== undefined;
    const metres = hasPoint && hasFix
      ? Math.round(distanceMetres(form.checkLatitude, form.checkLongitude, r.latitude, r.longitude))
      : null;
    const repeatCount = r.deviceFingerprint ? seenDevice.get(r.deviceFingerprint) || 1 : 1;
    return {
      id: r.id,
      index: i + 1,
      submittedAt: r.createdAt,
      userId: r.userId,
      name: r.respondentName || '',
      email: r.respondentEmail || '',
      registrationNumber: r.respondentRegNo || '',
      session: r.respondentSession || '',
      answers: r.answers || {},
      latitude: hasFix ? Number(r.latitude) : null,
      longitude: hasFix ? Number(r.longitude) : null,
      locationAccuracy: r.locationAccuracy === null ? null : Number(r.locationAccuracy),
      locationStatus: r.locationStatus,
      deviceFingerprint: r.deviceFingerprint || null,
      deviceLabel: r.deviceLabel || '',
      deviceDetails: r.deviceDetails || null,
      deviceStatus: r.deviceStatus,
      ipAddress: r.ipAddress || '',
      repeatedDevice: repeatCount > 1,
      deviceUseCount: repeatCount,
      distanceMetres: metres,
      band: bandFor(metres),
    };
  });

  // Per-question tallies, so the summary is useful without opening the table.
  const fieldStats = (form.fields || []).map((f) => {
    const values = responses.map((r) => r.answers?.[f.id]).filter((v) => v !== undefined && v !== null && v !== '');
    const stat = { id: f.id, label: f.label, type: f.type, answered: values.length };
    if (['single_choice', 'multi_choice', 'dropdown'].includes(f.type)) {
      const tally = new Map(optionLabels(f).map((o) => [o, 0]));
      for (const v of values) {
        for (const one of Array.isArray(v) ? v : [v]) {
          tally.set(one, (tally.get(one) || 0) + 1);
        }
      }
      stat.options = [...tally.entries()].map(([label, count]) => ({ label, count }));
    }
    if (f.type === 'number') {
      const nums = values.map(Number).filter(Number.isFinite);
      if (nums.length) {
        stat.numeric = {
          min: Math.min(...nums),
          max: Math.max(...nums),
          average: Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100,
        };
      }
    }
    return stat;
  });

  const repeatedDevices = [...seenDevice.entries()]
    .filter(([, n]) => n > 1)
    .map(([fp, n]) => ({
      fingerprint: fp,
      count: n,
      label: responses.find((r) => r.deviceFingerprint === fp)?.deviceLabel || '',
      respondents: responses.filter((r) => r.deviceFingerprint === fp).map((r) => r.name || r.email || `#${r.index}`),
    }))
    .sort((a, b) => b.count - a.count);

  const withDistance = responses.filter((r) => r.distanceMetres !== null);
  const stats = {
    total: responses.length,
    withLocation: responses.filter((r) => r.latitude !== null).length,
    locationDenied: responses.filter((r) => r.locationStatus === 'DENIED').length,
    locationUnavailable: responses.filter((r) => r.locationStatus === 'UNAVAILABLE').length,
    uniqueDevices: seenDevice.size,
    deviceDenied: responses.filter((r) => r.deviceStatus === 'DENIED').length,
    repeatedDeviceResponses: responses.filter((r) => r.repeatedDevice).length,
    firstAt: responses[0]?.submittedAt || null,
    lastAt: responses[responses.length - 1]?.submittedAt || null,
    bands: hasPoint ? {
      green: withDistance.filter((r) => r.band === 'GREEN').length,
      yellow: withDistance.filter((r) => r.band === 'YELLOW').length,
      red: withDistance.filter((r) => r.band === 'RED').length,
      unmeasured: responses.length - withDistance.length,
    } : null,
    fields: fieldStats,
    repeatedDevices,
  };

  return { responses, stats };
}

exports.responses = async (req, res, next) => {
  try {
    if (!isAdminish(req.user)) return res.status(403).json({ message: 'Only an admin, HOD or coordinator can see responses' });
    const form = await Form.findByPk(req.params.id, {
      include: [{ model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName', 'email'] }],
    });
    if (!form) return res.status(404).json({ message: 'Form not found' });
    const { responses, stats } = await buildReport(form);
    res.json({
      form: staffForm(form, responses.length),
      bands: { greenUpto: GREEN_UPTO, yellowUpto: YELLOW_UPTO },
      responses,
      stats,
    });
  } catch (e) { next(e); }
};

// Quoting by the book: double the quotes, wrap anything with a comma, quote
// or newline, and keep a leading =/+/-/@ from being read as a formula.
function csvCell(value) {
  let s = value === null || value === undefined ? '' : String(value);
  if (Array.isArray(value)) s = value.join('; ');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

exports.responsesCsv = async (req, res, next) => {
  try {
    if (!isAdminish(req.user)) return res.status(403).json({ message: 'Only an admin, HOD or coordinator can see responses' });
    const form = await Form.findByPk(req.params.id);
    if (!form) return res.status(404).json({ message: 'Form not found' });
    const { responses } = await buildReport(form);
    const fields = form.fields || [];
    const hasPoint = form.checkLatitude !== null && form.checkLatitude !== undefined;

    const header = ['#', 'Submitted at', 'Name', 'Email', 'Registration no', 'Session'];
    for (const f of fields) header.push(f.label);
    if (form.collectLocation) header.push('Latitude', 'Longitude', 'Accuracy (m)', 'Location');
    if (hasPoint) header.push('Distance from reference (m)', 'Band');
    if (form.collectDevice) header.push('Device', 'Device fingerprint', 'Times this device answered', 'Repeated device');
    header.push('IP address');

    const lines = [header.map(csvCell).join(',')];
    for (const r of responses) {
      const row = [
        r.index,
        new Date(r.submittedAt).toISOString(),
        r.name,
        r.email,
        r.registrationNumber,
        r.session,
      ];
      for (const f of fields) {
        const v = r.answers?.[f.id];
        // A file answer is an object; the URL is the useful half of it.
        row.push(v && typeof v === 'object' && !Array.isArray(v) ? (v.url || '') : (v ?? ''));
      }
      if (form.collectLocation) row.push(r.latitude ?? '', r.longitude ?? '', r.locationAccuracy ?? '', r.locationStatus);
      if (hasPoint) row.push(r.distanceMetres ?? '', r.band ?? '');
      if (form.collectDevice) row.push(r.deviceLabel, r.deviceFingerprint ?? '', r.deviceUseCount, r.repeatedDevice ? 'YES' : '');
      row.push(r.ipAddress);
      lines.push(row.map(csvCell).join(','));
    }

    const safeTitle = String(form.title || 'form').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 60) || 'form';
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}-responses-${stamp}.csv"`);
    // Excel reads UTF-8 only when the file starts with a byte-order mark.
    res.send('﻿' + lines.join('\r\n') + '\r\n');
  } catch (e) { next(e); }
};

// ---------------------------------------------------------------------------
// Responder side — no session of its own. A bearer token is read when one is
// sent, but a stale token must never turn a public form into an error page.
// ---------------------------------------------------------------------------

const jwt = require('jsonwebtoken');

async function softUser(req) {
  const token = String(req.headers['authorization'] || '').split(' ')[1];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(payload.id);
    if (!user || user.status !== 'ACTIVE') return null;
    return user;
  } catch {
    return null;
  }
}

const openState = (form) => {
  if (form.status === 'DRAFT') return { open: false, reason: 'This form has not been published yet.' };
  if (form.status === 'CLOSED') return { open: false, reason: 'This form is closed and no longer accepts responses.' };
  if (form.closesAt && new Date(form.closesAt).getTime() < Date.now()) {
    return { open: false, reason: 'This form closed on ' + new Date(form.closesAt).toISOString().slice(0, 10) + '.' };
  }
  return { open: true, reason: null };
};

exports.publicGet = async (req, res, next) => {
  try {
    const form = await Form.findOne({ where: { slug: String(req.params.slug || '') } });
    if (!form) return res.status(404).json({ message: 'This form does not exist.' });

    // A form locked to the rotating code opens only from a code that is still
    // live, or from a pass issued when one was scanned a moment ago.
    let entryPass = null;
    if (form.requireQrToken) {
      if (!qrEntryOk(form, req.query.k, req.query.pass)) {
        return res.status(403).json({
          qrExpired: true,
          title: form.title,
          message: 'This QR code has expired. Scan the code currently on screen.',
        });
      }
      entryPass = makeQrToken(form.slug, QR_PASS_SECONDS, 'pass');
    }

    const state = openState(form);
    if (form.audience === 'PRIVATE') {
      const user = await softUser(req);
      if (!user) {
        return res.status(401).json({
          loginRequired: true,
          title: form.title,
          message: 'Sign in to fill this form.',
        });
      }
      const autofill = await autofillFor(user);
      let alreadyAnswered = null;
      if (form.oneResponsePerUser) {
        const prior = await FormResponse.findOne({ where: { formId: form.id, userId: user.id } });
        if (prior) alreadyAnswered = prior.createdAt;
      }
      return res.json({ form: publicForm(form), ...state, autofill, alreadyAnswered, entryPass });
    }
    res.json({ form: publicForm(form), ...state, autofill: null, alreadyAnswered: null, entryPass });
  } catch (e) { next(e); }
};

// Check one answer against its question. Returns an error string or null.
function validateAnswer(field, value) {
  const empty = value === undefined || value === null || value === ''
    || (Array.isArray(value) && !value.length);
  if (empty) return field.required ? `Please answer: ${field.label}` : null;

  if (field.type === 'file') {
    // The answer is the file we stored for them, not the file itself — it was
    // uploaded in its own request before the form was submitted.
    if (!value || typeof value !== 'object' || Array.isArray(value)) return `${field.label}: upload a file`;
    if (!isOwnMediaUrl(value.url)) return `${field.label}: that upload could not be verified — try uploading it again`;
    return null;
  }
  if (field.type === 'multi_choice') {
    if (!Array.isArray(value)) return `${field.label}: pick from the options`;
    if (value.length > 60) return `${field.label}: too many selections`;
    const allowed = optionLabels(field);
    const bad = value.find((v) => !allowed.includes(v));
    if (bad !== undefined) return `${field.label}: "${bad}" is not one of the options`;
    return null;
  }
  if (value && typeof value === 'object') return `${field.label}: expected a single answer`;
  if (Array.isArray(value)) return `${field.label}: expected a single answer`;
  const s = String(value);
  if (['single_choice', 'dropdown'].includes(field.type)) {
    return optionLabels(field).includes(s) ? null : `${field.label}: "${s}" is not one of the options`;
  }
  if (field.type === 'number' && !Number.isFinite(Number(s))) return `${field.label}: enter a number`;
  if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return `${field.label}: enter an email address`;
  if (field.type === 'date' && Number.isNaN(new Date(s).getTime())) return `${field.label}: enter a date`;
  if (field.type === 'long_text' && s.length > 10000) return `${field.label}: keep it under 10000 characters`;
  if (field.type !== 'long_text' && s.length > 1000) return `${field.label}: keep it under 1000 characters`;
  return null;
}

exports.publicSubmit = async (req, res, next) => {
  try {
    const form = await Form.findOne({ where: { slug: String(req.params.slug || '') } });
    if (!form) return res.status(404).json({ message: 'This form does not exist.' });

    const state = openState(form);
    if (!state.open) return res.status(400).json({ message: state.reason });

    if (form.requireQrToken && !qrEntryOk(form, req.body?.qrToken, req.body?.entryPass)) {
      return res.status(403).json({
        qrExpired: true,
        message: 'This QR code has expired. Scan the code currently on screen and fill the form again.',
      });
    }

    let user = null;
    if (form.audience === 'PRIVATE') {
      user = await softUser(req);
      if (!user) return res.status(401).json({ loginRequired: true, message: 'Sign in to fill this form.' });
      if (form.oneResponsePerUser) {
        const prior = await FormResponse.findOne({ where: { formId: form.id, userId: user.id } });
        if (prior) return res.status(409).json({ message: 'You have already answered this form.', alreadyAnswered: prior.createdAt });
      }
    } else {
      // A public form takes anonymous answers, but if the responder happens
      // to be signed in we keep the link — it costs nothing and helps later.
      user = await softUser(req);
    }

    // Answers, question by question. Unknown keys are dropped.
    const incoming = req.body?.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
    const answers = {};
    for (const field of form.fields || []) {
      const value = incoming[field.id];
      const error = validateAnswer(field, value);
      if (error) return res.status(400).json({ message: error, fieldId: field.id });
      if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) continue;
      if (field.type === 'file') {
        answers[field.id] = {
          url: String(value.url).slice(0, 1024),
          name: String(value.name || 'file').slice(0, 255),
          size: Number.isFinite(Number(value.size)) ? Number(value.size) : null,
          type: String(value.type || '').slice(0, 120) || null,
        };
        continue;
      }
      answers[field.id] = field.type === 'multi_choice'
        ? value.map((v) => String(v).slice(0, 1000))
        : String(value).slice(0, field.type === 'long_text' ? 10000 : 1000);
    }

    // Location, as the browser reported it.
    const loc = req.body?.location && typeof req.body.location === 'object' ? req.body.location : {};
    let latitude = null;
    let longitude = null;
    let locationAccuracy = null;
    let locationStatus = 'NOT_ASKED';
    if (form.collectLocation) {
      const lat = Number(loc.latitude);
      const lng = Number(loc.longitude);
      const granted = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
      if (granted) {
        latitude = lat;
        longitude = lng;
        locationAccuracy = Number.isFinite(Number(loc.accuracy)) ? Number(loc.accuracy) : null;
        locationStatus = 'GRANTED';
      } else {
        locationStatus = ['DENIED', 'UNAVAILABLE'].includes(loc.status) ? loc.status : 'DENIED';
        if (form.locationRequired) {
          return res.status(400).json({
            message: 'This form needs your location. Allow location access in your browser and try again.',
            locationRequired: true,
          });
        }
      }
    }

    // Device signals -> a fingerprint. Not a MAC address; no browser gives one out.
    const userAgent = String(req.headers['user-agent'] || '').slice(0, 2000);
    const signals = req.body?.device && typeof req.body.device === 'object' ? req.body.device : null;
    let deviceFingerprint = null;
    let label = null;
    let details = null;
    let deviceStatus = 'NOT_ASKED';
    if (form.collectDevice) {
      if (signals && req.body?.device?.status !== 'DENIED') {
        deviceFingerprint = fingerprint(signals, userAgent);
        label = deviceLabel(signals, userAgent);
        details = {
          platform: signals.platform || null,
          screen: signals.screen || null,
          timezone: signals.timezone || null,
          language: signals.language || null,
          cores: signals.cores ?? null,
          memory: signals.memory ?? null,
          touch: signals.touch ?? null,
        };
        deviceStatus = deviceFingerprint ? 'GRANTED' : 'DENIED';
      } else {
        deviceStatus = 'DENIED';
      }
    }

    const account = user ? await autofillFor(user) : null;
    const typed = req.body?.respondent && typeof req.body.respondent === 'object' ? req.body.respondent : {};
    // A private form trusts the account and ignores any posted name. A public
    // form asked the responder who they are, so their answer is the one that
    // counts — even when they happen to be signed in; the account is still
    // recorded in user_id. Account details only fill the gaps they leave.
    const pick = (field, typedValue) => {
      const fromAccount = account?.[field] || '';
      if (form.audience === 'PRIVATE') return fromAccount;
      return String(typedValue || '').trim() || fromAccount;
    };
    const row = await FormResponse.create({
      formId: form.id,
      userId: user?.id || null,
      respondentName: pick('name', typed.name).slice(0, 255) || null,
      respondentEmail: pick('email', typed.email).slice(0, 255) || null,
      respondentRegNo: pick('registrationNumber', typed.registrationNumber).slice(0, 100) || null,
      respondentSession: pick('session', typed.session).slice(0, 255) || null,
      answers,
      latitude,
      longitude,
      locationAccuracy,
      locationStatus,
      deviceFingerprint,
      deviceLabel: label,
      deviceDetails: details,
      deviceStatus,
      userAgent,
      ipAddress: clientIp(req),
    });

    res.status(201).json({ message: 'Thank you — your response has been recorded.', id: row.id, submittedAt: row.createdAt });
  } catch (e) { next(e); }
};

// ---------------------------------------------------------------------------
// Uploads and QR codes
// ---------------------------------------------------------------------------

// A picture or clip for a question, an option, or the banner at the top of
// the form. Staff only.
exports.uploadMedia = async (req, res, next) => {
  try {
    if (!isAdminish(req.user)) return res.status(403).json({ message: 'Only an admin, HOD or coordinator can manage forms' });
    const form = await Form.findByPk(req.params.id);
    if (!form) return res.status(404).json({ message: 'Form not found' });
    if (!canEdit(form, req.user)) return res.status(403).json({ message: 'Only the form owner or an admin can change this form' });
    if (!req.file) return res.status(400).json({ message: 'Choose a file to upload' });

    const kind = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    // Multer allows the larger ceiling for both; an image has its own limit.
    if (kind === 'image' && req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ message: 'Keep images under 10 MB' });
    }
    const url = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype, `forms/${form.id}`);
    res.status(201).json({ media: { kind, url, name: req.file.originalname.slice(0, 255) } });
  } catch (e) { next(e); }
};

// A responder's answer to a file question. This is reachable without a login
// on a public form, so it is deliberately narrow: the form must be open, it
// must actually ask for a file, and the file has to match what that question
// accepts. The route in front of it throttles by IP.
exports.publicUpload = async (req, res, next) => {
  try {
    const form = await Form.findOne({ where: { slug: String(req.params.slug || '') } });
    if (!form) return res.status(404).json({ message: 'This form does not exist.' });
    const state = openState(form);
    if (!state.open) return res.status(400).json({ message: state.reason });
    if (form.requireQrToken && !qrEntryOk(form, req.body?.qrToken, req.body?.entryPass)) {
      return res.status(403).json({ qrExpired: true, message: 'This QR code has expired. Scan the code currently on screen.' });
    }
    // A private form's uploads need the same account a submission needs.
    if (form.audience === 'PRIVATE' && !(await softUser(req))) {
      return res.status(401).json({ loginRequired: true, message: 'Sign in to fill this form.' });
    }
    if (!req.file) return res.status(400).json({ message: 'Choose a file to upload' });

    const field = (form.fields || []).find((f) => f.id === String(req.body?.fieldId || '') && f.type === 'file');
    if (!field) return res.status(400).json({ message: 'This form does not ask for that file.' });

    const allowed = FILE_ACCEPTS[field.accept] || FILE_ACCEPTS.any;
    if (!allowed.includes(req.file.mimetype)) {
      return res.status(400).json({
        message: field.accept === 'image'
          ? 'That question takes a picture (JPG, PNG, WEBP, GIF or HEIC).'
          : field.accept === 'document'
            ? 'That question takes a document (PDF, Word, Excel, CSV or text).'
            : `Files of type ${req.file.mimetype || 'unknown'} are not accepted here.`,
      });
    }
    const maxMb = Math.min(FILE_MAX_MB, Math.max(1, Number(field.maxSizeMb) || 10));
    if (req.file.size > maxMb * 1024 * 1024) {
      return res.status(400).json({ message: `Keep this file under ${maxMb} MB.` });
    }

    const url = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype, `form-answers/${form.id}`);
    res.status(201).json({
      file: {
        url,
        name: String(req.file.originalname || 'file').slice(0, 255),
        size: req.file.size,
        type: req.file.mimetype,
      },
    });
  } catch (e) { next(e); }
};

// One turn of the rotating code. The display page asks for a fresh one each
// time it refreshes; the static download uses the plain link instead, which
// never expires.
exports.qrToken = async (req, res, next) => {
  try {
    if (!isAdminish(req.user)) return res.status(403).json({ message: 'Only an admin, HOD or coordinator can manage forms' });
    const form = await Form.findByPk(req.params.id);
    if (!form) return res.status(404).json({ message: 'Form not found' });

    const windowSeconds = Math.min(300, Math.max(10, Number(form.qrWindowSeconds) || 20));
    // Live a little past the refresh, so a scan caught at the last moment
    // still opens the form.
    const token = makeQrToken(form.slug, windowSeconds * 2, 'live');
    res.json({
      slug: form.slug,
      token,
      path: `/f/${form.slug}?k=${encodeURIComponent(token)}`,
      windowSeconds,
      requireQrToken: !!form.requireQrToken,
      status: form.status,
    });
  } catch (e) { next(e); }
};
