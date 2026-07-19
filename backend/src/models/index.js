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
      'MENTOR',
      'CHAIR_HEAD'
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
      'MENTOR',
      'CHAIR_HEAD'
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
  sipEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
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

AssessmentResponse.belongsTo(AssessmentQuestion, { foreignKey: 'questionId', onDelete: 'CASCADE' });
AssessmentQuestion.hasMany(AssessmentResponse, { foreignKey: 'questionId', onDelete: 'CASCADE' });

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
  // Set on create — lets us scope monitoring to "teams this CHAIR_HEAD
  // created" while leaving admin/HOD able to see everything. Nullable
  // because rows that existed before this column was added won't have a
  // value; CHAIR_HEAD just won't see those legacy rows.
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
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

// ============ SIP (INTERNSHIP) MODELS ============

const SIP = sequelize.define('SIP', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  studentSessionId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  enrollmentNo: {
    type: DataTypes.STRING,
  },
  studentName: {
    type: DataTypes.STRING,
  },
  specialization: {
    type: DataTypes.STRING,
  },
  gender: {
    type: DataTypes.ENUM('MALE', 'FEMALE', 'OTHER'),
  },
  email: {
    type: DataTypes.STRING,
  },
  phoneNo: {
    type: DataTypes.STRING,
  },
  homeTownLocation: {
    type: DataTypes.STRING,
  },
  companyName: {
    type: DataTypes.STRING,
  },
  jobRole: {
    type: DataTypes.STRING,
  },
  sipLocation: {
    type: DataTypes.STRING,
  },
  stipend: {
    type: DataTypes.DECIMAL(10, 2),
  },
  type: {
    type: DataTypes.ENUM('ON_CAMPUS', 'OFF_CAMPUS'),
  },
  corporateType: {
    type: DataTypes.ENUM('CORPORATE', 'FAMILY_BUSINESS', 'ENTREPRENEURSHIP', 'SOCIAL_INTERNSHIP', 'GOVT_PROJECTS'),
  },
  joinDate: {
    type: DataTypes.DATE,
  },
  nocDate: {
    type: DataTypes.DATE,
  },
  completionDate: {
    type: DataTypes.DATE,
  },
  durationWeeks: {
    type: DataTypes.INTEGER,
  },
  supervisorName: {
    type: DataTypes.STRING,
  },
  supervisorPhone: {
    type: DataTypes.STRING,
  },
  supervisorEmail: {
    type: DataTypes.STRING,
  },
  hrHeadName: {
    type: DataTypes.STRING,
  },
  hrPhone: {
    type: DataTypes.STRING,
  },
  hrEmail: {
    type: DataTypes.STRING,
  },
  officeAddress: {
    type: DataTypes.TEXT,
  },
  projectTitle: {
    type: DataTypes.STRING,
  },
  facultyMentorName: {
    type: DataTypes.STRING,
  },
  sipEndDate: {
    type: DataTypes.DATE,
  },
  certificateIssued: {
    type: DataTypes.STRING,
  },
  facultyFeedback: {
    type: DataTypes.STRING,
  },
  supervisorFeedback: {
    type: DataTypes.STRING,
  },
  facultyGrading: {
    type: DataTypes.DECIMAL(5, 2),
  },
  supervisorGrading: {
    type: DataTypes.DECIMAL(5, 2),
  },
  extensionWeeks: {
    type: DataTypes.INTEGER,
  },
  ppOffered: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  ppoCompensation: {
    type: DataTypes.DECIMAL(10, 2),
  },
  ppoPosition: {
    type: DataTypes.STRING,
  },
  ppoLocation: {
    type: DataTypes.STRING,
  },
  nocIssueDateExtension: {
    type: DataTypes.DATE,
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'COMPLETED'),
    defaultValue: 'PENDING',
  },
}, {
  tableName: 'sips',
  timestamps: true,
  underscored: true,
});

const SIPWeeklyUpdate = sequelize.define('SIPWeeklyUpdate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  sipId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  weekStartDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  weekEndDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  statusText: {
    type: DataTypes.TEXT,
  },
  submitted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  submittedAt: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'sip_weekly_updates',
  timestamps: true,
  underscored: true,
});

