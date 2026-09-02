const crypto = require('crypto');
const {
  sequelize,
  Certification,
  CertificateAssignment,
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
      const fields = shapeCertification(cert).fields;
      const issueDateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

      let created = 0;
      let skipped = 0;
      for (const student of students) {
        const existing = await CertificateAssignment.findOne({
          where: { certificationId: cert.id, studentId: student.id },
        });
        if (existing) { skipped += 1; continue; }

        // Generate a unique certificate number (retry on the rare collision).
        let certificateNumber = genCertificateNumber();
        const fieldValues = {};
        // Resolve field values (CERTIFICATE_ID depends on the number).
        for (const f of fields) fieldValues[f.id] = resolveField(f, student, certificateNumber, issueDateStr);

        let attempts = 0;
        while (attempts < 5) {
          try {
            await CertificateAssignment.create({
              certificationId: cert.id,
              studentId: student.id,
              certificateNumber,
              fieldValues,
              issuedBy: req.user.id,
              issuedAt: new Date(),
            });
            created += 1;
            break;
          } catch (e) {
            // We pre-checked the (certification, student) pair, so a unique
            // violation here is almost always the certificate number — retry
            // with a fresh one. Give up (skip) after a few attempts.
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

      // Mark the certification ACTIVE once it has been used.
      if (created > 0 && cert.status !== 'ACTIVE') await cert.update({ status: 'ACTIVE' });

      res.json({ message: 'Assignment complete', created, skipped });
    } catch (err) {
      console.error('certification.assign error:', err);
      res.status(500).json({ message: 'Failed to assign certificate' });
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
