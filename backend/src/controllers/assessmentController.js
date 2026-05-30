const {
  Assessment,
  AssessmentQuestion,
  AssessmentAssignment,
  AssessmentSubmission,
  AssessmentResponse,
  AcademicSession,
  StudentSession,
  StudentSessionCategory,
  SessionCategory,
  User,
  RubricScore,
  RubricCriteria,
} = require('../models');
const { Op } = require('sequelize');
const { uploadToS3 } = require('../utils/s3Upload');

const assessmentController = {
  // ============ ASSESSMENT CRUD ============
  
  // Create assessment
  createAssessment: async (req, res) => {
    const { title, description, type, assignmentScope, academicSessionId, deadline, totalPoints } = req.body;
    const userId = req.user.id;

    if (!title || !assignmentScope || !academicSessionId) {
      return res.status(400).json({
        message: 'title, assignmentScope, and academicSessionId are required',
      });
    }

    try {
      const assessment = await Assessment.create({
        title,
        description,
        type: type || 'MANUAL',
        status: 'DRAFT',
        assignmentScope,
        academicSessionId,
        createdBy: userId,
        deadline: deadline ? new Date(deadline) : null,
        totalPoints: totalPoints || 0,
      });

      res.status(201).json({
        message: 'Assessment created successfully',
        assessment,
      });
    } catch (error) {
      console.error('Create assessment error:', error);
      res.status(500).json({ message: 'Failed to create assessment' });
    }
  },

  // Get all assessments for a session
  getAssessments: async (req, res) => {
    const { academicSessionId, status, page = 1, limit = 10 } = req.query;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    console.log('[getAssessments] Params:', { academicSessionId, status, page, limit, userRole, userId });

    try {
      let sessionId = academicSessionId;
      let studentSessionId = null;
      let where = {};

      // For students, get their current session if not provided
      if (!sessionId && userRole === 'STUDENT' && userId) {
        console.log('[getAssessments] Looking for student session for userId:', userId);
        const studentSession = await StudentSession.findOne({
          where: { userId },
          order: [['createdAt', 'DESC']],
        });

        if (studentSession) {
          sessionId = studentSession.academicSessionId;
          studentSessionId = studentSession.id;
          console.log('[getAssessments] Found student session:', { sessionId, studentSessionId });
        } else {
          console.log('[getAssessments] No student session found');
          // If student has no session, return empty
          return res.status(200).json({
            message: 'No assessments found',
            count: 0,
            assessments: [],
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: 0,
              pages: 0,
            },
          });
        }
      }

      // For FACULTY, PLACEMENT_COORDINATOR, TRAINER: only see their own assessments
      if (['FACULTY', 'PLACEMENT_COORDINATOR', 'TRAINER'].includes(userRole)) {
        where.createdBy = userId;
        console.log('[getAssessments] Non-admin user filtered to own assessments:', userId);
      }

      // Build where clause
      // For admin/faculty/HOD: if no sessionId provided, get all assessments from all sessions
      // For students: require sessionId (already handled above)
      // For others: require sessionId
      if (sessionId) {
        where.academicSessionId = sessionId;
      } else if (userRole === 'STUDENT' || !['ADMIN', 'HOD', 'MENTOR', 'FACULTY', 'PLACEMENT_COORDINATOR', 'TRAINER'].includes(userRole)) {
        console.log('[getAssessments] Non-admin user without sessionId');
        return res.status(400).json({ message: 'academicSessionId is required' });
      }

      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const offset = (pageNum - 1) * limitNum;
      
      if (status) where.status = status;

      console.log('[getAssessments] Query where clause:', where);

      // Build include array based on user role
      let includeArray = [
        {
          model: User,
          attributes: ['id', 'firstName', 'lastName', 'email'],
          as: 'Creator',
        },
        {
          model: AssessmentQuestion,
          attributes: ['id', 'questionText', 'questionType', 'pointsValue'],
        },
      ];

      // Add submissions for student view
      if (userRole === 'STUDENT' && studentSessionId) {
        includeArray.push({
          model: AssessmentSubmission,
          where: { 
            studentSessionId,
            status: { [Op.in]: ['SUBMITTED', 'GRADED'] }, // Only include submitted or graded submissions
          },
          required: false,
          attributes: ['id', 'status', 'totalScore', 'submittedAt', 'gradedAt'],
        });
      }

      const { count, rows } = await Assessment.findAndCountAll({
        where,
        offset,
        limit: limitNum,
        include: includeArray,
        order: [['createdAt', 'DESC']],
      });

      console.log('[getAssessments] Found', count, 'assessments');

      // Convert to JSON and parse metadata for questions in each assessment
      const assessmentsWithParsedMetadata = rows.map(assessment => {
        const assessmentData = assessment.toJSON();
        if (assessmentData.AssessmentQuestions) {
          assessmentData.AssessmentQuestions = assessmentData.AssessmentQuestions.map(q => {
            if (typeof q.metadata === 'string') {
              try {
                q.metadata = JSON.parse(q.metadata);
              } catch (e) {
                console.warn('Failed to parse metadata for question:', q.id);
              }
            }
            return q;
          });
        }
        return assessmentData;
      });

      res.status(200).json({
        message: 'Assessments retrieved',
        count,
        assessments: assessmentsWithParsedMetadata,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          pages: Math.ceil(count / limitNum),
        },
      });
    } catch (error) {
      console.error('[getAssessments] Error:', error);
      console.error('[getAssessments] Error stack:', error.stack);
      res.status(500).json({ message: 'Failed to fetch assessments', error: error.message });
    }
  },

  // Get assessments assigned to a specific student
  getStudentAssignedAssessments: async (req, res) => {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (userRole !== 'STUDENT') {
      return res.status(403).json({ message: 'Only students can view their assigned assessments' });
    }

    try {
      // Get student session
      const studentSession = await StudentSession.findOne({
        where: { userId },
        order: [['createdAt', 'DESC']],
      });

      if (!studentSession) {
        return res.status(200).json({
          message: 'No assigned assessments',
          assessments: [],
        });
      }

      // Find direct assignments for this student
      const directAssignments = await AssessmentAssignment.findAll({
        where: { studentSessionId: studentSession.id },
        attributes: ['assessmentId'],
      });

      // Find categories this student belongs to
      const studentCategories = await StudentSessionCategory.findAll({
        where: { studentSessionId: studentSession.id },
        attributes: ['sessionCategoryId'],
      });

      const categoryIds = studentCategories.map(sc => sc.sessionCategoryId);

      // Find assessments assigned to those categories
      let categoryAssignmentIds = [];
      if (categoryIds.length > 0) {
        const categoryAssignments = await AssessmentAssignment.findAll({
          where: { categoryId: { [Op.in]: categoryIds } },
          attributes: ['assessmentId'],
        });
        categoryAssignmentIds = categoryAssignments.map(a => a.assessmentId);
      }

      // Get all unique assessment IDs
      const assessmentIds = [
        ...new Set([
          ...directAssignments.map(a => a.assessmentId),
          ...categoryAssignmentIds,
        ]),
      ];

      if (assessmentIds.length === 0) {
        return res.status(200).json({
          message: 'No assigned assessments',
          assessments: [],
        });
      }

      // Get assessments that are published
      const assessments = await Assessment.findAll({
        where: {
          id: { [Op.in]: assessmentIds },
          status: 'PUBLISHED',
        },
        include: [
          {
            model: User,
            attributes: ['id', 'firstName', 'lastName', 'email'],
            as: 'Creator',
          },
          {
            model: AssessmentQuestion,
            attributes: ['id', 'questionText', 'questionType', 'pointsValue', 'metadata'],
          },
          {
            model: AssessmentSubmission,
            where: { 
              studentSessionId: studentSession.id,
              status: { [Op.in]: ['SUBMITTED', 'GRADED'] }, // Only include submitted or graded submissions
            },
            required: false,
            attributes: ['id', 'status', 'totalScore', 'submittedAt', 'gradedAt'],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      // Parse metadata for questions and normalize submissions
      const assessmentsWithParsedMetadata = assessments.map(assessment => {
        const assessmentData = assessment.toJSON();
        
        // Parse question metadata
        if (assessmentData.AssessmentQuestions) {
          assessmentData.AssessmentQuestions = assessmentData.AssessmentQuestions.map(q => {
            if (typeof q.metadata === 'string') {
              try {
                q.metadata = JSON.parse(q.metadata);
              } catch (e) {
                console.warn('Failed to parse metadata for question:', q.id);
              }
            }
            return q;
          });
        }
        
        // Normalize submissions field (Sequelize returns as AssessmentSubmissions or submissions)
        if (assessmentData.AssessmentSubmissions) {
          assessmentData.submissions = assessmentData.AssessmentSubmissions;
          delete assessmentData.AssessmentSubmissions;
        } else if (!assessmentData.submissions) {
          assessmentData.submissions = [];
        }
        
        return assessmentData;
      });

      res.status(200).json({
        message: 'Assigned assessments retrieved',
        assessments: assessmentsWithParsedMetadata,
      });
    } catch (error) {
      console.error('Get student assigned assessments error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch assigned assessments',
        error: error.message 
      });
    }
  },


  // Get single assessment
  getAssessment: async (req, res) => {
    const { id } = req.params;

    try {
      const assessment = await Assessment.findByPk(id, {
        include: [
          {
            model: User,
            attributes: ['id', 'firstName', 'lastName', 'email'],
            as: 'Creator',
          },
          {
            model: AssessmentQuestion,
            attributes: ['id', 'questionText', 'questionType', 'pointsValue', 'orderIndex', 'metadata'],
            order: [['orderIndex', 'ASC']],
          },
          {
            model: AssessmentAssignment,
            required: false,
            attributes: ['id', 'assessmentId', 'studentSessionId', 'categoryId'],
            include: [
              {
                model: StudentSession,
                required: false,
                attributes: ['id', 'userId'],
                include: [
                  {
                    model: User,
                    required: false,
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                    as: 'Student',
                  },
                ],
              },
              {
                model: SessionCategory,
                required: false,
                attributes: ['id', 'name'],
              },
            ],
          },
        ],
      });

      if (!assessment) {
        return res.status(404).json({ message: 'Assessment not found' });
      }

      // Convert to JSON and parse metadata for questions
      const assessmentData = assessment.toJSON();
      
      if (assessmentData.AssessmentQuestions) {
        assessmentData.AssessmentQuestions = assessmentData.AssessmentQuestions.map(q => {
          // Parse metadata if it's a string
          if (typeof q.metadata === 'string') {
            try {
              q.metadata = JSON.parse(q.metadata);
            } catch (e) {
              console.warn('Failed to parse metadata for question:', q.id, e);
              q.metadata = {};
            }
          }
          return q;
        });
      }

      res.status(200).json({
        message: 'Assessment retrieved',
        assessment: assessmentData,
      });
    } catch (error) {
      console.error('Get assessment error:', error);
      res.status(500).json({ message: 'Failed to fetch assessment', error: error.message });
    }
  },

  // Update assessment
  updateAssessment: async (req, res) => {
    const { id } = req.params;
    const { title, description, type, status, deadline, totalPoints } = req.body;
    const userId = req.user.id;

    try {
      const assessment = await Assessment.findByPk(id);
      if (!assessment) {
        return res.status(404).json({ message: 'Assessment not found' });
      }

      // Only creator and admin can update
      if (assessment.createdBy !== userId && !['ADMIN', 'HOD'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized to update this assessment' });
      }

      // Can only edit if DRAFT
      if (assessment.status !== 'DRAFT') {
        return res.status(400).json({ message: 'Can only edit assessments in DRAFT status' });
      }

      await assessment.update({
        title: title || assessment.title,
        description: description || assessment.description,
        type: type || assessment.type,
        status: status || assessment.status,
        deadline: deadline ? new Date(deadline) : assessment.deadline,
        totalPoints: totalPoints || assessment.totalPoints,
      });

      res.status(200).json({
        message: 'Assessment updated successfully',
        assessment,
      });
    } catch (error) {
      console.error('Update assessment error:', error);
      res.status(500).json({ message: 'Failed to update assessment' });
    }
  },

  // Publish assessment (DRAFT -> PUBLISHED)
  publishAssessment: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      const assessment = await Assessment.findByPk(id);
      if (!assessment) {
        return res.status(404).json({ message: 'Assessment not found' });
      }

      if (assessment.createdBy !== userId && !['ADMIN', 'HOD'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      if (assessment.status !== 'DRAFT') {
        return res.status(400).json({ message: 'Only DRAFT assessments can be published' });
      }

      const questionCount = await AssessmentQuestion.count({
        where: { assessmentId: id },
      });

      if (questionCount === 0) {
        return res.status(400).json({ message: 'Assessment must have at least one question' });
      }

      await assessment.update({ status: 'PUBLISHED' });

      res.status(200).json({
        message: 'Assessment published successfully',
        assessment,
      });
    } catch (error) {
      console.error('Publish assessment error:', error);
      res.status(500).json({ message: 'Failed to publish assessment' });
    }
  },

  // Close assessment (PUBLISHED -> CLOSED)
  closeAssessment: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      const assessment = await Assessment.findByPk(id);
      if (!assessment) {
        return res.status(404).json({ message: 'Assessment not found' });
      }

      if (assessment.createdBy !== userId && !['ADMIN', 'HOD'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      if (assessment.status !== 'PUBLISHED') {
        return res.status(400).json({ message: 'Only PUBLISHED assessments can be closed' });
      }

      await assessment.update({ status: 'CLOSED' });

      res.status(200).json({
        message: 'Assessment closed successfully',
        assessment,
      });
    } catch (error) {
      console.error('Close assessment error:', error);
      res.status(500).json({ message: 'Failed to close assessment' });
    }
  },

  // Unpublish assessment (PUBLISHED -> DRAFT)
  unpublishAssessment: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      const assessment = await Assessment.findByPk(id);
      if (!assessment) {
        return res.status(404).json({ message: 'Assessment not found' });
      }

      if (assessment.createdBy !== userId && !['ADMIN', 'HOD'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      if (assessment.status !== 'PUBLISHED') {
        return res.status(400).json({ message: 'Only PUBLISHED assessments can be unpublished' });
      }

      await assessment.update({ status: 'DRAFT' });

      res.status(200).json({
        message: 'Assessment unpublished successfully',
        assessment,
      });
    } catch (error) {
      console.error('Unpublish assessment error:', error);
      res.status(500).json({ message: 'Failed to unpublish assessment' });
    }
  },

  // Delete assessment
  deleteAssessment: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      const assessment = await Assessment.findByPk(id);
      if (!assessment) {
        return res.status(404).json({ message: 'Assessment not found' });
      }

      if (assessment.createdBy !== userId && !['ADMIN', 'HOD'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Delete cascade handled by Sequelize associations
      await assessment.destroy({ force: true });

      res.status(200).json({
        message: 'Assessment deleted successfully',
      });
    } catch (error) {
      console.error('Delete assessment error:', error);
      res.status(500).json({ message: error.message || 'Failed to delete assessment' });
    }
  },

  // ============ QUESTION MANAGEMENT ============

  // Add question to assessment
  addQuestion: async (req, res) => {
    const { assessmentId } = req.params;
    const { questionText, questionType, pointsValue, metadata } = req.body;
    const userId = req.user.id;

    if (!questionText || !questionType) {
      return res.status(400).json({ message: 'questionText and questionType are required' });
    }

    try {
      const assessment = await Assessment.findByPk(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: 'Assessment not found' });
      }

      if (assessment.createdBy !== userId && !['ADMIN', 'HOD'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      if (assessment.status !== 'DRAFT') {
        return res.status(400).json({ message: 'Can only edit questions in DRAFT assessments' });
      }

      // Get current max orderIndex
      const lastQuestion = await AssessmentQuestion.findOne({
        where: { assessmentId },
        order: [['orderIndex', 'DESC']],
      });
      const nextIndex = (lastQuestion?.orderIndex || 0) + 1;

      const question = await AssessmentQuestion.create({
        assessmentId,
        questionText,
        questionType,
        pointsValue: pointsValue || 1,
        orderIndex: nextIndex,
        metadata: metadata || {},
      });

      res.status(201).json({
        message: 'Question added successfully',
        question,
      });
    } catch (error) {
      console.error('Add question error:', error);
      res.status(500).json({ message: 'Failed to add question' });
    }
  },

  // Update question
  updateQuestion: async (req, res) => {
    const { assessmentId, questionId } = req.params;
    const { questionText, questionType, pointsValue, metadata } = req.body;
    const userId = req.user.id;

    try {
      const assessment = await Assessment.findByPk(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: 'Assessment not found' });
      }

      if (assessment.createdBy !== userId && !['ADMIN', 'HOD'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      if (assessment.status !== 'DRAFT') {
        return res.status(400).json({ message: 'Can only edit questions in DRAFT assessments' });
      }

      const question = await AssessmentQuestion.findByPk(questionId);
      if (!question) {
        return res.status(404).json({ message: 'Question not found' });
      }

      await question.update({
        questionText: questionText || question.questionText,
        questionType: questionType || question.questionType,
        pointsValue: pointsValue || question.pointsValue,
        metadata: metadata || question.metadata,
      });

      res.status(200).json({
        message: 'Question updated successfully',
        question,
      });
    } catch (error) {
      console.error('Update question error:', error);
      res.status(500).json({ message: 'Failed to update question' });
    }
  },

  // Delete question
  deleteQuestion: async (req, res) => {
    const { assessmentId, questionId } = req.params;
    const userId = req.user.id;

    try {
      const assessment = await Assessment.findByPk(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: 'Assessment not found' });
      }

      if (assessment.createdBy !== userId && !['ADMIN', 'HOD'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      if (assessment.status !== 'DRAFT') {
        return res.status(400).json({ message: 'Can only edit questions in DRAFT assessments' });
      }

      const question = await AssessmentQuestion.findByPk(questionId);
      if (!question) {
        return res.status(404).json({ message: 'Question not found' });
      }

      await question.destroy();

      res.status(200).json({
        message: 'Question deleted successfully',
      });
    } catch (error) {
      console.error('Delete question error:', error);
      res.status(500).json({ message: 'Failed to delete question' });
    }
  },

  // ============ ASSIGNMENT MANAGEMENT ============

  // Assign assessment to students/categories (multi-select support)
  assignAssessment: async (req, res) => {
    const { assessmentId } = req.params;
    const { studentSessionIds = [], categoryIds = [] } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (studentSessionIds.length === 0 && categoryIds.length === 0) {
      return res.status(400).json({
        message: 'At least one studentSessionId or categoryId must be provided',
      });
    }

    try {
      const assessment = await Assessment.findByPk(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: 'Assessment not found' });
      }

      // Check authorization
      if (assessment.createdBy !== userId && userRole !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized to assign this assessment' });
      }

      if (assessment.status !== 'DRAFT' && assessment.status !== 'PUBLISHED') {
        return res.status(400).json({
          message: 'Assessment must be in DRAFT or PUBLISHED status',
        });
      }

      const assignments = [];

      // Assign to specific students
      for (const studentSessionId of studentSessionIds) {
        const existing = await AssessmentAssignment.findOne({
          where: { assessmentId, studentSessionId },
        });

        if (!existing) {
          assignments.push({
            assessmentId,
            studentSessionId,
            categoryId: null,
          });
        }
      }

      // Assign to categories
      for (const categoryId of categoryIds) {
        const existing = await AssessmentAssignment.findOne({
          where: { assessmentId, categoryId },
        });

        if (!existing) {
          assignments.push({
            assessmentId,
            categoryId,
            studentSessionId: null,
          });
        }
      }

      if (assignments.length > 0) {
        await AssessmentAssignment.bulkCreate(assignments);
      }

      res.status(201).json({
        message: `Assessment assigned to ${assignments.length} students/categories`,
        assignmentsCreated: assignments.length,
      });
    } catch (error) {
      console.error('Assign assessment error:', error);
      res.status(500).json({ message: 'Failed to assign assessment' });
    }
  },

  // Remove assignment
  removeAssignment: async (req, res) => {
    const { assessmentId, assignmentId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    try {
      const assignment = await AssessmentAssignment.findByPk(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }

      // Check authorization by verifying user owns the assessment
      const assessment = await Assessment.findByPk(assignment.assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: 'Assessment not found' });
      }

      if (assessment.createdBy !== userId && userRole !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized to remove this assignment' });
      }

      await assignment.destroy();

      res.status(200).json({
        message: 'Assignment removed successfully',
      });
    } catch (error) {
      console.error('Remove assignment error:', error);
      res.status(500).json({ message: 'Failed to remove assignment' });
    }
  },

  // Get students assigned to an assessment
  getAssignedStudents: async (req, res) => {
    const { assessmentId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    try {
      const assessment = await Assessment.findByPk(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: 'Assessment not found' });
      }

      // Check authorization
      if (assessment.createdBy !== userId && userRole !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized to view assignments for this assessment' });
      }

      const assignments = await AssessmentAssignment.findAll({
        where: { assessmentId },
        include: [
          {
            model: StudentSession,
            required: false,
            include: [
              {
                model: User,
                attributes: ['id', 'firstName', 'lastName', 'email', 'registrationNumber'],
                as: 'Student',
              },
            ],
          },
          {
            model: SessionCategory,
            required: false,
          },
        ],
      });

      // Map and convert to JSON to ensure proper serialization
      const mappedAssignments = assignments.map(assignment => {
        const assignmentJson = assignment.toJSON ? assignment.toJSON() : assignment;
        if (assignmentJson.StudentSession && assignmentJson.StudentSession.Student) {
          assignmentJson.StudentSession.Student = assignmentJson.StudentSession.Student.toJSON ? assignmentJson.StudentSession.Student.toJSON() : assignmentJson.StudentSession.Student;
        }
        return assignmentJson;
      });

      res.status(200).json({
        message: 'Assigned students retrieved',
        assignments: mappedAssignments,
      });
    } catch (error) {
      console.error('Get assigned students error:', error);
      res.status(500).json({ message: 'Failed to fetch assigned students' });
    }
  },

  // ============ SUBMISSION MANAGEMENT ============

  // Get student's assessment submissions
  getSubmissions: async (req, res) => {
    const { assessmentId, studentSessionId } = req.query;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    let where = {
      status: { [Op.in]: ['SUBMITTED', 'GRADED'] }, // Only return submitted or graded, not in-progress
    };
    if (assessmentId) where.assessmentId = assessmentId;
    if (studentSessionId) where.studentSessionId = studentSessionId;

    try {
      // For non-admin roles, verify they own the assessment
      if (assessmentId && userRole !== 'ADMIN') {
        const assessment = await Assessment.findByPk(assessmentId);
        if (!assessment) {
          return res.status(404).json({ message: 'Assessment not found' });
        }
        if (assessment.createdBy !== userId) {
          return res.status(403).json({ message: 'Not authorized to view these submissions' });
        }
      }

      const submissions = await AssessmentSubmission.findAll({
        where,
        include: [
          {
            model: Assessment,
            attributes: ['title', 'totalPoints'],
          },
          {
            model: StudentSession,
            include: [
              {
                model: User,
                attributes: ['id', 'firstName', 'lastName', 'email'],
                as: 'Student',
              },
            ],
          },
          {
            model: User,
            attributes: ['id', 'firstName', 'lastName', 'email'],
            as: 'GradedByUser',
          },
          {
            model: AssessmentResponse,
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      // Convert submissions to JSON and ensure totalScore is a number
      const submissionsJSON = submissions.map(sub => {
        const subJSON = sub.toJSON();
        return {
          ...subJSON,
          totalScore: subJSON.totalScore ? parseFloat(subJSON.totalScore) : null,
        };
      });

      console.log('[getSubmissions] Submissions with scores:', submissionsJSON.map(s => ({
        id: s.id,
        assessmentId: s.assessmentId,
        studentSessionId: s.studentSessionId,
        totalScore: s.totalScore,
        status: s.status,
      })));

      res.status(200).json({
        message: 'Submissions retrieved',
        submissions: submissionsJSON,
      });
    } catch (error) {
      console.error('Get submissions error:', error);
      res.status(500).json({ message: 'Failed to fetch submissions' });
    }
  },

  // Get submissions for a specific assessment (student gets their own)
  getAssessmentSubmissions: async (req, res) => {
    const { assessmentId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    try {
      // For students, get their own submissions
      if (userRole === 'STUDENT') {
        const studentSession = await StudentSession.findOne({
          where: { userId },
          order: [['createdAt', 'DESC']],
        });

        if (!studentSession) {
          return res.status(200).json({
            message: 'No submissions found',
            submissions: [],
          });
        }

        const submissions = await AssessmentSubmission.findAll({
          where: {
            assessmentId,
            studentSessionId: studentSession.id,
            status: { [Op.in]: ['SUBMITTED', 'GRADED'] },
          },
          include: [
            {
              model: Assessment,
              attributes: ['title', 'totalPoints'],
            },
            {
              model: AssessmentResponse,
              attributes: ['id', 'questionId', 'response', 'fileUrl', 'isCorrect', 'feedback'],
              include: [
                {
                  model: AssessmentQuestion,
                  attributes: ['questionText', 'questionType', 'pointsValue'],
                },
              ],
            },
            {
              model: User,
              attributes: ['id', 'firstName', 'lastName', 'email'],
              as: 'GradedByUser',
            },
          ],
          order: [['createdAt', 'DESC']],
        });

        return res.status(200).json({
          message: 'Submissions retrieved',
          submissions,
        });
      }

      // For admin/teachers, verify authorization and get all submissions for the assessment
      const assessment = await Assessment.findByPk(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: 'Assessment not found' });
      }

      // Only creator and admin can view submissions
      if (assessment.createdBy !== userId && userRole !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized to view these submissions' });
      }

      const submissions = await AssessmentSubmission.findAll({
        where: {
          assessmentId,
          status: { [Op.in]: ['SUBMITTED', 'GRADED'] },
        },
        include: [
          {
            model: Assessment,
            attributes: ['title', 'totalPoints'],
          },
          {
            model: StudentSession,
            include: [
              {
                model: User,
                attributes: ['id', 'firstName', 'lastName', 'email'],
                as: 'Student',
              },
            ],
          },
          {
            model: AssessmentResponse,
            attributes: ['id', 'questionId', 'response', 'fileUrl', 'isCorrect', 'feedback'],
            include: [
              {
                model: AssessmentQuestion,
                attributes: ['questionText', 'questionType', 'pointsValue'],
              },
            ],
          },
          {
            model: User,
            attributes: ['id', 'firstName', 'lastName', 'email'],
            as: 'GradedByUser',
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      res.status(200).json({
        message: 'Submissions retrieved',
        submissions,
      });
    } catch (error) {
      console.error('Get assessment submissions error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch submissions',
        error: error.message 
      });
    }
  },

  // Start/Create submission (student initiates)
  startSubmission: async (req, res) => {
    const { assessmentId } = req.params;
    const userId = req.user?.id;

    try {
      console.log('[startSubmission] Starting for user:', userId, 'assessment:', assessmentId);
      
      const assessment = await Assessment.findByPk(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: 'Assessment not found' });
      }

      if (assessment.status !== 'PUBLISHED') {
        return res.status(400).json({ message: 'Assessment is not available' });
      }

      // Get student session from user ID - ensure we get the LATEST one for this user
      const studentSession = await StudentSession.findOne({
        where: { userId },
        order: [['createdAt', 'DESC']], // Get the most recent session
      });

      if (!studentSession) {
        console.log('[startSubmission] No student session found for user:', userId);
        return res.status(400).json({ message: 'Student session not found' });
      }

      const studentSessionId = studentSession.id;
      console.log('[startSubmission] Found student session:', studentSessionId, 'for user:', userId);

      // Check if already has a submission (SUBMITTED, GRADED, or IN_PROGRESS)
      const existing = await AssessmentSubmission.findOne({
        where: {
          assessmentId,
          studentSessionId,
          status: { [Op.in]: ['IN_PROGRESS', 'SUBMITTED', 'GRADED'] },
        },
      });

      console.log('[startSubmission] Checking for existing submission:', {
        assessmentId,
        studentSessionId,
        existing: existing ? 'FOUND' : 'NOT FOUND',
        existingData: existing ? { id: existing.id, status: existing.status } : null,
      });

      // If already submitted or graded, reject
      if (existing && (existing.status === 'SUBMITTED' || existing.status === 'GRADED')) {
        console.log('[startSubmission] Student already has submitted assessment:', existing.id);
        return res.status(400).json({ message: 'Student already has an active submission' });
      }

      // If IN_PROGRESS exists, return it (student reopening the same attempt)
      let submission;
      let isNewSubmission = false;
      if (existing && existing.status === 'IN_PROGRESS') {
        console.log('[startSubmission] Returning existing IN_PROGRESS submission:', existing.id);
        submission = existing;
        isNewSubmission = false;
      } else {
        // Create new IN_PROGRESS submission
        submission = await AssessmentSubmission.create({
          assessmentId,
          studentSessionId,
          status: 'IN_PROGRESS',
        });
        console.log('[startSubmission] Created new IN_PROGRESS submission:', submission.id);
        isNewSubmission = true;
      }

      // Get questions for response initialization
      const questions = await AssessmentQuestion.findAll({
        where: { assessmentId },
        attributes: ['id', 'questionText', 'questionType', 'pointsValue', 'orderIndex', 'metadata'],
        order: [['orderIndex', 'ASC']],
      });

      // Convert to JSON and parse metadata if needed
      const parsedQuestions = questions.map(q => {
        const questionData = q.toJSON();
        if (typeof questionData.metadata === 'string') {
          try {
            questionData.metadata = JSON.parse(questionData.metadata);
          } catch (e) {
            console.warn('Failed to parse metadata for question:', q.id);
            questionData.metadata = {};
          }
        }
        return questionData;
      });

      res.status(isNewSubmission ? 201 : 200).json({
        message: isNewSubmission ? 'Submission started' : 'Submission resumed',
        submission,
        questions: parsedQuestions,
      });
    } catch (error) {
      console.error('[startSubmission] Error:', error);
      console.error('[startSubmission] Error stack:', error.stack);
      res.status(500).json({ 
        message: 'Failed to start submission', 
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  // Submit answer to a question
  submitAnswer: async (req, res) => {
    const { submissionId, questionId } = req.params;
    const { response, fileUrl } = req.body;

    try {
      const submission = await AssessmentSubmission.findByPk(submissionId);
      if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
      }

      if (submission.status === 'GRADED') {
        return res.status(400).json({ message: 'Submission is already graded and cannot be modified' });
      }

      const question = await AssessmentQuestion.findByPk(questionId);
      if (!question) {
        return res.status(404).json({ message: 'Question not found' });
      }

      let isCorrect = null;
      let score = null;

      // Auto-grade MCQ if applicable
      if (question.questionType === 'MCQ' && response) {
        const metadata = question.metadata;
        const correctAnswers = metadata.correctAnswers || [];
        const multipleCorrect = metadata.multipleCorrect || false;

        let responseArray = Array.isArray(response) ? response : [response];
        isCorrect = JSON.stringify(responseArray.sort()) === JSON.stringify(correctAnswers.sort());

        if (isCorrect) {
          score = question.pointsValue;
        } else {
          score = 0;
        }
      }

      // Upsert response
      const [responseRecord, created] = await AssessmentResponse.findOrCreate({
        where: { submissionId, questionId },
        defaults: {
          response: JSON.stringify(response),
          fileUrl,
          isCorrect,
          score,
        },
      });

      if (!created) {
        await responseRecord.update({
          response: JSON.stringify(response),
          fileUrl,
          isCorrect,
          score,
        });
      }

      res.status(200).json({
        message: 'Answer submitted successfully',
        response: responseRecord,
      });
    } catch (error) {
      console.error('Submit answer error:', error);
      res.status(500).json({ message: 'Failed to submit answer' });
    }
  },

  // Submit complete assessment
  submitAssessment: async (req, res) => {
    const { submissionId } = req.params;

    try {
      const submission = await AssessmentSubmission.findByPk(submissionId);
      if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
      }

      if (submission.status === 'GRADED') {
        return res.status(400).json({ message: 'Submission is already graded' });
      }

      // Calculate total score
      const responses = await AssessmentResponse.findAll({
        where: { submissionId },
      });

      let totalScore = 0;
      const assessment = await Assessment.findByPk(submission.assessmentId);

      if (assessment.type === 'AUTO_GRADE') {
        // Sum up auto-graded scores
        totalScore = responses.reduce((sum, r) => {
          return sum + (r.score || 0);
        }, 0);
      }

      // Update submission with SUBMITTED status
      const updatedSubmission = await submission.update({
        status: 'SUBMITTED',
        submittedAt: new Date(),
        totalScore: assessment.type === 'AUTO_GRADE' ? totalScore : null,
      });

      console.log('[submitAssessment] Submission updated:', {
        submissionId,
        newStatus: updatedSubmission.status,
        submittedAt: updatedSubmission.submittedAt,
        totalScore: updatedSubmission.totalScore,
      });

      // Fetch the updated submission to ensure we return the latest data
      const finalSubmission = await AssessmentSubmission.findByPk(submissionId);

      res.status(200).json({
        message: 'Assessment submitted successfully',
        submission: finalSubmission,
      });
    } catch (error) {
      console.error('[submitAssessment] Error:', error);
      res.status(500).json({ 
        message: 'Failed to submit assessment',
        error: error.message 
      });
    }
  },

  // ============ GRADING MANAGEMENT ============

  // Grade a submission (manual grading)
  gradeSubmission: async (req, res) => {
    const { submissionId } = req.params;
    const { responses } = req.body; // [{ questionId, score, feedback }, ...]
    const userId = req.user.id;

    try {
      const submission = await AssessmentSubmission.findByPk(submissionId);
      if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
      }

      if (submission.status !== 'SUBMITTED') {
        return res.status(400).json({ message: 'Only submitted assessments can be graded' });
      }

      // Verify user is creator or admin
      const assessment = await Assessment.findByPk(submission.assessmentId);
      if (assessment.createdBy !== userId && !['ADMIN', 'HOD'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized to grade' });
      }

      // Update responses with grades
      let totalScore = 0;
      for (const grading of responses) {
        const response = await AssessmentResponse.findByPk(grading.responseId);
        if (response) {
          await response.update({
            score: grading.score,
            feedback: grading.feedback,
            isCorrect: grading.maxScore ? grading.score >= (grading.maxScore / 2) : grading.score > 0,
          });
          totalScore += grading.score;
        }
      }

      await submission.update({
        status: 'GRADED',
        totalScore,
        gradedBy: userId,
        gradedAt: new Date(),
      });

      res.status(200).json({
        message: 'Submission graded successfully',
        submission,
      });
    } catch (error) {
      console.error('Grade submission error:', error);
      res.status(500).json({ message: 'Failed to grade submission' });
    }
  },

  // Get results (only creator and admin can view)
  getResults: async (req, res) => {
    const { assessmentId } = req.params;
    const userId = req.user.id;

    try {
      const assessment = await Assessment.findByPk(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: 'Assessment not found' });
      }

      // Check authorization
      if (assessment.createdBy !== userId && !['ADMIN', 'HOD'].includes(req.user.role)) {
        return res.status(403).json({
          message: 'Only creator and admin can view results',
        });
      }

      const submissions = await AssessmentSubmission.findAll({
        where: { 
          assessmentId,
          status: { [Op.in]: ['SUBMITTED', 'GRADED'] }, // Only show submitted or graded, not in-progress
        },
        include: [
          {
            model: StudentSession,
            include: [
              {
                model: User,
                attributes: ['id', 'firstName', 'lastName', 'email'],
                as: 'Student',
              },
            ],
          },
          {
            model: AssessmentResponse,
            include: [
              {
                model: AssessmentQuestion,
                attributes: ['questionText', 'questionType', 'pointsValue', 'metadata'],
              },
            ],
          },
          {
            model: User,
            attributes: ['id', 'firstName', 'lastName'],
            as: 'GradedByUser',
          },
          {
            model: RubricScore,
            required: false,
            include: [
              {
                model: RubricCriteria,
                attributes: ['id', 'criteriaName', 'description', 'maxPoints'],
              },
            ],
          },
        ],
        order: [['submittedAt', 'DESC']],
      });

      // Convert to JSON and parse metadata for questions in responses
      const submissionsWithParsedMetadata = submissions.map(submission => {
        const submissionData = submission.toJSON();
        if (submissionData.AssessmentResponses) {
          submissionData.AssessmentResponses = submissionData.AssessmentResponses.map(response => {
            if (response.AssessmentQuestion && typeof response.AssessmentQuestion.metadata === 'string') {
              try {
                response.AssessmentQuestion.metadata = JSON.parse(response.AssessmentQuestion.metadata);
              } catch (e) {
                console.warn('Failed to parse metadata for question:', response.AssessmentQuestion.id);
              }
            }
            return response;
          });
        }
        return submissionData;
      });

      res.status(200).json({
        message: 'Results retrieved',
        assessment: {
          id: assessment.id,
          title: assessment.title,
          totalPoints: assessment.totalPoints,
          status: assessment.status,
        },
        submissions: submissionsWithParsedMetadata,
      });
    } catch (error) {
      console.error('Get results error:', error);
      res.status(500).json({ message: 'Failed to fetch results' });
    }
  },

  // Upload file for assessment submission
  uploadAssessmentFile: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { file } = req;
      const fileUrl = await uploadToS3(file.buffer, file.originalname, file.mimetype);

      res.status(200).json({
        message: 'File uploaded successfully',
        fileUrl,
        fileName: file.originalname,
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ message: error.message || 'Failed to upload file' });
    }
  },

  // Create submission directly with assessmentId and studentSessionId (or userId)
  createSubmissionDirect: async (req, res) => {
    const { assessmentId } = req.params;
    let { studentSessionId, userId } = req.body;

    // Only ADMIN can create submissions for others
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can create submissions for students' });
    }

    if (!assessmentId || (!studentSessionId && !userId)) {
      return res.status(400).json({ message: 'assessmentId and (studentSessionId or userId) are required' });
    }

    try {
      console.log('[createSubmissionDirect] Creating submission for assessment:', assessmentId, 'with studentSessionId:', studentSessionId, 'userId:', userId);

      // Get the assessment
      const assessment = await Assessment.findByPk(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: 'Assessment not found' });
      }

      // If userId is provided instead of sessionId, find the latest student session
      if (!studentSessionId && userId) {
        const studentSession = await StudentSession.findOne({
          where: { userId },
          order: [['createdAt', 'DESC']],
        });
        
        if (!studentSession) {
          return res.status(404).json({ message: 'Student session not found for this user' });
        }
        studentSessionId = studentSession.id;
      }

      // Get the student session
      const studentSession = await StudentSession.findByPk(studentSessionId, {
        include: [{
          model: User,
          attributes: ['id', 'firstName', 'lastName', 'email'],
          as: 'Student',
        }],
      });

      if (!studentSession) {
        return res.status(404).json({ message: 'Student session not found' });
      }

      // Check if submission already exists
      const existing = await AssessmentSubmission.findOne({
        where: {
          assessmentId,
          studentSessionId,
        },
      });

      if (existing) {
        return res.status(409).json({ 
          message: `${studentSession.Student.firstName} ${studentSession.Student.lastName} already has a submission for this assessment (Status: ${existing.status})`,
          code: 'SUBMISSION_EXISTS',
          existingSubmission: {
            id: existing.id,
            status: existing.status,
          }
        });
      }

      // Create submission
      const submission = await AssessmentSubmission.create({
        assessmentId,
        studentSessionId,
        status: 'SUBMITTED',
      });

      console.log('[createSubmissionDirect] Successfully created submission:', submission.id);

      res.status(201).json({
        message: 'Submission created successfully',
        submission,
        student: {
          id: studentSession.Student.id,
          firstName: studentSession.Student.firstName,
          lastName: studentSession.Student.lastName,
          email: studentSession.Student.email,
        },
      });
    } catch (error) {
      console.error('[createSubmissionDirect] Error:', error);
      res.status(500).json({
        message: 'Failed to create submission',
        error: error.message,
      });
    }
  },

  // Create submission for a student (admin only)
  createSubmissionForStudent: async (req, res) => {
    const { assessmentId, userId } = req.body;
    const adminId = req.user?.id;

    // Only ADMIN can create submissions for others
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can create submissions for students' });
    }

    if (!assessmentId || !userId) {
      return res.status(400).json({ message: 'assessmentId and userId are required' });
    }

    try {
      console.log('[createSubmissionForStudent] Creating submission for user:', userId, 'assessment:', assessmentId);

      // Get the assessment
      const assessment = await Assessment.findByPk(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: 'Assessment not found' });
      }

      // Get the user (student)
      const student = await User.findByPk(userId);
      if (!student || student.approvedRole !== 'STUDENT') {
        return res.status(404).json({ message: 'Student not found' });
      }

      // Find student session - get the latest one
      const studentSession = await StudentSession.findOne({
        where: { userId },
        order: [['createdAt', 'DESC']],
      });

      if (!studentSession) {
        return res.status(400).json({ message: 'Student does not have an active session' });
      }

      // Check if submission already exists
      const existing = await AssessmentSubmission.findOne({
        where: {
          assessmentId,
          studentSessionId: studentSession.id,
        },
      });

      if (existing) {
        return res.status(409).json({ 
          message: `${student.firstName} ${student.lastName} already has a submission for this assessment (Status: ${existing.status})`,
          code: 'SUBMISSION_EXISTS',
          existingSubmission: {
            id: existing.id,
            status: existing.status,
          }
        });
      }

      // Create submission
      const submission = await AssessmentSubmission.create({
        assessmentId,
        studentSessionId: studentSession.id,
        status: 'SUBMITTED',
      });

      console.log('[createSubmissionForStudent] Successfully created submission:', submission.id);

      res.status(201).json({
        message: 'Submission created successfully',
        submission,
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
        },
      });
    } catch (error) {
      console.error('[createSubmissionForStudent] Error:', error);
      res.status(500).json({
        message: 'Failed to create submission',
        error: error.message,
      });
    }
  },

  // Delete submission (admin only)
  deleteSubmission: async (req, res) => {
    const { submissionId } = req.params;

    // Only ADMIN can delete submissions
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can delete submissions' });
    }

    if (!submissionId) {
      return res.status(400).json({ message: 'submissionId is required' });
    }

    try {
      console.log('[deleteSubmission] Deleting submission:', submissionId);

      // Find the submission
      const submission = await AssessmentSubmission.findByPk(submissionId);
      if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
      }

      // Get student info for response
      const studentSession = await StudentSession.findByPk(submission.studentSessionId, {
        include: [{ model: User, as: 'Student', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      });

      // Delete all associated responses for this submission
      await AssessmentResponse.destroy({
        where: { submissionId },
      });

      // Delete all associated rubric scores
      const RubricScore = require('../models').RubricScore;
      await RubricScore.destroy({
        where: { submissionId },
      });

      // Delete the submission
      await submission.destroy();

      console.log('[deleteSubmission] Successfully deleted submission:', submissionId);

      res.status(200).json({
        message: 'Submission deleted successfully',
        deletedSubmission: {
          id: submission.id,
          status: submission.status,
          student: studentSession?.Student 
            ? {
                id: studentSession.Student.id,
                firstName: studentSession.Student.firstName,
                lastName: studentSession.Student.lastName,
                email: studentSession.Student.email,
              }
            : null,
        },
      });
    } catch (error) {
      console.error('[deleteSubmission] Error:', error);
      res.status(500).json({
        message: 'Failed to delete submission',
        error: error.message,
      });
    }
  },
};

module.exports = assessmentController;
