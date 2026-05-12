const { AcademicSession, StudentSession, User, SessionCategory, StudentSessionCategory } = require('../models');

const sessionController = {
  // Create academic session (Admin only)
  createSession: async (req, res) => {
    const { name, startDate, endDate, description } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({
        message: 'name, startDate, and endDate are required',
      });
    }

    try {
      const session = await AcademicSession.create({
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        description,
        isActive: false,
      });

      res.status(201).json({
        message: 'Academic session created',
        session,
      });
    } catch (error) {
      console.error('Create session error:', error);
      res.status(500).json({ message: 'Failed to create session' });
    }
  },

  // Get all sessions
  getAllSessions: async (req, res) => {
    try {
      const { isActive, page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const offset = (pageNum - 1) * limitNum;

      let where = {};
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const { count, rows } = await AcademicSession.findAndCountAll({
        where,
        offset,
        limit: limitNum,
        order: [['startDate', 'DESC']],
        include: [
          {
            model: StudentSession,
            attributes: ['id'],
            required: false,
          },
        ],
        distinct: true,
      });

      console.log('Session rows:', rows.length);
      rows.forEach((session, index) => {
        console.log(`Session ${index + 1} (${session.name}): ${session.StudentSessions?.length || 0} students`);
      });

      // Transform rows to include _count
      const sessionsWithCount = rows.map(session => ({
        ...session.toJSON(),
        _count: {
          StudentSessions: session.StudentSessions?.length || 0,
        },
      }));

      res.json({
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
        sessions: sessionsWithCount,
      });
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({ message: 'Failed to fetch sessions' });
    }
  },

  // Get session by ID
  getSessionById: async (req, res) => {
    try {
      const session = await AcademicSession.findByPk(req.params.id, {
        include: {
          model: StudentSession,
          attributes: ['id', 'status', 'enrollmentDate', 'userId'],
        },
      });

      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      res.json(session);
    } catch (error) {
      console.error('Get session by ID error:', error);
      res.status(500).json({ message: 'Failed to fetch session' });
    }
  },

  // Update session (Admin only)
  updateSession: async (req, res) => {
    const { sessionId } = req.params;
    const { name, startDate, endDate, isActive, description, sipEnabled } = req.body;

    try {
      const session = await AcademicSession.findByPk(sessionId);

      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      const updateData = {
        name: name || session.name,
        startDate: startDate ? new Date(startDate) : session.startDate,
        endDate: endDate ? new Date(endDate) : session.endDate,
        isActive: isActive !== undefined ? isActive : session.isActive,
        description: description || session.description,
      };

      if (sipEnabled !== undefined) {
        updateData.sipEnabled = sipEnabled;
      }

      await session.update(updateData);

      res.json({
        message: 'Session updated',
        session,
      });
    } catch (error) {
      console.error('Update session error:', error);
      res.status(500).json({ message: 'Failed to update session' });
    }
  },

  // Activate session (Admin only)
  activateSession: async (req, res) => {
    const { sessionId } = req.params;

    try {
      const session = await AcademicSession.findByPk(sessionId);

      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      // Activate this session (multiple sessions can be active simultaneously for different batches)
      await session.update({ isActive: true });

      res.json({
        message: 'Session activated',
        session,
      });
    } catch (error) {
      console.error('Activate session error:', error);
      res.status(500).json({ message: 'Failed to activate session' });
    }
  },

  // Onboard student to session (Admin only)
  onboardStudent: async (req, res) => {
    const { sessionId } = req.params;
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ message: 'studentId is required' });
    }

    try {
      const session = await AcademicSession.findByPk(sessionId);

      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      const student = await User.findByPk(studentId);

      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      if (student.approvedRole !== 'STUDENT') {
        return res.status(400).json({
          message: 'User is not a student',
        });
      }

      // Check if already enrolled
      const existing = await StudentSession.findOne({
        where: { userId: studentId, academicSessionId: sessionId },
      });

      if (existing) {
        return res.status(409).json({
          message: 'Student already enrolled in this session',
        });
      }

      const studentSession = await StudentSession.create({
        userId: studentId,
        academicSessionId: sessionId,
        status: 'ONBOARDED',
        onboardedBy: req.user.id,
      });

      res.status(201).json({
        message: 'Student onboarded successfully',
        studentSession,
      });
    } catch (error) {
      console.error('Onboard student error:', error);
      res.status(500).json({ message: 'Failed to onboard student' });
    }
  },

  // Get session students
  getSessionStudents: async (req, res) => {
    const { sessionId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    try {
      const { count, rows } = await StudentSession.findAndCountAll({
        where: { academicSessionId: sessionId },
        offset,
        limit: parseInt(limit),
        include: [
          {
            model: User,
            as: 'Student',
            attributes: [
              'id',
              'email',
              'firstName',
              'lastName',
              'registrationNumber',
              'profileImage',
              'department',
            ],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      // Map rows to include Student relationship correctly
      const students = rows.map(row => {
        const student = row.Student ? (row.Student.toJSON ? row.Student.toJSON() : row.Student) : {};
        return {
          id: row.id,
          studentSessionId: row.id,
          status: row.status,
          enrollmentDate: row.enrollmentDate,
          Student: student,
        };
      });

      res.json({
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
        students,
      });
    } catch (error) {
      console.error('Get session students error:', error);
      res.status(500).json({ message: 'Failed to fetch students' });
    }
  },

  // Drop student from session
  dropStudent: async (req, res) => {
    const { studentSessionId } = req.params;

    try {
      const studentSession = await StudentSession.findByPk(studentSessionId);

      if (!studentSession) {
        return res.status(404).json({ message: 'Student session not found' });
      }

      await studentSession.update({ status: 'DROPPED' });

      res.json({
        message: 'Student dropped from session',
        studentSession,
      });
    } catch (error) {
      console.error('Drop student error:', error);
      res.status(500).json({ message: 'Failed to drop student' });
    }
  },

  // Upload students from Excel
  uploadStudents: async (req, res) => {
    const { sessionId } = req.params;

    console.log('Upload request received');
    console.log('File:', req.file);
    console.log('Session ID:', sessionId);

    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
      const XLSX = require('xlsx');
      
      console.log('XLSX imported successfully');
      
      const session = await AcademicSession.findByPk(sessionId);
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      // Parse Excel file
      console.log('Parsing Excel file, buffer size:', req.file.buffer.length);
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(worksheet);

      console.log('Raw rows parsed:', rawRows.length);

      // Filter out empty rows (rows where all fields are empty or undefined)
      const rows = rawRows.filter(row => {
        const hasData = Object.values(row).some(val => val && String(val).trim() !== '');
        return hasData;
      });

      console.log('Rows after filtering empty ones:', rows.length);

      if (!rows || rows.length === 0) {
        return res.status(400).json({ message: 'Excel file is empty' });
      }

      const results = {
        created: 0,
        onboarded: 0,
        failed: [],
      };

      // Process each row
      console.log(`Starting to process ${rows.length} rows`);
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const firstName = String(row['First Name'] || row['firstName'] || '').trim();
          const lastName = String(row['Last Name'] || row['lastName'] || '').trim();
          const email = String(row['Email'] || row['email'] || '').trim();
          const registrationNumber = String(row['Registration Number'] || row['registrationNumber'] || '').trim();

          console.log(`[Row ${i + 1}] Processing: firstName="${firstName}", email="${email}", lastName="${lastName}", regNum="${registrationNumber}"`);

          // Validate required fields
          if (!firstName || !email) {
            console.log(`[Row ${i + 1}] Validation failed: missing firstName or email`);
            results.failed.push({
              email: email || 'Unknown',
              reason: 'Missing required fields (First Name, Email)',
            });
            continue;
          }

          // Check if user exists
          let user = await User.findOne({ where: { email } });
          console.log(`[Row ${i + 1}] User lookup for ${email}: ${user ? 'Found (ID: ' + user.id + ')' : 'Not found'}`);

          if (!user) {
            // Create new user
            console.log(`[Row ${i + 1}] Creating new user with email: ${email}`);
            user = await User.create({
              email,
              password: '12345678',
              firstName,
              lastName: lastName || null,
              registrationNumber: registrationNumber || null,
              requestedRole: 'STUDENT',
              approvedRole: 'STUDENT',
              status: 'ACTIVE',
              isVerified: true,
            });
            console.log(`[Row ${i + 1}] User created successfully with ID: ${user.id}`);
            results.created++;
          } else {
            console.log(`[Row ${i + 1}] User already exists: ${user.id}`);
          }

          // Check if already enrolled
          const existing = await StudentSession.findOne({
            where: { userId: user.id, academicSessionId: sessionId },
          });
          console.log(`[Row ${i + 1}] StudentSession check: ${existing ? 'Already enrolled' : 'Not enrolled'}`);

          if (!existing) {
            // Onboard to session
            console.log(`[Row ${i + 1}] Creating StudentSession for user ${user.id}`);
            await StudentSession.create({
              userId: user.id,
              academicSessionId: sessionId,
              status: 'ONBOARDED',
              onboardedBy: req.user.id,
            });
            console.log(`[Row ${i + 1}] StudentSession created successfully`);
            results.onboarded++;
          }
        } catch (rowError) {
          let errorMessage = rowError.message;
          
          // Extract detailed error from Sequelize validation errors
          if (rowError.errors && Array.isArray(rowError.errors)) {
            errorMessage = rowError.errors.map(e => `${e.path}: ${e.message}`).join('; ');
          }
          
          console.error(`[Row ${i + 1}] Error:`, errorMessage);
          console.error(`[Row ${i + 1}] Full error:`, rowError);
          results.failed.push({
            email: row.email || row.Email || 'Unknown',
            reason: errorMessage,
          });
        }
      }

      console.log('Final results:', JSON.stringify(results, null, 2));

      res.json({
        message: 'Students uploaded successfully',
        results,
      });
    } catch (error) {
      console.error('Upload students error:', error);
      res.status(500).json({ message: 'Failed to upload students', error: error.message });
    }
  },

  // Create registration link
  createRegistrationLink: async (req, res) => {
    const { sessionId } = req.params;

    try {
      const session = await AcademicSession.findByPk(sessionId);

      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      // Generate unique token
      const token = require('crypto').randomBytes(32).toString('hex');

      await session.update({ registrationToken: token });

      res.json({
        message: 'Registration link created',
        token,
      });
    } catch (error) {
      console.error('Create registration link error:', error);
      res.status(500).json({ message: 'Failed to create registration link' });
    }
  },

  // Get registration link details
  getRegistrationLinkDetails: async (req, res) => {
    const { token } = req.params;

    try {
      const session = await AcademicSession.findOne({
        where: { registrationToken: token },
      });

      if (!session) {
        return res.status(404).json({ message: 'Invalid registration link' });
      }

      res.json(session);
    } catch (error) {
      console.error('Get registration link error:', error);
      res.status(500).json({ message: 'Failed to get registration link details' });
    }
  },

  // Register student via link
  registerStudent: async (req, res) => {
    const { token } = req.params;
    const { email, firstName, lastName, password, registrationNumber } = req.body;

    if (!email || !firstName || !lastName || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    try {
      const session = await AcademicSession.findOne({
        where: { registrationToken: token },
      });

      if (!session) {
        return res.status(404).json({ message: 'Invalid or expired registration link' });
      }

      // Check if email already exists
      let user = await User.findOne({ where: { email } });

      if (user) {
        // Check if already enrolled in this session
        const existing = await StudentSession.findOne({
          where: { userId: user.id, academicSessionId: session.id },
        });

        if (existing) {
          return res.status(409).json({
            message: 'You are already enrolled in this session',
          });
        }
      } else {
        // Create new user
        user = await User.create({
          email,
          password,
          firstName,
          lastName,
          registrationNumber: registrationNumber || null,
          requestedRole: 'STUDENT',
          approvedRole: 'STUDENT',
          status: 'PENDING',
          isVerified: false,
        });
      }

      // Create student session (status will be PENDING until admin approval)
      const studentSession = await StudentSession.create({
        userId: user.id,
        academicSessionId: session.id,
        status: 'PENDING',
      });

      res.status(201).json({
        message: 'Registration successful. Pending admin approval.',
        studentSession,
      });
    } catch (error) {
      console.error('Register student error:', error);
      console.error('Error message:', error.message);
      console.error('Error details:', error.errors || error.stack);
      res.status(500).json({ 
        message: 'Failed to register student',
        error: error.message,
        details: error.errors ? error.errors.map(e => e.message) : error.toString()
      });
    }
  },

  // Category Management Functions

  // Create a new category for a session
  createCategory: async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { name, description, color } = req.body;

      if (!name) {
        return res.status(400).json({ message: 'Category name is required' });
      }

      const session = await AcademicSession.findByPk(sessionId);
      if (!session) {
        return res.status(404).json({ message: 'Academic session not found' });
      }

      const category = await SessionCategory.create({
        academicSessionId: sessionId,
        name,
        description,
        color: color || '#3B82F6',
      });

      res.status(201).json({
        message: 'Category created successfully',
        category,
      });
    } catch (error) {
      console.error('Create category error:', error);
      res.status(500).json({ message: 'Failed to create category' });
    }
  },

  // Get all categories for a session
  getSessionCategories: async (req, res) => {
    try {
      const { sessionId } = req.params;

      const categories = await SessionCategory.findAll({
        where: { academicSessionId: sessionId },
        order: [['createdAt', 'ASC']],
      });

      // Count students per category
      const categoriesWithCounts = await Promise.all(
        categories.map(async (category) => {
          const studentCount = await StudentSessionCategory.count({
            where: { sessionCategoryId: category.id },
          });
          return {
            ...category.toJSON(),
            studentCount,
          };
        })
      );

      res.json({
        categories: categoriesWithCounts,
        total: categoriesWithCounts.length,
      });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({ message: 'Failed to fetch categories' });
    }
  },

  // Update a category
  updateCategory: async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { name, description, color } = req.body;

      const category = await SessionCategory.findByPk(categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      await category.update({
        name: name || category.name,
        description: description !== undefined ? description : category.description,
        color: color || category.color,
      });

      res.json({
        message: 'Category updated successfully',
        category,
      });
    } catch (error) {
      console.error('Update category error:', error);
      res.status(500).json({ message: 'Failed to update category' });
    }
  },

  // Delete a category
  deleteCategory: async (req, res) => {
    try {
      const { categoryId } = req.params;

      const category = await SessionCategory.findByPk(categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      await category.destroy();

      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      console.error('Delete category error:', error);
      res.status(500).json({ message: 'Failed to delete category' });
    }
  },

  // Assign student to category
  assignStudentToCategory: async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { studentSessionId } = req.body;
      const userId = req.user.id;

      if (!studentSessionId) {
        return res.status(400).json({ message: 'studentSessionId is required' });
      }

      const category = await SessionCategory.findByPk(categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      const studentSession = await StudentSession.findByPk(studentSessionId);
      if (!studentSession) {
        return res.status(404).json({ message: 'Student session not found' });
      }

      // Check if already assigned
      const existingAssignment = await StudentSessionCategory.findOne({
        where: { studentSessionId, sessionCategoryId: categoryId },
      });

      if (existingAssignment) {
        return res.status(400).json({ message: 'Student already assigned to this category' });
      }

      const assignment = await StudentSessionCategory.create({
        studentSessionId,
        sessionCategoryId: categoryId,
        assignedBy: userId,
      });

      res.status(201).json({
        message: 'Student assigned to category successfully',
        assignment,
      });
    } catch (error) {
      console.error('Assign student to category error:', error);
      res.status(500).json({ message: 'Failed to assign student to category' });
    }
  },

  // Remove student from category
  removeStudentFromCategory: async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { studentSessionId } = req.body;

      const assignment = await StudentSessionCategory.findOne({
        where: { studentSessionId, sessionCategoryId: categoryId },
      });

      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }

      await assignment.destroy();

      res.json({ message: 'Student removed from category successfully' });
    } catch (error) {
      console.error('Remove student from category error:', error);
      res.status(500).json({ message: 'Failed to remove student from category' });
    }
  },

  // Get students in a category
  getStudentsByCategory: async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const category = await SessionCategory.findByPk(categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      const { count, rows } = await StudentSessionCategory.findAndCountAll({
        where: { sessionCategoryId: categoryId },
        include: [
          {
            model: StudentSession,
            include: [
              {
                model: User,
                attributes: ['id', 'firstName', 'lastName', 'email', 'registrationNumber'],
                as: 'Student',
              },
            ],
          },
        ],
        offset,
        limit: parseInt(limit),
        order: [['createdAt', 'DESC']],
      });

      res.json({
        category,
        students: rows,
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
      });
    } catch (error) {
      console.error('Get students by category error:', error);
      res.status(500).json({ message: 'Failed to fetch students by category' });
    }
  },

  // Get categories for a student
  getStudentCategories: async (req, res) => {
    try {
      const { studentSessionId } = req.params;

      const categories = await StudentSessionCategory.findAll({
        where: { studentSessionId },
        include: [
          {
            model: SessionCategory,
            attributes: ['id', 'name', 'description', 'color'],
          },
        ],
      });

      res.json({
        categories: categories.map(c => c.SessionCategory),
        total: categories.length,
      });
    } catch (error) {
      console.error('Get student categories error:', error);
      res.status(500).json({ message: 'Failed to fetch student categories' });
    }
  },

  // Bulk assign students to category
  bulkAssignStudentsToCategory: async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { studentSessionIds } = req.body;
      const userId = req.user.id;

      if (!Array.isArray(studentSessionIds) || studentSessionIds.length === 0) {
        return res.status(400).json({ message: 'studentSessionIds array is required' });
      }

      const category = await SessionCategory.findByPk(categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      // Get existing assignments
      const existingAssignments = await StudentSessionCategory.findAll({
        where: {
          sessionCategoryId: categoryId,
          studentSessionId: studentSessionIds,
        },
      });

      const existingIds = new Set(existingAssignments.map(a => a.studentSessionId));
      const idsToAssign = studentSessionIds.filter(id => !existingIds.has(id));

      if (idsToAssign.length === 0) {
        return res.status(400).json({ message: 'All selected students are already assigned to this category' });
      }

      const assignments = await StudentSessionCategory.bulkCreate(
        idsToAssign.map(studentSessionId => ({
          studentSessionId,
          sessionCategoryId: categoryId,
          assignedBy: userId,
        }))
      );

      res.status(201).json({
        message: `${assignments.length} students assigned to category successfully`,
        assignedCount: assignments.length,
        skippedCount: existingAssignments.length,
      });
    } catch (error) {
      console.error('Bulk assign students error:', error);
      res.status(500).json({ message: 'Failed to bulk assign students' });
    }
  },

  // Get current student's enrolled session
  getStudentEnrolledSession: async (req, res) => {
    try {
      const userId = req.user.id;

      // Find student's session enrollment
      const studentSession = await StudentSession.findOne({
        where: { userId },
        include: [
          {
            model: AcademicSession,
            attributes: ['id', 'name', 'description', 'sipEnabled', 'startDate', 'endDate', 'isActive'],
          },
        ],
      });

      if (!studentSession) {
        return res.status(404).json({ message: 'Student not enrolled in any session' });
      }

      res.json({
        session: studentSession.AcademicSession,
        studentSessionId: studentSession.id,
      });
    } catch (error) {
      console.error('Get student enrolled session error:', error);
      res.status(500).json({ message: 'Failed to fetch student session' });
    }
  },

  // Get current student's categories
  getStudentEnrolledCategories: async (req, res) => {
    try {
      const userId = req.user.id;

      // Find student's session enrollment
      const studentSession = await StudentSession.findOne({
        where: { userId },
      });

      if (!studentSession) {
        return res.status(404).json({ message: 'Student not enrolled in any session' });
      }

      // Find student's categories
      const categories = await StudentSessionCategory.findAll({
        where: { studentSessionId: studentSession.id },
        include: [
          {
            model: SessionCategory,
            attributes: ['id', 'name', 'description', 'color'],
          },
        ],
      });

      res.json({
        categories: categories.map(c => c.SessionCategory),
        total: categories.length,
      });
    } catch (error) {
      console.error('Get student enrolled categories error:', error);
      res.status(500).json({ message: 'Failed to fetch student categories' });
    }
  },
};

module.exports = sessionController;
