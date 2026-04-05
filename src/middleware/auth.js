const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { error } = require('../utils/apiResponse');
const { canAssignRole } = require('../config/permissions');

/**
 * Protect — verify JWT and attach user to req
 */
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return error(res, 'Not authorized — no token provided', 401);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return error(res, 'User not found', 401);
    if (user.status === 'inactive') return error(res, 'Account is inactive. Contact the Membership Coordinator.', 403);

    req.user = user;
    // Non-blocking activity update
    user.updateActivity().catch(() => {});
    next();
  } catch (err) {
    return error(res, 'Not authorized — invalid or expired token', 401);
  }
};

/**
 * requirePermission — check a specific permission string
 * Usage: requirePermission('users:approve')
 */
const requirePermission = (permission) => (req, res, next) => {
  if (!req.user) return error(res, 'Not authenticated', 401);
  if (req.user.hasPermission(permission)) return next();
  return error(res, `Permission denied: '${permission}' required`, 403);
};

/**
 * requireAnyPermission — pass if user has ANY of the listed permissions
 */
const requireAnyPermission = (...permissions) => (req, res, next) => {
  if (!req.user) return error(res, 'Not authenticated', 401);
  const has = permissions.some(p => req.user.hasPermission(p));
  if (has) return next();
  return error(res, 'Insufficient permissions', 403);
};

/**
 * requireRole — legacy role-based check (use requirePermission where possible)
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return error(res, 'Not authenticated', 401);
  if (roles.includes(req.user.role)) return next();
  return error(res, `Role '${req.user.role}' is not authorized for this action`, 403);
};

/**
 * canChangeRole — validate that the requester can assign the target role
 */
const canChangeRole = (req, res, next) => {
  const { role: targetRole } = req.body;
  if (!targetRole) return next(); // no role change, skip
  if (!canAssignRole(req.user.role, targetRole)) {
    return error(res, `Your role cannot assign '${targetRole}'`, 403);
  }
  next();
};

// Keep authorize as alias for requireRole for backward compat
const authorize = requireRole;

/**
 * isSuperAdmin — hard gate for super_admin only routes
 */
const isSuperAdmin = (req, res, next) => {
  if (!req.user) return error(res, 'Not authenticated', 401);
  if (req.user.role !== 'super_admin') return error(res, 'Super Admin access required', 403);
  next();
};

module.exports = { protect, requirePermission, requireAnyPermission, requireRole, authorize, canChangeRole, isSuperAdmin };
