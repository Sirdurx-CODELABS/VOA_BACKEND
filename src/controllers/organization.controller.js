const AllianceOrganization = require('../models/AllianceOrganization');
const User = require('../models/User');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');
const { log } = require('../services/audit.service');
const logger = require('../utils/logger');

/**
 * GET /api/organizations/public
 * Public — list active organizations (for registration dropdown)
 */
exports.getActiveOrganizations = async (req, res, next) => {
  try {
    const orgs = await AllianceOrganization.find({ status: 'active' })
      .select('organizationName shortName logo logoUrl primaryColor secondaryColor accentColor district state facilityType organizationType address contactEmail contactPhone website description')
      .sort({ organizationName: 1 })
      .lean();
    return success(res, orgs, 'Organizations fetched');
  } catch (err) { next(err); }
};

/**
 * GET /api/organizations
 * Super Admin — list all organizations
 */
exports.getAllOrganizations = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.organizationType) filter.organizationType = req.query.organizationType;
    if (req.query.search) filter.organizationName = { $regex: req.query.search, $options: 'i' };

    const [orgs, total] = await Promise.all([
      AllianceOrganization.find(filter).skip(skip).limit(limit).sort('-createdAt').lean(),
      AllianceOrganization.countDocuments(filter),
    ]);

    // Attach member counts
    const enriched = await Promise.all(orgs.map(async (org) => {
      const memberCount = await User.countDocuments({ allianceOrganizationId: org._id, status: 'active' });
      return { ...org, memberCount };
    }));

    return paginated(res, enriched, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

/**
 * GET /api/organizations/:id
 * Super Admin — get single organization details
 */
exports.getOrganizationById = async (req, res, next) => {
  try {
    const org = await AllianceOrganization.findById(req.params.id).lean();
    if (!org) return error(res, 'Organization not found', 404);
    const memberCount = await User.countDocuments({ allianceOrganizationId: org._id, status: 'active' });
    return success(res, { ...org, memberCount });
  } catch (err) { next(err); }
};

/**
 * POST /api/organizations
 * Super Admin — create a new organization
 */
exports.createOrganization = async (req, res, next) => {
  try {
    const { organizationName, shortName, logo, logoUrl, primaryColor, secondaryColor, accentColor,
            district, state, country, facilityType, organizationType, address,
            contactEmail, contactPhone, website, description } = req.body;

    const existing = await AllianceOrganization.findOne({ organizationName });
    if (existing) return error(res, 'An organization with this name already exists', 409);

    const org = await AllianceOrganization.create({
      organizationName, shortName, logo, logoUrl,
      primaryColor: primaryColor || '#1E3A8A',
      secondaryColor: secondaryColor || '#F97316',
      accentColor: accentColor || '#22C55E',
      district, state, country: country || 'Nigeria',
      facilityType, organizationType: organizationType || 'ngo',
      address, contactEmail, contactPhone, website, description,
      status: 'active',
    });

    await log({ actor: req.user, action: 'CREATE_ORGANIZATION', entity: 'AllianceOrganization', entityId: org._id, details: { organizationName }, ip: req.ip });
    return success(res, org, 'Organization created successfully', 201);
  } catch (err) { next(err); }
};

/**
 * PUT /api/organizations/:id
 * Super Admin — update organization
 */
exports.updateOrganization = async (req, res, next) => {
  try {
    const org = await AllianceOrganization.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!org) return error(res, 'Organization not found', 404);
    await log({ actor: req.user, action: 'UPDATE_ORGANIZATION', entity: 'AllianceOrganization', entityId: org._id, details: req.body, ip: req.ip });
    return success(res, org, 'Organization updated');
  } catch (err) { next(err); }
};

/**
 * PATCH /api/organizations/:id/status
 * Super Admin — approve, suspend, or activate an organization
 */
exports.updateOrganizationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive', 'suspended', 'pending'].includes(status)) {
      return error(res, 'Invalid status value', 400);
    }
    const org = await AllianceOrganization.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!org) return error(res, 'Organization not found', 404);
    await log({ actor: req.user, action: 'UPDATE_ORG_STATUS', entity: 'AllianceOrganization', entityId: org._id, details: { status }, ip: req.ip });
    return success(res, org, `Organization status updated to ${status}`);
  } catch (err) { next(err); }
};

/**
 * DELETE /api/organizations/:id
 * Super Admin — delete organization
 */
exports.deleteOrganization = async (req, res, next) => {
  try {
    const org = await AllianceOrganization.findByIdAndDelete(req.params.id);
    if (!org) return error(res, 'Organization not found', 404);
    await log({ actor: req.user, action: 'DELETE_ORGANIZATION', entity: 'AllianceOrganization', entityId: req.params.id, details: { organizationName: org.organizationName }, ip: req.ip });
    return success(res, null, 'Organization deleted');
  } catch (err) { next(err); }
};

/**
 * GET /api/organizations/me
 * Chairman / Vice Chairman — get their own organization profile
 */
exports.getMyOrganization = async (req, res, next) => {
  try {
    if (!req.allianceOrganizationId) return error(res, 'You are not affiliated with any organization', 400);
    const org = await AllianceOrganization.findById(req.allianceOrganizationId).lean();
    if (!org) return error(res, 'Organization not found', 404);
    return success(res, org);
  } catch (err) { next(err); }
};

/**
 * PUT /api/organizations/me
 * Chairman / Vice Chairman — update their own organization profile
 */
exports.updateMyOrganization = async (req, res, next) => {
  try {
    if (!req.allianceOrganizationId) return error(res, 'You are not affiliated with any organization', 400);

    const allowed = ['organizationName', 'shortName', 'logo', 'logoUrl', 'primaryColor', 'secondaryColor', 'accentColor', 'district', 'state', 'country', 'facilityType', 'organizationType', 'address', 'contactEmail', 'contactPhone', 'website', 'description', 'systemInfo'];
    const update = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    }

    const org = await AllianceOrganization.findByIdAndUpdate(req.allianceOrganizationId, update, { new: true, runValidators: true });
    if (!org) return error(res, 'Organization not found', 404);

    await log({ actor: req.user, action: 'UPDATE_MY_ORGANIZATION', entity: 'AllianceOrganization', entityId: org._id, details: update, ip: req.ip });
    return success(res, org, 'Organization updated');
  } catch (err) { next(err); }
};

/**
 * POST /api/organizations/request
 * Public — request a new organization (pending approval)
 */
exports.requestNewOrganization = async (req, res, next) => {
  try {
    const { organizationName, shortName, contactEmail, contactPhone, address, description, organizationType } = req.body;

    if (!organizationName) return error(res, 'Organization name is required', 400);

    const org = await AllianceOrganization.create({
      organizationName,
      shortName: shortName || organizationName.substring(0, 20),
      contactEmail: contactEmail || '',
      contactPhone: contactPhone || '',
      address: address || '',
      description: description || '',
      organizationType: organizationType || 'ngo',
      status: 'pending',
    });

    logger.info(`New organization requested via public endpoint: ${organizationName} (${org._id})`);
    return success(res, { id: org._id, organizationName: org.organizationName, status: org.status }, 'Organization registration request submitted. You will be notified once approved.', 201);
  } catch (err) { next(err); }
};
