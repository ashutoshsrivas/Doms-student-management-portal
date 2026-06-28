const {
  SIP,
  SIPWeeklyUpdate,
  StudentSession,
  AcademicSession,
  User,
  MentorTeam,
  MentorTeamMember,
} = require('../models');
const { Op } = require('sequelize');
const { uploadToS3, deleteFromS3 } = require('../utils/s3Upload');
const { v4: uuidv4 } = require('uuid');

const calculateWeekStartEnd = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { weekStartDate: monday, weekEndDate: sunday };
};

const sipController = {
  createSIP: async (req, res) => {
    try {
      const userId = req.user.id;
      const { sessionId, ...formData } = req.body;

      if (!sessionId) {
        return res.status(400).json({ message: 'sessionId is required' });
      }

      const session = await AcademicSession.findByPk(sessionId);
      if (!session || !session.sipEnabled) {
        return res.status(400).json({ message: 'SIP is not enabled for this session' });
      }

      const studentSession = await StudentSession.findOne({
        where: { userId, academicSessionId: sessionId },
      });
      if (!studentSession) {
        return res.status(400).json({ message: 'Student is not enrolled in this session' });
      }

      const existingSIP = await SIP.findOne({
        where: { studentSessionId: studentSession.id },
      });
      if (existingSIP) {
        return res.status(400).json({ message: 'SIP already exists for this session' });
      }

      // Convert numeric strings to proper types, empty strings to NULL
      const cleanedData = {};
      const numericFields = ['stipend', 'durationWeeks', 'facultyGrading', 'supervisorGrading', 'extensionWeeks', 'ppoCompensation'];
      const dateFields = ['joinDate', 'nocDate', 'completionDate', 'sipEndDate', 'nocIssueDateExtension'];

      for (const [key, value] of Object.entries(formData)) {
        if (numericFields.includes(key)) {
          // Only convert to number if value is not empty
          cleanedData[key] = (value === '' || value === null || value === undefined) ? null : parseFloat(value);
        } else if (key === 'ppOffered') {
          cleanedData[key] = value === true || value === 'true';
        } else if (dateFields.includes(key)) {
          // Handle date fields - convert empty strings or invalid dates to NULL
          if (value === '' || value === null || value === undefined) {
            cleanedData[key] = null;
          } else if (value === 'Invalid date' || isNaN(new Date(value).getTime())) {
            cleanedData[key] = null;
          } else {
            cleanedData[key] = value;
          }
        } else {
          // Convert empty strings to NULL for all other fields
          cleanedData[key] = (value === '' || value === null || value === undefined) ? null : value;
        }
      }

      const sip = await SIP.create({
        studentSessionId: studentSession.id,
        createdBy: userId,
        ...cleanedData,
      });

      res.status(201).json({ message: 'SIP created successfully', sip });
    } catch (error) {
      console.error('Error creating SIP:', error);
      res.status(500).json({ message: 'Failed to create SIP', error: error.message });
    }
  },

  getSIPDetails: async (req, res) => {
    try {
      const { sipId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const sip = await SIP.findByPk(sipId, {
        include: [
          { model: StudentSession, include: [{ model: AcademicSession }] },
          { model: User, as: 'Student', attributes: ['id', 'firstName', 'lastName', 'email'] },
        ],
      });

      if (!sip) {
        return res.status(404).json({ message: 'SIP not found' });
      }

      const isOwner = sip.createdBy === userId;
      const isAuthorized =
        isOwner || ['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR'].includes(userRole);

      if (!isAuthorized) {
        return res.status(403).json({ message: 'Not authorized to view this SIP' });
      }

      res.json(sip);
    } catch (error) {
      console.error('Error fetching SIP:', error);
      res.status(500).json({ message: 'Failed to fetch SIP', error: error.message });
    }
  },

  updateSIP: async (req, res) => {
    try {
      const { sipId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;
      const updateData = req.body;

      const sip = await SIP.findByPk(sipId);
      if (!sip) {
        return res.status(404).json({ message: 'SIP not found' });
      }

      const isOwner = sip.createdBy === userId;
      const isAuthorized = isOwner || ['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR'].includes(userRole);
      if (!isAuthorized) {
        return res.status(403).json({ message: 'Not authorized to update this SIP' });
      }

      // Convert numeric strings to proper types, empty strings to NULL
      const cleanedData = {};
      const numericFields = ['stipend', 'durationWeeks', 'facultyGrading', 'supervisorGrading', 'extensionWeeks', 'ppoCompensation'];
      const dateFields = ['joinDate', 'nocDate', 'completionDate', 'sipEndDate', 'nocIssueDateExtension'];

      for (const [key, value] of Object.entries(updateData)) {
        if (numericFields.includes(key)) {
          cleanedData[key] = (value === '' || value === null || value === undefined) ? null : parseFloat(value);
        } else if (key === 'ppOffered') {
          cleanedData[key] = value === true || value === 'true';
        } else if (dateFields.includes(key)) {
          // Handle date fields - convert empty strings or invalid dates to NULL
          if (value === '' || value === null || value === undefined) {
            cleanedData[key] = null;
          } else if (value === 'Invalid date' || isNaN(new Date(value).getTime())) {
            cleanedData[key] = null;
          } else {
            cleanedData[key] = value;
          }
        } else {
          // Convert empty strings to NULL for all other fields
          cleanedData[key] = (value === '' || value === null || value === undefined) ? null : value;
        }
      }

      await sip.update(cleanedData);
      res.json({ message: 'SIP updated successfully', sip });
    } catch (error) {
      console.error('Error updating SIP:', error);
      res.status(500).json({ message: 'Failed to update SIP', error: error.message });
    }
  },

  getSIPsBySession: async (req, res) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const adminRoles = ['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR'];

      let sips;

      if (adminRoles.includes(userRole)) {
        // Admins can see all SIPs for the session
        sips = await SIP.findAll({
          include: [
            {
              model: StudentSession,
              where: { academicSessionId: sessionId },
              include: [{ model: AcademicSession }],
            },
            { model: User, as: 'Student', attributes: ['id', 'firstName', 'lastName', 'email'] },
          ],
        });
      } else if (userRole === 'STUDENT') {
        // Students can only see their own SIP
        const studentSession = await StudentSession.findOne({
          where: { userId, academicSessionId: sessionId },
        });

        if (!studentSession) {
          return res.status(403).json({ message: 'Not enrolled in this session' });
        }

        sips = await SIP.findAll({
          where: { studentSessionId: studentSession.id },
          include: [
            {
              model: StudentSession,
              include: [{ model: AcademicSession }],
            },
            { model: User, as: 'Student', attributes: ['id', 'firstName', 'lastName', 'email'] },
          ],
        });
      } else {
        return res.status(403).json({ message: 'Not authorized to view SIPs' });
      }

      res.json(sips);
    } catch (error) {
      console.error('Error fetching SIPs:', error);
      res.status(500).json({ message: 'Failed to fetch SIPs', error: error.message });
    }
  },

  submitWeeklyUpdate: async (req, res) => {
    try {
      const { sipId } = req.params;
      const { statusText } = req.body;
      const userId = req.user.id;

      if (!statusText) {
        return res.status(400).json({ message: 'statusText is required' });
      }

      const sip = await SIP.findByPk(sipId);
      if (!sip) {
        return res.status(404).json({ message: 'SIP not found' });
      }

      if (sip.createdBy !== userId) {
        return res.status(403).json({ message: 'Not authorized to update this SIP' });
      }

      const now = new Date();
      const { weekStartDate, weekEndDate } = calculateWeekStartEnd(now);

      let weekUpdate = await SIPWeeklyUpdate.findOne({
        where: {
          sipId,
          weekStartDate,
          weekEndDate,
        },
      });

      if (weekUpdate) {
        weekUpdate.statusText = statusText;
        weekUpdate.submitted = true;
        weekUpdate.submittedAt = now;
        await weekUpdate.save();
      } else {
        weekUpdate = await SIPWeeklyUpdate.create({
          sipId,
          weekStartDate,
          weekEndDate,
          statusText,
          submitted: true,
          submittedAt: now,
        });
      }

      res.json({ message: 'Weekly update submitted', weekUpdate });
    } catch (error) {
      console.error('Error submitting weekly update:', error);
      res.status(500).json({ message: 'Failed to submit weekly update', error: error.message });
    }
  },

  getWeeklyUpdates: async (req, res) => {
    try {
      const { sipId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const sip = await SIP.findByPk(sipId);
      if (!sip) {
        return res.status(404).json({ message: 'SIP not found' });
      }

      const isOwner = sip.createdBy === userId;
      const isAuthorized =
        isOwner || ['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR'].includes(userRole);

      if (!isAuthorized) {
        return res.status(403).json({ message: 'Not authorized to view weekly updates' });
      }

      const updates = await SIPWeeklyUpdate.findAll({
        where: { sipId },
        order: [['weekStartDate', 'ASC']],
      });

      res.json(updates);
    } catch (error) {
      console.error('Error fetching weekly updates:', error);
      res.status(500).json({ message: 'Failed to fetch weekly updates', error: error.message });
    }
  },

  uploadCertificate: async (req, res) => {
    try {
      const { sipId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const sip = await SIP.findByPk(sipId);
      if (!sip) {
        return res.status(404).json({ message: 'SIP not found' });
      }

      const isOwner = sip.createdBy === userId;
      const isAdmin = userRole === 'ADMIN';
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: 'Not authorized to upload certificate' });
      }

      if (sip.certificateIssued) {
        await deleteFromS3(sip.certificateIssued);
      }

      const certificateUrl = await uploadToS3(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'sip-certificates'
      );

      await sip.update({ certificateIssued: certificateUrl });

      res.json({
        message: 'Certificate uploaded successfully',
        certificateIssued: certificateUrl,
      });
    } catch (error) {
      console.error('Error uploading certificate:', error);
      res.status(500).json({ message: 'Failed to upload certificate', error: error.message });
    }
  },

  uploadFeedback: async (req, res) => {
    try {
      const { sipId } = req.params;
      const { feedbackType } = req.query;
      const userId = req.user.id;
      const userRole = req.user.role;

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      if (!feedbackType || !['faculty', 'supervisor'].includes(feedbackType)) {
        return res.status(400).json({ message: 'feedbackType query param required: faculty or supervisor' });
      }

      const sip = await SIP.findByPk(sipId);
      if (!sip) {
        return res.status(404).json({ message: 'SIP not found' });
      }

      const isAuthorized = ['ADMIN', 'PLACEMENT_COORDINATOR'].includes(userRole);
      if (!isAuthorized) {
        return res.status(403).json({ message: 'Not authorized to upload feedback' });
      }

      const feedbackColumn = feedbackType === 'faculty' ? 'facultyFeedback' : 'supervisorFeedback';
      const oldUrl = sip[feedbackColumn];
      if (oldUrl) {
        await deleteFromS3(oldUrl);
      }

      const feedbackUrl = await uploadToS3(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'sip-feedback'
      );

      await sip.update({ [feedbackColumn]: feedbackUrl });

      res.json({
        message: `${feedbackType} feedback uploaded successfully`,
        [feedbackColumn]: feedbackUrl,
      });
    } catch (error) {
      console.error('Error uploading feedback:', error);
      res.status(500).json({ message: 'Failed to upload feedback', error: error.message });
    }
  },

  // Faculty/CHAIR_HEAD/MENTOR/HOD/ADMIN — list every mentee assigned to
  // the caller's mentor teams together with each mentee's SIP form and
  // weekly updates. One bundled response so the page renders in one
  // round-trip.
  getMyMenteesSIPs: async (req, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const isAdmin = ['ADMIN', 'HOD'].includes(userRole);

      const teamWhere = isAdmin ? {} : { facultyId: userId };

      const teams = await MentorTeam.findAll({
        where: teamWhere,
        include: [
          { model: AcademicSession, attributes: ['id', 'name', 'sipEnabled'] },
          { model: User, as: 'Faculty', attributes: ['id', 'firstName', 'lastName', 'email'] },
          {
            model: MentorTeamMember,
            include: [
              {
                model: StudentSession,
                include: [
                  { model: User, as: 'Student', attributes: ['id', 'firstName', 'lastName', 'email'] },
                ],
              },
            ],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      // Collect every studentSessionId so we can fetch SIPs in one query.
      const studentSessionIds = [];
      teams.forEach((t) => {
        (t.MentorTeamMembers || []).forEach((m) => {
          if (m.StudentSession?.id) studentSessionIds.push(m.StudentSession.id);
        });
      });

      const sips = studentSessionIds.length
        ? await SIP.findAll({ where: { studentSessionId: { [Op.in]: studentSessionIds } } })
        : [];
      const sipByStudentSession = new Map(sips.map((s) => [s.studentSessionId, s]));

      const sipIds = sips.map((s) => s.id);
      const updates = sipIds.length
        ? await SIPWeeklyUpdate.findAll({
            where: { sipId: { [Op.in]: sipIds } },
            order: [['weekStartDate', 'ASC']],
          })
        : [];
      const updatesBySipId = new Map();
      updates.forEach((u) => {
        const list = updatesBySipId.get(u.sipId) || [];
        list.push(u);
        updatesBySipId.set(u.sipId, list);
      });

      const out = teams.map((t) => {
        const mentees = (t.MentorTeamMembers || [])
          .filter((m) => m.StudentSession)
          .map((m) => {
            const ss = m.StudentSession;
            const sip = sipByStudentSession.get(ss.id) || null;
            const weeklyUpdates = sip ? (updatesBySipId.get(sip.id) || []) : [];
            return {
              studentSessionId: ss.id,
              student: ss.Student
                ? {
                    id: ss.Student.id,
                    firstName: ss.Student.firstName,
                    lastName: ss.Student.lastName,
                    email: ss.Student.email,
                  }
                : null,
              sip,
              weeklyUpdates,
            };
          });
        return {
          teamId: t.id,
          teamName: t.teamName,
          status: t.status,
          session: t.AcademicSession
            ? { id: t.AcademicSession.id, name: t.AcademicSession.name, sipEnabled: t.AcademicSession.sipEnabled }
            : null,
          faculty: t.Faculty
            ? {
                id: t.Faculty.id,
                name: `${t.Faculty.firstName || ''} ${t.Faculty.lastName || ''}`.trim(),
                email: t.Faculty.email,
              }
            : null,
          mentees,
        };
      });

      res.json({ teams: out });
    } catch (error) {
      console.error('Error fetching mentees SIPs:', error);
      res.status(500).json({ message: 'Failed to fetch mentees SIPs', error: error.message });
    }
  },

  deleteSIP: async (req, res) => {
    try {
      const { sipId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const sip = await SIP.findByPk(sipId);
      if (!sip) {
        return res.status(404).json({ message: 'SIP not found' });
      }

      const isAdmin = userRole === 'ADMIN';
      if (!isAdmin) {
        return res.status(403).json({ message: 'Not authorized to delete SIP' });
      }

      // Delete uploaded files if they exist
      if (sip.certificateIssued) {
        await deleteFromS3(sip.certificateIssued);
      }
      if (sip.facultyFeedback) {
        await deleteFromS3(sip.facultyFeedback);
      }
      if (sip.supervisorFeedback) {
        await deleteFromS3(sip.supervisorFeedback);
      }

      // Delete associated weekly updates
      await SIPWeeklyUpdate.destroy({
        where: { sipId },
      });

      // Delete the SIP
      await sip.destroy();

      res.json({ message: 'SIP deleted successfully' });
    } catch (error) {
      console.error('Error deleting SIP:', error);
      res.status(500).json({ message: 'Failed to delete SIP', error: error.message });
    }
  },
};

module.exports = sipController;
