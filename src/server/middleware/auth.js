'use strict';

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// CSRF token middleware for mutating admin routes
function requireCsrf(req, res, next) {
  const token = req.headers['x-csrf-token'];
  if (!token || token !== req.session?.csrfToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
}

// Role-based access control
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId)
      return res.status(401).json({ error: 'Auth required' });
    const role = req.session.role || 'student';
    if (!roles.includes(role))
      return res.status(403).json({ error: 'Forbidden — needs role: ' + roles.join('/') });
    next();
  };
}

// Convenience: admin or professor (anyone who can manage the lab)
const requireStaff = requireRole('admin', 'professor');
// Convenience: admin, professor, or moderator (can post news, photos)
const requireModerator = requireRole('admin', 'professor', 'moderator');

// Resolve the current account on every authenticated request so role changes and
// deactivation take effect immediately, including sessions restored after restart.
function refreshSessionUser(db) {
  return (req, res, next) => {
    if (!req.session?.userId) return next();
    const user = db
      .prepare('SELECT id, username, role, active FROM users WHERE id=?')
      .get(req.session.userId);
    if (!user || !user.active) {
      return req.session.destroy((error) => {
        if (error) return next(error);
        res.clearCookie('connect.sid');
        next();
      });
    }
    req.session.username = user.username;
    req.session.role = user.role || 'student';
    next();
  };
}

module.exports = {
  requireAuth,
  requireCsrf,
  requireRole,
  requireStaff,
  requireModerator,
  refreshSessionUser,
};
