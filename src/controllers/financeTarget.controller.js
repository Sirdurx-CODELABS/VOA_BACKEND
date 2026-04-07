const FinanceTarget = require('../models/FinanceTarget');
const Contribution = require('../models/Contribution');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');

exports.create = async (req, res, next) => {
  try {
    const { title, description, category, targetAmount, startDate, deadline } = req.body;
    const target = await FinanceTarget.create({
      title, description, category, targetAmount,
      startDate: startDate || new Date(),
      deadline: deadline || null,
      createdBy: req.user._id,
    });
    return success(res, target, 'Finance target created', 201);
  } catch (err) { next(err); }
};

exports.getAll = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.isCompleted !== undefined) filter.isCompleted = req.query.isCompleted === 'true';
    if (req.query.category) filter.category = req.query.category;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const [targets, total] = await Promise.all([
      FinanceTarget.find(filter).skip(skip).limit(limit)
        .populate('createdBy', 'fullName role')
        .sort({ isCompleted: 1, createdAt: -1 }),
      FinanceTarget.countDocuments(filter),
    ]);
    return paginated(res, targets, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const target = await FinanceTarget.findById(req.params.id).populate('createdBy', 'fullName role');
    if (!target) return error(res, 'Target not found', 404);

    // Get contributions linked to this target
    const contributions = await Contribution.find({ targetId: req.params.id, status: 'approved' })
      .populate('userId', 'fullName profileImage')
      .sort('-createdAt')
      .limit(20);

    return success(res, { target, contributions });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const allowed = ['title', 'description', 'category', 'targetAmount', 'deadline', 'isActive'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const target = await FinanceTarget.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!target) return error(res, 'Target not found', 404);
    return success(res, target, 'Target updated');
  } catch (err) { next(err); }
};

exports.markComplete = async (req, res, next) => {
  try {
    const target = await FinanceTarget.findByIdAndUpdate(
      req.params.id,
      { isCompleted: true, completedAt: new Date(), isActive: false },
      { new: true }
    );
    if (!target) return error(res, 'Target not found', 404);
    return success(res, target, 'Target marked as completed');
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    await FinanceTarget.findByIdAndDelete(req.params.id);
    return success(res, null, 'Target deleted');
  } catch (err) { next(err); }
};

// Public summary — visible to all members
exports.getPublicSummary = async (req, res, next) => {
  try {
    const [active, completed, totalRaised] = await Promise.all([
      FinanceTarget.find({ isActive: true, isCompleted: false }).select('title targetAmount amountRaised category'),
      FinanceTarget.find({ isCompleted: true }).select('title targetAmount amountRaised completedAt').limit(5).sort('-completedAt'),
      Contribution.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);
    return success(res, {
      activeTargets: active,
      completedTargets: completed,
      totalRaisedAllTime: totalRaised[0]?.total || 0,
    });
  } catch (err) { next(err); }
};
