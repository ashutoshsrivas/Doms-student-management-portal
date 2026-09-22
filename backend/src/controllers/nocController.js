const { Op } = require('sequelize');
const {
  StudentNOC,
  StudentSession,
  AcademicSession,
  SIP,
  User,
} = require('../models');
const { uploadToS3 } = require('../utils/s3Upload');

const isISODate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

// The student's current session enrollment: newest one wins.
async function currentEnrollment(userId) {
  return StudentSession.findOne({
    where: { userId },
    include: [{ model: AcademicSession, attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC']],
  });
}

const shapeOwn = (n) => {
  const p = n.toJSON ? n.toJSON() : n;
  return {
    id: p.id,
    nocUrl: p.nocUrl,
    nocFileName: p.nocFileName || '',
    uploadedAt: p.uploadedAt,
    issueDate: p.issueDate,
    sessionName: p.StudentSession?.AcademicSession?.name || '',
  };
};

const nocController = {
  // GET /api/noc/me — the logged-in student's NOC(s) + the session a new
  // upload will be attached to.
  getMine: async (req, res) => {
    try {
      if (req.user.role !== 'STUDENT') {
        return res.status(403).json({ message: 'Only students have their own NOC' });
      }
      const enrollment = await currentEnrollment(req.user.id);
      const nocs = await StudentNOC.findAll({
        where: { userId: req.user.id },
        include: [{ model: StudentSession, include: [{ model: AcademicSession, attributes: ['id', 'name'] }] }],
        order: [['uploadedAt', 'DESC']],
      });
      res.json({
        currentSession: enrollment?.AcademicSession?.name || null,
        nocs: nocs.map(shapeOwn),
      });
    } catch (error) {
      console.error('noc.getMine error:', error);
      res.status(500).json({ message: 'Failed to load NOC' });
    }
  },

  // POST /api/noc/upload — student uploads (or replaces) the NOC for their
  // current session. The previous file is left in storage, never deleted.
  upload: async (req, res) => {
    try {
      if (req.user.role !== 'STUDENT') {
        return res.status(403).json({ message: 'Only students can upload an NOC here' });
      }
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

      const enrollment = await currentEnrollment(req.user.id);
      const studentSessionId = enrollment ? enrollment.id : null;

      const nocUrl = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype, 'student-noc');
      const now = new Date();

      let noc = await StudentNOC.findOne({ where: { userId: req.user.id, studentSessionId } });
      if (noc) {
        await noc.update({ nocUrl, nocFileName: req.file.originalname, uploadedAt: now });
      } else {
        noc = await StudentNOC.create({
          userId: req.user.id,
          studentSessionId,
          nocUrl,
          nocFileName: req.file.originalname,
          uploadedAt: now,
        });
      }
      await noc.reload({ include: [{ model: StudentSession, include: [{ model: AcademicSession, attributes: ['id', 'name'] }] }] });
      res.json({ message: 'NOC uploaded successfully', noc: shapeOwn(noc) });
    } catch (error) {
      console.error('noc.upload error:', error);
      res.status(500).json({ message: 'Failed to upload NOC' });
    }
  },

  // GET /api/noc — every uploaded NOC. All roles except students.
  // Optional ?sessionId= (academic session) filter.
  list: async (req, res) => {
    try {
      if (req.user.role === 'STUDENT') return res.status(403).json({ message: 'Not authorized' });
      const { sessionId } = req.query;

      const nocs = await StudentNOC.findAll({
        include: [
          { model: User, as: 'Student', attributes: ['id', 'firstName', 'lastName', 'email', 'registrationNumber'] },
          {
            model: StudentSession,
            required: !!sessionId,
            where: sessionId ? { academicSessionId: sessionId } : undefined,
            include: [{ model: AcademicSession, attributes: ['id', 'name'] }],
          },
        ],
        order: [['uploadedAt', 'DESC']],
      });

      // Company / specialization come from the student's SIP form, if any.
      const ssIds = nocs.map((n) => n.studentSessionId).filter(Boolean);
      const sips = ssIds.length
        ? await SIP.findAll({
          where: { studentSessionId: { [Op.in]: ssIds } },
          attributes: ['studentSessionId', 'companyName', 'specialization', 'enrollmentNo'],
        })
        : [];
      const sipBySS = new Map(sips.map((s) => [s.studentSessionId, s]));

      const students = nocs.map((n) => {
        const p = n.toJSON();
        const sip = sipBySS.get(p.studentSessionId);
        return {
          id: p.id,
          studentName: p.Student ? `${p.Student.firstName || ''} ${p.Student.lastName || ''}`.trim() : '',
          email: p.Student?.email || '',
          enrollmentNo: p.Student?.registrationNumber || sip?.enrollmentNo || '',
          companyName: sip?.companyName || '',
          specialization: sip?.specialization || '',
          sessionName: p.StudentSession?.AcademicSession?.name || '',
          nocUrl: p.nocUrl,
          nocFileName: p.nocFileName || '',
          uploadedAt: p.uploadedAt,
          issueDate: p.issueDate,
        };
      });
      res.json({ total: students.length, students });
    } catch (error) {
      console.error('noc.list error:', error);
      res.status(500).json({ message: 'Failed to fetch NOC list' });
    }
  },

  // PATCH /api/noc/:id/issue-date — staff set/clear the NOC issue date.
  setIssueDate: async (req, res) => {
    try {
      if (req.user.role === 'STUDENT') return res.status(403).json({ message: 'Not authorized' });
      const { issueDate } = req.body;
      if (issueDate !== null && issueDate !== '' && !isISODate(issueDate)) {
        return res.status(400).json({ message: 'issueDate must be YYYY-MM-DD or empty' });
      }
      const noc = await StudentNOC.findByPk(req.params.id);
      if (!noc) return res.status(404).json({ message: 'NOC not found' });
      await noc.update({
        issueDate: issueDate || null,
        issueDateSetBy: req.user.id,
        issueDateSetAt: new Date(),
      });
      res.json({ id: noc.id, issueDate: noc.issueDate });
    } catch (error) {
      console.error('noc.setIssueDate error:', error);
      res.status(500).json({ message: 'Failed to save issue date' });
    }
  },
};

module.exports = nocController;
