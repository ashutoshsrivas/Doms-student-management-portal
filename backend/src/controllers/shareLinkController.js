// Admin-managed shareable links for student public profiles.
// Each link carries its own `sections` filter so the public page only shows
// what the admin opted in for that specific link.

const crypto = require('crypto');
const { Op } = require('sequelize');
const {
  ShareLink,
  User,
  StudentProfile,
  StudentSession,
  AcademicSession,
  Assessment,
  AssessmentSubmission,
} = require('../models');

// Canonical list of sections the public page can show. Identity (name,
// photo, reg no, dept, session) is always shown — it's not a toggleable
// section. Keep this list in sync with the public page.
const SECTION_KEYS = [
  'contact',
  'aboutCareer',
  'skillsInterests',
  'workExperience',
  'projects',
  'achievements',
  'certifications',
  'responsibilities',
  'onlinePresence',
  'additionalInfo',
  'documents',
  'assessmentReport',
];

function generateToken() {
  // URL-safe base64-ish: 24 bytes -> ~32 chars. base64url (Node 16+).
  return crypto.randomBytes(24).toString('base64url');
}

function normaliseSections(input) {
  if (input == null) return null; // null = ALL allowed
  if (!Array.isArray(input)) return null;
  const set = new Set(input.filter((x) => SECTION_KEYS.includes(x)));
  if (set.size === 0) return []; // explicit empty = identity only
  if (set.size === SECTION_KEYS.length) return null; // all selected => normalise to null
  return Array.from(set);
}

function buildLinkUrl(req, token) {
  const fromHeader = req.get('x-forwarded-host') || req.get('host');
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0];
  const origin = process.env.PUBLIC_ORIGIN || `${proto}://${fromHeader}`;
  return `${origin}/share/profile/${token}`;
}

