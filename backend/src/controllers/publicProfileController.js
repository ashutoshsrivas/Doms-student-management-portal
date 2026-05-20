// Public student profile controller.
// Serves a read-only view of a STUDENT user's profile data over a stable
// URL — used by the "Create Shareable Link" feature on the admin page.
// NO authentication required. Refuses to serve non-student accounts so
// nobody can pull admin / faculty info via this endpoint.

const { User, StudentProfile, StudentSession, AcademicSession } = require('../models');

const publicProfileController = {
  getPublicProfile: async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ message: 'userId is required' });
      }

      const user = await User.findByPk(userId, {
        attributes: [
          'id', 'firstName', 'lastName', 'email', 'phoneNumber',
          'department', 'registrationNumber', 'approvedRole', 'status',
          'profileImage', 'createdAt',
        ],
      });

      if (!user) {
        return res.status(404).json({ message: 'Profile not found' });
      }

      // Only expose STUDENT accounts via this public endpoint.
      // Pending or rejected students are also off-limits — only active ones.
      if (user.approvedRole !== 'STUDENT' || user.status !== 'ACTIVE') {
        return res.status(404).json({ message: 'Profile not available' });
      }

      const profile = await StudentProfile.findOne({ where: { userId } });

      // Most-recent session this student belongs to, for context display.
      const studentSession = await StudentSession.findOne({
        where: { userId },
        include: [{ model: AcademicSession, attributes: ['id', 'name', 'startDate', 'endDate'] }],
        order: [['createdAt', 'DESC']],
      });

      res.json({
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
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
      });
    } catch (error) {
      console.error('Public profile fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch profile' });
    }
  },
};

module.exports = publicProfileController;
