const { SIPRequirement, AcademicSession, User } = require('../models');

const sipRequirementController = {
  postRequirement: async (req, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const { sessionId, title, description, companyName, jobRole, location, stipend, type, requirements } = req.body;

      const allowedRoles = ['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR'];
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: 'Not authorized to post requirements' });
      }

      if (!sessionId || !title) {
        return res.status(400).json({ message: 'sessionId and title are required' });
      }

      const session = await AcademicSession.findByPk(sessionId);
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      const requirement = await SIPRequirement.create({
        sessionId,
        title,
        description,
        companyName,
        jobRole,
        location,
        stipend,
        type,
        requirements: requirements || [],
        createdBy: userId,
      });

      res.status(201).json({ message: 'Requirement posted successfully', requirement });
    } catch (error) {
      console.error('Error posting requirement:', error);
      res.status(500).json({ message: 'Failed to post requirement', error: error.message });
    }
  },

  getRequirements: async (req, res) => {
    try {
      const { sessionId } = req.params;

      const requirements = await SIPRequirement.findAll({
        where: { sessionId },
        include: [
          { model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
        ],
        order: [['createdAt', 'DESC']],
      });

      res.json(requirements);
    } catch (error) {
      console.error('Error fetching requirements:', error);
      res.status(500).json({ message: 'Failed to fetch requirements', error: error.message });
    }
  },

  deleteRequirement: async (req, res) => {
    try {
      const { requirementId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const requirement = await SIPRequirement.findByPk(requirementId);
      if (!requirement) {
        return res.status(404).json({ message: 'Requirement not found' });
      }

      const isCreator = requirement.createdBy === userId;
      const isAdmin = userRole === 'ADMIN';
      if (!isCreator && !isAdmin) {
        return res.status(403).json({ message: 'Not authorized to delete this requirement' });
      }

      await requirement.destroy();
      res.json({ message: 'Requirement deleted successfully' });
    } catch (error) {
      console.error('Error deleting requirement:', error);
      res.status(500).json({ message: 'Failed to delete requirement', error: error.message });
    }
  },
};

module.exports = sipRequirementController;
