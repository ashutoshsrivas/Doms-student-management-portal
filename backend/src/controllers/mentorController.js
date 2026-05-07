const {
  User,
  AcademicSession,
  StudentSession,
  MentorTeam,
  MentorTeamMember,
  MentorRequirement,
  MentorResponse,
} = require('../models');
const s3Upload = require('../utils/s3Upload');
const { Op } = require('sequelize');

module.exports = {
  // ============ MENTOR TEAM MANAGEMENT (ADMIN) ============

  // Create a new mentor team
  createMentorTeam: async (req, res) => {
    const { sessionId, facultyId, teamName, description, studentSessionIds } = req.body;
    const adminId = req.user?.id;

    console.log('[createMentorTeam] Step 1: Creating team:', { sessionId, facultyId, teamName });

    try {
      // Verify session exists
      console.log('[createMentorTeam] Step 2: Finding session:', sessionId);
      const session = await AcademicSession.findByPk(sessionId);
      if (!session) {
        console.log('[createMentorTeam] Session not found');
        return res.status(404).json({ message: 'Academic session not found' });
      }
      console.log('[createMentorTeam] Step 3: Session found:', session.name);

      // Verify faculty exists and has FACULTY role
      console.log('[createMentorTeam] Step 4: Finding faculty:', facultyId);
      const faculty = await User.findByPk(facultyId);
      if (!faculty || faculty.approvedRole !== 'FACULTY') {
        console.log('[createMentorTeam] Faculty not found or invalid role:', faculty?.approvedRole);
        return res.status(404).json({ message: 'Faculty not found or invalid role' });
      }
      console.log('[createMentorTeam] Step 5: Faculty found:', faculty.firstName);

      // Create the mentor team
      console.log('[createMentorTeam] Step 6: Creating MentorTeam object');
      const team = await MentorTeam.create({
        sessionId,
        facultyId,
        teamName,
        description,
        status: 'ACTIVE',
      });
      console.log('[createMentorTeam] Step 7: Team created with id:', team.id);

      // Add team members if provided
      if (studentSessionIds && Array.isArray(studentSessionIds) && studentSessionIds.length > 0) {
        console.log('[createMentorTeam] Step 8: Adding members:', studentSessionIds.length);
        const members = await Promise.all(
          studentSessionIds.map(studentSessionId =>
            MentorTeamMember.create({
              mentorTeamId: team.id,
              studentSessionId,
              joinedAt: new Date(),
            })
          )
        );
        console.log(`[createMentorTeam] Step 9: Added ${members.length} members to team`);
      } else {
        console.log('[createMentorTeam] Step 8: No members to add');
      }

      console.log('[createMentorTeam] Step 10: Sending success response');
      res.status(201).json({
        message: 'Mentor team created successfully',
        team,
      });
    } catch (error) {
      console.error('[createMentorTeam] ERROR:', error.message);
      console.error('[createMentorTeam] Stack:', error.stack);
      res.status(500).json({ message: 'Failed to create mentor team', error: error.message });
    }
  },

  // Get all mentor teams (admin/faculty)
  getMentorTeams: async (req, res) => {
    const { sessionId, facultyId } = req.query;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    console.log('[getMentorTeams] Fetching teams:', { sessionId, facultyId, userRole });

    try {
      let where = {};
      if (sessionId) where.sessionId = sessionId;
      if (facultyId) where.facultyId = facultyId;

      // Non-admin faculty can only see their own teams
      if (userRole === 'FACULTY' && !facultyId) {
        where.facultyId = userId;
      }

      const teams = await MentorTeam.findAll({
        where,
        include: [
          {
            model: User,
            as: 'Faculty',
            attributes: ['id', 'firstName', 'lastName', 'email'],
          },
          {
            model: AcademicSession,
            attributes: ['id', 'name', 'startDate', 'endDate'],
          },
          {
            model: MentorTeamMember,
            include: [
              {
                model: StudentSession,
                include: [
                  {
                    model: User,
                    as: 'Student',
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                  },
                ],
              },
            ],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      res.status(200).json({
        message: 'Mentor teams retrieved',
        teams,
        count: teams.length,
      });
    } catch (error) {
      console.error('Get mentor teams error:', error);
      res.status(500).json({ message: 'Failed to fetch mentor teams' });
    }
  },

  // Get single mentor team
  getMentorTeam: async (req, res) => {
    const { teamId } = req.params;

    try {
      const team = await MentorTeam.findByPk(teamId, {
        include: [
          {
            model: User,
            as: 'Faculty',
            attributes: ['id', 'firstName', 'lastName', 'email'],
          },
          {
            model: AcademicSession,
            attributes: ['id', 'name'],
          },
          {
            model: MentorTeamMember,
            include: [
              {
                model: StudentSession,
                include: [
                  {
                    model: User,
                    as: 'Student',
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                  },
                ],
              },
            ],
          },
          {
            model: MentorRequirement,
          },
        ],
      });

      if (!team) {
        return res.status(404).json({ message: 'Mentor team not found' });
      }

      res.status(200).json({
        message: 'Mentor team retrieved',
        team,
      });
    } catch (error) {
      console.error('Get mentor team error:', error);
      res.status(500).json({ message: 'Failed to fetch mentor team' });
    }
  },

  // Update mentor team
  updateMentorTeam: async (req, res) => {
    const { teamId } = req.params;
    const { teamName, description, status, facultyId } = req.body;

    try {
      const team = await MentorTeam.findByPk(teamId);
      if (!team) {
        return res.status(404).json({ message: 'Mentor team not found' });
      }

      // Verify faculty exists and has FACULTY role if being changed
      if (facultyId && facultyId !== team.facultyId) {
        const faculty = await User.findByPk(facultyId);
        if (!faculty || faculty.approvedRole !== 'FACULTY') {
          return res.status(404).json({ message: 'Faculty not found or invalid role' });
        }
      }

      await team.update({
        ...(teamName && { teamName }),
        ...(description && { description }),
        ...(status && { status }),
        ...(facultyId && { facultyId }),
      });

      res.status(200).json({
        message: 'Mentor team updated successfully',
        team,
      });
    } catch (error) {
      console.error('Update mentor team error:', error);
      res.status(500).json({ message: 'Failed to update mentor team' });
    }
  },

  // Delete mentor team
  deleteMentorTeam: async (req, res) => {
    const { teamId } = req.params;

    try {
      const team = await MentorTeam.findByPk(teamId);
      if (!team) {
        return res.status(404).json({ message: 'Mentor team not found' });
      }

      await team.destroy();

      res.status(200).json({
        message: 'Mentor team deleted successfully',
      });
    } catch (error) {
      console.error('Delete mentor team error:', error);
      res.status(500).json({ message: 'Failed to delete mentor team' });
    }
  },

  // Add students to mentor team
  addTeamMembers: async (req, res) => {
    const { teamId } = req.params;
    const { studentSessionIds } = req.body;

    try {
      const team = await MentorTeam.findByPk(teamId);
      if (!team) {
        return res.status(404).json({ message: 'Mentor team not found' });
      }

      // Check for existing members
      const existingMembers = await MentorTeamMember.findAll({
        where: {
          mentorTeamId: teamId,
          studentSessionId: { [Op.in]: studentSessionIds },
        },
      });

      const newIds = studentSessionIds.filter(
        id => !existingMembers.some(m => m.studentSessionId === id)
      );

      const members = await Promise.all(
        newIds.map(studentSessionId =>
          MentorTeamMember.create({
            mentorTeamId: teamId,
            studentSessionId,
          })
        )
      );

      res.status(201).json({
        message: `${members.length} students added to team`,
        members,
      });
    } catch (error) {
      console.error('Add team members error:', error);
      res.status(500).json({ message: 'Failed to add team members' });
    }
  },

  // Remove student from mentor team
  removeTeamMember: async (req, res) => {
    const { teamId, memberId } = req.params;

    try {
      const member = await MentorTeamMember.findByPk(memberId);
      if (!member || member.mentorTeamId !== teamId) {
        return res.status(404).json({ message: 'Team member not found' });
      }

      await member.destroy();

      res.status(200).json({
        message: 'Student removed from team successfully',
      });
    } catch (error) {
      console.error('Remove team member error:', error);
      res.status(500).json({ message: 'Failed to remove team member' });
    }
  },

  // ============ MENTOR REQUIREMENTS (FACULTY) ============

  // Create requirement
  createRequirement: async (req, res) => {
    const { teamId } = req.params;
    const { title, description, dueDate } = req.body;
    const facultyId = req.user?.id;

    console.log('[createRequirement] Creating requirement:', { teamId, title });

    try {
      const team = await MentorTeam.findByPk(teamId);
      if (!team) {
        return res.status(404).json({ message: 'Mentor team not found' });
      }

      // Verify faculty owns this team
      if (team.facultyId !== facultyId && req.user?.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized to create requirements for this team' });
      }

      const requirement = await MentorRequirement.create({
        mentorTeamId: teamId,
        createdBy: facultyId,
        title,
        description,
        dueDate,
        status: 'ACTIVE',
      });

      res.status(201).json({
        message: 'Requirement created successfully',
        requirement,
      });
    } catch (error) {
      console.error('Create requirement error:', error);
      res.status(500).json({ message: 'Failed to create requirement' });
    }
  },

  // Get requirements for a team
  getTeamRequirements: async (req, res) => {
    const { teamId } = req.params;

    try {
      const requirements = await MentorRequirement.findAll({
        where: { mentorTeamId: teamId },
        include: [
          {
            model: User,
            as: 'CreatedBy',
            attributes: ['id', 'firstName', 'lastName'],
          },
          {
            model: MentorResponse,
            include: [
              {
                model: StudentSession,
                include: [
                  {
                    model: User,
                    as: 'Student',
                    attributes: ['id', 'firstName', 'lastName'],
                  },
                ],
              },
            ],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      res.status(200).json({
        message: 'Requirements retrieved',
        requirements,
        count: requirements.length,
      });
    } catch (error) {
      console.error('Get team requirements error:', error);
      res.status(500).json({ message: 'Failed to fetch requirements' });
    }
  },

  // Get single requirement
  getRequirement: async (req, res) => {
    const { requirementId } = req.params;

    try {
      const requirement = await MentorRequirement.findByPk(requirementId, {
        include: [
          {
            model: User,
            as: 'CreatedBy',
            attributes: ['id', 'firstName', 'lastName'],
          },
          {
            model: MentorTeam,
            include: [
              {
                model: User,
                as: 'Faculty',
                attributes: ['id', 'firstName', 'lastName'],
              },
            ],
          },
          {
            model: MentorResponse,
            include: [
              {
                model: StudentSession,
                include: [
                  {
                    model: User,
                    as: 'Student',
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                  },
                ],
              },
            ],
          },
        ],
      });

      if (!requirement) {
        return res.status(404).json({ message: 'Requirement not found' });
      }

      res.status(200).json({
        message: 'Requirement retrieved',
        requirement,
      });
    } catch (error) {
      console.error('Get requirement error:', error);
      res.status(500).json({ message: 'Failed to fetch requirement' });
    }
  },

  // Update requirement
  updateRequirement: async (req, res) => {
    const { requirementId } = req.params;
    const { title, description, dueDate, status } = req.body;
    const userId = req.user?.id;

    try {
      const requirement = await MentorRequirement.findByPk(requirementId);
      if (!requirement) {
        return res.status(404).json({ message: 'Requirement not found' });
      }

      // Verify authorization
      if (requirement.createdBy !== userId && req.user?.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized to update this requirement' });
      }

      await requirement.update({
        ...(title && { title }),
        ...(description && { description }),
        ...(dueDate && { dueDate }),
        ...(status && { status }),
      });

      res.status(200).json({
        message: 'Requirement updated successfully',
        requirement,
      });
    } catch (error) {
      console.error('Update requirement error:', error);
      res.status(500).json({ message: 'Failed to update requirement' });
    }
  },

  // Delete requirement
  deleteRequirement: async (req, res) => {
    const { requirementId } = req.params;
    const userId = req.user?.id;

    try {
      const requirement = await MentorRequirement.findByPk(requirementId);
      if (!requirement) {
        return res.status(404).json({ message: 'Requirement not found' });
      }

      // Verify authorization
      if (requirement.createdBy !== userId && req.user?.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized to delete this requirement' });
      }

      await requirement.destroy();

      res.status(200).json({
        message: 'Requirement deleted successfully',
      });
    } catch (error) {
      console.error('Delete requirement error:', error);
      res.status(500).json({ message: 'Failed to delete requirement' });
    }
  },

  // ============ STUDENT RESPONSES ============

  // Submit response to requirement
  submitResponse: async (req, res) => {
    const { requirementId } = req.params;
    const { responseText } = req.body;
    const studentSessionId = req.body.studentSessionId || req.query.studentSessionId;

    console.log('[submitResponse] Submitting response:', { 
      requirementId, 
      studentSessionId,
      hasFile: !!req.file,
      fileInfo: req.file ? { 
        name: req.file.originalname, 
        size: req.file.size,
        mimetype: req.file.mimetype 
      } : null,
      responseText: responseText?.substring(0, 50)
    });

    try {
      // Verify requirement exists
      const requirement = await MentorRequirement.findByPk(requirementId);
      if (!requirement) {
        return res.status(404).json({ message: 'Requirement not found' });
      }

      // Verify student session exists and belongs to team
      const teamMember = await MentorTeamMember.findOne({
        where: {
          mentorTeamId: requirement.mentorTeamId,
          studentSessionId,
        },
      });

      if (!teamMember) {
        return res.status(403).json({ message: 'Student is not a member of this team' });
      }

      // Check if response already exists
      let response = await MentorResponse.findOne({
        where: {
          requirementId,
          studentSessionId,
        },
      });

      let fileUrl = null;
      // Handle file upload if present
      if (req.file) {
        try {
          console.log('[submitResponse] Uploading file to S3:', req.file.originalname);
          fileUrl = await s3Upload.uploadToS3(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            'mentor-responses'
          );
          console.log('[submitResponse] File uploaded successfully:', fileUrl);
        } catch (uploadError) {
          console.error('[submitResponse] File upload error:', uploadError);
          return res.status(500).json({ message: 'Failed to upload file to S3', error: uploadError.message });
        }
      }

      if (response) {
        // Update existing response
        response = await response.update({
          responseText: responseText || response.responseText,
          fileUrl: fileUrl || response.fileUrl,
          status: 'SUBMITTED',
          submittedAt: new Date(),
        });
      } else {
        // Create new response
        response = await MentorResponse.create({
          requirementId,
          studentSessionId,
          responseText,
          fileUrl,
          status: 'SUBMITTED',
          submittedAt: new Date(),
        });
      }

      res.status(201).json({
        message: 'Response submitted successfully',
        response,
      });
    } catch (error) {
      console.error('Submit response error:', error);
      res.status(500).json({ message: 'Failed to submit response' });
    }
  },

  // Get student responses for a requirement
  getRequirementResponses: async (req, res) => {
    const { requirementId } = req.params;

    try {
      const responses = await MentorResponse.findAll({
        where: { requirementId },
        include: [
          {
            model: StudentSession,
            include: [
              {
                model: User,
                as: 'Student',
                attributes: ['id', 'firstName', 'lastName', 'email'],
              },
            ],
          },
          {
            model: MentorRequirement,
            attributes: ['id', 'title', 'description', 'dueDate', 'status'],
          },
        ],
        order: [['submittedAt', 'DESC']],
      });

      res.status(200).json({
        message: 'Responses retrieved',
        responses,
        count: responses.length,
      });
    } catch (error) {
      console.error('Get requirement responses error:', error);
      res.status(500).json({ message: 'Failed to fetch responses' });
    }
  },

  // Get student's own responses
  getStudentResponses: async (req, res) => {
    const { studentSessionId } = req.query;

    try {
      const responses = await MentorResponse.findAll({
        where: { studentSessionId },
        include: [
          {
            model: MentorRequirement,
            include: [
              {
                model: MentorTeam,
                include: [
                  {
                    model: User,
                    as: 'Faculty',
                    attributes: ['id', 'firstName', 'lastName'],
                  },
                ],
              },
            ],
          },
        ],
        order: [['submittedAt', 'DESC']],
      });

      res.status(200).json({
        message: 'Student responses retrieved',
        responses,
        count: responses.length,
      });
    } catch (error) {
      console.error('Get student responses error:', error);
      res.status(500).json({ message: 'Failed to fetch student responses' });
    }
  },

  // Provide feedback on response
  provideFeedback: async (req, res) => {
    const { responseId } = req.params;
    const { feedback } = req.body;
    const facultyId = req.user?.id;

    try {
      const response = await MentorResponse.findByPk(responseId, {
        include: [
          {
            model: MentorRequirement,
            include: [
              {
                model: MentorTeam,
              },
            ],
          },
        ],
      });

      if (!response) {
        return res.status(404).json({ message: 'Response not found' });
      }

      // Verify faculty owns the team
      if (response.MentorRequirement.MentorTeam.facultyId !== facultyId && req.user?.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized to provide feedback' });
      }

      await response.update({
        feedback,
        status: 'REVIEWED',
      });

      res.status(200).json({
        message: 'Feedback provided successfully',
        response,
      });
    } catch (error) {
      console.error('Provide feedback error:', error);
      res.status(500).json({ message: 'Failed to provide feedback' });
    }
  },

  // ============ STUDENT MENTOR VIEW ============

  // Get student's mentors
  getStudentMentors: async (req, res) => {
    const { studentSessionId } = req.query;

    try {
      const mentorTeams = await MentorTeamMember.findAll({
        where: { studentSessionId },
        include: [
          {
            model: MentorTeam,
            include: [
              {
                model: User,
                as: 'Faculty',
                attributes: ['id', 'firstName', 'lastName', 'email', 'department'],
              },
              {
                model: AcademicSession,
                attributes: ['id', 'name'],
              },
              {
                model: MentorRequirement,
              },
            ],
          },
        ],
      });

      res.status(200).json({
        message: 'Student mentors retrieved',
        mentors: mentorTeams,
        count: mentorTeams.length,
      });
    } catch (error) {
      console.error('Get student mentors error:', error);
      res.status(500).json({ message: 'Failed to fetch mentors' });
    }
  },

  // Get requirements for student (from their mentor teams)
  getStudentRequirements: async (req, res) => {
    const { studentSessionId } = req.query;

    try {
      console.log('[getStudentRequirements] Fetching for student session:', studentSessionId);
      
      // Get all mentor teams for this student
      const membershipTeams = await MentorTeamMember.findAll({
        where: { studentSessionId },
        attributes: ['mentorTeamId'],
      });

      const teamIds = membershipTeams.map(m => m.mentorTeamId);
      console.log('[getStudentRequirements] Team IDs:', teamIds);

      if (teamIds.length === 0) {
        return res.status(200).json({
          message: 'No mentor requirements',
          requirements: [],
          count: 0,
        });
      }

      // Get all requirements from these teams
      const requirements = await MentorRequirement.findAll({
        where: {
          mentorTeamId: { [Op.in]: teamIds },
          status: 'ACTIVE',
        },
        include: [
          {
            model: MentorTeam,
            include: [
              {
                model: User,
                as: 'Faculty',
                attributes: ['id', 'firstName', 'lastName'],
              },
            ],
          },
          {
            model: MentorResponse,
            where: { studentSessionId },
            required: false, // LEFT JOIN - include reqs with/without responses
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      console.log('[getStudentRequirements] Found requirements:', requirements.length);
      requirements.forEach((req, idx) => {
        console.log(`[getStudentRequirements] Requirement ${idx}:`, {
          id: req.id,
          title: req.title,
          responsesCount: req.MentorResponses?.length || 0,
          responses: req.MentorResponses,
        });
      });

      res.status(200).json({
        message: 'Student requirements retrieved',
        requirements,
        count: requirements.length,
      });
    } catch (error) {
      console.error('Get student requirements error:', error);
      res.status(500).json({ message: 'Failed to fetch requirements' });
    }
  },
};
