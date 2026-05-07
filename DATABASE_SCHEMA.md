# Database Schema Documentation

## Overview
The DOMS database uses MySQL with Sequelize ORM. All tables have automatic `createdAt` and `updatedAt` timestamps.

## Tables

### 1. Users Table
Stores all user information and authentication data.

```sql
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  firstName VARCHAR(255) NOT NULL,
  lastName VARCHAR(255) NOT NULL,
  phoneNumber VARCHAR(20),
  profileImage VARCHAR(255),
  department VARCHAR(255),
  employeeId VARCHAR(255) UNIQUE,
  registrationNumber VARCHAR(255) UNIQUE,
  status ENUM('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'INACTIVE') DEFAULT 'PENDING',
  requestedRole ENUM('ADMIN', 'HOD', 'FACULTY', 'COORDINATOR', 'PLACEMENT_COORDINATOR', 'TRAINER', 'STUDENT', 'MENTOR') NOT NULL,
  approvedRole ENUM('ADMIN', 'HOD', 'FACULTY', 'COORDINATOR', 'PLACEMENT_COORDINATOR', 'TRAINER', 'STUDENT', 'MENTOR'),
  lastLogin DATETIME,
  lastPasswordChange DATETIME,
  isVerified BOOLEAN DEFAULT FALSE,
  verificationToken VARCHAR(255),
  resetPasswordToken VARCHAR(255),
  resetPasswordExpires DATETIME,
  metadata JSON,
  createdAt DATETIME,
  updatedAt DATETIME
);

-- Indexes
CREATE INDEX idx_email ON users(email);
CREATE INDEX idx_status ON users(status);
CREATE INDEX idx_approvedRole ON users(approvedRole);
```

**Field Descriptions:**
- `id`: UUID primary key
- `email`: Unique email address
- `password`: Hashed password (bcryptjs)
- `firstName`, `lastName`: User's name
- `phoneNumber`: Contact number
- `profileImage`: URL to S3 profile photo
- `department`: Department/faculty name
- `employeeId`: For non-student users
- `registrationNumber`: For student users
- `status`: Account status (PENDING = awaiting admin approval)
- `requestedRole`: Role user requested during signup
- `approvedRole`: Role assigned by admin
- `lastLogin`: Timestamp of last login
- `isVerified`: Email verification status
- `metadata`: JSON object for flexible data storage

### 2. Roles Table
Defines available user roles and their permissions.

```sql
CREATE TABLE roles (
  id CHAR(36) PRIMARY KEY,
  name ENUM('ADMIN', 'HOD', 'FACULTY', 'COORDINATOR', 'PLACEMENT_COORDINATOR', 'TRAINER', 'STUDENT', 'MENTOR') UNIQUE NOT NULL,
  description TEXT,
  permissions JSON,
  createdAt DATETIME,
  updatedAt DATETIME
);
```

**Role Options:**
- `ADMIN`: System administrator (full access)
- `HOD`: Head of Department (department-level access)
- `FACULTY`: Faculty member (class management)
- `COORDINATOR`: Academic coordinator
- `PLACEMENT_COORDINATOR`: Placement coordination
- `TRAINER`: Training staff
- `STUDENT`: Student account
- `MENTOR`: Mentoring staff

### 3. UserRoles Table (Junction)
Links users to roles (many-to-many relationship).

```sql
CREATE TABLE user_roles (
  id CHAR(36) PRIMARY KEY,
  userId CHAR(36) NOT NULL,
  roleId CHAR(36) NOT NULL,
  createdAt DATETIME,
  updatedAt DATETIME,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_role (userId, roleId)
);

-- Indexes
CREATE INDEX idx_userId ON user_roles(userId);
CREATE INDEX idx_roleId ON user_roles(roleId);
```

**Purpose:** Allows users to have multiple roles (e.g., faculty member who is also a mentor).

### 4. AcademicSessions Table
Manages academic sessions (semesters, years, etc.).

```sql
CREATE TABLE academic_sessions (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  startDate DATETIME NOT NULL,
  endDate DATETIME NOT NULL,
  isActive BOOLEAN DEFAULT FALSE,
  description TEXT,
  createdAt DATETIME,
  updatedAt DATETIME
);

-- Indexes
CREATE INDEX idx_startDate ON academic_sessions(startDate);
CREATE INDEX idx_endDate ON academic_sessions(endDate);
CREATE INDEX idx_isActive ON academic_sessions(isActive);
```

**Field Descriptions:**
- `id`: UUID primary key
- `name`: Session name (e.g., "2024-2025 Fall Semester")
- `startDate`: Session start date
- `endDate`: Session end date
- `isActive`: Currently active session (only one should be active)
- `description`: Additional details

**Note:** Only one session should have `isActive = TRUE` at any time.

### 5. StudentSessions Table
Links students to academic sessions (enrollment).