const SIPRequirement = sequelize.define('SIPRequirement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  sessionId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  companyName: {
    type: DataTypes.STRING,
  },
  jobRole: {
    type: DataTypes.STRING,
  },
  location: {
    type: DataTypes.STRING,
  },
  stipend: {
    type: DataTypes.DECIMAL(10, 2),
  },
  requirements: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('ON_CAMPUS', 'OFF_CAMPUS', 'CORPORATE', 'FAMILY_BUSINESS', 'ENTREPRENEURSHIP', 'SOCIAL_INTERNSHIP', 'GOVT_PROJECTS'),
  },
}, {
  tableName: 'sip_requirements',
  timestamps: true,
  underscored: true,
});

const SIPQuestion = sequelize.define('SIPQuestion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  sessionId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  question: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'sip_questions',
  timestamps: true,
  underscored: true,
});

const SIPQuestionAnswer = sequelize.define('SIPQuestionAnswer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  questionId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  sipId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  answerText: {
    type: DataTypes.TEXT,
  },
  answerDocument: {
    type: DataTypes.STRING,
  },
  submittedAt: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'sip_question_answers',
  timestamps: true,
  underscored: true,
});

// ============ SIP ASSOCIATIONS ============

SIP.belongsTo(StudentSession, { foreignKey: 'studentSessionId', onDelete: 'CASCADE' });
StudentSession.hasMany(SIP, { foreignKey: 'studentSessionId', onDelete: 'CASCADE' });

SIP.belongsTo(User, { foreignKey: 'createdBy', as: 'Student' });
User.hasMany(SIP, { foreignKey: 'createdBy' });

SIPWeeklyUpdate.belongsTo(SIP, { foreignKey: 'sipId', onDelete: 'CASCADE' });
SIP.hasMany(SIPWeeklyUpdate, { foreignKey: 'sipId', onDelete: 'CASCADE' });

SIPRequirement.belongsTo(AcademicSession, { foreignKey: 'sessionId', onDelete: 'CASCADE' });
AcademicSession.hasMany(SIPRequirement, { foreignKey: 'sessionId', onDelete: 'CASCADE' });

SIPRequirement.belongsTo(User, { foreignKey: 'createdBy', as: 'Creator' });
User.hasMany(SIPRequirement, { foreignKey: 'createdBy' });

SIPQuestion.belongsTo(AcademicSession, { foreignKey: 'sessionId', onDelete: 'CASCADE' });
AcademicSession.hasMany(SIPQuestion, { foreignKey: 'sessionId', onDelete: 'CASCADE' });

SIPQuestion.belongsTo(User, { foreignKey: 'createdBy', as: 'Creator' });
User.hasMany(SIPQuestion, { foreignKey: 'createdBy' });

SIPQuestionAnswer.belongsTo(SIPQuestion, { foreignKey: 'questionId', onDelete: 'CASCADE' });
SIPQuestion.hasMany(SIPQuestionAnswer, { foreignKey: 'questionId', onDelete: 'CASCADE' });

SIPQuestionAnswer.belongsTo(SIP, { foreignKey: 'sipId', onDelete: 'CASCADE' });
SIP.hasMany(SIPQuestionAnswer, { foreignKey: 'sipId', onDelete: 'CASCADE' });

// ============ SHARE LINK MODEL ============
// One row per admin-created public profile share. The token is the
// URL-safe identifier used in /share/profile/<token>. Multiple links can
// exist for the same student (e.g. one per recruiter), each with its own
// `sections` filter so the admin controls what the public page shows.

const ShareLink = sequelize.define('ShareLink', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  token: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  label: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // JSON array of section keys to expose. null = all sections.
  sections: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
    get() {
      const raw = this.getDataValue('sections');
      if (raw == null) return null;
      if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch { return null; }
      }
      return Array.isArray(raw) ? raw : null;
    },
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'REVOKED'),
    defaultValue: 'ACTIVE',
    allowNull: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'share_links',
  timestamps: true,
  underscored: true,
});

// Associations
ShareLink.belongsTo(User, { foreignKey: 'userId', as: 'Student' });
User.hasMany(ShareLink, { foreignKey: 'userId', as: 'ProfileShareLinks' });
ShareLink.belongsTo(User, { foreignKey: 'createdBy', as: 'Creator' });

// ============ FACULTY TASK MODELS ============
// Admin assigns a task to a faculty (or HOD / mentor / coordinator / trainer).
// The assignee can mark it done and optionally attach a supporting document.
// Admins can also write private notes about a faculty (faculty_notes).

