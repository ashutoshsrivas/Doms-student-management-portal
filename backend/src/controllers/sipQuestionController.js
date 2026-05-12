const { SIPQuestion, SIPQuestionAnswer, SIP, AcademicSession, User } = require('../models');
const { uploadToS3, deleteFromS3 } = require('../utils/s3Upload');

const sipQuestionController = {
  // Admin: Post a new question
  postQuestion: async (req, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const { sessionId, question, description } = req.body;

      const allowedRoles = ['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR'];
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: 'Not authorized to post questions' });
      }

      if (!sessionId || !question) {
        return res.status(400).json({ message: 'sessionId and question are required' });
      }

      const session = await AcademicSession.findByPk(sessionId);
      if (!session || !session.sipEnabled) {
        return res.status(400).json({ message: 'SIP is not enabled for this session' });
      }

      const newQuestion = await SIPQuestion.create({
        sessionId,
        question,
        description: description || '',
        createdBy: userId,
      });

      res.status(201).json({ message: 'Question posted successfully', question: newQuestion });
    } catch (error) {
      console.error('Error posting question:', error);
      res.status(500).json({ message: 'Failed to post question', error: error.message });
    }
  },

  // Get all questions for a session
  getQuestions: async (req, res) => {
    try {
      const { sessionId } = req.params;

      const questions = await SIPQuestion.findAll({
        where: { sessionId },
        include: [{ model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName'] }],
        order: [['createdAt', 'DESC']],
      });

      res.json(questions);
    } catch (error) {
      console.error('Error fetching questions:', error);
      res.status(500).json({ message: 'Failed to fetch questions', error: error.message });
    }
  },

  // Get a single question
  getQuestion: async (req, res) => {
    try {
      const { questionId } = req.params;

      const question = await SIPQuestion.findByPk(questionId, {
        include: [{ model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName'] }],
      });

      if (!question) {
        return res.status(404).json({ message: 'Question not found' });
      }

      res.json(question);
    } catch (error) {
      console.error('Error fetching question:', error);
      res.status(500).json({ message: 'Failed to fetch question', error: error.message });
    }
  },

  // Delete a question (admin only)
  deleteQuestion: async (req, res) => {
    try {
      const { questionId } = req.params;
      const userRole = req.user.role;

      const allowedRoles = ['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR'];
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: 'Not authorized to delete questions' });
      }

      const question = await SIPQuestion.findByPk(questionId);
      if (!question) {
        return res.status(404).json({ message: 'Question not found' });
      }

      // Delete associated answers
      await SIPQuestionAnswer.destroy({
        where: { questionId },
      });

      await question.destroy();
      res.json({ message: 'Question deleted successfully' });
    } catch (error) {
      console.error('Error deleting question:', error);
      res.status(500).json({ message: 'Failed to delete question', error: error.message });
    }
  },

  // Student: Submit answer to a question
  submitAnswer: async (req, res) => {
    try {
      const { questionId } = req.params;
      const userId = req.user.id;
      const { answerText } = req.body;

      if (!answerText && !req.file) {
        return res.status(400).json({ message: 'Answer text or document is required' });
      }

      const question = await SIPQuestion.findByPk(questionId);
      if (!question) {
        return res.status(404).json({ message: 'Question not found' });
      }

      // Find student's SIP for this session
      const sip = await SIP.findOne({
        include: [
          {
            model: require('../models').StudentSession,
            where: { userId, academicSessionId: question.sessionId },
          },
        ],
      });

      if (!sip) {
        return res.status(400).json({ message: 'No SIP found for this session' });
      }

      // Check if answer already exists
      let answer = await SIPQuestionAnswer.findOne({
        where: { questionId, sipId: sip.id },
      });

      let answerDocumentUrl = null;

      // Upload document if provided
      if (req.file) {
        answerDocumentUrl = await uploadToS3(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype,
          'sip-question-answers'
        );
      }

      if (answer) {
        // Update existing answer
        // Delete old document if exists
        if (answer.answerDocument && req.file) {
          await deleteFromS3(answer.answerDocument);
        }

        answer.answerText = answerText || answer.answerText;
        answer.answerDocument = answerDocumentUrl || answer.answerDocument;
        answer.submittedAt = new Date();
        await answer.save();
      } else {
        // Create new answer
        answer = await SIPQuestionAnswer.create({
          questionId,
          sipId: sip.id,
          answerText,
          answerDocument: answerDocumentUrl,
          submittedAt: new Date(),
        });
      }

      res.json({ message: 'Answer submitted successfully', answer });
    } catch (error) {
      console.error('Error submitting answer:', error);
      res.status(500).json({ message: 'Failed to submit answer', error: error.message });
    }
  },

  // Student: Get their answer to a question
  getMyAnswer: async (req, res) => {
    try {
      const { questionId } = req.params;
      const userId = req.user.id;

      const question = await SIPQuestion.findByPk(questionId);
      if (!question) {
        return res.status(404).json({ message: 'Question not found' });
      }

      // Find student's SIP
      const sip = await SIP.findOne({
        include: [
          {
            model: require('../models').StudentSession,
            where: { userId, academicSessionId: question.sessionId },
          },
        ],
      });

      if (!sip) {
        return res.json({ answer: null });
      }

      const answer = await SIPQuestionAnswer.findOne({
        where: { questionId, sipId: sip.id },
      });

      res.json({ answer: answer || null });
    } catch (error) {
      console.error('Error fetching answer:', error);
      res.status(500).json({ message: 'Failed to fetch answer', error: error.message });
    }
  },

  // Admin: Get all answers to a question
  getQuestionAnswers: async (req, res) => {
    try {
      const { questionId } = req.params;
      const userRole = req.user.role;

      const allowedRoles = ['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR'];
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: 'Not authorized to view answers' });
      }

      const answers = await SIPQuestionAnswer.findAll({
        where: { questionId },
        include: [
          {
            model: SIP,
            attributes: ['id', 'studentSessionId'],
          },
        ],
        order: [['submittedAt', 'DESC']],
      });

      // Fetch student info for each answer
      const StudentSession = require('../models').StudentSession;
      const User = require('../models').User;

      for (let answer of answers) {
        if (answer.SIP && answer.SIP.studentSessionId) {
          const studentSession = await StudentSession.findByPk(answer.SIP.studentSessionId, {
            include: [
              {
                model: User,
                as: 'Student',
                attributes: ['id', 'firstName', 'lastName', 'email'],
              },
            ],
          });
          if (studentSession) {
            answer.dataValues.SIP.dataValues.StudentSession = studentSession;
          }
        }
      }

      res.json(answers);
    } catch (error) {
      console.error('Error fetching answers:', error);
      res.status(500).json({ message: 'Failed to fetch answers', error: error.message });
    }
  },
};

module.exports = sipQuestionController;
