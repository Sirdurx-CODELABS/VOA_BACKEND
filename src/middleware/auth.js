const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AllianceOrganization = require('../models/AllianceOrganization');
const StaffProfile = require('../ai/models/StaffProfile');
const { error } = require('../utils/apiResponse');
const { canAssignRole, isClinicalRole } = require('../config/permissions');

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
    if (user.status === 'inactive') return error(res, 'Account is inactive. Contact your administrator.', 403);

    req.user = user;

    // Attach organization context
    if (user.allianceOrganizationId) {
      const org = await AllianceOrganization.findById(user.allianceOrganizationId).lean().catch(() => null);
      req.organization = org || null;
      req.allianceOrganizationId = user.allianceOrganizationId;
    } else {
      req.organization = null;
      req.allianceOrganizationId = null;
    }

    req.isSuperAdmin = user.role === 'super_admin';
    req.isVoaAdmin = user.role === 'voa_admin';
    req.isClinicalUser = isClinicalRole(user.role);

    // Non-blocking activity update
    user.updateActivity().catch(() => {});
    next();
  } catch (err) {
    return error(res, 'Not authorized — invalid or expired token', 401);
  }
};

/**
 * requirePermission — check a specific permission string
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
  if (!targetRole) return next();
  if (!canAssignRole(req.user.role, targetRole)) {
    return error(res, `Your role cannot assign '${targetRole}'`, 403);
  }
  next();
};

/**
 * requireClinicalRole — restrict to one or more clinical roles
 */
const requireClinicalRole = (...roles) => (req, res, next) => {
  if (!req.user) return error(res, 'Not authenticated', 401);
  if (!req.isClinicalUser) return error(res, 'Clinical role required', 403);
  if (roles.length > 0 && !roles.includes(req.user.role)) {
    return error(res, `Role '${req.user.role}' is not authorized for this action`, 403);
  }
  next();
};

/**
 * loadStaffProfile — attach staff profile extension to req.staffProfile
 */
const loadStaffProfile = async (req, res, next) => {
  if (!req.user || !req.isClinicalUser) return next();
  try {
    const profile = await StaffProfile.findOne({ user: req.user._id }).populate('hospital');
    req.staffProfile = profile || null;
  } catch {
    req.staffProfile = null;
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

/**
 * isSuperOrVoaAdmin — gate for super_admin or voa_admin
 */
const isSuperOrVoaAdmin = (req, res, next) => {
  if (!req.user) return error(res, 'Not authenticated', 401);
  if (req.user.role !== 'super_admin' && req.user.role !== 'voa_admin') {
    return error(res, 'System admin access required', 403);
  }
  next();
};

module.exports = {
  protect, requirePermission, requireAnyPermission,
  requireRole, authorize, canChangeRole,
  isSuperAdmin, isSuperOrVoaAdmin,
  isClinicalRole, requireClinicalRole, loadStaffProfile,
};