```sql
CREATE TABLE student_sessions (
  id CHAR(36) PRIMARY KEY,
  userId CHAR(36) NOT NULL,
  academicSessionId CHAR(36) NOT NULL,
  status ENUM('ONBOARDED', 'DROPPED', 'COMPLETED') DEFAULT 'ONBOARDED',
  enrollmentDate DATETIME DEFAULT CURRENT_TIMESTAMP,
  onboardedBy CHAR(36) NOT NULL,
  createdAt DATETIME,
  updatedAt DATETIME,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (academicSessionId) REFERENCES academic_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (onboardedBy) REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_userId ON student_sessions(userId);
CREATE INDEX idx_academicSessionId ON student_sessions(academicSessionId);
CREATE INDEX idx_status ON student_sessions(status);
CREATE UNIQUE INDEX unique_student_session ON student_sessions(userId, academicSessionId);
```

**Field Descriptions:**
- `userId`: Reference to student user
- `academicSessionId`: Reference to academic session
- `status`: Enrollment status
  - `ONBOARDED`: Student enrolled in session
  - `DROPPED`: Student dropped from session
  - `COMPLETED`: Session completed
- `enrollmentDate`: When student was enrolled
- `onboardedBy`: Admin who onboarded the student

**Usage:** When a student is onboarded to a session by admin, a record is created in this table.

## Relationships

```
User ──┬──→ Role (Many-to-Many via UserRole)
       ├──→ StudentSession (Student enrolled in sessions)
       └──→ StudentSession (As onboardedBy - admin who onboarded)

Role ──→ UserRole (One-to-Many)

AcademicSession ──→ StudentSession (One-to-Many)

UserRole ──→ User (Many-to-One)
UserRole ──→ Role (Many-to-One)
```

## Data Types

- `CHAR(36)`: UUID primary keys
- `VARCHAR(255)`: Standard text fields
- `TEXT`: Long text (description, metadata)
- `JSON`: Flexible data (permissions, metadata)
- `ENUM`: Fixed set of values (roles, statuses)
- `DATETIME`: Date and time
- `BOOLEAN`: True/False

## Indexing Strategy

**Indexed Columns:**
- Foreign keys (userId, roleId, academicSessionId)
- Frequently filtered fields (status, approvedRole, isActive)
- Unique fields (email, employeeId, registrationNumber)

**Why?** Faster queries for common operations like:
- Finding users by status
- Listing sessions by active status
- Getting student enrollments

## Common Queries

### Get user with their roles
```sql
SELECT u.*, r.name as role
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.userId
LEFT JOIN roles r ON ur.roleId = r.id
WHERE u.id = ?;
```

### Get all students in a session
```sql
SELECT u.*, ss.status, ss.enrollmentDate
FROM users u
JOIN student_sessions ss ON u.id = ss.userId
JOIN academic_sessions a ON ss.academicSessionId = a.id
WHERE a.id = ? AND u.approvedRole = 'STUDENT';
```

### Get pending user requests
```sql
SELECT * FROM users
WHERE status = 'PENDING'
ORDER BY createdAt DESC;
```

### Get active session
```sql
SELECT * FROM academic_sessions
WHERE isActive = TRUE;
```

## Constraints

1. **Unique Constraints:**
   - User email must be unique
   - Employee ID must be unique
   - Registration number must be unique
   - Only one active session at a time (enforced in application logic)
   - Each user can have only one relationship with a specific role

2. **Foreign Key Constraints:**
   - StudentSession must reference valid userId and academicSessionId
   - StudentSession.onboardedBy must reference valid admin userId
   - UserRole must reference valid userId and roleId

3. **Data Validation:**
   - Password must be hashed before storage
   - Email must be valid format
   - Status values are restricted by ENUM
   - Role names are restricted by ENUM

## Future Extensions

When building additional features, you might add:

```sql
-- Student Profiles (future)
CREATE TABLE student_profiles (
  id CHAR(36) PRIMARY KEY,
  userId CHAR(36) NOT NULL,
  bio TEXT,
  skills JSON,
  achievements JSON,
  resumeUrl VARCHAR(255),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Assessments (future)
CREATE TABLE assessments (
  id CHAR(36) PRIMARY KEY,
  sessionId CHAR(36) NOT NULL,
  createdBy CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  dueDate DATETIME,
  FOREIGN KEY (sessionId) REFERENCES academic_sessions(id),
  FOREIGN KEY (createdBy) REFERENCES users(id)
);

-- Messages (future)
CREATE TABLE messages (
  id CHAR(36) PRIMARY KEY,
  senderId CHAR(36) NOT NULL,
  recipientId CHAR(36) NOT NULL,
  content TEXT NOT NULL,
  isRead BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (senderId) REFERENCES users(id),
  FOREIGN KEY (recipientId) REFERENCES users(id)
);
```

## Migrations

Sequelize handles schema creation automatically with `sequelize.sync()`. To reset:

```javascript
// Reset (development only!)
await sequelize.drop();
await sequelize.sync();
```

## Backup & Maintenance

Regular backups:
```bash
mysqldump -u root -p doms > backup.sql
```

Restore:
```bash
mysql -u root -p doms < backup.sql
```

## Performance Notes

1. Indexes on frequently queried columns
2. Connection pooling for multiple concurrent requests
3. Use pagination for large result sets
4. Lazy load related data as needed
5. Archive old academic sessions for better performance

## Audit Trail

The `createdAt` and `updatedAt` timestamps provide basic audit trail:
- Identify when users were created/modified
- Track session creation dates
- Monitor enrollment changes

For comprehensive audit logging, consider adding an audit log table in future versions.
