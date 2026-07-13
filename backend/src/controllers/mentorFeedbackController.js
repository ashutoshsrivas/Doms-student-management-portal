// Mentor <-> mentee feedback thread. Scoped to a (mentor, student) pair;
// participants can post, admin/HOD can read/post any thread.

const { Op, QueryTypes } = require('sequelize');
const { sequelize, MentorFeedbackMessage, User } = require('../models');

// Supervisors can read + post on any thread. Admin/HOD already did;
// coordinator + placement coordinator now included per product ask.
const SUPERVISOR_ROLES = new Set(['ADMIN', 'HOD', 'COORDINATOR', 'PLACEMENT_COORDINATOR']);
const isSupervisor = (role) => SUPERVISOR_ROLES.has(role);
const isAdmin = (role) => isSupervisor(role);

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

// GET /api/mentor-feedback/all — supervisor view. Lists every unique
// (mentor, student) pair with at least one message, plus a snippet.
exports.listAll = async (req, res) => {
  try {
    if (!isSupervisor(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const rows = await sequelize.query(
      `SELECT
         m.mentor_user_id,
         m.student_user_id,
         (SELECT COUNT(*) FROM mentor_feedback_messages
            WHERE mentor_user_id = m.mentor_user_id
              AND student_user_id = m.student_user_id) AS message_count,
         lm.body AS last_body,
         lm.created_at AS last_at,
         lm.author_user_id AS last_author,
         mu.first_name AS mentor_first, mu.last_name AS mentor_last,
         mu.email AS mentor_email, mu.approved_role AS mentor_role,
         mu.department AS mentor_department,
         su.first_name AS student_first, su.last_name AS student_last,
         su.email AS student_email
       FROM (
         SELECT mentor_user_id, student_user_id, MAX(created_at) AS max_at
           FROM mentor_feedback_messages
          GROUP BY mentor_user_id, student_user_id
       ) m
       JOIN mentor_feedback_messages lm
         ON lm.mentor_user_id = m.mentor_user_id
        AND lm.student_user_id = m.student_user_id
        AND lm.created_at = m.max_at
       JOIN users mu ON mu.id = m.mentor_user_id
       JOIN users su ON su.id = m.student_user_id
       ORDER BY m.max_at DESC`,
      { type: QueryTypes.SELECT },
    );
    const threads = rows.map((r) => ({
      mentor: {
        id: r.mentor_user_id,
        firstName: r.mentor_first,
        lastName: r.mentor_last,
        email: r.mentor_email,
        approvedRole: r.mentor_role,
        department: r.mentor_department,
      },
      student: {
        id: r.student_user_id,
        firstName: r.student_first,
        lastName: r.student_last,
        email: r.student_email,
      },
      messageCount: Number(r.message_count || 0),
      lastMessage: {
        body: r.last_body,
        createdAt: r.last_at,
        fromMentor: r.last_author === r.mentor_user_id,
        fromStudent: r.last_author === r.student_user_id,
      },
    }));
    res.json({ threads });
  } catch (e) {
    console.error('mentor feedback listAll error:', e);
    res.status(500).json({ message: 'Failed to load conversations' });
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
