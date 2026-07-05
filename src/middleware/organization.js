const AllianceOrganization = require('../models/AllianceOrganization');
const { error } = require('../utils/apiResponse');

/**
 * bindOrganization — attaches organization context to req based on authenticated user
 * Must be used AFTER `protect` middleware.
 * Sets:
 *   req.allianceOrganizationId — the user's org ID (null for super_admin)
 *   req.organization           — the org document (null for super_admin)
 *   req.isSuperAdmin           — boolean
 */
const bindOrganization = async (req, res, next) => {
  try {
    req.isSuperAdmin = req.user?.role === 'super_admin';

    if (req.isSuperAdmin) {
      // Super admin can be unaffiliated or can query a specific org
      if (req.query.allianceOrganizationId) {
        req.allianceOrganizationId = req.query.allianceOrganizationId;
      } else {
        req.allianceOrganizationId = null; // null = no filter = see all
      }
      req.organization = null;
      return next();
    }

    const orgId = req.user?.allianceOrganizationId;
    if (!orgId) {
      return error(res, 'Your account is not associated with any organization', 403);
    }

    const org = await AllianceOrganization.findById(orgId);
    if (!org) {
      return error(res, 'Your organization was not found', 404);
    }
    if (org.status !== 'active') {
      return error(res, 'Your organization is currently inactive or suspended', 403);
    }

    req.allianceOrganizationId = orgId;
    req.organization = org;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * filterByOrganization — convenience wrapper for controllers
 * Returns a MongoDB filter object that scopes queries to the current organization.
 * If the user is super_admin with no specific org filter, returns {} (no filter).
 * Super admin can pass ?allianceOrganizationId=X to filter a specific org.
 */
const orgFilter = (req) => {
  if (req.isSuperAdmin) {
    if (req.query.allianceOrganizationId) {
      return { allianceOrganizationId: req.query.allianceOrganizationId };
    }
    return {}; // no filter = see all
  }
  return { allianceOrganizationId: req.allianceOrganizationId || null };
};

/**
 * assertOrgAccess — middleware that ensures a document belongs to the user's org.
 * Pass the model and an optional id source (default: req.params.id).
 * Must be used after `protect`.
 */
const assertOrgAccess = (model, idSource = 'params.id') => async (req, res, next) => {
  if (req.isSuperAdmin) return next();
  try {
    const id = idSource.split('.').reduce((o, k) => o?.[k], req);
    const doc = await model.findById(id).select('allianceOrganizationId').lean();
    if (!doc) return next(); // let the controller handle 404
    if (doc.allianceOrganizationId?.toString() !== req.allianceOrganizationId?.toString()) {
      return error(res, 'Access denied — resource belongs to another organization', 403);
    }
    next();
  } catch (err) { next(err); }
};

module.exports = { bindOrganization, orgFilter, assertOrgAccess };
