const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/roadmapController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Student's own roadmap and goal
router.get('/me', ctrl.myRoadmap);
router.post('/goal', ctrl.saveGoal);

// Staff: goals awaiting approval, session overview, one student's roadmap
router.get('/sessions', ctrl.listSessions);
router.get('/goals', ctrl.listGoals);
router.post('/goals/:id/decide', ctrl.decideGoal);
router.patch('/goals/:id', ctrl.updateGoal);
router.delete('/goals/:id', ctrl.deleteGoal);
router.post('/notices/:id/ack', ctrl.acknowledgeNotice);
router.get('/students', ctrl.listStudents);
router.get('/student/:userId', ctrl.studentRoadmap);

// Staff milestones placed on a whole session's timeline
router.get('/milestones', ctrl.listMilestones);
router.post('/milestones', ctrl.createMilestone);
router.patch('/milestones/:id', ctrl.updateMilestone);
router.delete('/milestones/:id', ctrl.deleteMilestone);
router.get('/milestones/:id/responses', ctrl.milestoneResponses);
router.post('/milestones/:id/response', ctrl.saveMilestoneResponse);

// The student's own milestones and achievements
router.post('/self-milestones', ctrl.createSelfMilestone);
router.patch('/self-milestones/:id', ctrl.updateSelfMilestone);
router.delete('/self-milestones/:id', ctrl.deleteSelfMilestone);

module.exports = router;
