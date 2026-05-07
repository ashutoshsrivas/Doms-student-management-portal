const {
  Rubric,
  RubricCriteria,
  RubricScore,
  Assessment,
  AssessmentSubmission,
  User,
  AssessmentQuestion,
  AssessmentResponse,
} = require('../models');
const { Op } = require('sequelize');

module.exports = {
  // Create a new rubric for an assessment
  createRubric: async (req, res) => {
    const { assessmentId, name, description, totalPoints, criteria } = req.body;
    const userId = req.user?.id;

    try {
      const assessment = await Assessment.findByPk(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: 'Assessment not found' });
      }

      // Check authorization
      if (assessment.createdBy !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized to create rubric for this assessment' });
      }

      // Create rubric
      const rubric = await Rubric.create({
        assessmentId,
        name,
        description,
        totalPoints,
        createdBy: userId,
      });

      // Create criteria if provided
      let createdCriteria = [];
      if (criteria && Array.isArray(criteria)) {
        console.log('[createRubric] Creating criteria for rubric', rubric.id, ':', criteria);
        for (const criterion of criteria) {
          try {
            const rubricCriterion = await RubricCriteria.create({
              rubricId: rubric.id,
              questionId: criterion.questionId || null,
              criteriaName: criterion.criteriaName,
              description: criterion.description,
              maxPoints: criterion.maxPoints,
              orderIndex: criterion.orderIndex || 0,
            });
            console.log('[createRubric] Created criterion:', rubricCriterion.toJSON());
            createdCriteria.push(rubricCriterion);
          } catch (criteriaError) {
            console.error('[createRubric] Error creating criterion:', criteriaError.message, criterion);
          }
        }
        console.log('[createRubric] Total criteria created:', createdCriteria.length);
      } else {
        console.log('[createRubric] No criteria provided in request');
      }

      const rubricWithCriteria = rubric.toJSON();
      rubricWithCriteria.RubricCriteria = createdCriteria;

      res.status(201).json({
        message: 'Rubric created successfully',
        rubric: rubricWithCriteria,
      });
    } catch (error) {
      console.error('Create rubric error:', error);
      res.status(500).json({ message: 'Failed to create rubric', error: error.message });
    }
  },

  // Get rubrics for an assessment
  getRubrics: async (req, res) => {
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
        return res.status(403).json({ message: 'Not authorized to view rubrics for this assessment' });
      }

      const rubrics = await Rubric.findAll({
        where: { assessmentId },
        include: [
          {
            model: RubricCriteria,
            order: [['orderIndex', 'ASC']],
          },
          {
            model: User,
            attributes: ['id', 'firstName', 'lastName'],
            as: 'Creator',
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      res.status(200).json({
        message: 'Rubrics retrieved',
        rubrics,
      });
    } catch (error) {
      console.error('Get rubrics error:', error);
      res.status(500).json({ message: 'Failed to fetch rubrics' });
    }
  },

  // Get single rubric with criteria
  getRubric: async (req, res) => {
    const { rubricId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    try {
      const rubric = await Rubric.findByPk(rubricId, {
        include: [
          {
            model: Assessment,
            attributes: ['id', 'createdBy'],
          },
        ],
      });

      if (!rubric) {
        return res.status(404).json({ message: 'Rubric not found' });
      }

      // Check authorization
      if (rubric.Assessment && rubric.Assessment.createdBy !== userId && userRole !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized to view this rubric' });
      }

      const rubricFull = await Rubric.findByPk(rubricId, {
        include: [
          {
            model: RubricCriteria,
            include: [
              {
                model: AssessmentQuestion,
                attributes: ['id', 'questionText', 'questionType'],
                as: 'Question',
              },
            ],
            order: [['orderIndex', 'ASC']],
          },
          {
            model: User,
            attributes: ['id', 'firstName', 'lastName'],
            as: 'Creator',
          },
        ],
      });

      if (!rubricFull) {
        return res.status(404).json({ message: 'Rubric not found' });
      }

      res.status(200).json({
        message: 'Rubric retrieved',
        rubric: rubricFull,
      });
    } catch (error) {
      console.error('Get rubric error:', error);
      res.status(500).json({ message: 'Failed to fetch rubric' });
    }
  },

  // Update rubric
  updateRubric: async (req, res) => {
    const { rubricId } = req.params;
    const { name, description, totalPoints } = req.body;
    const userId = req.user?.id;

    try {
      const rubric = await Rubric.findByPk(rubricId);
      if (!rubric) {
        return res.status(404).json({ message: 'Rubric not found' });
      }

      // Check authorization
      if (rubric.createdBy !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized to update this rubric' });
      }

      await rubric.update({
        name: name || rubric.name,
        description: description !== undefined ? description : rubric.description,
        totalPoints: totalPoints !== undefined ? totalPoints : rubric.totalPoints,
      });

      res.status(200).json({
        message: 'Rubric updated successfully',
        rubric,
      });
    } catch (error) {
      console.error('Update rubric error:', error);
      res.status(500).json({ message: 'Failed to update rubric' });
    }
  },

  // Delete rubric
  deleteRubric: async (req, res) => {
    const { rubricId } = req.params;
    const userId = req.user?.id;

    try {
      const rubric = await Rubric.findByPk(rubricId);
      if (!rubric) {
        return res.status(404).json({ message: 'Rubric not found' });
      }

      // Check authorization
      if (rubric.createdBy !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized to delete this rubric' });
      }

      // Manually cascade delete:
      // 1. Find all criteria for this rubric
      const criteria = await RubricCriteria.findAll({
        where: { rubricId }
      });

      // 2. Delete all RubricScores for these criteria
      for (const criterion of criteria) {
        await RubricScore.destroy({
          where: { rubricCriteriaId: criterion.id }
        });
      }

      // 3. Delete all criteria
      await RubricCriteria.destroy({
        where: { rubricId }
      });

      // 4. Finally delete the rubric
      await rubric.destroy();

      res.status(200).json({
        message: 'Rubric deleted successfully',
      });
    } catch (error) {
      console.error('Delete rubric error:', error.message, error);
      res.status(500).json({ message: 'Failed to delete rubric', error: error.message });
    }
  },

  // Add criteria to rubric
  addCriteria: async (req, res) => {
    const { rubricId } = req.params;
    const { criteriaName, description, maxPoints, questionId, orderIndex } = req.body;
    const userId = req.user?.id;

    try {
      const rubric = await Rubric.findByPk(rubricId);
      if (!rubric) {
        return res.status(404).json({ message: 'Rubric not found' });
      }

      // Check authorization
      if (rubric.createdBy !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized to add criteria to this rubric' });
      }

      const criterion = await RubricCriteria.create({
        rubricId,
        questionId: questionId || null,
        criteriaName,
        description,
        maxPoints,
        orderIndex: orderIndex || 0,
      });

      // Update rubric totalPoints
      const criteria = await RubricCriteria.findAll({ where: { rubricId } });
      const totalPoints = criteria.reduce((sum, c) => sum + parseFloat(c.maxPoints || 0), 0);
      await rubric.update({ totalPoints });

      res.status(201).json({
        message: 'Criteria added successfully',
        criterion,
      });
    } catch (error) {
      console.error('Add criteria error:', error);
      res.status(500).json({ message: 'Failed to add criteria' });
    }
  },

  // Update criteria
  updateCriteria: async (req, res) => {
    const { criteriaId } = req.params;
    const { criteriaName, description, maxPoints, questionId, orderIndex } = req.body;
    const userId = req.user?.id;

    try {
      const criterion = await RubricCriteria.findByPk(criteriaId, {
        include: [{ model: Rubric }],
      });

      if (!criterion) {
        return res.status(404).json({ message: 'Criteria not found' });
      }

      // Check authorization
      if (criterion.Rubric.createdBy !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized to update this criteria' });
      }

      await criterion.update({
        criteriaName: criteriaName || criterion.criteriaName,
        description: description !== undefined ? description : criterion.description,
        maxPoints: maxPoints !== undefined ? maxPoints : criterion.maxPoints,
        questionId: questionId !== undefined ? questionId : criterion.questionId,
        orderIndex: orderIndex !== undefined ? orderIndex : criterion.orderIndex,
      });

      // Recalculate rubric totalPoints
      const rubricId = criterion.rubricId;
      const criteria = await RubricCriteria.findAll({ where: { rubricId } });
      const totalPoints = criteria.reduce((sum, c) => sum + parseFloat(c.maxPoints || 0), 0);
      await Rubric.update({ totalPoints }, { where: { id: rubricId } });

      res.status(200).json({
        message: 'Criteria updated successfully',
        criterion,
      });
    } catch (error) {
      console.error('Update criteria error:', error);
      res.status(500).json({ message: 'Failed to update criteria' });
    }
  },

  // Delete criteria
  deleteCriteria: async (req, res) => {
    const { criteriaId } = req.params;
    const userId = req.user?.id;

    try {
      const criterion = await RubricCriteria.findByPk(criteriaId, {
        include: [{ model: Rubric }],
      });

      if (!criterion) {
        return res.status(404).json({ message: 'Criteria not found' });
      }

      // Check authorization
      if (criterion.Rubric.createdBy !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized to delete this criteria' });
      }

      const rubricId = criterion.rubricId;
      await criterion.destroy();

      // Recalculate rubric totalPoints
      const criteria = await RubricCriteria.findAll({ where: { rubricId } });
      const totalPoints = criteria.reduce((sum, c) => sum + parseFloat(c.maxPoints || 0), 0);
      await Rubric.update({ totalPoints }, { where: { id: rubricId } });

      res.status(200).json({
        message: 'Criteria deleted successfully',
      });
    } catch (error) {
      console.error('Delete criteria error:', error);
      res.status(500).json({ message: 'Failed to delete criteria' });
    }
  },

  // Grade submission using rubric
  gradeSubmissionWithRubric: async (req, res) => {
    const { submissionId } = req.params;
    const { rubricId, rubricScores } = req.body; // rubricId and Array of { rubricCriteriaId, score, feedback }
    const userId = req.user?.id;

    console.log('[gradeSubmissionWithRubric] Received request:');
    console.log('  - Submission ID:', submissionId);
    console.log('  - Rubric ID:', rubricId);
    console.log('  - Rubric Scores:', JSON.stringify(rubricScores, null, 2));

    try {
      const submission = await AssessmentSubmission.findByPk(submissionId, {
        include: [{ model: Assessment }],
      });

      if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
      }

      // Check authorization - only assessment creator or admin can grade
      if (submission.Assessment.createdBy !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized to grade this submission' });
      }

      // Delete existing rubric scores for this submission
      await RubricScore.destroy({ where: { submissionId } });

      // Create new rubric scores
      let totalScore = 0;
      const createdScores = [];

      for (const rubricScore of rubricScores) {
        const score = await RubricScore.create({
          submissionId,
          rubricCriteriaId: rubricScore.rubricCriteriaId,
          score: rubricScore.score,
          feedback: rubricScore.feedback || null,
        });
        createdScores.push(score);
        const scoreValue = parseFloat(rubricScore.score || 0);
        console.log(`  - Score for criteria ${rubricScore.rubricCriteriaId}: ${scoreValue}`);
        totalScore += scoreValue;
      }

      console.log('  - Total Score Calculated:', totalScore);

      // Update submission status to GRADED and set totalScore with rubricId
      const updated = await submission.update({
        status: 'GRADED',
        totalScore,
        gradedBy: userId,
        gradedAt: new Date(),
        rubricId: rubricId || null,
      });

      console.log('[gradeSubmissionWithRubric] Submission updated:');
      console.log('  - Status:', updated.status);
      console.log('  - Total Score:', updated.totalScore);

      res.status(200).json({
        message: 'Submission graded successfully using rubric',
        submission: updated,
        scores: createdScores,
      });
    } catch (error) {
      console.error('Grade submission error:', error);
      res.status(500).json({ message: 'Failed to grade submission' });
    }
  },

  // Get rubric scores for a submission
  getSubmissionRubricScores: async (req, res) => {
    const { submissionId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    try {
      const submission = await AssessmentSubmission.findByPk(submissionId, {
        include: [
          {
            model: Assessment,
            attributes: ['id', 'createdBy'],
          },
          {
            model: RubricScore,
            include: [
              {
                model: RubricCriteria,
                include: [
                  {
                    model: AssessmentQuestion,
                    attributes: ['id', 'questionText', 'questionType'],
                    as: 'Question',
                  },
                ],
              },
            ],
          },
          {
            model: AssessmentResponse,
            include: [
              {
                model: AssessmentQuestion,
                attributes: ['id', 'questionText'],
              },
            ],
          },
        ],
      });

      if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
      }

      // Check authorization
      if (submission.Assessment && submission.Assessment.createdBy !== userId && userRole !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized to view these scores' });
      }

      // Enrich rubric scores with student responses
      const enrichedScores = submission.RubricScores.map((score) => {
        const scoreJson = score.toJSON();
        
        // If this criterion is linked to a question, find the student's response
        if (scoreJson.RubricCriteria && scoreJson.RubricCriteria.questionId) {
          const studentResponse = submission.AssessmentResponses?.find(
            (r) => r.questionId === scoreJson.RubricCriteria.questionId
          );
          
          if (studentResponse) {
            scoreJson.studentResponse = {
              id: studentResponse.id,
              response: studentResponse.response,
              fileUrl: studentResponse.fileUrl,
              questionText: studentResponse.AssessmentQuestion?.questionText,
            };
          }
        }
        
        return scoreJson;
      });

      res.status(200).json({
        message: 'Rubric scores retrieved',
        scores: enrichedScores,
        totalScore: submission.totalScore,
      });
    } catch (error) {
      console.error('Get rubric scores error:', error);
      res.status(500).json({ message: 'Failed to fetch rubric scores' });
    }
  },
};
