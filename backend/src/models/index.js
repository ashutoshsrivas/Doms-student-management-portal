const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const Role = sequelize.define('Role', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.ENUM(
      'ADMIN',
      'HOD',
      'FACULTY',
      'COORDINATOR',
      'PLACEMENT_COORDINATOR',
      'TRAINER',
      'STUDENT',
      'MENTOR'
    ),
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.TEXT,
  },
  permissions: {
    type: DataTypes.JSON,
    defaultValue: {},
  },
}, {
  tableName: 'roles',
  timestamps: true,
  underscored: true,
});

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  phoneNumber: {
    type: DataTypes.STRING,
  },
  profileImage: {
    type: DataTypes.STRING,
  },
  department: {
    type: DataTypes.STRING,
  },
  employeeId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
  },
  registrationNumber: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'INACTIVE'),
    defaultValue: 'PENDING',
  },
  requestedRole: {
    type: DataTypes.ENUM(
      'ADMIN',
      'HOD',
      'FACULTY',
      'COORDINATOR',
      'PLACEMENT_COORDINATOR',
      'TRAINER',
      'STUDENT',
      'MENTOR'
    ),
    allowNull: false,
  },
  approvedRole: {
    type: DataTypes.ENUM(
      'ADMIN',
      'HOD',
      'FACULTY',
      'COORDINATOR',
      'PLACEMENT_COORDINATOR',
      'TRAINER',
      'STUDENT',
      'MENTOR'
    ),
    allowNull: true,
  },
  lastLogin: {
    type: DataTypes.DATE,
  },
  lastPasswordChange: {
    type: DataTypes.DATE,
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  verificationToken: {
    type: DataTypes.STRING,
  },
  resetPasswordToken: {
    type: DataTypes.STRING,
  },
  resetPasswordExpires: {
    type: DataTypes.DATE,
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
  },
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeCreate: async (user) => {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    },
    beforeUpdate: async (user) => {
      // Only hash password if it has been changed
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
  },
});

// Add instance method to compare password
User.prototype.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

const AcademicSession = sequelize.define('AcademicSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  registrationToken: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
  },
}, {
  tableName: 'academic_sessions',
  timestamps: true,
  underscored: true,
});

const StudentSession = sequelize.define('StudentSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  status: {
    type: DataTypes.ENUM('ONBOARDED', 'DROPPED', 'COMPLETED', 'PENDING'),
    defaultValue: 'ONBOARDED',
  },
  enrollmentDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  onboardedBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'student_sessions',
  timestamps: true,
  underscored: true,
});

const UserRole = sequelize.define('UserRole', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
}, {
  tableName: 'user_roles',
  timestamps: true,
  underscored: true,
});

const StudentProfile = sequelize.define('StudentProfile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // Personal Background
  fatherName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fatherOccupation: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fatherOccupationDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  motherName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  motherOccupation: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  motherOccupationDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  guardianPhone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  residentialStatus: {
    type: DataTypes.ENUM('HOSTELLER', 'DAY_SCHOLAR', 'OTHER'),
    allowNull: true,
  },
  // Professional Profile
  aboutMe: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  careerObjective: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  interests: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('interests');
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return [];
        }
      }
      return Array.isArray(rawValue) ? rawValue : [];
    },
  },
  // Skills & Expertise
  skills: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('skills');
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return [];
        }
      }
      return Array.isArray(rawValue) ? rawValue : [];
    },
  },
  coScholasticExpertise: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  coScholasticDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Work Experience
  hasWorkExperience: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  workExperiences: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('workExperiences');
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return [];
        }
      }
      return Array.isArray(rawValue) ? rawValue : [];
    },
  },
  // Achievements & Activities
  achievements: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('achievements');
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return [];
        }
      }
      return Array.isArray(rawValue) ? rawValue : [];
    },
  },
  certifications: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('certifications');
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return [];
        }
      }
      return Array.isArray(rawValue) ? rawValue : [];
    },
  },
  resume: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  certificateDocuments: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('certificateDocuments');
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return [];
        }
      }
      return Array.isArray(rawValue) ? rawValue : [];
    },
  },
  projects: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('projects');
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return [];
        }
      }
      return Array.isArray(rawValue) ? rawValue : [];
    },
  },
  positionsOfResponsibility: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('positionsOfResponsibility');
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return [];
        }
      }
      return Array.isArray(rawValue) ? rawValue : [];
    },
  },
  // Online Presence
  linkedin: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  github: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  portfolio: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  coursera: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  otherLinks: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('otherLinks');
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return [];
        }
      }
      return Array.isArray(rawValue) ? rawValue : [];
    },
  },
  // Additional
  languagesKnown: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('languagesKnown');
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return [];
        }
      }
      return Array.isArray(rawValue) ? rawValue : [];
    },
  },
  hobbies: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('hobbies');
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return [];
        }
      }
      return Array.isArray(rawValue) ? rawValue : [];
    },
  },
  strengths: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('strengths');
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return [];
        }
      }
      return Array.isArray(rawValue) ? rawValue : [];
    },
  },
  areasOfImprovement: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('areasOfImprovement');
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return [];
        }
      }
      return Array.isArray(rawValue) ? rawValue : [];
    },
  },
}, {
  tableName: 'student_profiles',
  timestamps: true,
  underscored: true,
});