const FacultyTask = sequelize.define('FacultyTask', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  assigneeId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  assignedBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  deadline: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'COMPLETED'),
    defaultValue: 'PENDING',
    allowNull: false,
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  documentUrl: {
    type: DataTypes.STRING(1024),
    allowNull: true,
  },
  documentName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  documentMime: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  priority: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
    defaultValue: 'MEDIUM',
    allowNull: false,
  },
  adminRemark: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  remarkedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  remarkedBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  // Assigner-side sign-off on a completed task. Positive contributions
  // to the accuracy score (on-time +5, ≤1d-late +1) only apply once
  // approvedAt is set; negative time-based deltas apply regardless.
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  // groupTaskId links sibling rows that came from the same admin action.
  // For INDIVIDUAL/COPY mode: NULL (rows independent).
  // For SHARED mode: same UUID across all siblings, AND sharedCompletion=true.
  groupTaskId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  sharedCompletion: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  // Set true on completion when completedAt > deadline. Lets the UI flag
  // "submitted late" without a re-compute on every render.
  submittedLate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  // Deadline-extension request flow (one pending request at a time).
  // When extensionStatus is 'PENDING' the admin sees the request banner;
  // 'APPROVED' moves task.deadline -> extensionRequestedDeadline and clears
  // back to NULL so a new request can be made later; 'REJECTED' keeps the
  // record around for one display cycle then can also clear back.
  extensionStatus: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
    allowNull: true,
  },
  extensionRequestedDeadline: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  extensionRequestReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  extensionRequestedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  extensionRespondedBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  extensionRespondedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  extensionResponseReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'faculty_tasks',
  timestamps: true,
  underscored: true,
});

FacultyTask.belongsTo(User, { foreignKey: 'assigneeId', as: 'Assignee' });
User.hasMany(FacultyTask, { foreignKey: 'assigneeId', as: 'AssignedTasks' });
FacultyTask.belongsTo(User, { foreignKey: 'assignedBy', as: 'Assigner' });
FacultyTask.belongsTo(User, { foreignKey: 'remarkedBy', as: 'Remarker' });
FacultyTask.belongsTo(User, { foreignKey: 'approvedBy', as: 'Approver' });

// ============ FACULTY GROUP MODELS ============
// An admin-curated bundle of users that can be assigned tasks together.
// When a task is assigned to a group in SHARED mode, each member gets a
// faculty_tasks row linked by group_task_id; completing one cascades to
// all siblings.

const FacultyGroup = sequelize.define('FacultyGroup', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'faculty_groups',
  timestamps: true,
  underscored: true,
});

const FacultyGroupMember = sequelize.define('FacultyGroupMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  groupId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'faculty_group_members',
  timestamps: true,
  underscored: true,
  indexes: [
    { unique: true, fields: ['group_id', 'user_id'] },
  ],
});

FacultyGroup.belongsTo(User, { foreignKey: 'createdBy', as: 'Creator' });
FacultyGroup.hasMany(FacultyGroupMember, { foreignKey: 'groupId', as: 'Members', onDelete: 'CASCADE' });
FacultyGroupMember.belongsTo(FacultyGroup, { foreignKey: 'groupId', as: 'Group' });
FacultyGroupMember.belongsTo(User, { foreignKey: 'userId', as: 'User' });

// Per-task discussion thread / trail. Both the assignee and admin may
// append updates; only the author (or admin) can delete their own.
const FacultyTaskUpdate = sequelize.define('FacultyTaskUpdate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  taskId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  // System updates (extension approved/rejected, status changes) get
  // kind='SYSTEM' so the UI can render them with a different style.
  kind: {
    type: DataTypes.ENUM('USER', 'SYSTEM'),
    defaultValue: 'USER',
    allowNull: false,
  },
}, {
  tableName: 'faculty_task_updates',
  timestamps: true,
  underscored: true,
  indexes: [{ fields: ['task_id', 'created_at'] }],
});

FacultyTaskUpdate.belongsTo(FacultyTask, { foreignKey: 'taskId', as: 'Task' });
FacultyTask.hasMany(FacultyTaskUpdate, { foreignKey: 'taskId', as: 'Updates', onDelete: 'CASCADE' });
FacultyTaskUpdate.belongsTo(User, { foreignKey: 'userId', as: 'Author' });
FacultyTask.belongsTo(User, { foreignKey: 'extensionRespondedBy', as: 'ExtensionResponder' });

