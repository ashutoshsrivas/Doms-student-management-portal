const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');

// Permission aliases — some roles get another role's access without a
// DB change. The raw approved_role stays intact so admin listings still
// see the true label.
//   TRAINER      -> PLACEMENT_COORDINATOR
//   COORDINATOR  -> ADMIN
const ROLE_ALIASES = {
  TRAINER: 'PLACEMENT_COORDINATOR',
  COORDINATOR: 'ADMIN',
};
const effectiveRole = (role) => ROLE_ALIASES[role] || role;

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
      return res.status(401).json({ message, code: err.name });
    }

    const dbUser = await User.findByPk(payload.id, {
      include: { model: Role, through: { attributes: [] } },
    });

    if (!dbUser) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (dbUser.status !== 'ACTIVE') {
      return res.status(401).json({ message: 'Account is not active', status: dbUser.status });
    }

    if (!dbUser.approvedRole || dbUser.approvedRole !== payload.role) {
      return res.status(401).json({ message: 'User role has changed' });
    }

    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      role: effectiveRole(dbUser.approvedRole),
      status: dbUser.status,
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRole,
  effectiveRole,
};
