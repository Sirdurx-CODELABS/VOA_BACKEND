const Contribution = require('../models/Contribution');
const User = require('../models/User');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');
const { createNotification } = require('../services/notification.service');
const { uploadToCloudinary } = require('../services/upload.service');
const { log } = require('../services/audit.service');

// Minimum contribution by gender
const MINIMUMS = { male: 3000, female: 2000, other: 2500 };

const generateReceiptNumber = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `VOA-RCP-${ts}-${rand}`;
};

/**
 * Calculate points:
 * Base: 10 pts for minimum
 * Bonus: +1 pt per ₦500 above minimum
 */
const calcPoints = (amount, minimum) => {
  const extra = Math.max(0, amount - minimum);
  return 10 + Math.floor(extra / 500);
};

// ── Member submits contribution ───────────────────────────────────────────────
exports.submit = async (req, res, next) => {
  try {
    const { month, paymentMethod, referenceNote, accountId, amount } = req.body;
    const user = await User.findById(req.user._id);
    const minimum = MINIMUMS[user.gender] || 2500;
    const paidAmount = parseFloat(amount);

    // Validate amount
    if (!paidAmount || isNaN(paidAmount)) {
      return error(res, 'Amount is required', 400);
    }
    if (paidAmount < minimum) {
      return error(res, `Amount must not be less than the required minimum contribution of ₦${minimum.toLocaleString()}`, 400);
    }

    // Check for duplicate
    const existing = await Contribution.findOne({ userId: req.user._id, month });
    if (existing) return error(res, `You already submitted a contribution for ${month}`, 409);

    let proofImage = null;
    if (req.file) {
      proofImage = await uploadToCloudinary(req.file.path, 'voa/contributions');
    }

    const extraAmount = Math.max(0, paidAmount - minimum);
    const isAboveMinimum = paidAmount > minimum;

    const contribution = await Contribution.create({
      userId: req.user._id,
      amount: paidAmount,
      minimumRequiredAmount: minimum,
      isAboveMinimum,
      extraAmount,
      month,
      paymentMethod: paymentMethod || 'bank_transfer',
      referenceNote,
      accountId: accountId || null,
      proofImage,
      status: 'pending',
    });

    // Notify treasurer
    const treasurer = await User.findOne({ role: 'treasurer', status: 'active' });
    if (treasurer) {
      const extra = isAboveMinimum ? ` (+₦${extraAmount.toLocaleString()} extra)` : '';
      await createNotification({
        recipient: treasurer._id,
        title: 'New Contribution Submitted',
        message: `${user.fullName} submitted ₦${paidAmount.toLocaleString()}${extra} for ${month}`,
        type: 'general',
        relatedId: contribution._id,
        relatedModel: 'Contribution',
      });
    }

    return success(res, contribution, 'Contribution submitted successfully', 201);
  } catch (err) { next(err); }
};

// ── Get contributions ─────────────────────────────────────────────────────────
exports.getAll = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.month) filter.month = req.query.month;
    // Members only see their own
    if (!['treasurer', 'chairman', 'super_admin', 'vice_chairman'].includes(req.user.role)) {
      filter.userId = req.user._id;
    }

    const [contributions, total] = await Promise.all([
      Contribution.find(filter).skip(skip).limit(limit)
        .populate('userId', 'fullName email gender profileImage')
        .populate('approvedBy', 'fullName')
        .populate('accountId', 'accountName bankName accountNumber')
        .sort('-createdAt'),
      Contribution.countDocuments(filter),
    ]);
    return paginated(res, contributions, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const c = await Contribution.findById(req.params.id)
      .populate('userId', 'fullName email gender profileImage engagementScore')
      .populate('approvedBy', 'fullName role')
      .populate('accountId', 'accountName bankName accountNumber');
    if (!c) return error(res, 'Contribution not found', 404);
    if (req.user.role === 'member' && c.userId._id.toString() !== req.user._id.toString()) {
      return error(res, 'Not authorized', 403);
    }
    return success(res, c);
  } catch (err) { next(err); }
};

