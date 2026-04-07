 const MonthlyContribution = require('../models/MonthlyContribution');
const Installment = require('../models/Installment');
const FinanceTarget = require('../models/FinanceTarget');
const User = require('../models/User');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');
const { createNotification } = require('../services/notification.service');
const { uploadToCloudinary } = require('../services/upload.service');
const { log } = require('../services/audit.service');
const { calculateRequiredContribution, getMinimumPayment } = require('../services/contributionCalc.service');
const { awardEarlyContributorBonus, awardContributionPoints } = require('../services/points.service');

const generateReceiptNumber = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `VOA-RCP-${ts}-${rand}`;
};

// ── Get or create monthly contribution record ─────────────────────────────────
const getOrCreateMonthlyRecord = async (userId, month) => {
  let record = await MonthlyContribution.findOne({ userId, month });
  if (!record) {
    const user = await User.findById(userId);
    const { requiredAmount, breakdown, calculationSource } = await calculateRequiredContribution(user);
    const [year] = month.split('-').map(Number);
    record = await MonthlyContribution.create({
      userId, month, year, requiredAmount, breakdown, calculationSource,
    });
  }
  return record;
};

// ── Get required amount for current user ─────────────────────────────────────
exports.getRequiredAmount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const result = await calculateRequiredContribution(user);
    // Include treasurer phone for WhatsApp notifications
    const treasurer = await User.findOne({ role: 'treasurer', status: 'active' }).select('phone fullName');
    return success(res, { ...result, minimumPayment: getMinimumPayment(), treasurerPhone: treasurer?.phone || null, treasurerName: treasurer?.fullName || null });
  } catch (err) { next(err); }
};

// ── Get monthly status for current user ──────────────────────────────────────
exports.getMonthlyStatus = async (req, res, next) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const record = await getOrCreateMonthlyRecord(req.user._id, month);
    const installments = await Installment.find({ userId: req.user._id, month })
      .populate('approvedBy', 'fullName')
      .sort('-createdAt');
    return success(res, { record, installments });
  } catch (err) { next(err); }
};

// ── Submit an installment payment ─────────────────────────────────────────────
exports.submitInstallment = async (req, res, next) => {
  try {
    const { month, amount, paymentMode, paymentMethod, referenceNote, accountId, targetId } = req.body;
    const paidAmount = parseFloat(amount);
    const MAX_PAYMENT = 100000;

    if (!paidAmount || isNaN(paidAmount) || paidAmount <= 0) {
      return error(res, 'A valid payment amount is required', 400);
    }

    if (paidAmount > MAX_PAYMENT) {
      return error(res, `Maximum single payment is ₦${MAX_PAYMENT.toLocaleString()}`, 400);
    }

    // Get the monthly record (creates it if it doesn't exist)
    const monthlyRecord = await getOrCreateMonthlyRecord(req.user._id, month);
    const dueAmount = monthlyRecord.requiredAmount;
    const remaining = Math.max(0, dueAmount - monthlyRecord.amountPaid);

    // Validate minimum: must be at least ₦1, and for required mode must match remaining
    const mode = paymentMode || 'required';

    if (mode === 'required') {
      // Required mode: amount must equal the remaining balance (or full required if nothing paid yet)
      const expectedAmount = remaining > 0 ? remaining : dueAmount;
      if (Math.abs(paidAmount - expectedAmount) > 1) { // allow ₦1 rounding tolerance
        return error(res, `Required payment amount is ₦${expectedAmount.toLocaleString()}`, 400);
      }
    }

    // For custom and installment: minimum is ₦1 (no artificial floor above the actual due)
    if ((mode === 'custom' || mode === 'installment') && paidAmount < 1) {
      return error(res, 'Amount must be at least ₦1', 400);
    }

    let proofImage = null;
    if (req.file) proofImage = await uploadToCloudinary(req.file.path, 'voa/contributions');

    const installment = await Installment.create({
      userId: req.user._id,
      monthlyContributionId: monthlyRecord._id,
      month,
      amount: paidAmount,
      paymentMode: mode,
      paymentMethod: paymentMethod || 'bank_transfer',
      referenceNote: referenceNote || '',
      accountId: accountId || null,
      targetId: targetId || null,
      proofImage,
      status: 'pending',
      calculatedDueAtSubmission: dueAmount,
    });

    // Notify treasurer
    const treasurer = await User.findOne({ role: 'treasurer', status: 'active' });
    if (treasurer) {
      const modeLabel = mode === 'installment' ? 'installment' : mode === 'custom' ? 'custom' : 'full';
      await createNotification({
        recipient: treasurer._id,
        title: 'New Contribution Payment',
        message: `${req.user.fullName} submitted ₦${paidAmount.toLocaleString()} (${modeLabel}) for ${month}`,
        type: 'general',
        relatedId: installment._id,
        relatedModel: 'Installment',
      });
    }

    return success(res, { installment, monthlyRecord }, 'Payment submitted successfully. Awaiting treasurer approval.', 201);
  } catch (err) { next(err); }
};