const shareLinkController = {
  // GET /api/share-links/sections  -> list of valid section keys for the UI
  listSectionKeys: (req, res) => {
    res.json({ sections: SECTION_KEYS });
  },

  // POST /api/share-links  { userId, sections?, label?, expiresAt? }
  create: async (req, res) => {
    try {
      const { userId, sections, label, expiresAt, studentSessionId } = req.body || {};
      if (!userId) return res.status(400).json({ message: 'userId is required' });

      const student = await User.findByPk(userId);
      if (!student) return res.status(404).json({ message: 'User not found' });
      if (student.approvedRole !== 'STUDENT') {
        return res.status(400).json({ message: 'Share links can only be created for student accounts' });
      }

      // Pin to a specific student session so the public page doesn't
      // silently swap to the next cohort when the student re-enrols. If
      // the caller didn't specify one, default to the student's most-recent
      // enrolment at creation time.
      let pinnedStudentSessionId = null;
      if (studentSessionId) {
        const ss = await StudentSession.findOne({
          where: { id: studentSessionId, userId },
          attributes: ['id'],
        });
        if (!ss) return res.status(400).json({ message: 'Invalid studentSessionId for this student' });
        pinnedStudentSessionId = studentSessionId;
      } else {
        const latest = await StudentSession.findOne({
          where: { userId },
          order: [['createdAt', 'DESC']],
          attributes: ['id'],
        });
        pinnedStudentSessionId = latest ? latest.id : null;
      }

      const link = await ShareLink.create({
        token: generateToken(),
        userId,
        createdBy: req.user.id,
        sections: normaliseSections(sections),
        label: label ? String(label).slice(0, 120) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        studentSessionId: pinnedStudentSessionId,
      });

      res.status(201).json({
        link: serializeLink(link, req),
      });
    } catch (error) {
      console.error('ShareLink create error:', error);
      res.status(500).json({ message: 'Failed to create share link' });
    }
  },

  // GET /api/share-links?userId=X
  list: async (req, res) => {
    try {
      const { userId } = req.query;
      const where = {};
      if (userId) where.userId = String(userId);

      const rows = await ShareLink.findAll({
        where,
        order: [['createdAt', 'DESC']],
        include: [
          { model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'Student', attributes: ['id', 'firstName', 'lastName', 'email'] },
        ],
      });

      res.json({ links: rows.map((r) => serializeLink(r, req, true)) });
    } catch (error) {
      console.error('ShareLink list error:', error);
      res.status(500).json({ message: 'Failed to list share links' });
    }
  },

  // DELETE /api/share-links/:id  (hard delete)
  remove: async (req, res) => {
    try {
      const { id } = req.params;
      const link = await ShareLink.findByPk(id);
      if (!link) return res.status(404).json({ message: 'Link not found' });
      await link.destroy();
      res.json({ message: 'Link deleted', id });
    } catch (error) {
      console.error('ShareLink delete error:', error);
      res.status(500).json({ message: 'Failed to delete share link' });
    }
  },

  // GET /api/public/share/:token  -- PUBLIC, no auth
  resolveToken: async (req, res) => {
    try {
      const { token } = req.params;
      if (!token) return res.status(404).json({ message: 'Not found' });

      const link = await ShareLink.findOne({ where: { token } });
      if (!link || link.status !== 'ACTIVE') {
        return res.status(404).json({ message: 'Link not found or revoked' });
      }
      if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
        return res.status(410).json({ message: 'This share link has expired' });
      }

      const user = await User.findByPk(link.userId, {
        attributes: [
          'id', 'firstName', 'lastName', 'email', 'phoneNumber',
          'department', 'registrationNumber', 'approvedRole', 'status',
          'profileImage', 'createdAt',
        ],
      });
      if (!user || user.approvedRole !== 'STUDENT' || user.status !== 'ACTIVE') {
        return res.status(404).json({ message: 'Profile not available' });
      }

      const profile = await StudentProfile.findOne({ where: { userId: link.userId } });
      // Prefer the pinned StudentSession (new links) — falls back to the
      // student's most-recent enrolment for legacy links that predate the
      // pin field.
      const studentSession = link.studentSessionId
        ? await StudentSession.findOne({
            where: { id: link.studentSessionId },
            include: [{ model: AcademicSession, attributes: ['id', 'name', 'startDate', 'endDate'] }],
          })
        : await StudentSession.findOne({
            where: { userId: link.userId },
            include: [{ model: AcademicSession, attributes: ['id', 'name', 'startDate', 'endDate'] }],
            order: [['createdAt', 'DESC']],
          });

      // Sections == null  -> all SECTION_KEYS visible
      // Sections == []    -> identity-only (no toggleable sections shown)
      // Sections == [...] -> only those keys visible
      const allowedSections = link.sections == null ? SECTION_KEYS : link.sections;

      // Optional: assessment report (only fetched if section is allowed).
      // Scope to the pinned session's enrolment if one exists; otherwise
      // fall back to every enrolment (legacy links without a pin).
      let assessmentRows = null;
      if (allowedSections.includes('assessmentReport')) {
        const ss = link.studentSessionId
          ? [{ id: link.studentSessionId }]
          : await StudentSession.findAll({
              where: { userId: link.userId },
              attributes: ['id'],
            });
        const ssIds = ss.map((s) => s.id);
        if (ssIds.length > 0) {
          const subs = await AssessmentSubmission.findAll({
            where: { studentSessionId: ssIds },
            include: [
              {
                model: Assessment,
                attributes: ['id', 'title', 'type', 'totalPoints'],
              },
            ],
            order: [['submittedAt', 'DESC'], ['createdAt', 'DESC']],
          });

          assessmentRows = subs
            // Hide IN_PROGRESS unsubmitted ones from the public view
            .filter((s) => s.submittedAt || s.status === 'SUBMITTED' || s.status === 'GRADED')
            .map((s) => ({
              title: s.Assessment?.title || 'Assessment',
              type: s.Assessment?.type || null,
              status: s.status,
              totalPoints: s.Assessment?.totalPoints != null ? Number(s.Assessment.totalPoints) : null,
              totalScore: s.totalScore != null ? Number(s.totalScore) : null,
              submittedAt: s.submittedAt,
              gradedAt: s.gradedAt,
            }));
        } else {
          assessmentRows = [];
        }
      }

      res.json({
        meta: {
          token: link.token,
          label: link.label || null,
          createdAt: link.createdAt,
          allowedSections,
        },
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          // contact section is gated on the `contact` flag below; only
          // include email / phone if the admin opted into the contact section.
          email: allowedSections.includes('contact') ? user.email : null,
          phoneNumber: allowedSections.includes('contact') ? user.phoneNumber : null,
          department: user.department,
          registrationNumber: user.registrationNumber,
          profileImage: user.profileImage,
        },
        session: studentSession?.AcademicSession
          ? {
              id: studentSession.AcademicSession.id,
              name: studentSession.AcademicSession.name,
              startDate: studentSession.AcademicSession.startDate,
              endDate: studentSession.AcademicSession.endDate,
            }
          : null,
        profile: profile ? profile.toJSON() : null,
        assessments: assessmentRows,
      });
    } catch (error) {
      console.error('ShareLink resolve error:', error);
      res.status(500).json({ message: 'Failed to load shared profile' });
    }
  },
};

function serializeLink(link, req, includeCreator = false) {
  return {
    id: link.id,
    token: link.token,
    url: buildLinkUrl(req, link.token),
    userId: link.userId,
    label: link.label,
    sections: link.sections, // null == all
    status: link.status,
    expiresAt: link.expiresAt,
    createdAt: link.createdAt,
    createdBy: includeCreator && link.Creator
      ? {
          id: link.Creator.id,
          name: `${link.Creator.firstName || ''} ${link.Creator.lastName || ''}`.trim(),
          email: link.Creator.email,
        }
      : link.createdBy,
  };
}

module.exports = shareLinkController;
module.exports.SECTION_KEYS = SECTION_KEYS;
