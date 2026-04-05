const Program = require('../models/Program');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');
const { createNotification, notifyMany } = require('../services/notification.service');

exports.createProgram = async (req, res, next) => {
  try {
    const program = await Program.create({ ...req.body, createdBy: req.user._id });
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

    Object.assign(program, req.body);
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
