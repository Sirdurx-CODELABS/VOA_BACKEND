const SocialChannel = require('../models/SocialChannel');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');

exports.create = async (req, res, next) => {
  try {
    const { name, type, identifier, description, isActive } = req.body;
    if (!name || !type || !identifier) return error(res, 'Name, type, and identifier are required', 400);
    const channel = await SocialChannel.create({ name, type, identifier, description, isActive, allianceOrganizationId: req.allianceOrganizationId });
    return success(res, channel, 'Social channel created', 201);
  } catch (err) { next(err); }
};

exports.getAll = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (!req.isSuperAdmin) {
      if (req.allianceOrganizationId) filter.allianceOrganizationId = req.allianceOrganizationId;
    } else if (req.query.allianceOrganizationId) {
      filter.allianceOrganizationId = req.query.allianceOrganizationId;
    }
    const [channels, total] = await Promise.all([
      SocialChannel.find(filter).skip(skip).limit(limit).sort('-createdAt'),
      SocialChannel.countDocuments(filter),
    ]);
    return paginated(res, channels, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (!req.isSuperAdmin && req.allianceOrganizationId) {
      query.allianceOrganizationId = req.allianceOrganizationId;
    }
    const channel = await SocialChannel.findOne(query);
    if (!channel) return error(res, 'Social channel not found', 404);
    return success(res, channel);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (!req.isSuperAdmin && req.allianceOrganizationId) {
      query.allianceOrganizationId = req.allianceOrganizationId;
    }
    const channel = await SocialChannel.findOneAndUpdate(query, req.body, { new: true, runValidators: true });
    if (!channel) return error(res, 'Social channel not found', 404);
    return success(res, channel, 'Social channel updated');
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (!req.isSuperAdmin && req.allianceOrganizationId) {
      query.allianceOrganizationId = req.allianceOrganizationId;
    }
    const channel = await SocialChannel.findOneAndDelete(query);
    if (!channel) return error(res, 'Social channel not found', 404);
    return success(res, null, 'Social channel deleted');
  } catch (err) { next(err); }
};

exports.getActive = async (req, res, next) => {
  try {
    const channels = await SocialChannel.find({ isActive: true }).sort('-createdAt');
    return success(res, channels);
  } catch (err) { next(err); }
};
