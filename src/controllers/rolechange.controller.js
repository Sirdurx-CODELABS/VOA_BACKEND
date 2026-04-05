const RoleChangeRequest = require('../models/RoleChangeRequest');
const User = require('../models/User');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');
const { createNotification } = require('../services/notification.service');
const { log } = require('../services/audit.service');
const { canAssignRole } = require('../config/permissions');

// Membership Coordinator creates a role change request
exports.create = async (req, res, next) => {
  try {
    const { userId, requestedRole, reason } = req.body;

    // Validate the coordinator can request this role
    if (!canAssignRole(req.user.role, requestedRole)) {
      return error(res, `You cannot request role '${requestedRole}'`, 403);
    }

    const target = await User.findById(userId);
    if (!target) return error(res, 'User not found', 404);

    const rcr = await RoleChangeRequest.create({
      userId, requestedRole, reason,
      initiatedBy: req.user._id,
      membershipCoordinatorApproved: true,
    });

    // Notify chairman
    const chairman = await User.findOne({ role: 'chairman', status: 'active' });
    if (chairman) {
      await createNotification({
        recipient: chairman._id,
        title: 'Role Change Request',
        message: `${req.user.fullName} requests role change for ${target.fullName} → ${requestedRole.replace(/_/g, ' ')}`,
        type: 'general',
        relatedId: rcr._id,
        relatedModel: 'RoleChangeRequest',
      });
    }

    await log({ actor: req.user, action: 'CREATE_ROLE_CHANGE_REQUEST', entity: 'RoleChangeRequest', entityId: rcr._id, details: { userId, requestedRole }, ip: req.ip });
    return success(res, rcr, 'Role change request submitted for Chairman approval', 201);
  } catch (err) { next(err); }
};

exports.getAll = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const [requests, total] = await Promise.all([
      RoleChangeRequest.find(filter).skip(skip).limit(limit)
        .populate('userId', 'fullName email role')
        .populate('initiatedBy', 'fullName role')
        .populate('approvedBy', 'fullName')
        .sort('-createdAt'),
      RoleChangeRequest.countDocuments(filter),
    ]);
    return paginated(res, requests, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

// Chairman approves or rejects
exports.chairmanDecision = async (req, res, next) => {
  try {
    const { decision, note } = req.body;
    const rcr = await RoleChangeRequest.findById(req.params.id).populate('userId');
    if (!rcr) return error(res, 'Request not found', 404);
    if (rcr.status !== 'pending_chairman') return error(res, 'Request already processed', 400);

    if (decision === 'approve') {
      rcr.status = 'approved';
      rcr.chairmanApproved = true;
      rcr.approvedBy = req.user._id;
      rcr.note = note;
      await rcr.save();

      await User.findByIdAndUpdate(rcr.userId._id, { role: rcr.requestedRole });

      await createNotification({
        recipient: rcr.userId._id,
        title: 'Role Updated',
        message: `Your role has been changed to ${rcr.requestedRole.replace(/_/g, ' ')} by the Chairman.`,
        type: 'achievement',
        relatedId: rcr._id,
        relatedModel: 'RoleChangeRequest',
      });
    } else {
      rcr.status = 'rejected';
      rcr.rejectedBy = req.user._id;
      rcr.note = note;
      await rcr.save();

      await createNotification({
        recipient: rcr.userId._id,
        title: 'Role Change Request',
        message: `The role change request was not approved at this time.`,
        type: 'general',
        relatedId: rcr._id,
        relatedModel: 'RoleChangeRequest',
      });
    }

    await log({ actor: req.user, action: 'CHAIRMAN_ROLE_DECISION', entity: 'RoleChangeRequest', entityId: rcr._id, details: { decision, role: rcr.requestedRole }, ip: req.ip });
    return success(res, rcr, `Role change ${decision === 'approve' ? 'approved' : 'rejected'}`);
  } catch (err) { next(err); }
};

// Super admin bypass — direct role change
exports.superAdminApprove = async (req, res, next) => {
  try {
    const rcr = await RoleChangeRequest.findById(req.params.id).populate('userId');
    if (!rcr) return error(res, 'Request not found', 404);

    rcr.status = 'approved';
    rcr.chairmanApproved = true;
    rcr.membershipCoordinatorApproved = true;
    rcr.approvedBy = req.user._id;
    rcr.note = 'Approved directly by Super Admin';
    await rcr.save();

    await User.findByIdAndUpdate(rcr.userId._id, { role: rcr.requestedRole });
    await log({ actor: req.user, action: 'SUPERADMIN_ROLE_CHANGE', entity: 'RoleChangeRequest', entityId: rcr._id, ip: req.ip });
    return success(res, rcr, 'Role changed by Super Admin');
  } catch (err) { next(err); }
};
