const Program = require('../models/Program');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');
const { createNotification, notifyMany } = require('../services/notification.service');
const { uploadToCloudinary } = require('../services/upload.service');

exports.createProgram = async (req, res, next) => {
  try {
    const data = { ...req.body, createdBy: req.user._id };
    
    // Handle images upload
    if (req.files && req.files.images) {
      const images = [];
      const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      
      for (const file of files) {
        if (images.length >= 10) break;
        const uploadedUrl = await uploadToCloudinary(file.path, 'programs');
        images.push(uploadedUrl);
      }
      data.images = images;
    }

    const program = await Program.create(data);
    
    // Notify assigned members
    if (program.assignedMembers?.length) {
      await notifyMany(program.assignedMembers, {
        title: 'Program Assignment',
        message: `You have been assigned to: ${program.title}`,
        type: 'assignment',
        relatedId: program._id,
        relatedModel: 'Program',
      });
    }
    return success(res, program, 'Program created', 201);
  } catch (err) { next(err); }
};

exports.getAllPrograms = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) filter.title = { $regex: req.query.search, $options: 'i' };

    const [programs, total] = await Promise.all([
      Program.find(filter).skip(skip).limit(limit)
        .populate('createdBy', 'fullName role')
        .populate('assignedMembers', 'fullName email')
        .sort('-createdAt'),
      Program.countDocuments(filter),
    ]);
    return paginated(res, programs, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

exports.getPublicPrograms = async (req, res, next) => {
  try {
    const filter = { isPublic: true };
    if (req.query.status) filter.status = req.query.status;
    
    const programs = await Program.find(filter)
      .populate('createdBy', 'fullName')
      .sort('-createdAt');
    return success(res, programs);
  } catch (err) { next(err); }
};

exports.getProgramById = async (req, res, next) => {
  try {
    const program = await Program.findById(req.params.id)
      .populate('createdBy', 'fullName role')
      .populate('assignedMembers', 'fullName email phone');
    if (!program) return error(res, 'Program not found', 404);
    return success(res, program);
  } catch (err) { next(err); }
};

exports.updateProgram = async (req, res, next) => {
  try {
    const program = await Program.findById(req.params.id);
    if (!program) return error(res, 'Program not found', 404);

    // Only creator or chairman can update
    if (program.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'chairman') {
      return error(res, 'Not authorized to update this program', 403);
    }

    const data = { ...req.body };
    
    // Handle images upload
    if (req.files && req.files.images) {
      const images = [...(program.images || [])];
      const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      
      for (const file of files) {
        if (images.length >= 10) break;
        const uploadedUrl = await uploadToCloudinary(file.path, 'programs');
        images.push(uploadedUrl);
      }
      // Merge existing images with new ones, max 10
      data.images = images.slice(0, 10);
    }

    Object.assign(program, data);
    await program.save();
    return success(res, program, 'Program updated');
  } catch (err) { next(err); }
};

exports.deleteProgram = async (req, res, next) => {
  try {
    const program = await Program.findByIdAndDelete(req.params.id);
    if (!program) return error(res, 'Program not found', 404);
    return success(res, null, 'Program deleted');
  } catch (err) { next(err); }
};

exports.assignMembers = async (req, res, next) => {
  try {
    const { memberIds } = req.body;
    const program = await Program.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { assignedMembers: { $each: memberIds } } },
      { new: true }
    ).populate('assignedMembers', 'fullName email');

    if (!program) return error(res, 'Program not found', 404);

    await notifyMany(memberIds, {
      title: 'Program Assignment',
      message: `You have been assigned to: ${program.title}`,
      type: 'assignment',
      relatedId: program._id,
      relatedModel: 'Program',
    });

    return success(res, program, 'Members assigned');
  } catch (err) { next(err); }
};

exports.removeMembers = async (req, res, next) => {
  try {
    const { memberIds } = req.body;
    const program = await Program.findByIdAndUpdate(
      req.params.id,
      { $pull: { assignedMembers: { $in: memberIds } } },
      { new: true }
    );
    if (!program) return error(res, 'Program not found', 404);
    return success(res, program, 'Members removed');
  } catch (err) { next(err); }
};

// Join requests
exports.submitJoinRequest = async (req, res, next) => {
  try {
    const { name, email, phone, message } = req.body;
    const program = await Program.findById(req.params.id);
    
    if (!program) return error(res, 'Program not found', 404);
    if (!program.isPublic) return error(res, 'Program not open for join requests', 403);

    // Check if already submitted
    const existingRequest = program.joinRequests.find(
      (r) => r.email.toLowerCase() === email.toLowerCase()
    );
    if (existingRequest) return error(res, 'Join request already submitted', 400);

    program.joinRequests.push({
      user: req.user?._id || null,
      name,
      email,
      phone,
      message,
    });

    await program.save();

    return success(res, program, 'Join request submitted successfully');
  } catch (err) { next(err); }
};

exports.getJoinRequests = async (req, res, next) => {
  try {
    const program = await Program.findById(req.params.id)
      .populate('joinRequests.user', 'fullName email');
    
    if (!program) return error(res, 'Program not found', 404);
    return success(res, program.joinRequests);
  } catch (err) { next(err); }
};

exports.updateJoinRequestStatus = async (req, res, next) => {
  try {
    const { requestId, status } = req.body;
    const program = await Program.findById(req.params.id);
    
    if (!program) return error(res, 'Program not found', 404);

    const joinRequest = program.joinRequests.id(requestId);
    if (!joinRequest) return error(res, 'Join request not found', 404);

    joinRequest.status = status;

    // If approved, add to assigned members
    if (status === 'approved' && joinRequest.user) {
      if (!program.assignedMembers.includes(joinRequest.user)) {
        program.assignedMembers.push(joinRequest.user);
      }
    }

    await program.save();

    return success(res, program, 'Join request status updated');
  } catch (err) { next(err); }
};
