const PositionApplication = require('../models/PositionApplication');
const User = require('../models/User');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');
const { createNotification } = require('../services/notification.service');
const { log } = require('../services/audit.service');

// Member submits application
exports.submit = async (req, res, next) => {
  try {
    // Prevent duplicate pending applications
    const existing = await PositionApplication.findOne({
      applicantId: req.user._id,
      status: { $in: ['pending_membership_review', 'pending_chairman_approval'] },
    });
    if (existing) return error(res, 'You already have a pending application', 409);

    const app = await PositionApplication.create({
      ...req.body,
      applicantId: req.user._id,
      currentRole: req.user.role,
    });

    // Notify all membership coordinators
    const coordinators = await User.find({ role: 'membership_coordinator', status: 'active' });
    for (const c of coordinators) {
      await createNotification({
        recipient: c._id,
        title: 'New Position Application',
        message: `${req.user.fullName} applied for ${app.appliedPosition.replace(/_/g, ' ')}`,
        type: 'general',
        relatedId: app._id,
        relatedModel: 'PositionApplication',
      });
    }

    await log({ actor: req.user, action: 'SUBMIT_POSITION_APPLICATION', entity: 'PositionApplication', entityId: app._id, ip: req.ip });
    return success(res, app, 'Application submitted successfully', 201);
  } catch (err) { next(err); }
};

// Get applications (filtered by role)
exports.getAll = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};

    // Members only see their own
    if (req.user.role === 'member') filter.applicantId = req.user._id;
    if (req.query.status) filter.status = req.query.status;

    const [apps, total] = await Promise.all([
      PositionApplication.find(filter).skip(skip).limit(limit)
        .populate('applicantId', 'fullName email role engagementScore')
        .populate('membershipReviewBy', 'fullName')
        .populate('chairmanDecisionBy', 'fullName')
        .sort('-createdAt'),
      PositionApplication.countDocuments(filter),
    ]);
    return paginated(res, apps, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const app = await PositionApplication.findById(req.params.id)
      .populate('applicantId', 'fullName email role profileImage engagementScore')
      .populate('membershipReviewBy', 'fullName role')
      .populate('chairmanDecisionBy', 'fullName role');
    if (!app) return error(res, 'Application not found', 404);
    return success(res, app);
  } catch (err) { next(err); }
};

// Membership Coordinator reviews
exports.membershipReview = async (req, res, next) => {
  try {
    const { decision, note } = req.body;
    const app = await PositionApplication.findById(req.params.id);
    if (!app) return error(res, 'Application not found', 404);
    if (app.status !== 'pending_membership_review') return error(res, 'Application is not pending membership review', 400);

    if (decision === 'reject') {
      app.status = 'rejected';
      app.membershipReviewBy = req.user._id;
      app.membershipReviewNote = note;
      app.membershipReviewAt = new Date();
      await app.save();

      await createNotification({
        recipient: app.applicantId,
        title: 'Application Reviewed',
        message: `Your application for ${app.appliedPosition.replace(/_/g, ' ')} was not accepted at this time.`,
        type: 'general',
        relatedId: app._id,
        relatedModel: 'PositionApplication',
      });
    } else {
      // Accept → escalate to chairman
      app.status = 'pending_chairman_approval';
      app.membershipCoordinatorApproved = true;
      app.membershipReviewBy = req.user._id;
      app.membershipReviewNote = note;
      app.membershipReviewAt = new Date();
      await app.save();

      // Notify chairman
      const chairman = await User.findOne({ role: 'chairman', status: 'active' });
      if (chairman) {
        await createNotification({
          recipient: chairman._id,
          title: 'Position Application Awaiting Approval',
          message: `${(await User.findById(app.applicantId))?.fullName} applied for ${app.appliedPosition.replace(/_/g, ' ')} — Membership Coordinator approved.`,
          type: 'general',
          relatedId: app._id,
          relatedModel: 'PositionApplication',
        });
      }
    }

    await log({ actor: req.user, action: 'MEMBERSHIP_REVIEW_APPLICATION', entity: 'PositionApplication', entityId: app._id, details: { decision }, ip: req.ip });
    return success(res, app, `Application ${decision === 'accept' ? 'escalated to Chairman' : 'rejected'}`);
  } catch (err) { next(err); }
};

// Chairman final decision
exports.chairmanReview = async (req, res, next) => {
  try {
    const { decision, note } = req.body;
    const app = await PositionApplication.findById(req.params.id).populate('applicantId');
    if (!app) return error(res, 'Application not found', 404);
    if (app.status !== 'pending_chairman_approval') return error(res, 'Application is not pending chairman approval', 400);

    app.chairmanDecisionBy = req.user._id;
    app.chairmanDecisionNote = note;
    app.chairmanDecisionAt = new Date();

    if (decision === 'approve') {
      app.status = 'approved';
      app.chairmanApproved = true;
      // Actually change the role
      await User.findByIdAndUpdate(app.applicantId._id, { role: app.appliedPosition });

      await createNotification({
        recipient: app.applicantId._id,
        title: '🎉 Position Approved!',
        message: `Congratulations! You have been approved as ${app.appliedPosition.replace(/_/g, ' ')}.`,
        type: 'achievement',
        relatedId: app._id,
        relatedModel: 'PositionApplication',
      });
    } else {
      app.status = 'rejected';
      await createNotification({
        recipient: app.applicantId._id,
        title: 'Application Decision',
        message: `Your application for ${app.appliedPosition.replace(/_/g, ' ')} was not approved at this time.`,
        type: 'general',
        relatedId: app._id,
        relatedModel: 'PositionApplication',
      });
    }

    await app.save();
    await log({ actor: req.user, action: 'CHAIRMAN_REVIEW_APPLICATION', entity: 'PositionApplication', entityId: app._id, details: { decision, newRole: app.appliedPosition }, ip: req.ip });
    return success(res, app, `Application ${decision === 'approve' ? 'approved — role updated' : 'rejected'}`);
  } catch (err) { next(err); }
};

// Super admin direct approve
exports.superAdminApprove = async (req, res, next) => {
  try {
    const app = await PositionApplication.findById(req.params.id).populate('applicantId');
    if (!app) return error(res, 'Application not found', 404);

    app.status = 'approved';
    app.chairmanApproved = true;
    app.membershipCoordinatorApproved = true;
    app.chairmanDecisionBy = req.user._id;
    app.chairmanDecisionAt = new Date();
    app.chairmanDecisionNote = 'Approved directly by Super Admin';
    await app.save();

    await User.findByIdAndUpdate(app.applicantId._id, { role: app.appliedPosition });
    await log({ actor: req.user, action: 'SUPERADMIN_APPROVE_APPLICATION', entity: 'PositionApplication', entityId: app._id, ip: req.ip });
    return success(res, app, 'Application approved and role updated');
  } catch (err) { next(err); }
};