// ── Treasurer approves installment ────────────────────────────────────────────
exports.approveInstallment = async (req, res, next) => {
  try {
    const inst = await Installment.findById(req.params.id).populate('userId');
    if (!inst) return error(res, 'Installment not found', 404);
    if (inst.status !== 'pending') return error(res, 'Already processed', 400);

    const monthlyRecord = await MonthlyContribution.findById(inst.monthlyContributionId);
    if (!monthlyRecord) return error(res, 'Monthly record not found', 404);

    const receiptNumber = generateReceiptNumber();
    inst.status = 'approved';
    inst.approvedBy = req.user._id;
    inst.approvedAt = new Date();
    inst.receiptNumber = receiptNumber;

    // Update monthly record
    const newAmountPaid = monthlyRecord.amountPaid + inst.amount;
    // isExtraPayment = this specific payment pushed total above required
    inst.isExtraPayment = newAmountPaid > monthlyRecord.requiredAmount && monthlyRecord.requiredAmount > 0;

    monthlyRecord.amountPaid = newAmountPaid;
    if (newAmountPaid >= monthlyRecord.requiredAmount && !monthlyRecord.isCompleted) {
      monthlyRecord.isCompleted = true;
      monthlyRecord.completedAt = new Date();
    }
    if (newAmountPaid > monthlyRecord.requiredAmount) {
      monthlyRecord.extraAmount = newAmountPaid - monthlyRecord.requiredAmount;
    }
    await monthlyRecord.save();

    // Award points — use the monthly record's requiredAmount as the minimum baseline
    const totalPoints = await awardContributionPoints(inst.userId._id, inst._id, inst.amount, monthlyRecord.requiredAmount);
    await awardEarlyContributorBonus(inst.userId._id, inst._id);
    inst.pointsAwarded = totalPoints;
    await inst.save();

    // Update finance target if linked
    if (inst.targetId) {
      const target = await FinanceTarget.findById(inst.targetId);
      if (target) {
        target.amountRaised += inst.amount;
        if (target.amountRaised >= target.targetAmount && !target.isCompleted) {
          target.isCompleted = true;
          target.completedAt = new Date();
        }
        await target.save();
      }
    }

    // Notify member
    const remaining = Math.max(0, monthlyRecord.requiredAmount - monthlyRecord.amountPaid);
    const msg = monthlyRecord.isCompleted
      ? `Your ${inst.month} contribution is now COMPLETE! ✅ Receipt: ${receiptNumber}. +${totalPoints} pts!`
      : `₦${inst.amount.toLocaleString()} approved. Remaining for ${inst.month}: ₦${remaining.toLocaleString()}. Receipt: ${receiptNumber}.`;

    await createNotification({
      recipient: inst.userId._id,
      title: monthlyRecord.isCompleted ? '🎉 Monthly Contribution Complete!' : '✅ Payment Approved',
      message: msg,
      type: 'achievement',
      relatedId: inst._id,
      relatedModel: 'Installment',
    });

    await log({ actor: req.user, action: 'APPROVE_INSTALLMENT', entity: 'Installment', entityId: inst._id, details: { month: inst.month, amount: inst.amount }, ip: req.ip });
    return success(res, { installment: inst, monthlyRecord }, 'Payment approved');
  } catch (err) { next(err); }
};

// ── Treasurer rejects installment ─────────────────────────────────────────────
exports.rejectInstallment = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const inst = await Installment.findById(req.params.id).populate('userId');
    if (!inst) return error(res, 'Installment not found', 404);
    if (inst.status !== 'pending') return error(res, 'Already processed', 400);

    inst.status = 'rejected';
    inst.approvedBy = req.user._id;
    inst.approvedAt = new Date();
    inst.rejectionReason = reason || 'Proof not valid';
    await inst.save();

    await createNotification({
      recipient: inst.userId._id,
      title: 'Payment Rejected',
      message: `Your ₦${inst.amount.toLocaleString()} payment for ${inst.month} was rejected. Reason: ${inst.rejectionReason}`,
      type: 'general',
      relatedId: inst._id,
      relatedModel: 'Installment',
    });

    return success(res, inst, 'Payment rejected');
  } catch (err) { next(err); }
};

