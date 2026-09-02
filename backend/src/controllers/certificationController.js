const crypto = require('crypto');
const XLSX = require('xlsx');
const {
  sequelize,
  Certification,
  CertificateAssignment,
  StudentSession,
  User,
} = require('../models');
const { Op } = require('sequelize');
const { uploadToS3, deleteFromS3 } = require('../utils/s3Upload');

const MANAGE_ROLES = ['ADMIN', 'HOD'];
// Roles that may view any student's earned certificates.
const STAFF_VIEW_ROLES = ['ADMIN', 'HOD', 'FACULTY', 'CHAIR_HEAD', 'PLACEMENT_COORDINATOR', 'COORDINATOR', 'MENTOR'];

const canManage = (role) => MANAGE_ROLES.includes(role);

const fullName = (u) =>
  `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || u?.email || '';

// Resolve a field definition to its concrete value for one student at issue time.
function resolveField(field, student, certificateNumber, issueDateStr) {
  switch (field.type) {
    case 'STUDENT_NAME': return fullName(student);
    case 'REGISTRATION_NUMBER': return student.registrationNumber || '';
    case 'EMAIL': return student.email || '';
    case 'ISSUE_DATE': return issueDateStr;
    case 'CERTIFICATE_ID': return certificateNumber;
    case 'CUSTOM_TEXT':
    default:
      return field.value || '';
  }
}

// Re-resolve a certification's CURRENT field definitions against a student at
// read time. Design/field edits therefore reflect on already-issued
// certificates, while the certificate number and issue date stay stable.
function resolvedValuesFor(certification, assignment, student) {
  const fields = shapeCertification(certification).fields;
  const issueDateStr = new Date(assignment.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const map = {};
  for (const f of fields) map[f.id] = resolveField(f, student || {}, assignment.certificateNumber, issueDateStr);
  return map;
}

function genCertificateNumber() {
  const year = new Date().getFullYear();
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 hex chars
  return `GESoM-${year}-${rand}`;
}

// Issue `cert` to each student (idempotent per student), snapshotting field
// values. Returns { created, skipped }. Shared by the manual and Excel flows.
async function issueCertificatesTo(cert, students, issuedById) {
  const fields = shapeCertification(cert).fields;
  const issueDateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  let created = 0;
  let skipped = 0;
  for (const student of students) {
    const existing = await CertificateAssignment.findOne({
      where: { certificationId: cert.id, studentId: student.id },
    });
    if (existing) { skipped += 1; continue; }

    let certificateNumber = genCertificateNumber();
    const fieldValues = {};
    for (const f of fields) fieldValues[f.id] = resolveField(f, student, certificateNumber, issueDateStr);

    let attempts = 0;
    while (attempts < 5) {
      try {
        await CertificateAssignment.create({
          certificationId: cert.id,
          studentId: student.id,
          certificateNumber,
          fieldValues,
          issuedBy: issuedById,
          issuedAt: new Date(),
        });
        created += 1;
        break;
      } catch (e) {
        // (cert, student) is pre-checked, so a unique violation is almost
        // always the certificate number — retry with a fresh one.
        if (e.name === 'SequelizeUniqueConstraintError') {
          attempts += 1;
          if (attempts >= 5) { skipped += 1; break; }
          certificateNumber = genCertificateNumber();
          for (const f of fields) if (f.type === 'CERTIFICATE_ID') fieldValues[f.id] = certificateNumber;
          continue;
        }
        throw e;
      }
    }
  }
  return { created, skipped };
}

// Shape a certification for API responses (parse fields defensively).
function shapeCertification(c) {
  const plain = c.toJSON ? c.toJSON() : c;
  let fields = plain.fields;
  if (typeof fields === 'string') {
    try { fields = JSON.parse(fields); } catch { fields = []; }
  }
  return { ...plain, fields: Array.isArray(fields) ? fields : [] };
}

function shapeAssignment(a) {
  const plain = a.toJSON ? a.toJSON() : a;
  let values = plain.fieldValues;
  if (typeof values === 'string') {
    try { values = JSON.parse(values); } catch { values = {}; }
  }
  return { ...plain, fieldValues: values || {} };
}

module.exports = {
  // ── Templates (management) ────────────────────────────────────
  // POST /api/certifications
  create: async (req, res) => {
    try {
      if (!canManage(req.user.role)) return res.status(403).json({ message: 'Not authorized' });
      const { title, description } = req.body;
      if (!title || !title.trim()) return res.status(400).json({ message: 'Title is required' });
      const cert = await Certification.create({
        title: title.trim(),
        description: description ? String(description) : null,
        createdBy: req.user.id,
      });
      res.status(201).json({ certification: shapeCertification(cert) });
    } catch (err) {
      console.error('certification.create error:', err);
      res.status(500).json({ message: 'Failed to create certification' });
    }
  },

  // GET /api/certifications
  list: async (req, res) => {
    try {
      if (!canManage(req.user.role)) return res.status(403).json({ message: 'Not authorized' });
      const certs = await Certification.findAll({
        include: [{ model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName'] }],
        order: [['createdAt', 'DESC']],
      });
      // Attach issued counts.
      const counts = await CertificateAssignment.findAll({
        attributes: ['certificationId', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
        where: { status: 'ISSUED' },
        group: ['certificationId'],
        raw: true,
      });
      const countMap = {};
      counts.forEach((r) => { countMap[r.certificationId] = parseInt(r.cnt, 10) || 0; });
      const shaped = certs.map((c) => ({ ...shapeCertification(c), issuedCount: countMap[c.id] || 0 }));
      res.json({ certifications: shaped });
    } catch (err) {
      console.error('certification.list error:', err);
      res.status(500).json({ message: 'Failed to list certifications' });
    }
  },

  // GET /api/certifications/:id
  getOne: async (req, res) => {
    try {
      if (!canManage(req.user.role)) return res.status(403).json({ message: 'Not authorized' });
      const cert = await Certification.findByPk(req.params.id);
      if (!cert) return res.status(404).json({ message: 'Certification not found' });
      res.json({ certification: shapeCertification(cert) });
    } catch (err) {
      console.error('certification.getOne error:', err);
      res.status(500).json({ message: 'Failed to fetch certification' });
    }
  },

  // PATCH /api/certifications/:id — title/description/fields/status
  update: async (req, res) => {
    try {
      if (!canManage(req.user.role)) return res.status(403).json({ message: 'Not authorized' });
      const cert = await Certification.findByPk(req.params.id);
      if (!cert) return res.status(404).json({ message: 'Certification not found' });
      const patch = {};
      if (req.body.title !== undefined) patch.title = String(req.body.title).trim();
      if (req.body.description !== undefined) patch.description = req.body.description ? String(req.body.description) : null;
      if (req.body.fields !== undefined) patch.fields = Array.isArray(req.body.fields) ? req.body.fields : [];
      if (req.body.status !== undefined && ['DRAFT', 'ACTIVE'].includes(req.body.status)) patch.status = req.body.status;
      await cert.update(patch);
      res.json({ certification: shapeCertification(cert) });
    } catch (err) {
      console.error('certification.update error:', err);
      res.status(500).json({ message: 'Failed to update certification' });
    }
  },

  // POST /api/certifications/:id/template — multipart image + width/height
  uploadTemplate: async (req, res) => {
    try {
      if (!canManage(req.user.role)) return res.status(403).json({ message: 'Not authorized' });
      const cert = await Certification.findByPk(req.params.id);
      if (!cert) return res.status(404).json({ message: 'Certification not found' });
      if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
      const url = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype, 'certifications');
      const w = parseInt(req.body.width, 10) || null;
      const h = parseInt(req.body.height, 10) || null;
      const oldUrl = cert.templateImageUrl;
      await cert.update({ templateImageUrl: url, templateWidth: w, templateHeight: h });
      // Best-effort cleanup of the previous template.
      if (oldUrl && oldUrl !== url) deleteFromS3(oldUrl).catch(() => {});
      res.json({ certification: shapeCertification(cert) });
    } catch (err) {
      console.error('certification.uploadTemplate error:', err);
      res.status(500).json({ message: 'Failed to upload template' });
    }
  },

  // DELETE /api/certifications/:id — removes the template and its issued certs.
  remove: async (req, res) => {
    const t = await sequelize.transaction();
    try {
      if (!canManage(req.user.role)) { await t.rollback(); return res.status(403).json({ message: 'Not authorized' }); }
      const cert = await Certification.findByPk(req.params.id);
      if (!cert) { await t.rollback(); return res.status(404).json({ message: 'Certification not found' }); }
      await CertificateAssignment.destroy({ where: { certificationId: cert.id }, transaction: t });
      const imageUrl = cert.templateImageUrl;
      await cert.destroy({ transaction: t });
      await t.commit();
      if (imageUrl) deleteFromS3(imageUrl).catch(() => {});
      res.json({ message: 'Certification deleted' });
    } catch (err) {
      await t.rollback();
      console.error('certification.remove error:', err);
      res.status(500).json({ message: 'Failed to delete certification' });
    }
  },

  // GET /api/certifications/:id/template-image — same-origin proxy so the
  // front-end can render/export to PDF without S3 CORS. Any authenticated user.
  templateImage: async (req, res) => {
    try {
      const cert = await Certification.findByPk(req.params.id, { attributes: ['id', 'templateImageUrl'] });
      if (!cert || !cert.templateImageUrl) return res.status(404).json({ message: 'No template image' });
      const upstream = await fetch(cert.templateImageUrl);
      if (!upstream.ok) return res.status(502).json({ message: 'Failed to fetch template image' });
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.set('Content-Type', upstream.headers.get('content-type') || 'image/png');
      res.set('Cache-Control', 'private, max-age=300');
      res.send(buf);
    } catch (err) {
      console.error('certification.templateImage error:', err);
      res.status(500).json({ message: 'Failed to load template image' });
    }
  },

  // ── Recipients + assignment ───────────────────────────────────
  // GET /api/certifications/recipients?search=
  recipients: async (req, res) => {
    try {
      if (!canManage(req.user.role)) return res.status(403).json({ message: 'Not authorized' });
      const search = (req.query.search || '').trim();
      const where = { approvedRole: 'STUDENT' };
      if (search) {
        where[Op.or] = [
          { firstName: { [Op.like]: `%${search}%` } },
          { lastName: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { registrationNumber: { [Op.like]: `%${search}%` } },
        ];
      }
      const users = await User.findAll({
        where,
        attributes: ['id', 'firstName', 'lastName', 'email', 'registrationNumber'],
        order: [['firstName', 'ASC']],
        limit: 500,
      });
      res.json({ users });
    } catch (err) {
      console.error('certification.recipients error:', err);
      res.status(500).json({ message: 'Failed to load recipients' });
    }
  },

  // POST /api/certifications/:id/assign — { studentIds: [] }
  assign: async (req, res) => {
    try {
      if (!canManage(req.user.role)) return res.status(403).json({ message: 'Not authorized' });
      const cert = await Certification.findByPk(req.params.id);
      if (!cert) return res.status(404).json({ message: 'Certification not found' });
      if (!cert.templateImageUrl) return res.status(400).json({ message: 'Upload a template image before assigning' });

      const studentIds = Array.isArray(req.body.studentIds) ? req.body.studentIds.filter(Boolean) : [];
      if (!studentIds.length) return res.status(400).json({ message: 'Select at least one recipient' });

      const students = await User.findAll({ where: { id: { [Op.in]: studentIds }, approvedRole: 'STUDENT' } });
      const { created, skipped } = await issueCertificatesTo(cert, students, req.user.id);

      // Mark the certification ACTIVE once it has been used.
      if (created > 0 && cert.status !== 'ACTIVE') await cert.update({ status: 'ACTIVE' });

      res.json({ message: 'Assignment complete', created, skipped });
    } catch (err) {
      console.error('certification.assign error:', err);
      res.status(500).json({ message: 'Failed to assign certificate' });
    }
  },

  // GET /api/certifications/session-template?sessionId= — download an .xlsx of
  // every student in a session, pre-filled, for bulk assignment.
  sessionTemplate: async (req, res) => {
    try {
      if (!canManage(req.user.role)) return res.status(403).json({ message: 'Not authorized' });
      const { sessionId } = req.query;
      if (!sessionId) return res.status(400).json({ message: 'sessionId is required' });
      const rows = await StudentSession.findAll({
        where: { academicSessionId: sessionId },
        include: [{ model: User, as: 'Student', attributes: ['id', 'firstName', 'lastName', 'email', 'registrationNumber'] }],
      });
      const data = rows
        .filter((r) => r.Student)
        .map((r) => ({
          'User ID': r.Student.id,
          'Registration No': r.Student.registrationNumber || '',
          'Name': fullName(r.Student),
          'Email': r.Student.email || '',
        }));
      const ws = XLSX.utils.json_to_sheet(data, { header: ['User ID', 'Registration No', 'Name', 'Email'] });
      ws['!cols'] = [{ wch: 38 }, { wch: 18 }, { wch: 26 }, { wch: 30 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Recipients');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.set('Content-Disposition', 'attachment; filename="certificate-recipients-template.xlsx"');
      res.send(buf);
    } catch (err) {
      console.error('certification.sessionTemplate error:', err);
      res.status(500).json({ message: 'Failed to generate template' });
    }
  },

  // POST /api/certifications/:id/assign-excel — multipart .xlsx of recipients.
  assignExcel: async (req, res) => {
    try {
      if (!canManage(req.user.role)) return res.status(403).json({ message: 'Not authorized' });
      const cert = await Certification.findByPk(req.params.id);
      if (!cert) return res.status(404).json({ message: 'Certification not found' });
      if (!cert.templateImageUrl) return res.status(400).json({ message: 'Upload a template image before assigning' });
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) return res.status(400).json({ message: 'The uploaded file has no sheets' });
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (!rows.length) return res.status(400).json({ message: 'The sheet has no rows' });

      // Collect identifiers, tolerant of header casing/variants.
      const pick = (row, keys) => {
        for (const k of Object.keys(row)) {
          if (keys.includes(k.trim().toLowerCase())) return String(row[k]).trim();
        }
        return '';
      };
      const ids = new Set(), emails = new Set(), regs = new Set();
      let rowCount = 0;
      for (const row of rows) {
        const id = pick(row, ['user id', 'userid', 'id']);
        const email = pick(row, ['email', 'e-mail']);
        const reg = pick(row, ['registration no', 'registration number', 'reg no', 'registrationnumber']);
        if (!id && !email && !reg) continue;
        rowCount += 1;
        if (id) ids.add(id);
        if (email) emails.add(email.toLowerCase());
        if (reg) regs.add(reg);
      }
      if (rowCount === 0) return res.status(400).json({ message: 'No recognizable rows. Keep the User ID / Email / Registration No columns.' });

      const or = [];
      if (ids.size) or.push({ id: { [Op.in]: [...ids] } });
      if (emails.size) or.push({ email: { [Op.in]: [...emails] } });
      if (regs.size) or.push({ registrationNumber: { [Op.in]: [...regs] } });
      const students = or.length
        ? await User.findAll({ where: { approvedRole: 'STUDENT', [Op.or]: or } })
        : [];

      const matchedCount = students.length;
      const unmatched = Math.max(0, rowCount - matchedCount);
      const { created, skipped } = await issueCertificatesTo(cert, students, req.user.id);
      if (created > 0 && cert.status !== 'ACTIVE') await cert.update({ status: 'ACTIVE' });

      res.json({ message: 'Bulk assignment complete', rows: rowCount, matched: matchedCount, created, skipped, unmatched });
    } catch (err) {
      console.error('certification.assignExcel error:', err);
      res.status(500).json({ message: 'Failed to process the Excel file' });
    }
  },

  // GET /api/certifications/:id/assignments — recipients of one certification
  listAssignments: async (req, res) => {
    try {
      if (!canManage(req.user.role)) return res.status(403).json({ message: 'Not authorized' });
      const cert = await Certification.findByPk(req.params.id);
      if (!cert) return res.status(404).json({ message: 'Certification not found' });
      const rows = await CertificateAssignment.findAll({
        where: { certificationId: cert.id },
        include: [
          { model: User, as: 'Student', attributes: ['id', 'firstName', 'lastName', 'email', 'registrationNumber'] },
          { model: User, as: 'IssuedByUser', attributes: ['id', 'firstName', 'lastName'] },
        ],
        order: [['issuedAt', 'DESC']],
      });
      const shaped = rows.map((r) => {
        const a = shapeAssignment(r);
        a.fieldValues = resolvedValuesFor(cert, a, a.Student); // reflect current design
        return a;
      });
      res.json({ assignments: shaped });
    } catch (err) {
      console.error('certification.listAssignments error:', err);
      res.status(500).json({ message: 'Failed to list recipients' });
    }
  },

  // DELETE /api/certifications/assignments/:assignmentId — revoke (remove) an issued cert
  revokeAssignment: async (req, res) => {
    try {
      if (!canManage(req.user.role)) return res.status(403).json({ message: 'Not authorized' });
      const row = await CertificateAssignment.findByPk(req.params.assignmentId);
      if (!row) return res.status(404).json({ message: 'Assignment not found' });
      await row.destroy();
      res.json({ message: 'Certificate revoked' });
    } catch (err) {
      console.error('certification.revokeAssignment error:', err);
      res.status(500).json({ message: 'Failed to revoke certificate' });
    }
  },

  // ── Student-facing views ──────────────────────────────────────
  // GET /api/certifications/my — current user's issued certificates
  myCertificates: async (req, res) => {
    try {
      const student = await User.findByPk(req.user.id, {
        attributes: ['id', 'firstName', 'lastName', 'email', 'registrationNumber'],
      });
      const rows = await CertificateAssignment.findAll({
        where: { studentId: req.user.id, status: 'ISSUED' },
        include: [{ model: Certification, as: 'Certification' }],
        order: [['issuedAt', 'DESC']],
      });
      const shaped = rows.map((r) => {
        const a = shapeAssignment(r);
        if (a.Certification) {
          a.Certification = shapeCertification(a.Certification);
          a.fieldValues = resolvedValuesFor(a.Certification, a, student); // reflect current design
        }
        return a;
      });
      res.json({ certificates: shaped });
    } catch (err) {
      console.error('certification.myCertificates error:', err);
      res.status(500).json({ message: 'Failed to load certificates' });
    }
  },

  // GET /api/certifications/student/:studentId — a student's earned certs.
  // Staff, or the student themselves.
  studentCertificates: async (req, res) => {
    try {
      const { studentId } = req.params;
      const isSelf = req.user.id === studentId;
      if (!isSelf && !STAFF_VIEW_ROLES.includes(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      const student = await User.findByPk(studentId, {
        attributes: ['id', 'firstName', 'lastName', 'email', 'registrationNumber'],
      });
      const rows = await CertificateAssignment.findAll({
        where: { studentId, status: 'ISSUED' },
        include: [{ model: Certification, as: 'Certification' }],
        order: [['issuedAt', 'DESC']],
      });
      const shaped = rows.map((r) => {
        const a = shapeAssignment(r);
        if (a.Certification) {
          a.Certification = shapeCertification(a.Certification);
          a.fieldValues = resolvedValuesFor(a.Certification, a, student); // reflect current design
        }
        return a;
      });
      res.json({ certificates: shaped });
    } catch (err) {
      console.error('certification.studentCertificates error:', err);
      res.status(500).json({ message: 'Failed to load certificates' });
    }
  },

  // ── Public verification (NO AUTH) ─────────────────────────────
  // GET /api/verify/:number — returns minimal, non-sensitive proof.
  verify: async (req, res) => {
    try {
      const number = String(req.params.number || '').trim();
      const row = await CertificateAssignment.findOne({
        where: { certificateNumber: number },
        include: [
          { model: Certification, as: 'Certification', attributes: ['id', 'title', 'description'] },
          { model: User, as: 'Student', attributes: ['firstName', 'lastName'] },
        ],
      });
      if (!row || row.status !== 'ISSUED') {
        return res.status(404).json({ valid: false, message: 'Certificate not found or has been revoked' });
      }
      res.json({
        valid: true,
        certificateNumber: row.certificateNumber,
        title: row.Certification?.title || 'Certificate',
        description: row.Certification?.description || null,
        recipientName: fullName(row.Student),
        issuedAt: row.issuedAt,
      });
    } catch (err) {
      console.error('certification.verify error:', err);
      res.status(500).json({ valid: false, message: 'Verification failed' });
    }
  },
};