// ============ EVENT MODEL ============
// Faculty (any assignable role) creates events; everyone authenticated can
// view; admin can reschedule/delete any; creator + admin can see the
// post-event report.
const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  venue: { type: DataTypes.STRING, allowNull: true },
  startAt: { type: DataTypes.DATE, allowNull: false },
  endAt: { type: DataTypes.DATE, allowNull: true },
  imageUrl: { type: DataTypes.STRING(1024), allowNull: true },
  videoUrl: { type: DataTypes.STRING(1024), allowNull: true },
  // Single user-supplied URL — either an external registration link or a
  // Google Forms / Microsoft Forms URL. The UI labels it generically.
  registrationUrl: { type: DataTypes.STRING(1024), allowNull: true },
  // Post-event report (uploaded after the fact by the creator). Visible
  // ONLY to the creator and admin.
  postReportUrl: { type: DataTypes.STRING(1024), allowNull: true },
  postReportName: { type: DataTypes.STRING, allowNull: true },
  postReportMime: { type: DataTypes.STRING, allowNull: true },
  postReportUploadedAt: { type: DataTypes.DATE, allowNull: true },
  status: {
    type: DataTypes.ENUM('SCHEDULED', 'CANCELLED'),
    defaultValue: 'SCHEDULED',
    allowNull: false,
  },
  createdBy: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'events',
  timestamps: true,
  underscored: true,
  indexes: [{ fields: ['start_at'] }],
});

Event.belongsTo(User, { foreignKey: 'createdBy', as: 'Creator' });
User.hasMany(Event, { foreignKey: 'createdBy', as: 'CreatedEvents' });

// Admin-set blocked dates. Stored as a DATEONLY ('YYYY-MM-DD'). Event
// create / update rejects start_at that falls on any blocked date.
const BlockedDate = sequelize.define('BlockedDate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  date: { type: DataTypes.DATEONLY, allowNull: false, unique: true },
  reason: { type: DataTypes.STRING(500), allowNull: true },
  createdBy: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'blocked_dates',
  timestamps: true,
  underscored: true,
});
BlockedDate.belongsTo(User, { foreignKey: 'createdBy', as: 'Creator' });

const FacultyNote = sequelize.define('FacultyNote', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  facultyId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'faculty_notes',
  timestamps: true,
  underscored: true,
});

FacultyNote.belongsTo(User, { foreignKey: 'facultyId', as: 'Faculty' });
FacultyNote.belongsTo(User, { foreignKey: 'createdBy', as: 'Creator' });

// Landing page CMS — single-row key/value store. ADMIN/HOD edit the JSON
// payload that the public landing page reads on mount.
const LandingContent = sequelize.define('LandingContent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  contentKey: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
  },
  payload: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'landing_content',
  timestamps: true,
  underscored: true,
});

// ============ Classes / Sections =========================================
// A class/section lives inside an academic session. One coordinator
// (faculty/chair-head/placement coordinator/coordinator), up to 4 CRs
// (students), and one attendance row per class per date.

const Class = sequelize.define('Class', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  sessionId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  coordinatorId: { type: DataTypes.UUID, allowNull: false },
  createdBy: { type: DataTypes.UUID, allowNull: true },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'ARCHIVED'),
    defaultValue: 'ACTIVE',
    allowNull: false,
  },
}, {
  tableName: 'classes',
  timestamps: true,
  underscored: true,
  indexes: [{ unique: true, fields: ['session_id', 'name'] }],
});

const ClassRepresentative = sequelize.define('ClassRepresentative', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  classId: { type: DataTypes.UUID, allowNull: false },
  studentId: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'class_representatives',
  timestamps: true,
  underscored: true,
  indexes: [{ unique: true, fields: ['class_id', 'student_id'] }],
});

