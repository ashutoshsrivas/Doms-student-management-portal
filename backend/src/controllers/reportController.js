const {
  User,
  Role,
  AcademicSession,
  StudentSession,
  StudentProfile,
  SessionCategory,
  StudentSessionCategory,
  Assessment,
  AssessmentSubmission,
  MentorTeam,
  MentorTeamMember,
  SIP,
  SIPQuestion,
  SIPQuestionAnswer,
} = require('../models');

// -- Helpers ---------------------------------------------------------------

const arrFmt = (v) => {
  if (v == null) return '';
  if (Array.isArray(v)) {
    return v
      .map((item) => {
        if (item == null) return '';
        if (typeof item === 'string') return item;
        if (typeof item === 'object') {
          // pick a few common label-ish fields
          return (
            item.name ||
            item.title ||
            item.label ||
            item.skill ||
            item.value ||
            JSON.stringify(item)
          );
        }
        return String(item);
      })
      .filter(Boolean)
      .join('; ');
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

const objArrayDetail = (v) => {
  // For arrays of richer objects (workExperiences, projects, etc.)
  if (!Array.isArray(v) || v.length === 0) return '';
  return v
    .map((item) => {
      if (!item || typeof item !== 'object') return String(item || '');
      const parts = [];
      const order = [
        'title',
        'name',
        'position',
        'role',
        'company',
        'organization',
        'institution',
        'year',
        'duration',
        'description',
      ];
      for (const k of order) if (item[k]) parts.push(`${k}: ${item[k]}`);
      // include any unknown short fields
      for (const k of Object.keys(item))
        if (!order.includes(k) && typeof item[k] !== 'object' && item[k])
          parts.push(`${k}: ${item[k]}`);
      return parts.join(' | ');
    })
    .join(' || ');
};

const dateOnly = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const isoFull = (d) => (d ? new Date(d).toISOString().replace('T', ' ').slice(0, 19) : '');

const buildMeta = (req, sessionRecord, reportType, title, rowCount) => ({
  reportType,
  title,
  session: sessionRecord
    ? { id: sessionRecord.id, name: sessionRecord.name }
    : null,
  generatedAt: new Date().toISOString(),
  generatedBy: req.user?.email || 'unknown',
  rowCount,
});

const resolveSession = async (sessionId) => {
  if (!sessionId) {
    const err = new Error('sessionId is required');
    err.status = 400;
    throw err;
  }
  const session = await AcademicSession.findByPk(sessionId);
  if (!session) {
    const err = new Error('Session not found');
    err.status = 404;
    throw err;
  }
  return session;
};

// -- Controllers ----------------------------------------------------------

const reportController = {
  // List of available reports — used by the UI to render cards
  listReports: async (req, res) => {
    res.json({
      reports: [
        {
          key: 'students_master',
          title: 'Students Master List',
          description: 'Basic info for every student in the session — name, email, phone, registration number, department, enrolment status and date.',
          requiresSession: true,
          path: '/api/reports/students/master',
        },
        {
          key: 'students_profiles_full',
          title: 'Student Profiles (Complete)',
          description: 'Everything students have filled in their profile — personal background, professional profile, skills, work experience, achievements, projects, certifications, social links, resume URL, hobbies.',
          requiresSession: true,
          path: '/api/reports/students/profiles',
        },
        {
          key: 'sip_details',
          title: 'SIP Internship Details',
          description: 'Every field of the SIP form — student, company, role, location, stipend, supervisor, HR, dates, grading, PPO offer, status.',
          requiresSession: true,
          path: '/api/reports/sip/details',
        },
        {
          key: 'sip_qa',
          title: 'SIP Questions & Answers',
          description: 'Posted SIP questions and each student\'s answer (text + uploaded document URL + submission time).',
          requiresSession: true,
          path: '/api/reports/sip/qa',
        },
        {
          key: 'assessment_summary',
          title: 'Assessments Summary',
          description: 'One row per assessment with total assigned, submitted, graded, average / max / min score.',
          requiresSession: true,
          path: '/api/reports/assessments/summary',
        },
        {
          key: 'mentor_teams',
          title: 'Mentor Teams & Members',
          description: 'One row per team-member pairing — team name, faculty mentor, student member.',
          requiresSession: true,
          path: '/api/reports/mentors/teams',
        },
        {
          key: 'users_status',
          title: 'All Users (any status)',
          description: 'Every account in the system — name, email, requested role, approved role, status, department, last login. Not session-scoped.',
          requiresSession: false,
          path: '/api/reports/users/status',
        },
      ],
    });
  },

  // Sessions picker
  listSessions: async (req, res) => {
    const sessions = await AcademicSession.findAll({
      attributes: ['id', 'name', 'startDate', 'endDate', 'isActive'],
      order: [['createdAt', 'DESC']],
    });
    res.json({ sessions });
  },

  // 1. Students Master List
  studentsMaster: async (req, res) => {
    const session = await resolveSession(req.query.sessionId);
    const rows = await StudentSession.findAll({
      where: { academicSessionId: session.id },
      include: [
        {
          model: User,
          as: 'Student',
          attributes: [
            'id', 'firstName', 'lastName', 'email', 'phoneNumber',
            'registrationNumber', 'department', 'status', 'createdAt',
            'lastLogin',
          ],
        },
      ],
      order: [[{ model: User, as: 'Student' }, 'firstName', 'ASC']],
    });

    const data = rows.map((r) => {
      const u = r.Student || {};
      return {
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        email: u.email || '',
        phoneNumber: u.phoneNumber || '',
        registrationNumber: u.registrationNumber || '',
        department: u.department || '',
        accountStatus: u.status || '',
        enrolmentStatus: r.status || '',
        enrolmentDate: isoFull(r.enrollmentDate),
        accountCreated: isoFull(u.createdAt),
        lastLogin: isoFull(u.lastLogin),
      };
    });

    res.json({
      meta: buildMeta(req, session, 'students_master', 'Students Master List', data.length),
      columns: [
        { key: 'firstName', label: 'First Name' },
        { key: 'lastName', label: 'Last Name' },
        { key: 'email', label: 'Email' },
        { key: 'phoneNumber', label: 'Phone' },
        { key: 'registrationNumber', label: 'Registration #' },
        { key: 'department', label: 'Department' },
        { key: 'accountStatus', label: 'Account Status' },
        { key: 'enrolmentStatus', label: 'Enrolment Status' },
        { key: 'enrolmentDate', label: 'Enrolment Date' },
        { key: 'accountCreated', label: 'Account Created' },
        { key: 'lastLogin', label: 'Last Login' },
      ],
      rows: data,
    });
  },

  // 2. Student Profiles (Complete)
  studentsProfilesFull: async (req, res) => {
    const session = await resolveSession(req.query.sessionId);

    // Pull StudentSessions + Student User + StudentProfile (StudentProfile hangs off User, not StudentSession).
    const rows = await StudentSession.findAll({
      where: { academicSessionId: session.id },
      include: [
        {
          model: User,
          as: 'Student',
          attributes: [
            'id', 'firstName', 'lastName', 'email', 'phoneNumber',
            'registrationNumber', 'department', 'status', 'createdAt',
            'profileImage',
          ],
          include: [
            { model: StudentProfile, required: false },
          ],
        },
      ],
      order: [[{ model: User, as: 'Student' }, 'firstName', 'ASC']],
    });

    const data = rows.map((r) => {
      const u = r.Student || {};
      const p = (u && u.StudentProfile) || {};
      return {
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        email: u.email || '',
        phoneNumber: u.phoneNumber || '',
        registrationNumber: u.registrationNumber || '',
        department: u.department || '',
        profileImage: u.profileImage || '',
        fatherName: p.fatherName || '',
        fatherOccupation: p.fatherOccupation || '',
        motherName: p.motherName || '',
        motherOccupation: p.motherOccupation || '',
        guardianPhone: p.guardianPhone || '',
        residentialStatus: p.residentialStatus || '',
        aboutMe: p.aboutMe || '',
        careerObjective: p.careerObjective || '',
        interests: arrFmt(p.interests),
        skills: arrFmt(p.skills),
        coScholasticExpertise: p.coScholasticExpertise || '',
        coScholasticDescription: p.coScholasticDescription || '',
        hasWorkExperience: p.hasWorkExperience ? 'Yes' : 'No',
        workExperiences: objArrayDetail(p.workExperiences),
        achievements: objArrayDetail(p.achievements),
        certifications: objArrayDetail(p.certifications),
        projects: objArrayDetail(p.projects),
        positionsOfResponsibility: objArrayDetail(p.positionsOfResponsibility),
        linkedin: p.linkedin || '',
        github: p.github || '',
        portfolio: p.portfolio || '',
        coursera: p.coursera || '',
        otherLinks: arrFmt(p.otherLinks),
        languagesKnown: arrFmt(p.languagesKnown),
        hobbies: arrFmt(p.hobbies),
        strengths: arrFmt(p.strengths),
        areasOfImprovement: arrFmt(p.areasOfImprovement),
        resume: p.resume || '',
        certificateDocuments: arrFmt(p.certificateDocuments),
      };
    });

    res.json({
      meta: buildMeta(req, session, 'students_profiles_full', 'Student Profiles (Complete)', data.length),
      columns: [
        { key: 'firstName', label: 'First Name' },
        { key: 'lastName', label: 'Last Name' },
        { key: 'email', label: 'Email' },
        { key: 'phoneNumber', label: 'Phone' },
        { key: 'registrationNumber', label: 'Registration #' },
        { key: 'department', label: 'Department' },
        { key: 'profileImage', label: 'Display Image URL' },
        { key: 'fatherName', label: 'Father Name' },
        { key: 'fatherOccupation', label: 'Father Occupation' },
        { key: 'motherName', label: 'Mother Name' },
        { key: 'motherOccupation', label: 'Mother Occupation' },
        { key: 'guardianPhone', label: 'Guardian Phone' },
        { key: 'residentialStatus', label: 'Residential Status' },
        { key: 'aboutMe', label: 'About Me' },
        { key: 'careerObjective', label: 'Career Objective' },
        { key: 'interests', label: 'Interests' },
        { key: 'skills', label: 'Skills' },
        { key: 'coScholasticExpertise', label: 'Co-Scholastic Expertise' },
        { key: 'coScholasticDescription', label: 'Co-Scholastic Description' },
        { key: 'hasWorkExperience', label: 'Has Work Experience' },
        { key: 'workExperiences', label: 'Work Experiences' },
        { key: 'achievements', label: 'Achievements' },
        { key: 'certifications', label: 'Certifications' },
        { key: 'projects', label: 'Projects' },
        { key: 'positionsOfResponsibility', label: 'Positions of Responsibility' },
        { key: 'linkedin', label: 'LinkedIn' },
        { key: 'github', label: 'GitHub' },
        { key: 'portfolio', label: 'Portfolio' },
        { key: 'coursera', label: 'Coursera' },
        { key: 'otherLinks', label: 'Other Links' },
        { key: 'languagesKnown', label: 'Languages Known' },
        { key: 'hobbies', label: 'Hobbies' },
        { key: 'strengths', label: 'Strengths' },
        { key: 'areasOfImprovement', label: 'Areas of Improvement' },
        { key: 'resume', label: 'Resume URL' },
        { key: 'certificateDocuments', label: 'Certificate Docs' },
      ],
      rows: data,
    });
  },

  // 3. SIP Internship Details
  sipDetails: async (req, res) => {
    const session = await resolveSession(req.query.sessionId);

    // SIP belongsTo StudentSession; we filter StudentSessions by academicSessionId.
    const studentSessions = await StudentSession.findAll({
      where: { academicSessionId: session.id },
      attributes: ['id'],
    });
    const ssIds = studentSessions.map((s) => s.id);

    const sips = await SIP.findAll({
      where: { studentSessionId: ssIds },
      include: [
        { model: User, as: 'Student', attributes: ['firstName', 'lastName', 'email', 'registrationNumber'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    const data = sips.map((s) => ({
      enrollmentNo: s.enrollmentNo || s.Student?.registrationNumber || '',
      studentName: s.studentName || `${s.Student?.firstName || ''} ${s.Student?.lastName || ''}`.trim(),
      email: s.email || s.Student?.email || '',
      phoneNo: s.phoneNo || '',
      specialization: s.specialization || '',
      gender: s.gender || '',
      homeTownLocation: s.homeTownLocation || '',
      companyName: s.companyName || '',
      jobRole: s.jobRole || '',
      sipLocation: s.sipLocation || '',
      stipend: s.stipend != null ? Number(s.stipend) : '',
      type: s.type || '',
      corporateType: s.corporateType || '',
      joinDate: dateOnly(s.joinDate),
      nocDate: dateOnly(s.nocDate),
      completionDate: dateOnly(s.completionDate),
      durationWeeks: s.durationWeeks || '',
      supervisorName: s.supervisorName || '',
      supervisorPhone: s.supervisorPhone || '',
      supervisorEmail: s.supervisorEmail || '',
      hrHeadName: s.hrHeadName || '',
      hrPhone: s.hrPhone || '',
      hrEmail: s.hrEmail || '',
      officeAddress: s.officeAddress || '',
      projectTitle: s.projectTitle || '',
      facultyMentorName: s.facultyMentorName || '',
      sipEndDate: dateOnly(s.sipEndDate),
      certificateIssued: s.certificateIssued || '',
      facultyFeedback: s.facultyFeedback || '',
      supervisorFeedback: s.supervisorFeedback || '',
      facultyGrading: s.facultyGrading != null ? Number(s.facultyGrading) : '',
      supervisorGrading: s.supervisorGrading != null ? Number(s.supervisorGrading) : '',
      extensionWeeks: s.extensionWeeks || '',
      ppOffered: s.ppOffered ? 'Yes' : 'No',
      ppoCompensation: s.ppoCompensation != null ? Number(s.ppoCompensation) : '',
      ppoPosition: s.ppoPosition || '',
      ppoLocation: s.ppoLocation || '',
      nocIssueDateExtension: dateOnly(s.nocIssueDateExtension),
      status: s.status || '',
      submittedAt: isoFull(s.createdAt),
    }));

    res.json({
      meta: buildMeta(req, session, 'sip_details', 'SIP Internship Details', data.length),
      columns: [
        { key: 'enrollmentNo', label: 'Enrollment No' },
        { key: 'studentName', label: 'Student Name' },
        { key: 'email', label: 'Email' },
        { key: 'phoneNo', label: 'Phone' },
        { key: 'specialization', label: 'Specialization' },
        { key: 'gender', label: 'Gender' },
        { key: 'homeTownLocation', label: 'Home Town' },
        { key: 'companyName', label: 'Company' },
        { key: 'jobRole', label: 'Job Role' },
        { key: 'sipLocation', label: 'SIP Location' },
        { key: 'stipend', label: 'Stipend' },
        { key: 'type', label: 'Type' },
        { key: 'corporateType', label: 'Corporate Type' },
        { key: 'joinDate', label: 'Join Date' },
        { key: 'nocDate', label: 'NOC Date' },
        { key: 'completionDate', label: 'Completion Date' },
        { key: 'durationWeeks', label: 'Duration (Weeks)' },
        { key: 'supervisorName', label: 'Supervisor Name' },
        { key: 'supervisorPhone', label: 'Supervisor Phone' },
        { key: 'supervisorEmail', label: 'Supervisor Email' },
        { key: 'hrHeadName', label: 'HR Head Name' },
        { key: 'hrPhone', label: 'HR Phone' },
        { key: 'hrEmail', label: 'HR Email' },
        { key: 'officeAddress', label: 'Office Address' },
        { key: 'projectTitle', label: 'Project Title' },
        { key: 'facultyMentorName', label: 'Faculty Mentor' },
        { key: 'sipEndDate', label: 'SIP End Date' },
        { key: 'certificateIssued', label: 'Certificate' },
        { key: 'facultyFeedback', label: 'Faculty Feedback' },
        { key: 'supervisorFeedback', label: 'Supervisor Feedback' },
        { key: 'facultyGrading', label: 'Faculty Grading' },
        { key: 'supervisorGrading', label: 'Supervisor Grading' },
        { key: 'extensionWeeks', label: 'Extension (Weeks)' },
        { key: 'ppOffered', label: 'PPO Offered' },
        { key: 'ppoCompensation', label: 'PPO Compensation' },
        { key: 'ppoPosition', label: 'PPO Position' },
        { key: 'ppoLocation', label: 'PPO Location' },
        { key: 'nocIssueDateExtension', label: 'NOC Issue (Ext.)' },
        { key: 'status', label: 'Status' },
        { key: 'submittedAt', label: 'Submitted At' },
      ],
      rows: data,
    });
  },

  // 4. SIP Questions & Answers
  sipQA: async (req, res) => {
    const session = await resolveSession(req.query.sessionId);

    const questions = await SIPQuestion.findAll({
      where: { sessionId: session.id },
      include: [
        {
          model: SIPQuestionAnswer,
          required: false,
          include: [
            {
              model: SIP,
              required: false,
              include: [
                { model: User, as: 'Student', attributes: ['firstName', 'lastName', 'email', 'registrationNumber'] },
              ],
            },
          ],
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    const data = [];
    for (const q of questions) {
      const answers = q.SIPQuestionAnswers || [];
      if (answers.length === 0) {
        data.push({
          questionText: q.question || '',
          questionDescription: q.description || '',
          studentName: '',
          studentEmail: '',
          registrationNumber: '',
          answerText: '',
          answerDocument: '',
          submittedAt: '',
        });
        continue;
      }
      for (const a of answers) {
        const u = a.SIP?.Student;
        data.push({
          questionText: q.question || '',
          questionDescription: q.description || '',
          studentName: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '',
          studentEmail: u?.email || '',
          registrationNumber: u?.registrationNumber || '',
          answerText: a.answerText || '',
          answerDocument: a.answerDocument || '',
          submittedAt: isoFull(a.submittedAt || a.createdAt),
        });
      }
    }

    res.json({
      meta: buildMeta(req, session, 'sip_qa', 'SIP Questions & Answers', data.length),
      columns: [
        { key: 'questionText', label: 'Question' },
        { key: 'questionDescription', label: 'Question Description' },
        { key: 'studentName', label: 'Student Name' },
        { key: 'studentEmail', label: 'Email' },
        { key: 'registrationNumber', label: 'Registration #' },
        { key: 'answerText', label: 'Answer' },
        { key: 'answerDocument', label: 'Document URL' },
        { key: 'submittedAt', label: 'Submitted At' },
      ],
      rows: data,
    });
  },

  // 5. Assessments Summary
  assessmentSummary: async (req, res) => {
    const session = await resolveSession(req.query.sessionId);

    const assessments = await Assessment.findAll({
      where: { academicSessionId: session.id },
      include: [
        { model: AssessmentSubmission, required: false },
      ],
      order: [['createdAt', 'DESC']],
    });

    const data = assessments.map((a) => {
      const subs = a.AssessmentSubmissions || [];
      const totalAssigned = subs.length;
      const submitted = subs.filter((s) => s.submittedAt || s.status === 'SUBMITTED' || s.status === 'GRADED').length;
      const graded = subs.filter((s) => s.status === 'GRADED').length;
      const scores = subs
        .filter((s) => s.status === 'GRADED' && s.totalScore != null)
        .map((s) => Number(s.totalScore));
      const avg = scores.length ? scores.reduce((x, y) => x + y, 0) / scores.length : null;

      return {
        title: a.title || '',
        type: a.type || '',
        status: a.status || '',
        totalPoints: a.totalPoints != null ? Number(a.totalPoints) : '',
        assignmentScope: a.assignmentScope || '',
        deadline: isoFull(a.deadline),
        totalAssigned,
        submitted,
        graded,
        avgScore: avg != null ? Math.round(avg * 100) / 100 : '',
        maxScore: scores.length ? Math.max(...scores) : '',
        minScore: scores.length ? Math.min(...scores) : '',
        createdAt: isoFull(a.createdAt),
      };
    });

    res.json({
      meta: buildMeta(req, session, 'assessment_summary', 'Assessments Summary', data.length),
      columns: [
        { key: 'title', label: 'Assessment' },
        { key: 'type', label: 'Type' },
        { key: 'status', label: 'Status' },
        { key: 'totalPoints', label: 'Total Points' },
        { key: 'assignmentScope', label: 'Scope' },
        { key: 'deadline', label: 'Deadline' },
        { key: 'totalAssigned', label: 'Assigned/Submitted Total' },
        { key: 'submitted', label: 'Submitted' },
        { key: 'graded', label: 'Graded' },
        { key: 'avgScore', label: 'Avg Score' },
        { key: 'maxScore', label: 'Max Score' },
        { key: 'minScore', label: 'Min Score' },
        { key: 'createdAt', label: 'Created' },
      ],
      rows: data,
    });
  },

  // 6. Mentor Teams & Members
  mentorTeams: async (req, res) => {
    const session = await resolveSession(req.query.sessionId);

    const teams = await MentorTeam.findAll({
      where: { sessionId: session.id },
      include: [
        { model: User, as: 'Faculty', attributes: ['firstName', 'lastName', 'email'] },
        {
          model: MentorTeamMember,
          required: false,
          include: [
            {
              model: StudentSession,
              required: false,
              include: [
                { model: User, as: 'Student', attributes: ['firstName', 'lastName', 'email', 'registrationNumber'] },
              ],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const data = [];
    for (const t of teams) {
      const facultyName = t.Faculty ? `${t.Faculty.firstName || ''} ${t.Faculty.lastName || ''}`.trim() : '';
      const facultyEmail = t.Faculty?.email || '';
      const members = t.MentorTeamMembers || [];
      if (members.length === 0) {
        data.push({
          teamName: t.teamName || '',
          teamDescription: t.description || '',
          facultyName,
          facultyEmail,
          studentName: '',
          studentEmail: '',
          registrationNumber: '',
          memberJoinedAt: '',
        });
        continue;
      }
      for (const m of members) {
        const u = m.StudentSession?.Student;
        data.push({
          teamName: t.teamName || '',
          teamDescription: t.description || '',
          facultyName,
          facultyEmail,
          studentName: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '',
          studentEmail: u?.email || '',
          registrationNumber: u?.registrationNumber || '',
          memberJoinedAt: isoFull(m.createdAt),
        });
      }
    }

    res.json({
      meta: buildMeta(req, session, 'mentor_teams', 'Mentor Teams & Members', data.length),
      columns: [
        { key: 'teamName', label: 'Team Name' },
        { key: 'teamDescription', label: 'Team Description' },
        { key: 'facultyName', label: 'Faculty Mentor' },
        { key: 'facultyEmail', label: 'Faculty Email' },
        { key: 'studentName', label: 'Student Name' },
        { key: 'studentEmail', label: 'Student Email' },
        { key: 'registrationNumber', label: 'Registration #' },
        { key: 'memberJoinedAt', label: 'Joined At' },
      ],
      rows: data,
    });
  },

  // 7. All users (any status) — not session-scoped
  usersStatus: async (req, res) => {
    const where = {};
    if (req.query.role) where.approvedRole = String(req.query.role).toUpperCase();
    if (req.query.status) where.status = String(req.query.status).toUpperCase();

    const users = await User.findAll({
      where,
      attributes: [
        'id', 'firstName', 'lastName', 'email', 'phoneNumber',
        'department', 'employeeId', 'registrationNumber',
        'requestedRole', 'approvedRole', 'status',
        'isVerified', 'lastLogin', 'createdAt',
      ],
      order: [['createdAt', 'DESC']],
    });

    const data = users.map((u) => ({
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      email: u.email || '',
      phoneNumber: u.phoneNumber || '',
      department: u.department || '',
      employeeId: u.employeeId || '',
      registrationNumber: u.registrationNumber || '',
      requestedRole: u.requestedRole || '',
      approvedRole: u.approvedRole || '',
      status: u.status || '',
      verified: u.isVerified ? 'Yes' : 'No',
      lastLogin: isoFull(u.lastLogin),
      createdAt: isoFull(u.createdAt),
    }));

    res.json({
      meta: buildMeta(req, null, 'users_status', 'All Users (any status)', data.length),
      columns: [
        { key: 'firstName', label: 'First Name' },
        { key: 'lastName', label: 'Last Name' },
        { key: 'email', label: 'Email' },
        { key: 'phoneNumber', label: 'Phone' },
        { key: 'department', label: 'Department' },
        { key: 'employeeId', label: 'Employee ID' },
        { key: 'registrationNumber', label: 'Registration #' },
        { key: 'requestedRole', label: 'Requested Role' },
        { key: 'approvedRole', label: 'Approved Role' },
        { key: 'status', label: 'Status' },
        { key: 'verified', label: 'Verified' },
        { key: 'lastLogin', label: 'Last Login' },
        { key: 'createdAt', label: 'Account Created' },
      ],
      rows: data,
    });
  },
};

module.exports = reportController;
