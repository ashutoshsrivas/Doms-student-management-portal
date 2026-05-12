const jwt = require('jsonwebtoken');
const { sequelize, User, Role, UserRole, AcademicSession } = require('../models');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { uploadToS3, deleteFromS3 } = require('../utils/s3Upload');

const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.approvedRole,
      status: user.status,
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      typ: 'refresh',
    },
    REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

const authController = {
  // Sign up
  signup: async (req, res) => {
    const { email, password, firstName, lastName, phoneNumber, requestedRole } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName || !requestedRole) {
      return res.status(400).json({
        message: 'Email, password, name, and requested role are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters',
      });
    }

    // Verify requested role is valid (cheap check before opening a tx)
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

    if (!validRoles.includes(requestedRole)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    try {
      const result = await sequelize.transaction(async (t) => {
        const existingUser = await User.findOne({ where: { email }, transaction: t });
        if (existingUser) {
          const err = new Error('Email already registered');
          err.status = 409;
          throw err;
        }

        let initialStatus = 'PENDING';
        let initialApprovedRole = null;

        if (requestedRole === 'ADMIN') {
          // Lock matching admin rows so concurrent signups can't both bootstrap.
          const adminCount = await User.count({
            where: { approvedRole: 'ADMIN', status: 'ACTIVE' },
            transaction: t,
            lock: t.LOCK.UPDATE,
          });

          if (adminCount === 0) {
            initialStatus = 'ACTIVE';
            initialApprovedRole = 'ADMIN';
          }
        }

        const user = await User.create({
          email,
          password,
          firstName,
          lastName,
          phoneNumber,
          requestedRole,
          approvedRole: initialApprovedRole,
          status: initialStatus,
          verificationToken: crypto.randomBytes(20).toString('hex'),
        }, { transaction: t });

        if (initialApprovedRole === 'ADMIN') {
          let role = await Role.findOne({ where: { name: 'ADMIN' }, transaction: t });
          if (!role) {
            role = await Role.create({
              name: 'ADMIN',
              description: 'System Administrator',
            }, { transaction: t });
          }
          await UserRole.create({
            userId: user.id,
            roleId: role.id,
          }, { transaction: t });
        }

        return { user, initialStatus, initialApprovedRole };
      });

      res.status(201).json({
        message: result.initialStatus === 'ACTIVE'
          ? 'Admin account created and activated successfully!'
          : 'Signup successful. Your request is pending admin approval.',
        userId: result.user.id,
        email: result.user.email,
        status: result.user.status,
        approvedRole: result.initialApprovedRole,
      });
    } catch (error) {
      if (error.status === 409) {
        return res.status(409).json({ message: error.message });
      }
      console.error('Signup error:', error);
      res.status(500).json({ message: 'Signup failed' });
    }
  },

  // Login
  login: async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }

    try {
      const user = await User.findOne({
        where: { email },
        include: {
          model: Role,
          through: { attributes: [] },
        },
      });

      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check if user status is approved
      if (user.status === 'PENDING') {
        return res.status(403).json({
          message: 'Your account is pending admin approval',
          status: 'PENDING',
        });
      }

      if (user.status === 'REJECTED') {
        return res.status(403).json({
          message: 'Your account request has been rejected',
          status: 'REJECTED',
        });
      }

      if (user.status === 'INACTIVE') {
        return res.status(403).json({
          message: 'Your account is inactive',
          status: 'INACTIVE',
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      if (!user.approvedRole) {
        return res.status(403).json({
          message: 'No role assigned to your account',
        });
      }

      // Update last login
      await user.update({ lastLogin: new Date() });

      // Generate tokens
      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      res.json({
        message: 'Login successful',
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.approvedRole,
          status: user.status,
          profileImage: user.profileImage,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  },

  // Refresh token
  refreshToken: async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    try {
      const decoded = jwt.verify(refreshToken, REFRESH_SECRET);

      if (decoded.typ !== 'refresh') {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }

      const user = await User.findByPk(decoded.id);

      if (!user) {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }

      if (user.status !== 'ACTIVE' || !user.approvedRole) {
        return res.status(401).json({ message: 'Account is not active' });
      }

      const newToken = generateToken(user);

      res.json({
        token: newToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.approvedRole,
          status: user.status,
        },
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({ message: 'Invalid refresh token' });
    }
  },

  // Get pending requests (Admin only)
  getPendingRequests: async (req, res) => {
    try {
      const pendingUsers = await User.findAll({
        where: { status: 'PENDING' },
        order: [['createdAt', 'DESC']],
        attributes: {
          exclude: ['password', 'verificationToken', 'resetPasswordToken'],
        },
      });

      res.json({
        count: pendingUsers.length,
        users: pendingUsers,
      });
    } catch (error) {
      console.error('Get pending requests error:', error);
      res.status(500).json({ message: 'Failed to fetch pending requests' });
    }
  },

  // Approve user request (Admin only)
  approveUser: async (req, res) => {
    const { userId, approvedRole, department } = req.body;

    if (!userId || !approvedRole) {
      return res.status(400).json({
        message: 'userId and approvedRole are required',
      });
    }

    try {
      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if role is valid
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

      // Update user
      await user.update({
        approvedRole,
        status: 'ACTIVE',
        department: department || user.department,
      });

      // Get or create role
      let role = await Role.findOne({ where: { name: approvedRole } });
      if (!role) {
        role = await Role.create({
          name: approvedRole,
          description: `${approvedRole} role`,
        });
      }

      // Assign role to user
      await UserRole.findOrCreate({
        where: { userId, roleId: role.id },
      });

      res.json({
        message: 'User approved successfully',
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
      console.error('Approve user error:', error);
      res.status(500).json({ message: 'Failed to approve user' });
    }
  },

  // Reject user request (Admin only)
  rejectUser: async (req, res) => {
    const { userId, reason } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    try {
      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      await user.update({
        status: 'REJECTED',
        metadata: {
          ...user.metadata,
          rejectionReason: reason,
          rejectedAt: new Date(),
        },
      });

      res.json({
        message: 'User request rejected',
        user: {
          id: user.id,
          email: user.email,
          status: user.status,
        },
      });
    } catch (error) {
      console.error('Reject user error:', error);
      res.status(500).json({ message: 'Failed to reject user' });
    }
  },

  // Get user profile
  getProfile: async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id, {
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

      // Return user in the same format as login
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.approvedRole,
        status: user.status,
        profileImage: user.profileImage,
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ message: 'Failed to fetch profile' });
    }
  },

  // Update user profile
  updateProfile: async (req, res) => {
    const { firstName, lastName, phoneNumber, department } = req.body;
    const userId = req.user.id;

    try {
      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      let profileImageUrl = user.profileImage;

      // Handle profile image upload to S3
      if (req.file) {
        try {
          // Delete old image from S3 if it exists
          if (user.profileImage) {
            await deleteFromS3(user.profileImage);
          }

          // Upload new image to S3
          profileImageUrl = await uploadToS3(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype
          );
        } catch (error) {
          console.error('Image upload error:', error);
          return res.status(500).json({ message: 'Failed to upload image' });
        }
      }

      // Update user profile
      await user.update({
        firstName: firstName || user.firstName,
        lastName: lastName || user.lastName,
        phoneNumber: phoneNumber || user.phoneNumber,
        department: department || user.department,
        profileImage: profileImageUrl,
      });

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          department: user.department,
          profileImage: profileImageUrl,
        },
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  },

  // Logout
  logout: (req, res) => {
    // Token is client-side managed, so just send success
    res.json({ message: 'Logged out successfully' });
  },

  // Reset password
  resetPassword: async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: 'New password must be at least 8 characters',
      });
    }

    try {
      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify current password
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      // Check if new password is same as current
      if (currentPassword === newPassword) {
        return res.status(400).json({
          message: 'New password must be different from current password',
        });
      }

      // Update password (will be hashed by beforeUpdate hook)
      user.password = newPassword;
      await user.save();

      res.json({
        message: 'Password reset successfully',
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  },
};

module.exports = authController;