const ClassAttendance = sequelize.define('ClassAttendance', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  classId: { type: DataTypes.UUID, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  presentCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  bunkedCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  leaveCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  submittedBy: { type: DataTypes.UUID, allowNull: false },
  submittedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  // Coordinator-only field. Response strips this out for non-admin/HOD
  // viewers (per product spec).
  actionTakenReport: { type: DataTypes.TEXT, allowNull: true },
  atrAt: { type: DataTypes.DATE, allowNull: true },
  atrBy: { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'class_attendance',
  timestamps: true,
  underscored: true,
  indexes: [{ unique: true, fields: ['class_id', 'date'] }],
});

Class.belongsTo(AcademicSession, { foreignKey: 'sessionId', as: 'Session' });
AcademicSession.hasMany(Class, { foreignKey: 'sessionId', onDelete: 'CASCADE' });
Class.belongsTo(User, { foreignKey: 'coordinatorId', as: 'Coordinator' });
User.hasMany(Class, { foreignKey: 'coordinatorId', as: 'CoordinatedClasses' });

Class.hasMany(ClassRepresentative, { foreignKey: 'classId', as: 'Representatives', onDelete: 'CASCADE' });
ClassRepresentative.belongsTo(Class, { foreignKey: 'classId' });
ClassRepresentative.belongsTo(User, { foreignKey: 'studentId', as: 'Student' });
User.hasMany(ClassRepresentative, { foreignKey: 'studentId', as: 'CRAssignments' });

Class.hasMany(ClassAttendance, { foreignKey: 'classId', as: 'Attendance', onDelete: 'CASCADE' });
ClassAttendance.belongsTo(Class, { foreignKey: 'classId' });
ClassAttendance.belongsTo(User, { foreignKey: 'submittedBy', as: 'Submitter' });
ClassAttendance.belongsTo(User, { foreignKey: 'atrBy', as: 'ATRAuthor' });

// Faculty weekly schedule (Mon–Sat, 8:00–18:00). Non-student roles place
// work-blocks on a 15-min grid. startMinutes/endMinutes are minutes since
// midnight; dayOfWeek 1..6 = Mon..Sat.
const WorkBlock = sequelize.define('WorkBlock', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  dayOfWeek: { type: DataTypes.INTEGER, allowNull: false },
  startMinutes: { type: DataTypes.INTEGER, allowNull: false },
  endMinutes: { type: DataTypes.INTEGER, allowNull: false },
  blockType: {
    type: DataTypes.ENUM('ACADEMIC', 'ADMINISTRATIVE', 'RESEARCH', 'MENTOR_MENTEE', 'LUNCH', 'CUSTOM'),
    allowNull: false,
  },
  title: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
  details: { type: DataTypes.TEXT, allowNull: true },
  customLabel: { type: DataTypes.STRING(120), allowNull: true },
}, {
  tableName: 'work_blocks',
  timestamps: true,
  underscored: true,
  indexes: [{ fields: ['user_id', 'day_of_week'] }],
});

WorkBlock.belongsTo(User, { foreignKey: 'userId', as: 'Owner' });
User.hasMany(WorkBlock, { foreignKey: 'userId', as: 'WorkBlocks', onDelete: 'CASCADE' });

// Extra achievements shown next to the weekly schedule. Free-form
// title/description; optional category + achievedOn date.
const FacultyAchievement = sequelize.define('FacultyAchievement', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING(255), allowNull: false },
  category: { type: DataTypes.STRING(120), allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  achievedOn: { type: DataTypes.DATEONLY, allowNull: true },
}, {
  tableName: 'faculty_achievements',
  timestamps: true,
  underscored: true,
  indexes: [{ fields: ['user_id'] }],
});

FacultyAchievement.belongsTo(User, { foreignKey: 'userId', as: 'Owner' });
User.hasMany(FacultyAchievement, { foreignKey: 'userId', as: 'Achievements', onDelete: 'CASCADE' });

// Mentor <-> mentee feedback thread. Each row is one chat message.
// The "thread" is defined implicitly by the (mentorUserId, studentUserId)
// pair — since a student can have multiple mentors, feedback stays
// scoped to a single mentor-mentee relationship.
const MentorFeedbackMessage = sequelize.define('MentorFeedbackMessage', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  mentorUserId: { type: DataTypes.UUID, allowNull: false },
  studentUserId: { type: DataTypes.UUID, allowNull: false },
  authorUserId: { type: DataTypes.UUID, allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
}, {
  tableName: 'mentor_feedback_messages',
  timestamps: true,
  underscored: true,
  indexes: [
    { name: 'mfm_pair_created', fields: ['mentor_user_id', 'student_user_id', 'created_at'] },
    { name: 'mfm_student', fields: ['student_user_id'] },
  ],
});

MentorFeedbackMessage.belongsTo(User, { foreignKey: 'mentorUserId', as: 'Mentor' });
MentorFeedbackMessage.belongsTo(User, { foreignKey: 'studentUserId', as: 'Student' });
MentorFeedbackMessage.belongsTo(User, { foreignKey: 'authorUserId', as: 'Author' });

// Messaging Models


module.exports = {
  sequelize,
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
  SIP,
  SIPWeeklyUpdate,
  SIPRequirement,
  SIPQuestion,
  SIPQuestionAnswer,
  ShareLink,
  FacultyTask,
  FacultyNote,
  FacultyGroup,
  FacultyGroupMember,
  FacultyTaskUpdate,
  Event,
  BlockedDate,
  LandingContent,
  Class,
  ClassRepresentative,
  ClassAttendance,
  WorkBlock,
  FacultyAchievement,
  MentorFeedbackMessage,
};