const SessionCategory = sequelize.define('SessionCategory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  academicSessionId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  color: {
    type: DataTypes.STRING,
    defaultValue: '#3B82F6',
  },
}, {
  tableName: 'session_categories',
  timestamps: true,
  underscored: true,
});

const StudentSessionCategory = sequelize.define('StudentSessionCategory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  studentSessionId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  sessionCategoryId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  assignedBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'student_session_categories',
  timestamps: true,
  underscored: true,
});

// Associations
Role.hasMany(UserRole);
UserRole.belongsTo(Role);

User.hasMany(UserRole);
UserRole.belongsTo(User);

User.belongsToMany(Role, { through: UserRole });
Role.belongsToMany(User, { through: UserRole });

AcademicSession.hasMany(StudentSession, { foreignKey: 'academicSessionId' });
StudentSession.belongsTo(AcademicSession, { foreignKey: 'academicSessionId' });

AcademicSession.hasMany(SessionCategory, { foreignKey: 'academicSessionId' });
SessionCategory.belongsTo(AcademicSession, { foreignKey: 'academicSessionId' });

StudentSession.hasMany(StudentSessionCategory, { foreignKey: 'studentSessionId' });
StudentSessionCategory.belongsTo(StudentSession, { foreignKey: 'studentSessionId' });

SessionCategory.hasMany(StudentSessionCategory, { foreignKey: 'sessionCategoryId' });
StudentSessionCategory.belongsTo(SessionCategory, { foreignKey: 'sessionCategoryId' });

User.hasMany(StudentSessionCategory, { foreignKey: 'assignedBy' });
StudentSessionCategory.belongsTo(User, { foreignKey: 'assignedBy', as: 'AssignedByUser' });

User.hasMany(StudentSession);
StudentSession.belongsTo(User, { as: 'Student', foreignKey: 'userId' });

User.hasOne(StudentProfile, { foreignKey: 'userId', onDelete: 'CASCADE' });
StudentProfile.belongsTo(User, { foreignKey: 'userId' });

// Assessment Models
const Assessment = sequelize.define('Assessment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  type: {
    type: DataTypes.ENUM('AUTO_GRADE', 'MANUAL'),
    defaultValue: 'MANUAL',
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'PUBLISHED', 'CLOSED'),
    defaultValue: 'DRAFT',
  },
  assignmentScope: {
    type: DataTypes.ENUM('ALL_STUDENTS', 'CATEGORY', 'SPECIFIC_STUDENT'),
    allowNull: false,
  },
  academicSessionId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  deadline: {
    type: DataTypes.DATE,
  },
  totalPoints: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'assessments',
  timestamps: true,
  underscored: true,
});

const AssessmentQuestion = sequelize.define('AssessmentQuestion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  assessmentId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  questionText: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  questionType: {
    type: DataTypes.ENUM('TEXT', 'MCQ', 'FILE'),
    allowNull: false,
  },
  pointsValue: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  orderIndex: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  // For MCQ: { options: ['A', 'B', 'C', 'D'], correctAnswers: [0, 1], multipleCorrect: true }
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
  },
}, {
  tableName: 'assessment_questions',
  timestamps: true,
  underscored: true,
});

const AssessmentAssignment = sequelize.define('AssessmentAssignment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  assessmentId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  studentSessionId: {
    type: DataTypes.UUID,
  },
  categoryId: {
    type: DataTypes.UUID,
  },
  assignedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'assessment_assignments',
  timestamps: true,
  underscored: true,
});

const AssessmentSubmission = sequelize.define('AssessmentSubmission', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  assessmentId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  studentSessionId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('IN_PROGRESS', 'SUBMITTED', 'GRADED'),
    defaultValue: 'IN_PROGRESS',
  },
  totalScore: {
    type: DataTypes.DECIMAL(5, 2),
  },
  gradedBy: {
    type: DataTypes.UUID,
  },
  gradedAt: {
    type: DataTypes.DATE,
  },
  submittedAt: {
    type: DataTypes.DATE,
  },
  rubricId: {
    type: DataTypes.UUID,
    allowNull: true, // Allow null for assessments graded without rubric
  },
}, {
  tableName: 'assessment_submissions',
  timestamps: true,
  underscored: true,
});

