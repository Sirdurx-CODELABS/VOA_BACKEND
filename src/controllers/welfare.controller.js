const WelfareRequest = require('../models/WelfareRequest');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');
const { createNotification } = require('../services/notification.service');
const { uploadMany } = require('../services/upload.service');
const User = require('../models/User');

exports.createRequest = async (req, res, next) => {
  try {
    // Only allow type + message from body (status stripped by validation middleware)
    const { type, message } = req.body;
    let attachments = [];
    if (req.files?.length) {
      attachments = await uploadMany(req.files, 'voa/welfare');
    }
    const request = await WelfareRequest.create({ type, message, userId: req.user._id, attachments });

    const officer = await User.findOne({ role: 'welfare_officer', status: 'active' });
    if (officer) {
      await createNotification({
        recipient: officer._id,
        title: 'New Welfare Request',
        message: `A new ${request.type} welfare request has been submitted`,
        type: 'welfare',
        relatedId: request._id,
        relatedModel: 'WelfareRequest',
      });
    }
    return success(res, request, 'Welfare request submitted', 201);
  } catch (err) { next(err); }
};

exports.getAllRequests = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;
    // Members can only see their own
    if (req.user.role === 'member') filter.userId = req.user._id;

    const [requests, total] = await Promise.all([
      WelfareRequest.find(filter).skip(skip).limit(limit)
        .populate('userId', 'fullName email phone')
        .populate('handledBy', 'fullName')
        .sort('-createdAt'),
      WelfareRequest.countDocuments(filter),
    ]);
    return paginated(res, requests, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

exports.getRequestById = async (req, res, next) => {
  try {
    const request = await WelfareRequest.findById(req.params.id)
      .populate('userId', 'fullName email phone')
      .populate('handledBy', 'fullName')
      .populate('followUps.addedBy', 'fullName');
    if (!request) return error(res, 'Request not found', 404);
    return success(res, request);
  } catch (err) { next(err); }
};

exports.updateRequestStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const request = await WelfareRequest.findById(req.params.id);
    if (!request) return error(res, 'Request not found', 404);

    request.status = status;
    request.handledBy = req.user._id;
    if (status === 'resolved') request.resolvedAt = new Date();
    await request.save();

    await createNotification({
      recipient: request.userId,
      title: 'Welfare Request Update',
      message: `Your welfare request status has been updated to: ${status}`,
      type: 'welfare',
      relatedId: request._id,
      relatedModel: 'WelfareRequest',
    });

    return success(res, request, 'Request status updated');
  } catch (err) { next(err); }
};

exports.addFollowUp = async (req, res, next) => {
  try {
    const request = await WelfareRequest.findById(req.params.id);
    if (!request) return error(res, 'Request not found', 404);

    request.followUps.push({ note: req.body.note, addedBy: req.user._id });
    await request.save();
    return success(res, request, 'Follow-up added');
  } catch (err) { next(err); }
};