// ── Treasurer approves ────────────────────────────────────────────────────────
exports.approve = async (req, res, next) => {
  try {
    const c = await Contribution.findById(req.params.id).populate('userId');
    if (!c) return error(res, 'Contribution not found', 404);
    if (c.status !== 'pending') return error(res, 'Contribution already processed', 400);

    const points = calcPoints(c.amount, c.minimumRequiredAmount);
    const receiptNumber = generateReceiptNumber();

    c.status = 'approved';
    c.approvedBy = req.user._id;
    c.approvedAt = new Date();
    c.receiptNumber = receiptNumber;
    c.pointsAwarded = points;
    await c.save();

    // Award points
    await User.findByIdAndUpdate(c.userId._id, {
      $inc: { points, engagementScore: points },
    });

    // Personalised notification
    const extraMsg = c.isAboveMinimum
      ? ` Thank you for your extra ₦${c.extraAmount.toLocaleString()} support ❤️`
      : ' Thank you for fulfilling your contribution.';

    await createNotification({
      recipient: c.userId._id,
      title: '✅ Contribution Approved!',
      message: `Your ₦${c.amount.toLocaleString()} contribution for ${c.month} has been approved.${extraMsg} Receipt: ${receiptNumber}. +${points} pts awarded!`,
      type: 'achievement',
      relatedId: c._id,
      relatedModel: 'Contribution',
    });

    await log({ actor: req.user, action: 'APPROVE_CONTRIBUTION', entity: 'Contribution', entityId: c._id, details: { month: c.month, amount: c.amount, points }, ip: req.ip });
    return success(res, c, 'Contribution approved and receipt generated');
  } catch (err) { next(err); }
};

// ── Treasurer rejects ─────────────────────────────────────────────────────────
exports.reject = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const c = await Contribution.findById(req.params.id).populate('userId');
    if (!c) return error(res, 'Contribution not found', 404);
    if (c.status !== 'pending') return error(res, 'Contribution already processed', 400);

    c.status = 'rejected';
    c.approvedBy = req.user._id;
    c.approvedAt = new Date();
    c.rejectionReason = reason || 'Proof of payment not valid';
    await c.save();

    await createNotification({
      recipient: c.userId._id,
      title: 'Contribution Rejected',
      message: `Your contribution for ${c.month} was rejected. Reason: ${c.rejectionReason}. Please resubmit with valid proof.`,
      type: 'general',
      relatedId: c._id,
      relatedModel: 'Contribution',
    });

    await log({ actor: req.user, action: 'REJECT_CONTRIBUTION', entity: 'Contribution', entityId: c._id, ip: req.ip });
    return success(res, c, 'Contribution rejected');
  } catch (err) { next(err); }
};

// ── Transparency summary ──────────────────────────────────────────────────────
exports.getSummary = async (req, res, next) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const [total, approved, pending, rejected, amountAgg, extraAgg] = await Promise.all([
      Contribution.countDocuments({ month }),
      Contribution.countDocuments({ month, status: 'approved' }),
      Contribution.countDocuments({ month, status: 'pending' }),
      Contribution.countDocuments({ month, status: 'rejected' }),
      Contribution.aggregate([
        { $match: { month, status: 'approved' } },
        { $group: { _id: null, totalAmount: { $sum: '$amount' }, totalMinimum: { $sum: '$minimumRequiredAmount' }, totalExtra: { $sum: '$extraAmount' } } },
      ]),
      Contribution.countDocuments({ month, status: 'approved', isAboveMinimum: true }),
    ]);

    const agg = amountAgg[0] || { totalAmount: 0, totalMinimum: 0, totalExtra: 0 };

    return success(res, {
      month, total, approved, pending, rejected,
      totalAmount: agg.totalAmount,
      totalMinimumExpected: agg.totalMinimum,
      totalExtraContributions: agg.totalExtra,
      topSupportersCount: extraAgg,
    });
  } catch (err) { next(err); }
};

// ── Required amount for current user ─────────────────────────────────────────
exports.getRequiredAmount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const minimum = MINIMUMS[user.gender] || 2500;
    return success(res, { minimum, gender: user.gender, MINIMUMS });
  } catch (err) { next(err); }
};