const AssessmentResponse = sequelize.define('AssessmentResponse', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  submissionId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  questionId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  response: {
    type: DataTypes.TEXT,
  },
  score: {
    type: DataTypes.DECIMAL(5, 2),
  },
  isCorrect: {
    type: DataTypes.BOOLEAN,
  },
  feedback: {
    type: DataTypes.TEXT,
  },
  fileUrl: {
    type: DataTypes.STRING,
  },
}, {
  tableName: 'assessment_responses',
  timestamps: true,
  underscored: true,
});

// Assessment Associations
Assessment.belongsTo(AcademicSession, { foreignKey: 'academicSessionId' });
AcademicSession.hasMany(Assessment, { foreignKey: 'academicSessionId' });

Assessment.belongsTo(User, { foreignKey: 'createdBy', as: 'Creator' });
User.hasMany(Assessment, { foreignKey: 'createdBy' });

Assessment.hasMany(AssessmentQuestion, { foreignKey: 'assessmentId', onDelete: 'CASCADE' });
AssessmentQuestion.belongsTo(Assessment, { foreignKey: 'assessmentId' });

Assessment.hasMany(AssessmentAssignment, { foreignKey: 'assessmentId', onDelete: 'CASCADE' });
AssessmentAssignment.belongsTo(Assessment, { foreignKey: 'assessmentId' });

AssessmentAssignment.belongsTo(StudentSession, { foreignKey: 'studentSessionId' });
StudentSession.hasMany(AssessmentAssignment, { foreignKey: 'studentSessionId' });

AssessmentAssignment.belongsTo(SessionCategory, { foreignKey: 'categoryId' });
SessionCategory.hasMany(AssessmentAssignment, { foreignKey: 'categoryId' });

Assessment.hasMany(AssessmentSubmission, { foreignKey: 'assessmentId', onDelete: 'CASCADE' });
AssessmentSubmission.belongsTo(Assessment, { foreignKey: 'assessmentId' });

AssessmentSubmission.belongsTo(StudentSession, { foreignKey: 'studentSessionId' });
StudentSession.hasMany(AssessmentSubmission, { foreignKey: 'studentSessionId' });

AssessmentSubmission.belongsTo(User, { foreignKey: 'gradedBy', as: 'GradedByUser' });
User.hasMany(AssessmentSubmission, { foreignKey: 'gradedBy' });

AssessmentSubmission.hasMany(AssessmentResponse, { foreignKey: 'submissionId', onDelete: 'CASCADE' });
AssessmentResponse.belongsTo(AssessmentSubmission, { foreignKey: 'submissionId' });

AssessmentResponse.belongsTo(AssessmentQuestion, { foreignKey: 'questionId' });
AssessmentQuestion.hasMany(AssessmentResponse, { foreignKey: 'questionId' });

// Rubric Models
const Rubric = sequelize.define('Rubric', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  assessmentId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  totalPoints: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'rubrics',
  timestamps: true,
  underscored: true,
});

const RubricCriteria = sequelize.define('RubricCriteria', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  rubricId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  questionId: {
    type: DataTypes.UUID,
    allowNull: true, // Can be null for general rubric criteria
  },
  criteriaName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  maxPoints: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
  },
  orderIndex: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'rubric_criteria',
  timestamps: true,
  underscored: true,
});

const RubricScore = sequelize.define('RubricScore', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  submissionId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  rubricCriteriaId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
  },
  feedback: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'rubric_scores',
  timestamps: true,
  underscored: true,
});

// Rubric Associations
Assessment.hasMany(Rubric, { foreignKey: 'assessmentId', onDelete: 'CASCADE' });
Rubric.belongsTo(Assessment, { foreignKey: 'assessmentId' });

Rubric.belongsTo(User, { foreignKey: 'createdBy', as: 'Creator' });
User.hasMany(Rubric, { foreignKey: 'createdBy' });

Rubric.hasMany(RubricCriteria, { foreignKey: 'rubricId', onDelete: 'CASCADE' });
RubricCriteria.belongsTo(Rubric, { foreignKey: 'rubricId' });

RubricCriteria.belongsTo(AssessmentQuestion, { foreignKey: 'questionId', as: 'Question' });
AssessmentQuestion.hasMany(RubricCriteria, { foreignKey: 'questionId' });

AssessmentSubmission.hasMany(RubricScore, { foreignKey: 'submissionId', onDelete: 'CASCADE' });
RubricScore.belongsTo(AssessmentSubmission, { foreignKey: 'submissionId' });

