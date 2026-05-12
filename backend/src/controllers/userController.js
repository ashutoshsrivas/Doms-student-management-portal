const { User, Role, UserRole, StudentSession, AcademicSession, StudentProfile } = require('../models');
const { uploadToS3, deleteFromS3 } = require('../utils/s3Upload');
const { v4: uuidv4 } = require('uuid');

const userController = {
  // Get all users (Admin only)
  getAllUsers: async (req, res) => {
    try {
      const { role, status, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      let where = {};
      if (role) where.approvedRole = role;
      if (status) where.status = status;

      const { count, rows } = await User.findAndCountAll({
        where,
        offset,
        limit: parseInt(limit),
        order: [['createdAt', 'DESC']],
        attributes: {
          exclude: ['password', 'verificationToken', 'resetPasswordToken'],
        },
      });

      res.json({
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
        users: rows,
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  },

  // Get user by ID
  getUserById: async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id, {
        include: {
          model: Role,
          through: { attributes: [] },
        },
        attributes: {
          exclude: ['password', 'verificationToken', 'resetPasswordToken'],
        },
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  },

  // Search users
  searchUsers: async (req, res) => {
    try {
      const { query, role, department } = req.query;

      if (!query || query.length < 2) {
        return res.status(400).json({
          message: 'Search query must be at least 2 characters',
        });
      }

      let where = {
        [require('sequelize').Op.or]: [
          { firstName: { [require('sequelize').Op.like]: `%${query}%` } },
          { lastName: { [require('sequelize').Op.like]: `%${query}%` } },
          { email: { [require('sequelize').Op.like]: `%${query}%` } },
        ],
      };

      if (role) where.approvedRole = role;
      if (department) where.department = department;

      const users = await User.findAll({
        where,
        limit: 20,
        attributes: {
          exclude: ['password', 'verificationToken', 'resetPasswordToken'],
        },
      });

      res.json({
        count: users.length,
        users,
      });
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({ message: 'Search failed' });
    }
  },

  // Update user role (Admin only)
  updateUserRole: async (req, res) => {
    const { userId } = req.params;
    const { newRole } = req.body;

    if (!newRole) {
      return res.status(400).json({ message: 'newRole is required' });
    }

    try {
      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const validRoles = [
        'ADMIN',
        'HOD',
        'FACULTY',
        'COORDINATOR',
        'PLACEMENT_COORDINATOR',
        'TRAINER',
        'STUDENT',
        'MENTOR',
      ];

      if (!validRoles.includes(newRole)) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      await user.update({ approvedRole: newRole });

      res.json({
        message: 'User role updated',
        user: {
          id: user.id,
          email: user.email,
          approvedRole: user.approvedRole,
        },
      });
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({ message: 'Failed to update user role' });
    }
  },

  // Deactivate user (Admin only)
  deactivateUser: async (req, res) => {
    const { userId } = req.params;
    const { reason } = req.body;

    try {
      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.id === req.user.id) {
        return res.status(400).json({
          message: 'Cannot deactivate your own account',
        });
      }

      await user.update({
        status: 'INACTIVE',
        metadata: {
          ...user.metadata,
          deactivationReason: reason,
          deactivatedAt: new Date(),
        },
      });

      res.json({
        message: 'User deactivated',
        user: {
          id: user.id,
          email: user.email,
          status: user.status,
        },
      });
    } catch (error) {
      console.error('Deactivate user error:', error);
      res.status(500).json({ message: 'Failed to deactivate user' });
    }
  },

  // Reactivate user (Admin only)
  reactivateUser: async (req, res) => {
    const { userId } = req.params;

    try {
      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      await user.update({ status: 'ACTIVE' });

      res.json({
        message: 'User reactivated',
        user: {
          id: user.id,
          email: user.email,
          status: user.status,
        },
      });
    } catch (error) {
      console.error('Reactivate user error:', error);
      res.status(500).json({ message: 'Failed to reactivate user' });
    }
  },

  // Create user (Admin only)
  createUser: async (req, res) => {
    try {
      const { email, password, firstName, lastName, requestedRole, approvedRole, department, phoneNumber, employeeId, registrationNumber } = req.body;

      // Validation
      if (!email || !password || !firstName) {
        return res.status(400).json({
          message: 'email, password, and firstName are required',
        });
      }

      const role = approvedRole || requestedRole;
      if (!role) {
        return res.status(400).json({
          message: 'Either requestedRole or approvedRole is required',
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      // Check valid role
      const validRoles = [
        'ADMIN',
        'HOD',
        'FACULTY',
        'COORDINATOR',
        'PLACEMENT_COORDINATOR',
        'TRAINER',
        'STUDENT',
        'MENTOR',
      ];

      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      // Create user
      const user = await User.create({
        email,
        password,
        firstName,
        lastName,
        requestedRole: role,
        approvedRole: role,
        status: 'ACTIVE',
        isVerified: true,
        department,
        phoneNumber,
        employeeId,
        registrationNumber,
      });

      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          approvedRole: user.approvedRole,
          status: user.status,
        },
      });
    } catch (error) {
      console.error('Create user error:', error);
      console.error('Error message:', error.message);
      console.error('Error details:', error.errors || error);
      res.status(500).json({ 
        message: 'Failed to create user',
        error: error.message,
        details: error.errors || error.toString()
      });
    }
  },

  // Update user (Admin only)
  updateUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const { firstName, lastName, email, phoneNumber, department, employeeId, registrationNumber, approvedRole, status } = req.body;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if email is being changed and if it's unique
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
          return res.status(400).json({ message: 'Email already in use' });
        }
      }

      // Validate role if provided
      if (approvedRole) {
        const validRoles = [
          'ADMIN',
          'HOD',
          'FACULTY',
          'COORDINATOR',
          'PLACEMENT_COORDINATOR',
          'TRAINER',
          'STUDENT',
          'MENTOR',
        ];
        if (!validRoles.includes(approvedRole)) {
          return res.status(400).json({ message: 'Invalid role' });
        }
      }

      const updateData = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (email !== undefined) updateData.email = email;
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
      if (department !== undefined) updateData.department = department;
      if (employeeId !== undefined) updateData.employeeId = employeeId;
      if (registrationNumber !== undefined) updateData.registrationNumber = registrationNumber;
      if (approvedRole !== undefined) updateData.approvedRole = approvedRole;
      if (status !== undefined) updateData.status = status;

      await user.update(updateData);

      res.json({
        message: 'User updated successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          department: user.department,
          employeeId: user.employeeId,
          registrationNumber: user.registrationNumber,
          approvedRole: user.approvedRole,
          status: user.status,
          profileImage: user.profileImage,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ message: 'Failed to update user' });
    }
  },

  // Reset password for a single user (Admin only)
  resetUserPassword: async (req, res) => {
    try {
      const { userId } = req.params;
      const defaultPassword = '12345678';

      console.log('[resetUserPassword] Resetting password for userId:', userId);

      const user = await User.findByPk(userId);
      if (!user) {
        console.log('[resetUserPassword] User not found for ID:', userId);
        return res.status(404).json({ message: 'User not found' });
      }

      console.log('[resetUserPassword] User found:', { id: user.id, email: user.email });

      // Pass raw password - let the beforeUpdate hook handle hashing (avoid double hashing)
      await user.update({ password: defaultPassword });
      console.log('[resetUserPassword] Password updated successfully (hook will hash it)');

      res.json({
        message: 'User password reset successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        newPassword: defaultPassword,
      });
    } catch (error) {
      console.error('[resetUserPassword] Error:', error);
      res.status(500).json({ message: 'Failed to reset user password', error: error.message });
    }
  },

  // Delete user (Admin only) - Hard delete
  deleteUser: async (req, res) => {
    try {
      const { userId } = req.params;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent admin from deleting themselves
      if (user.id === req.user.id) {
        return res.status(400).json({
          message: 'Cannot delete your own account',
        });
      }

      await user.destroy();

      res.json({
        message: 'User deleted successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  },

  // Get users with advanced filtering
  getUsersWithFilters: async (req, res) => {
    try {
      const { 
        role, 
        status, 
        department, 
        search, 
        page = 1, 
        limit = 10000,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      let where = {};
      let order = [[sortBy || 'createdAt', sortOrder || 'DESC']];

      // Apply filters
      if (role) where.approvedRole = role;
      // Exclude deleted users - only show ACTIVE status unless specific status requested
      if (status) {
        where.status = status;
      } else {
        where.status = 'ACTIVE';
      }
      if (department) where.department = department;

      // Search filter
      if (search && search.length >= 2) {
        const { Op } = require('sequelize');
        where[Op.or] = [
          { firstName: { [Op.like]: `%${search}%` } },
          { lastName: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { employeeId: { [Op.like]: `%${search}%` } },
          { registrationNumber: { [Op.like]: `%${search}%` } },
        ];
      }

      const { count, rows } = await User.findAndCountAll({
        where,
        offset,
        limit: parseInt(limit),
        order,
        attributes: {
          exclude: ['password', 'verificationToken', 'resetPasswordToken'],
        },
      });

      res.json({
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
        users: rows,
      });
    } catch (error) {
      console.error('Get users with filters error:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  },

  // Get user statistics
  getUserStatistics: async (req, res) => {
    try {
      const totalUsers = await User.count();
      const activeUsers = await User.count({ where: { status: 'ACTIVE' } });
      const inactiveUsers = await User.count({ where: { status: 'INACTIVE' } });
      const pendingUsers = await User.count({ where: { status: 'PENDING' } });

      const roleStats = {};
      const roles = ['ADMIN', 'HOD', 'FACULTY', 'COORDINATOR', 'PLACEMENT_COORDINATOR', 'TRAINER', 'STUDENT', 'MENTOR'];
      
      for (const role of roles) {
        roleStats[role] = await User.count({ where: { approvedRole: role } });
      }

      res.json({
        totalUsers,
        activeUsers,
        inactiveUsers,
        pendingUsers,
        roleStats,
      });
    } catch (error) {
      console.error('Get user statistics error:', error);
      res.status(500).json({ message: 'Failed to fetch statistics' });
    }
  },

  // Get student profile
  getStudentProfile: async (req, res) => {
    try {
      // Allow admin to fetch any user's profile via userId query param
      // Otherwise, use the authenticated user's ID
      const userId = req.query.userId || req.user.id;
      
      console.log('[GET Student Profile] Fetching profile for userId:', userId);
      console.log('[GET Student Profile] Query params:', req.query);
      console.log('[GET Student Profile] Authenticated user:', req.user?.id);
      
      let profile = await StudentProfile.findOne({ where: { userId } });

      console.log('[GET Student Profile] Profile found:', profile ? 'YES' : 'NO');
      if (profile) {
        console.log('[GET Student Profile] Profile data keys:', Object.keys(profile.toJSON()));
      }

      if (!profile) {
        // Return empty profile structure if it doesn't exist (don't auto-create for admin viewing)
        if (req.query.userId) {
          console.log('[GET Student Profile] Profile not found for userId:', userId, '- returning null');
          return res.json({ profile: null });
        }
        // Create a new profile if it doesn't exist for the logged-in user
        console.log('[GET Student Profile] Creating new profile for userId:', userId);
        profile = await StudentProfile.create({ userId });
      }

      console.log('[GET Student Profile] Returning profile');
      res.json({ profile });
    } catch (error) {
      console.error('[GET Student Profile] Error fetching student profile:', error);
      res.status(500).json({ message: 'Failed to fetch student profile' });
    }
  },

  // Update student profile
  updateStudentProfile: async (req, res) => {
    try {
      const userId = req.user.id;
      const profileData = req.body;

      let profile = await StudentProfile.findOne({ where: { userId } });

      if (!profile) {
        profile = await StudentProfile.create({ userId, ...profileData });
      } else {
        await profile.update(profileData);
      }

      res.json(profile);
    } catch (error) {
      console.error('Error updating student profile:', error);
      res.status(500).json({ message: 'Failed to update student profile' });
    }
  },

  // Upload resume to S3
  uploadResume: async (req, res) => {
    try {
      const userId = req.user.id;

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const resumeUrl = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype, 'student-resumes');

      let profile = await StudentProfile.findOne({ where: { userId } });

      if (!profile) {
        profile = await StudentProfile.create({
          userId,
          resume: resumeUrl,
        });
      } else {
        if (profile.resume) {
          await deleteFromS3(profile.resume);
        }

        await profile.update({ resume: resumeUrl });
      }

      res.json({ resume: resumeUrl, message: 'Resume uploaded successfully' });
    } catch (error) {
      console.error('Error uploading resume:', error);
      res.status(500).json({ message: 'Failed to upload resume' });
    }
  },

  // Upload certificate or achievement document to S3
  uploadCertificateDocument: async (req, res) => {
    try {
      const userId = req.user.id;

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const documentUrl = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype, 'student-certificates');
      const document = {
        id: uuidv4(),
        name: req.file.originalname,
        url: documentUrl,
        uploadedAt: new Date().toISOString(),
      };

      let profile = await StudentProfile.findOne({ where: { userId } });

      if (!profile) {
        profile = await StudentProfile.create({
          userId,
          certificateDocuments: [document],
        });
      } else {
        // Parse JSON string if needed
        let currentDocuments = [];
        if (typeof profile.certificateDocuments === 'string') {
          try {
            currentDocuments = JSON.parse(profile.certificateDocuments);
          } catch (e) {
            currentDocuments = [];
          }
        } else if (Array.isArray(profile.certificateDocuments)) {
          currentDocuments = profile.certificateDocuments;
        }

        await profile.update({
          certificateDocuments: [...currentDocuments, document],
        });
      }

      res.json({ document, message: 'Document uploaded successfully' });
    } catch (error) {
      console.error('Error uploading certificate document:', error);
      res.status(500).json({ message: 'Failed to upload certificate document' });
    }
  },

  // Delete an uploaded certificate / achievement document
  deleteCertificateDocument: async (req, res) => {
    try {
      console.log('[DELETE Certificate] Request received');
      console.log('[DELETE Certificate] User ID:', req.user?.id);
      console.log('[DELETE Certificate] Document ID from params:', req.params.documentId);
      console.log('[DELETE Certificate] Full URL:', req.originalUrl);
      
      const userId = req.user.id;
      const { documentId } = req.params;

      if (!documentId) {
        console.log('[DELETE Certificate] No document ID provided');
        return res.status(400).json({ message: 'Document ID is required' });
      }

      const profile = await StudentProfile.findOne({ where: { userId } });
      if (!profile) {
        console.log('[DELETE Certificate] Profile not found for user:', userId);
        return res.status(404).json({ message: 'Profile not found' });
      }

      console.log('[DELETE Certificate] Current documents (raw):', profile.certificateDocuments);
      console.log('[DELETE Certificate] Type:', typeof profile.certificateDocuments);

      // Parse JSON string if needed
      let currentDocuments = [];
      if (typeof profile.certificateDocuments === 'string') {
        try {
          currentDocuments = JSON.parse(profile.certificateDocuments);
        } catch (e) {
          console.log('[DELETE Certificate] Failed to parse JSON:', e);
          currentDocuments = [];
        }
      } else if (Array.isArray(profile.certificateDocuments)) {
        currentDocuments = profile.certificateDocuments;
      }

      console.log('[DELETE Certificate] Parsed documents:', currentDocuments);

      const documentIndex = currentDocuments.findIndex((doc) => doc.id === documentId);
      console.log('[DELETE Certificate] Document index:', documentIndex);
      
      if (documentIndex === -1) {
        console.log('[DELETE Certificate] Document not found in array');
        return res.status(404).json({ message: 'Document not found' });
      }

      const [removedDocument] = currentDocuments.splice(documentIndex, 1);
      console.log('[DELETE Certificate] Removing document:', removedDocument);
      
      if (removedDocument?.url) {
        await deleteFromS3(removedDocument.url);
        console.log('[DELETE Certificate] Deleted from S3:', removedDocument.url);
      }

      await profile.update({ certificateDocuments: currentDocuments });
      console.log('[DELETE Certificate] Updated profile with remaining documents');

      res.json({ message: 'Document removed successfully' });
    } catch (error) {
      console.error('[DELETE Certificate] Error:', error);
      res.status(500).json({ message: 'Failed to delete certificate document' });
    }
  },
};

module.exports = userController;
