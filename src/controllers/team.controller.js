const TeamMember = require('../models/TeamMember');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');
const { uploadToCloudinary } = require('../services/upload.service');

// Public: get all public team members
exports.getPublicTeam = async (req, res, next) => {
  try {
    const members = await TeamMember.find({ isPublic: true })
      .populate('user', 'fullName email role profileImage')
      .sort({ order: 1, createdAt: -1 });
    return success(res, members);
  } catch (err) {
    next(err);
  }
};

// Admin: get all team members
exports.getAllTeamMembers = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.search) {
      // Search by user name or position
      const membersWithUsers = await TeamMember.find().populate('user', 'fullName');
      const matchingIds = membersWithUsers
        .filter(m => (m.user?.fullName?.toLowerCase().includes(req.query.search.toLowerCase()) || m.position?.toLowerCase().includes(req.query.search.toLowerCase())))
        .map(m => m._id);
      filter._id = { $in: matchingIds };
    }

    if (!req.isSuperAdmin) {
      if (req.allianceOrganizationId) filter.allianceOrganizationId = req.allianceOrganizationId;
    } else if (req.query.allianceOrganizationId) {
      filter.allianceOrganizationId = req.query.allianceOrganizationId;
    }

    const [members, total] = await Promise.all([
      TeamMember.find(filter)
        .populate('user', 'fullName email role profileImage')
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      TeamMember.countDocuments(filter)
    ]);

    return paginated(res, members, paginationMeta(total, page, limit));
  } catch (err) {
    next(err);
  }
};

// Admin: get single team member
exports.getTeamMember = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (!req.isSuperAdmin && req.allianceOrganizationId) {
      query.allianceOrganizationId = req.allianceOrganizationId;
    }
    const member = await TeamMember.findOne(query).populate('user');
    if (!member) {
      return error(res, 'Team member not found', 404);
    }
    return success(res, member);
  } catch (err) {
    next(err);
  }
};

// Admin: create team member
exports.createTeamMember = async (req, res, next) => {
  try {
    const data = { ...req.body };
    data.allianceOrganizationId = req.allianceOrganizationId;
    
    if (req.file) {
      data.photo = await uploadToCloudinary(req.file.path, 'voa/team');
    }

    const member = await TeamMember.create(data);
    await member.populate('user', 'fullName email role profileImage');
    
    return success(res, member, 'Team member added', 201);
  } catch (err) {
    next(err);
  }
};

// Admin: update team member
exports.updateTeamMember = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (!req.isSuperAdmin && req.allianceOrganizationId) {
      query.allianceOrganizationId = req.allianceOrganizationId;
    }
    const member = await TeamMember.findOne(query);
    if (!member) {
      return error(res, 'Team member not found', 404);
    }

    const data = { ...req.body };
    
    if (req.file) {
      data.photo = await uploadToCloudinary(req.file.path, 'voa/team');
    }

    Object.assign(member, data);
    await member.save();
    await member.populate('user', 'fullName email role profileImage');

    return success(res, member, 'Team member updated');
  } catch (err) {
    next(err);
  }
};

// Admin: delete team member
exports.deleteTeamMember = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (!req.isSuperAdmin && req.allianceOrganizationId) {
      query.allianceOrganizationId = req.allianceOrganizationId;
    }
    const member = await TeamMember.findOneAndDelete(query);
    if (!member) {
      return error(res, 'Team member not found', 404);
    }

    return success(res, null, 'Team member removed');
  } catch (err) {
    next(err);
  }
};
