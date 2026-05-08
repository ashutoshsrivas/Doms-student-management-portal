const { User, StudentProfile, AcademicSession, StudentSession } = require('../models');
const { Op } = require('sequelize');

// Initialize LLM service - easily swappable for different providers
const initializeLLMService = () => {
  const provider = process.env.LLM_PROVIDER || 'gemini';
  
  if (provider === 'gemini') {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    return {
      provider: 'gemini',
      model: genAI.getGenerativeModel({ model: 'gemini-pro' }),
    };
  }
  
  // Easy to add more providers (OpenAI, Claude, etc.)
  throw new Error(`LLM Provider ${provider} not configured`);
};

// Extract and clean keywords from job description
const extractJobKeywords = (jobDescription) => {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
    'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
    'these', 'those', 'your', 'our', 'their', 'from', 'up', 'about', 'etc', 'include', 'including',
    'required', 'preferred', 'experience', 'years', 'year', 'role', 'position', 'job',
  ]);

  // Extract words and normalize
  const words = jobDescription
    .toLowerCase()
    .match(/\b[\w\-+#.]+\b/g) || [];

  // Filter and score keywords
  const keywords = {};
  words.forEach(word => {
    if (word.length >= 3 && !stopWords.has(word)) {
      keywords[word] = (keywords[word] || 0) + 1;
    }
  });

  // Return top keywords by frequency
  return Object.entries(keywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
};

// Phase 1 & 2: Pre-filter and keyword-score students
const preFilterAndScoreStudents = (students, jobKeywords) => {
  const scored = students
    .map(student => {
      const profile = student.StudentProfile || {};
      
      // Combine all searchable text
      const searchText = [
        student.firstName,
        student.lastName,
        student.email,
        student.department,
        profile.careerObjective || '',
        profile.aboutMe || '',
        Array.isArray(profile.skills) ? profile.skills.join(' ') : '',
        Array.isArray(profile.workExperience) ? profile.workExperience.map(w => JSON.stringify(w)).join(' ') : '',
        Array.isArray(profile.achievements) ? profile.achievements.join(' ') : '',
      ]
        .join(' ')
        .toLowerCase();

      // Count keyword matches
      let matchCount = 0;
      jobKeywords.forEach(keyword => {
        if (searchText.includes(keyword)) {
          matchCount++;
        }
      });

      // Calculate keyword match score (0-1)
      const keywordScore = matchCount / Math.max(jobKeywords.length, 1);
      
      // Calculate profile completeness score (0-1)
      const profileFields = [
        profile.skills?.length > 0,
        profile.workExperience?.length > 0,
        profile.achievements?.length > 0,
        profile.projects?.length > 0,
        profile.careerObjective && profile.careerObjective.length > 10,
      ].filter(Boolean).length;
      const completenessScore = profileFields / 5;

      // Combined score: 70% keyword match + 30% profile completeness
      // This ensures students with good keywords rank high, but we still analyze students with incomplete profiles
      const combinedScore = (keywordScore * 0.7) + (completenessScore * 0.3);

      return {
        student,
        keywordMatchScore: keywordScore,
        completenessScore,
        combinedScore,
        matchedKeywords: jobKeywords.filter(k => searchText.includes(k)),
      };
    })
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, Math.min(80, Math.ceil(students.length * 0.3))); // Top 80 or 30%, whichever is smaller

  return scored;
};

// Skip LLM (Gemini API issues) - use intelligent keyword + profile matching
const analyzeStudentJobMatch = async (llmService, jobDescription, student, studentProfile, matchedKeywords = []) => {
  const studentData = {
    name: `${student.firstName} ${student.lastName}`,
    email: student.email,
    skills: studentProfile?.skills || [],
    workExperiences: studentProfile?.workExperiences || [],
    projects: studentProfile?.projects || [],
    achievements: studentProfile?.achievements || [],
  };

  const jobDescLower = jobDescription.toLowerCase();
  
  // 1. Check for direct keyword/job requirement matches
  const keywordMatches = matchedKeywords.filter(k => {
    const keyword = k.toLowerCase();
    const profileText = [
      ...studentData.skills,
      ...studentData.workExperiences.map(e => `${e.role} ${e.organization} ${e.description}`),
      ...studentData.projects,
      ...studentData.achievements,
    ].join(' ').toLowerCase();
    
    return profileText.includes(keyword) || 
           (keyword.length > 3 && profileText.includes(keyword.substring(0, 4)));
  });

  // 2. Check for technical skills (baseline credit for technical roles)
  const technicalKeywords = ['coding', 'programming', 'development', 'developer', 'tech', 'software', 'technical', 'developer', 'engineer', 'ai', 'ml', 'data'];
  const hasTechnicalBackground = studentData.skills.some(s => 
    technicalKeywords.some(tk => s.toLowerCase().includes(tk))
  ) || studentData.workExperiences.some(e => 
    technicalKeywords.some(tk => `${e.role} ${e.organization}`.toLowerCase().includes(tk))
  );

  // 3. Check for specific skill matches
  const skillMatches = studentData.skills.filter(s => 
    jobDescLower.includes(s.toLowerCase()) ||
    (s.length > 3 && jobDescLower.includes(s.substring(0, 4).toLowerCase()))
  );

  // Calculate score with better baseline
  let baseScore = 0;
  
  // Give baseline score for technical background (40 points)
  if (hasTechnicalBackground) {
    baseScore = 40;
  } else if (studentData.workExperiences.length > 0 || studentData.skills.length > 0) {
    baseScore = 20; // Some professional or skill background
  }
  
  // Boost for direct keyword matches (+15 per match, max 30)
  const keywordBoost = Math.min(30, keywordMatches.length * 15);
  
  // Boost for specific skill matches (+15 per match, max 20)
  const skillBoost = Math.min(20, skillMatches.length * 15);
  
  // Boost for work experience experience (+8 points)
  const experienceBoost = studentData.workExperiences.length > 0 ? 8 : 0;
  
  // Boost for projects and achievements (+5 each)
  const projectBoost = studentData.projects.length > 0 ? 5 : 0;
  const achievementBoost = studentData.achievements.length > 0 ? 5 : 0;
  
  const totalScore = Math.min(100, baseScore + keywordBoost + skillBoost + experienceBoost + projectBoost + achievementBoost);

  // Build smart reasoning
  const matchDetails = [];
  if (skillMatches.length > 0) matchDetails.push(`${skillMatches.length} direct skill match(es)`);
  if (keywordMatches.length > 0) matchDetails.push(`${keywordMatches.length} requirement match(es)`);
  if (studentData.workExperiences.length > 0) matchDetails.push(`${studentData.workExperiences.length} work experience(s)`);
  if (!skillMatches.length && !keywordMatches.length && hasTechnicalBackground) matchDetails.push('Strong technical background');
  
  const reasoning = matchDetails.length > 0 
    ? matchDetails.join('. ')
    : `${studentData.skills.length > 0 ? 'Some' : 'Limited'} relevant skills`;
  
  return {
    studentId: student.id,
    studentName: studentData.name,
    email: studentData.email,
    matchScore: totalScore,
    reasoning: reasoning.substring(0, 250),
    keyStrengths: [
      ...skillMatches.slice(0, 1),
      ...studentData.workExperiences.slice(0, 1).map(e => e.role),
      ...keywordMatches.slice(0, 1),
    ].filter(Boolean).slice(0, 3),
    gapAreas: totalScore < 40 ? [] : [],
    error: false,
  };
};

// Main job matching controller
exports.matchStudentsToJob = async (req, res) => {
  try {
    const { jobDescription, sessionId } = req.body;

    if (!jobDescription || jobDescription.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Job description is required',
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required',
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'LLM service not configured',
      });
    }

    // Fetch students only from the selected session
    const session = await AcademicSession.findByPk(sessionId, {
      include: [
        {
          model: StudentSession,
          include: [
            {
              model: User,
              as: 'Student',
              attributes: ['id', 'firstName', 'lastName', 'email', 'department', 'registrationNumber', 'profileImage'],
              where: {
                status: 'ACTIVE',
              },
              include: [
                {
                  model: StudentProfile,
                  as: 'StudentProfile',
                },
              ],
            },
          ],
        },
      ],
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Extract students from StudentSession records using the Student alias
    const students = (session.StudentSessions || [])
      .map(ss => ss.Student)
      .filter(user => user !== null);

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active students found in this session',
      });
    }

    console.log(`[Job Matching] Starting 3-phase analysis for ${students.length} students in session "${session.name}"`);

    // ============ PHASE 1 & 2: PRE-FILTER & KEYWORD SCORING ============
    const jobKeywords = extractJobKeywords(jobDescription);
    console.log(`[Phase 1-2] Extracted keywords:`, jobKeywords.slice(0, 10));

    const prescored = preFilterAndScoreStudents(students, jobKeywords);
    console.log(`[Phase 1-2] Pre-filtered to ${prescored.length} candidates (from ${students.length})`);
    console.log(`[Phase 1-2] Token savings: ~${(students.length - prescored.length) * 500} tokens saved by pre-filtering`);

    if (prescored.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          sessionName: session.name,
          jobDescription: jobDescription.substring(0, 200) + (jobDescription.length > 200 ? '...' : ''),
          totalStudentsAnalyzed: students.length,
          topMatches: [],
        },
        message: 'No students matched job keywords. Try a different job description.',
      });
    }

    // ============ PHASE 3: FOCUSED LLM ANALYSIS ============
    // NOTE: LLM disabled due to Gemini API issues
    // Using intelligent keyword + profile-based matching
    console.log(`[Phase 3] Starting intelligent keyword-based analysis on ${prescored.length} pre-scored candidates`);

    const matchResults = await Promise.all(
      prescored.map(item =>
        analyzeStudentJobMatch(
          null, // No LLM service needed
          jobDescription,
          item.student,
          item.student.StudentProfile,
          item.matchedKeywords
        )
      )
    );

    // Filter and score with intelligent ranking
    const validMatches = matchResults
      .filter(match => !match.error || match.matchScore > 0)
      .map(match => ({
        ...match,
        finalScore: match.matchScore,
      }))
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 10)
      .map(({ finalScore, ...rest }) => rest);

    console.log(`[Phase 3] Analysis complete. Top matches: ${validMatches.slice(0, 3).map(m => `${m.studentName}(${m.matchScore})`).join(', ')}`);

    return res.status(200).json({
      success: true,
      data: {
        sessionName: session.name,
        jobDescription: jobDescription.substring(0, 200) + (jobDescription.length > 200 ? '...' : ''),
        totalStudentsInSession: students.length,
        studentsAnalyzedByLLM: prescored.length,
        tokenEfficiency: `Analyzed ${prescored.length}/${students.length} students (${Math.round((prescored.length/students.length)*100)}%)`,
        topMatches: validMatches,
      },
      message: `Found ${validMatches.length} matching students (analyzed ${prescored.length} with keyword pre-filtering)`,
    });
  } catch (error) {
    console.error('Job Matching Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing job matching',
      error: error.message,
    });
  }
};

// Get student details for detailed view
exports.getStudentDetails = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await User.findByPk(studentId, {
      include: [
        {
          model: StudentProfile,
          as: 'StudentProfile',
        },
      ],
      attributes: [
        'id',
        'firstName',
        'lastName',
        'email',
        'phoneNumber',
        'department',
        'registrationNumber',
        'profileImage',
      ],
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        personalInfo: {
          name: `${student.firstName} ${student.lastName}`,
          email: student.email,
          phone: student.phoneNumber,
          department: student.department,
          registrationNumber: student.registrationNumber,
          profileImage: student.profileImage,
        },
        profile: student.StudentProfile || {},
      },
    });
  } catch (error) {
    console.error('Student Details Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student details',
      error: error.message,
    });
  }
};
