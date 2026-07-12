// Aggregate report for /admin/mentor-report — mentor-mentee coverage
// and SIP-flag distribution for a given (defaults to active) session.
// Everything the report needs is returned in one call so the printable
// page renders instantly.

const { sequelize, AcademicSession, User } = require('../models');
const { QueryTypes, Op } = require('sequelize');

const MENTOR_ROLES = [
  'FACULTY', 'CHAIR_HEAD', 'PLACEMENT_COORDINATOR',
  'COORDINATOR', 'MENTOR', 'HOD',
];

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

// Same math as frontend/app/faculty/mentees-sip/page.tsx computeMenteeFlag,
// so this report agrees with the app views.
function computeFlag(row) {
  if (!row.sip_id) return 'red';
  if (row.sip_status === 'COMPLETED') return 'completed';
  if (!row.join_date) return 'not-started';
  const jd = new Date(row.join_date).getTime();
  if (Number.isNaN(jd)) return 'not-started';
  const weeksElapsed = Math.max(0, Math.floor((Date.now() - jd) / MS_PER_WEEK));
  const submitted = Number(row.updates_submitted || 0);
  const duration = row.duration_weeks ? Number(row.duration_weeks) : null;
  const expected = duration ? Math.min(weeksElapsed, duration) : weeksElapsed;
  if (submitted === 0 && weeksElapsed > 0) return 'red';
  if (expected > submitted) return 'yellow';
  return 'green';
}

async function pickSession(sessionId) {
  if (sessionId) {
    const s = await AcademicSession.findByPk(sessionId);
    return s;
  }
  return AcademicSession.findOne({
    where: { isActive: true },
    order: [['startDate', 'DESC']],
  }) || AcademicSession.findOne({ order: [['startDate', 'DESC']] });
}

