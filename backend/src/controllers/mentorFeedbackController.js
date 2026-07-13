// Mentor <-> mentee feedback thread. Scoped to a (mentor, student) pair;
// participants can post, admin/HOD can read/post any thread.

const { Op, QueryTypes } = require('sequelize');
const { sequelize, MentorFeedbackMessage, User } = require('../models');

const isAdmin = (role) => role === 'ADMIN' || role === 'HOD';

// Confirm the (mentor, student) pair actually shares an active mentor
// team. Prevents random users from posting into someone else's thread.
async function areLinked(mentorId, studentId) {
  const rows = await sequelize.query(
    `SELECT 1 FROM mentor_team_members m
       JOIN mentor_teams t ON t.id = m.mentor_team_id
       JOIN student_sessions ss ON ss.id = m.student_session_id
      WHERE t.faculty_id = :m AND t.status = 'ACTIVE'
        AND ss.user_id = :s
      LIMIT 1`,
    { replacements: { m: mentorId, s: studentId }, type: QueryTypes.SELECT },
  );
  return rows.length > 0;
}

function canAccess(user, mentorId, studentId) {
  if (isAdmin(user.role)) return true;
  return user.id === mentorId || user.id === studentId;
}

// GET /api/mentor-feedback/thread?mentorId=&studentId=
exports.list = async (req, res) => {
  try {
    const { mentorId, studentId } = req.query;
    if (!mentorId || !studentId) return res.status(400).json({ message: 'mentorId and studentId are required' });
    if (!canAccess(req.user, mentorId, studentId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const linked = isAdmin(req.user.role) || await areLinked(mentorId, studentId);
    if (!linked) return res.status(404).json({ message: 'No active mentor–mentee link' });

    const messages = await MentorFeedbackMessage.findAll({
      where: { mentorUserId: mentorId, studentUserId: studentId },
      order: [['createdAt', 'ASC']],
      include: [{
        model: User,
        as: 'Author',
        attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole'],
      }],
    });
    res.json({ messages });
  } catch (e) {
    console.error('mentor feedback list error:', e);
    res.status(500).json({ message: 'Failed to load messages' });
  }
};

// POST /api/mentor-feedback/thread  { mentorId, studentId, body }
exports.post = async (req, res) => {
  try {
    const { mentorId, studentId, body } = req.body || {};
    const text = String(body || '').trim();
    if (!mentorId || !studentId) return res.status(400).json({ message: 'mentorId and studentId are required' });
    if (!text) return res.status(400).json({ message: 'message body is required' });
    if (text.length > 4000) return res.status(400).json({ message: 'message too long (max 4000 chars)' });
    if (!canAccess(req.user, mentorId, studentId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const linked = isAdmin(req.user.role) || await areLinked(mentorId, studentId);
    if (!linked) return res.status(404).json({ message: 'No active mentor–mentee link' });

    const row = await MentorFeedbackMessage.create({
      mentorUserId: mentorId,
      studentUserId: studentId,
      authorUserId: req.user.id,
      body: text,
    });
    const withAuthor = await MentorFeedbackMessage.findByPk(row.id, {
      include: [{
        model: User,
        as: 'Author',
        attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole'],
      }],
    });
    res.status(201).json({ message: withAuthor });
  } catch (e) {
    console.error('mentor feedback post error:', e);
    res.status(500).json({ message: 'Failed to post message' });
  }
};

// GET /api/mentor-feedback/my-mentors — student side. Lists mentors the
// student has, with last-message snippet + unread count (unread = latest
// author is not the student and the student hasn't posted since).
exports.myMentors = async (req, res) => {
  try {
    const userId = req.user.id;
    // All mentors whose active team includes this student
    const mentors = await sequelize.query(
      `SELECT DISTINCT u.id, u.first_name, u.last_name, u.email, u.approved_role,
              u.department
         FROM mentor_teams t
         JOIN users u ON u.id = t.faculty_id
         JOIN mentor_team_members m ON m.mentor_team_id = t.id
         JOIN student_sessions ss ON ss.id = m.student_session_id
        WHERE ss.user_id = :s AND t.status = 'ACTIVE'
        ORDER BY u.first_name`,
      { replacements: { s: userId }, type: QueryTypes.SELECT },
    );

    // Latest message per mentor
    const latest = await sequelize.query(
      `SELECT m.mentor_user_id, m.body, m.created_at, m.author_user_id
         FROM mentor_feedback_messages m
         JOIN (
           SELECT mentor_user_id, MAX(created_at) AS max_at
             FROM mentor_feedback_messages
            WHERE student_user_id = :s
            GROUP BY mentor_user_id
         ) x ON x.mentor_user_id = m.mentor_user_id AND x.max_at = m.created_at
        WHERE m.student_user_id = :s`,
      { replacements: { s: userId }, type: QueryTypes.SELECT },
    );
    const byMentor = new Map(latest.map((r) => [r.mentor_user_id, r]));

    const out = mentors.map((u) => {
      const l = byMentor.get(u.id) || null;
      return {
        mentor: {
          id: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          email: u.email,
          approvedRole: u.approved_role,
          department: u.department,
        },
        lastMessage: l ? {
          body: l.body,
          createdAt: l.created_at,
          fromMentor: l.author_user_id !== userId,
        } : null,
      };
    });
    res.json({ mentors: out });
  } catch (e) {
    console.error('mentor feedback myMentors error:', e);
    res.status(500).json({ message: 'Failed to load mentors' });
  }
};