RubricScore.belongsTo(RubricCriteria, { foreignKey: 'rubricCriteriaId' });
RubricCriteria.hasMany(RubricScore, { foreignKey: 'rubricCriteriaId', onDelete: 'CASCADE' });

// ============ MENTOR-MENTEE MODELS ============

const MentorTeam = sequelize.define('MentorTeam', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  sessionId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  facultyId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  teamName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED'),
    defaultValue: 'ACTIVE',
  },
}, {
  tableName: 'mentor_teams',
  timestamps: true,
  underscored: true,
});

const MentorTeamMember = sequelize.define('MentorTeamMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  mentorTeamId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  studentSessionId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'mentor_team_members',
  timestamps: true,
  underscored: true,
});

const MentorRequirement = sequelize.define('MentorRequirement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  mentorTeamId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  dueDate: {
    type: DataTypes.DATE,
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'CLOSED', 'ARCHIVED'),
    defaultValue: 'ACTIVE',
  },
}, {
  tableName: 'mentor_requirements',
  timestamps: true,
  underscored: true,
});

const MentorResponse = sequelize.define('MentorResponse', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  requirementId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  studentSessionId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  responseText: {
    type: DataTypes.TEXT,
  },
  fileUrl: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.ENUM('SUBMITTED', 'REVIEWED'),
    defaultValue: 'SUBMITTED',
  },
  feedback: {
    type: DataTypes.TEXT,
  },
  submittedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'mentor_responses',
  timestamps: true,
  underscored: true,
});

// ============ MENTOR-MENTEE ASSOCIATIONS ============

// MentorTeam associations
MentorTeam.belongsTo(AcademicSession, { foreignKey: 'sessionId' });
AcademicSession.hasMany(MentorTeam, { foreignKey: 'sessionId', onDelete: 'CASCADE' });

MentorTeam.belongsTo(User, { foreignKey: 'facultyId', as: 'Faculty' });
User.hasMany(MentorTeam, { foreignKey: 'facultyId' });

MentorTeam.hasMany(MentorTeamMember, { foreignKey: 'mentorTeamId', onDelete: 'CASCADE' });
MentorTeamMember.belongsTo(MentorTeam, { foreignKey: 'mentorTeamId' });

// MentorTeamMember associations
MentorTeamMember.belongsTo(StudentSession, { foreignKey: 'studentSessionId' });
StudentSession.hasMany(MentorTeamMember, { foreignKey: 'studentSessionId', onDelete: 'CASCADE' });

// MentorRequirement associations
MentorRequirement.belongsTo(MentorTeam, { foreignKey: 'mentorTeamId', onDelete: 'CASCADE' });
MentorTeam.hasMany(MentorRequirement, { foreignKey: 'mentorTeamId', onDelete: 'CASCADE' });

MentorRequirement.belongsTo(User, { foreignKey: 'createdBy', as: 'CreatedBy' });
User.hasMany(MentorRequirement, { foreignKey: 'createdBy' });

// MentorResponse associations
MentorResponse.belongsTo(MentorRequirement, { foreignKey: 'requirementId', onDelete: 'CASCADE' });
MentorRequirement.hasMany(MentorResponse, { foreignKey: 'requirementId', onDelete: 'CASCADE' });

MentorResponse.belongsTo(StudentSession, { foreignKey: 'studentSessionId' });
StudentSession.hasMany(MentorResponse, { foreignKey: 'studentSessionId' });

// ============ ANNOUNCEMENT MODEL ============

const Announcement = sequelize.define('Announcement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('PUBLIC', 'PRIVATE'),
    defaultValue: 'PUBLIC',
    allowNull: false,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fileType: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  imageOrientation: {
    type: DataTypes.ENUM('SQUARE', 'LANDSCAPE', 'PORTRAIT'),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'ARCHIVED'),
    defaultValue: 'ACTIVE',
    allowNull: false,
  },
}, {
  tableName: 'announcements',
  timestamps: true,
  underscored: true,
});

// ============ ANNOUNCEMENT ASSOCIATIONS ============

Announcement.belongsTo(User, { foreignKey: 'createdBy', as: 'Creator' });
User.hasMany(Announcement, { foreignKey: 'createdBy' });

// Messaging Models


module.exports = {
  User,
  Role,
  AcademicSession,
  StudentSession,
  UserRole,
  StudentProfile,
  SessionCategory,
  StudentSessionCategory,
  Assessment,
  AssessmentQuestion,
  AssessmentAssignment,
  AssessmentSubmission,
  AssessmentResponse,
  Rubric,
  RubricCriteria,
  RubricScore,
  MentorTeam,
  MentorTeamMember,
  MentorRequirement,
  MentorResponse,
  Announcement,
};