// GET /api/mentor-report?sessionId=...
exports.getFullReport = async (req, res) => {
  try {
    if (!['ADMIN', 'HOD'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const session = await pickSession(req.query.sessionId);
    if (!session) return res.status(404).json({ message: 'No academic session found' });

    const sid = session.id;

    // 1) Per-mentee list — one row per assigned student, with flag inputs.
    const rows = await sequelize.query(`
      SELECT
        f.id AS faculty_id,
        f.first_name AS faculty_first,
        f.last_name AS faculty_last,
        f.email AS faculty_email,
        f.approved_role AS faculty_role,
        f.department AS faculty_department,
        t.id AS team_id,
        t.team_name,
        su.id AS mentee_id,
        su.first_name AS mentee_first,
        su.last_name AS mentee_last,
        su.email AS mentee_email,
        s.id AS sip_id,
        s.status AS sip_status,
        s.company_name,
        s.job_role,
        s.type AS sip_type,
        s.join_date,
        s.duration_weeks,
        (SELECT COUNT(*) FROM sip_weekly_updates w
            WHERE w.sip_id=s.id AND w.submitted=1) AS updates_submitted
      FROM mentor_teams t
      JOIN users f ON f.id=t.faculty_id
      JOIN mentor_team_members m ON m.mentor_team_id=t.id
      JOIN student_sessions ss ON ss.id=m.student_session_id
      JOIN users su ON su.id=ss.user_id
      LEFT JOIN sips s ON s.student_session_id=ss.id
      WHERE t.session_id=:sid AND t.status='ACTIVE'
      ORDER BY f.first_name, t.team_name, su.first_name
    `, { replacements: { sid }, type: QueryTypes.SELECT });

    // 2) Unassigned staff — eligible mentor roles with no active team.
    const unassigned = await sequelize.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.employee_id,
             u.approved_role, u.department
      FROM users u
      LEFT JOIN mentor_teams t
        ON t.faculty_id=u.id AND t.session_id=:sid AND t.status='ACTIVE'
      WHERE u.approved_role IN (:roles)
        AND u.status IN ('ACTIVE','APPROVED')
        AND t.id IS NULL
      ORDER BY u.approved_role, u.first_name
    `, { replacements: { sid, roles: MENTOR_ROLES }, type: QueryTypes.SELECT });

    // 3) Denominators
    const [eligibleRow] = await sequelize.query(`
      SELECT COUNT(*) AS c FROM users
      WHERE approved_role IN (:roles) AND status IN ('ACTIVE','APPROVED')
    `, { replacements: { roles: MENTOR_ROLES }, type: QueryTypes.SELECT });
    const [studentRow] = await sequelize.query(`
      SELECT COUNT(*) AS c FROM student_sessions WHERE academic_session_id=:sid
    `, { replacements: { sid }, type: QueryTypes.SELECT });

    const eligibleMentors = Number(eligibleRow?.c || 0);
    const studentsInSession = Number(studentRow?.c || 0);

    // Enrich each mentee row with computed flag
    const mentees = rows.map((r) => ({
      facultyId: r.faculty_id,
      facultyName: `${r.faculty_first || ''} ${r.faculty_last || ''}`.trim(),
      facultyEmail: r.faculty_email,
      facultyRole: r.faculty_role,
      facultyDepartment: r.faculty_department,
      teamId: r.team_id,
      teamName: r.team_name,
      menteeId: r.mentee_id,
      menteeName: `${r.mentee_first || ''} ${r.mentee_last || ''}`.trim(),
      menteeEmail: r.mentee_email,
      sipStatus: r.sip_status,
      sipType: r.sip_type,
      companyName: r.company_name,
      jobRole: r.job_role,
      joinDate: r.join_date,
      durationWeeks: r.duration_weeks,
      updatesSubmitted: Number(r.updates_submitted || 0),
      flag: computeFlag(r),
    }));

    // Roll up per faculty
    const perFaculty = new Map();
    for (const m of mentees) {
      if (!perFaculty.has(m.facultyId)) {
        perFaculty.set(m.facultyId, {
          facultyId: m.facultyId,
          facultyName: m.facultyName,
          facultyEmail: m.facultyEmail,
          facultyRole: m.facultyRole,
          facultyDepartment: m.facultyDepartment,
          teams: new Set(),
          total: 0,
          red: 0, yellow: 0, green: 0, completed: 0, notStarted: 0,
          companies: new Set(),
        });
      }
      const f = perFaculty.get(m.facultyId);
      f.teams.add(m.teamName);
      f.total += 1;
      if (m.flag === 'red') f.red += 1;
      else if (m.flag === 'yellow') f.yellow += 1;
      else if (m.flag === 'green') f.green += 1;
      else if (m.flag === 'completed') f.completed += 1;
      else if (m.flag === 'not-started') f.notStarted += 1;
      if (m.companyName) f.companies.add(m.companyName);
    }

    const facultyRollup = Array.from(perFaculty.values()).map((f) => ({
      facultyId: f.facultyId,
      facultyName: f.facultyName,
      facultyEmail: f.facultyEmail,
      facultyRole: f.facultyRole,
      facultyDepartment: f.facultyDepartment,
      teams: Array.from(f.teams),
      total: f.total,
      red: f.red,
      yellow: f.yellow,
      green: f.green,
      completed: f.completed,
      notStarted: f.notStarted,
      distinctCompanies: f.companies.size,
      greenRate: f.total ? Math.round((f.green / f.total) * 1000) / 10 : 0,
      redRate: f.total ? Math.round((f.red / f.total) * 1000) / 10 : 0,
    })).sort((a, b) => a.facultyName.localeCompare(b.facultyName));

    // Totals for the whole session
    const totals = {
      eligibleMentors,
      mentorsAssigned: perFaculty.size,
      activeTeams: new Set(mentees.map((m) => m.teamId)).size,
      assignedMentees: mentees.length,
      studentsInSession,
      orphanStudents: Math.max(0, studentsInSession - mentees.length),
      flags: {
        red: mentees.filter((m) => m.flag === 'red').length,
        yellow: mentees.filter((m) => m.flag === 'yellow').length,
        green: mentees.filter((m) => m.flag === 'green').length,
        completed: mentees.filter((m) => m.flag === 'completed').length,
        notStarted: mentees.filter((m) => m.flag === 'not-started').length,
      },
    };

    // Role breakdown of unassigned + role breakdown of assigned mentors
    const unassignedByRole = unassigned.reduce((acc, u) => {
      acc[u.approved_role] = (acc[u.approved_role] || 0) + 1;
      return acc;
    }, {});
    const assignedByRole = facultyRollup.reduce((acc, f) => {
      acc[f.facultyRole] = (acc[f.facultyRole] || 0) + 1;
      return acc;
    }, {});

    // Team-size distribution stats
    const teamSizes = facultyRollup.map((f) => f.total).sort((a, b) => a - b);
    const median = teamSizes.length
      ? (teamSizes.length % 2
          ? teamSizes[(teamSizes.length - 1) / 2]
          : (teamSizes[teamSizes.length / 2 - 1] + teamSizes[teamSizes.length / 2]) / 2)
      : 0;
    const teamStats = {
      min: teamSizes[0] || 0,
      max: teamSizes[teamSizes.length - 1] || 0,
      median,
      avg: teamSizes.length ? Math.round((teamSizes.reduce((a, b) => a + b, 0) / teamSizes.length) * 10) / 10 : 0,
    };

    // SIP type / company insights
    const sipTypes = mentees.reduce((acc, m) => {
      const k = m.sipType || 'UNSPECIFIED';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    const withSip = mentees.filter((m) => m.sipStatus).length;
    const distinctCompanies = new Set(mentees.filter((m) => m.companyName).map((m) => m.companyName)).size;

    // Top / bottom lists — only faculties with 3+ mentees, otherwise the
    // percentages are noise.
    const meaningful = facultyRollup.filter((f) => f.total >= 3);
    const topGreen = [...meaningful].sort((a, b) => b.greenRate - a.greenRate).slice(0, 5);
    const topRed = [...facultyRollup].sort((a, b) => b.red - a.red).slice(0, 5);
    const largestTeams = [...facultyRollup].sort((a, b) => b.total - a.total).slice(0, 5);

    res.json({
      session: { id: session.id, name: session.name, isActive: session.isActive },
      generatedAt: new Date().toISOString(),
      totals,
      unassigned,
      unassignedByRole,
      assignedByRole,
      teamStats,
      sipTypes,
      withSip,
      distinctCompanies,
      facultyRollup,
      mentees,
      insights: { topGreen, topRed, largestTeams },
    });
  } catch (error) {
    console.error('mentor-report error:', error);
    res.status(500).json({ message: 'Failed to build report' });
  }
};

// GET /api/mentor-report/sessions — for the session picker
exports.listSessions = async (req, res) => {
  if (!['ADMIN', 'HOD'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const sessions = await AcademicSession.findAll({
    attributes: ['id', 'name', 'isActive', 'startDate', 'endDate'],
    order: [['startDate', 'DESC']],
  });
  res.json({ sessions });
};