// ── Get all installments (treasurer view) ─────────────────────────────────────
exports.getAllInstallments = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.month) filter.month = req.query.month;

    const isTreasurer = ['treasurer', 'chairman', 'super_admin', 'vice_chairman'].includes(req.user.role) || req.user.isVice;
    if (!isTreasurer) {
      filter.userId = req.user._id;
    }

    // membershipType filter — join via User
    let userIdFilter = null;
    if (req.query.membershipType && isTreasurer) {
      const matchingUsers = await User.find({ membershipType: req.query.membershipType }).select('_id');
      userIdFilter = matchingUsers.map(u => u._id);
      filter.userId = { $in: userIdFilter };
    }

    const [installments, total] = await Promise.all([
      Installment.find(filter).skip(skip).limit(limit)
        .populate('userId', 'fullName email gender membershipType profileImage dob')
        .populate('approvedBy', 'fullName')
        .populate('accountId', 'accountName bankName accountNumber')
        .sort('-createdAt'),
      Installment.countDocuments(filter),
    ]);
    return paginated(res, installments, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

// ── Get all monthly records (treasurer view) ──────────────────────────────────
exports.getAllMonthlyRecords = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.month) filter.month = req.query.month;
    if (req.query.isCompleted !== undefined) filter.isCompleted = req.query.isCompleted === 'true';

    const isTreasurer = ['treasurer', 'chairman', 'super_admin', 'vice_chairman'].includes(req.user.role) || req.user.isVice;
    if (!isTreasurer) {
      filter.userId = req.user._id;
    }

    // membershipType filter — join via User
    if (req.query.membershipType && isTreasurer) {
      const matchingUsers = await User.find({ membershipType: req.query.membershipType }).select('_id');
      filter.userId = { $in: matchingUsers.map(u => u._id) };
    }

    const [records, total] = await Promise.all([
      MonthlyContribution.find(filter).skip(skip).limit(limit)
        .populate('userId', 'fullName email gender membershipType profileImage dob')
        .sort('-month'),
      MonthlyContribution.countDocuments(filter),
    ]);
    return paginated(res, records, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

// ── Transparency summary ──────────────────────────────────────────────────────
exports.getSummary = async (req, res, next) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const [total, completed, pending, totalRaised, totalRequired] = await Promise.all([
      MonthlyContribution.countDocuments({ month }),
      MonthlyContribution.countDocuments({ month, isCompleted: true }),
      MonthlyContribution.countDocuments({ month, isCompleted: false }),
      MonthlyContribution.aggregate([{ $match: { month } }, { $group: { _id: null, total: { $sum: '$amountPaid' } } }]),
      MonthlyContribution.aggregate([{ $match: { month } }, { $group: { _id: null, total: { $sum: '$requiredAmount' } } }]),
    ]);
    return success(res, {
      month, total, completed, pending,
      totalAmount: totalRaised[0]?.total || 0,
      totalRequired: totalRequired[0]?.total || 0,
      totalExtraContributions: 0,
      topSupportersCount: 0,
    });
  } catch (err) { next(err); }
};

// ── Recalculate required amount for current user's open monthly records ───────
// Called when DOB, gender, membership type, or children change
exports.recalculateMyContribution = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const { requiredAmount, breakdown, calculationSource } = await calculateRequiredContribution(user);
    const month = req.query.month || new Date().toISOString().slice(0, 7);

    // Update the open (not completed) monthly record if it exists
    const record = await MonthlyContribution.findOne({ userId: req.user._id, month, isCompleted: false });
    if (record) {
      record.requiredAmount = requiredAmount;
      record.breakdown = breakdown || [];
      record.calculationSource = calculationSource;
      // Recalculate extra/completion based on new required
      if (record.amountPaid >= requiredAmount && requiredAmount > 0) {
        record.isCompleted = true;
        record.completedAt = record.completedAt || new Date();
        record.extraAmount = record.amountPaid - requiredAmount;
      } else {
        record.isCompleted = false;
        record.completedAt = null;
        record.extraAmount = 0;
      }
      await record.save();
    }

    return success(res, { requiredAmount, breakdown, calculationSource, record: record || null });
  } catch (err) { next(err); }
};
