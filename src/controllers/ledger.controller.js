const ContributionLedger = require('../models/ContributionLedger');
const ContributionMonth = require('../models/ContributionMonth');
const TargetAllocation = require('../models/TargetAllocation');
const Installment = require('../models/Installment');
const FinanceTarget = require('../models/FinanceTarget');
const User = require('../models/User');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');
const { createNotification } = require('../services/notification.service');
const { log } = require('../services/audit.service');
const {
  getOrCreateLedger,
  getOrCreateMonth,
  updateLedger,
  assignPaymentToMonths,
  generateMonthlyRecords
} = require('../services/ledger.service');
const { calculateRequiredContribution } = require('../services/contributionCalc.service');

/**
 * Get all ledgers (treasurer/admin view)
 */
exports.getAllLedgers = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    
    if (req.query.membershipType) filter.membershipType = req.query.membershipType;
    if (req.query.status) filter.status = req.query.status;

    const ledgers = await ContributionLedger.find(filter)
      .populate('memberId', 'fullName email phone membershipType')
      .sort('-updatedAt')
      .skip(skip)
      .limit(limit);

    const total = await ContributionLedger.countDocuments(filter);

    return paginated(res, ledgers, { ...paginationMeta(page, limit, total) });
  } catch (err) { next(err); }
};

/**
 * Get single member ledger
 */
exports.getMemberLedger = async (req, res, next) => {
  try {
    const userId = req.params.memberId || req.user._id;
    
    const ledger = await getOrCreateLedger(userId);
    const months = await ContributionMonth.find({ ledgerId: ledger._id }).sort('month');
    const recentPayments = await Installment.find({ userId, status: 'approved' })
      .sort('-createdAt')
      .limit(20);

    return success(res, {
      ledger: ledger.toObject(),
      months,
      recentPayments
    });
  } catch (err) { next(err); }
};

// Helper: Generate receipt number
const generateReceiptNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `VOA-PAY-${year}${month}-${random}`;
};

/**
 * Add manual payment
 */
exports.addManualPayment = async (req, res, next) => {
  try {
    const {
      memberId,
      externalMemberName,
      amount,
      paymentDate,
      paymentMethod,
      referenceNumber,
      notes,
      paidForMonths,
      targetAllocations
    } = req.body;

    // Check if it's an external member
    if (!memberId && !externalMemberName) {
      return error(res, 'Either memberId or externalMemberName is required', 400);
    }

    let member = null;
    if (memberId) {
      member = await User.findById(memberId);
      if (!member) return error(res, 'Member not found', 404);
    }

    // Generate receipt number if not provided
    const finalReceiptNumber = referenceNumber || generateReceiptNumber();

    // Determine the month(s) for the payment
    const paymentMonth = paidForMonths && paidForMonths.length > 0 
      ? paidForMonths[0] 
      : new Date().toISOString().slice(0, 7);

    // Create installment
    const installment = await Installment.create({
      userId: memberId || null,
      externalMemberName: externalMemberName || null,
      amount: parseFloat(amount),
      month: paymentMonth,
      paymentMethod: paymentMethod || 'cash',
      referenceNote: notes || '',
      status: 'approved',
      approvedBy: req.user._id,
      approvedAt: paymentDate ? new Date(paymentDate) : new Date(),
      receiptNumber: finalReceiptNumber
    });

    // If it's a platform member, update ledger
    if (memberId && member) {
      // Get ledger
      const ledger = await getOrCreateLedger(memberId);

      // Allocate payment
      if (paidForMonths && paidForMonths.length > 0) {
        await assignPaymentToMonths(ledger._id, installment._id, paidForMonths);
      } else {
        // Use FIFO allocation
        const { allocatePaymentFIFO } = require('../services/ledger.service');
        await allocatePaymentFIFO(ledger._id, parseFloat(amount), installment._id);
      }
    }

    // Handle target allocations
    if (targetAllocations && targetAllocations.length > 0) {
      for (const allocation of targetAllocations) {
        await TargetAllocation.create({
          paymentId: installment._id,
          targetId: allocation.targetId,
          amount: parseFloat(allocation.amount),
          allocatedBy: req.user._id
        });

        // Update target
        const target = await FinanceTarget.findById(allocation.targetId);
        if (target) {
          target.amountRaised += parseFloat(allocation.amount);
          if (target.amountRaised >= target.targetAmount && !target.isCompleted) {
            target.isCompleted = true;
            target.completedAt = new Date();
          }
          await target.save();
        }
      }
    }

    // Audit log
    await log({
      actor: req.user,
      action: 'MANUAL_PAYMENT',
      entity: 'Installment',
      entityId: installment._id,
      details: {
        memberId,
        externalMemberName,
        amount,
        paymentMethod,
        referenceNumber
      },
      ip: req.ip
    });

    // Notify member if it's a platform member
    if (memberId && member) {
      await createNotification({
        recipient: memberId,
        title: 'Payment Recorded',
        message: `Your payment of ₦${parseFloat(amount).toLocaleString()} has been recorded.`,
        type: 'general',
        relatedId: installment._id,
        relatedModel: 'Installment'
      });
    }

    return success(res, installment, 'Payment recorded successfully', 201);
  } catch (err) { next(err); }
};

/**
 * Mark month as paid
 */
exports.markMonthPaid = async (req, res, next) => {
  try {
    const { memberId, month, amount } = req.body;
    
    const ledger = await getOrCreateLedger(memberId);
    const contributionMonth = await getOrCreateMonth(ledger._id, memberId, month);

    const paidAmount = parseFloat(amount || contributionMonth.requiredAmount);
    contributionMonth.paidAmount = paidAmount;
    contributionMonth.outstandingAmount = contributionMonth.requiredAmount - paidAmount;
    contributionMonth.status = paidAmount >= contributionMonth.requiredAmount ? 'paid' : 'partially_paid';
    
    await contributionMonth.save();
    await updateLedger(ledger._id);

    await log({
      actor: req.user,
      action: 'MARK_MONTH_PAID',
      entity: 'ContributionMonth',
      entityId: contributionMonth._id,
      details: { memberId, month, amount: paidAmount },
      ip: req.ip
    });

    return success(res, contributionMonth, 'Month marked as paid');
  } catch (err) { next(err); }
};

/**
 * Allocate payment to specific months
 */
exports.allocatePayment = async (req, res, next) => {
  try {
    const { memberId, paymentId, months } = req.body;
    
    const ledger = await getOrCreateLedger(memberId);
    await assignPaymentToMonths(ledger._id, paymentId, months);

    await log({
      actor: req.user,
      action: 'ALLOCATE_PAYMENT',
      entity: 'Installment',
      entityId: paymentId,
      details: { memberId, months },
      ip: req.ip
    });

    return success(res, null, 'Payment allocated successfully');
  } catch (err) { next(err); }
};

/**
 * Allocate to targets
 */
exports.allocateToTargets = async (req, res, next) => {
  try {
    const { paymentId, allocations } = req.body;

    for (const allocation of allocations) {
      await TargetAllocation.create({
        paymentId,
        targetId: allocation.targetId,
        amount: parseFloat(allocation.amount),
        allocatedBy: req.user._id
      });

      const target = await FinanceTarget.findById(allocation.targetId);
      if (target) {
        target.amountRaised += parseFloat(allocation.amount);
        if (target.amountRaised >= target.targetAmount && !target.isCompleted) {
          target.isCompleted = true;
          target.completedAt = new Date();
        }
        await target.save();
      }
    }

    await log({
      actor: req.user,
      action: 'ALLOCATE_TO_TARGETS',
      entity: 'Installment',
      entityId: paymentId,
      details: { allocations },
      ip: req.ip
    });

    return success(res, null, 'Amount allocated to targets');
  } catch (err) { next(err); }
};

/**
 * Get target contributions for member
 */
exports.getMemberTargetContributions = async (req, res, next) => {
  try {
    const userId = req.params.memberId || req.user._id;
    
    const payments = await Installment.find({ userId, status: 'approved' });
    const paymentIds = payments.map(p => p._id);
    
    const allocations = await TargetAllocation.find({ paymentId: { $in: paymentIds } })
      .populate('targetId', 'title category')
      .populate('paymentId', 'amount createdAt')
      .sort('-createdAt');

    return success(res, allocations);
  } catch (err) { next(err); }
};

/**
 * Get finance dashboard stats
 */
exports.getFinanceDashboardStats = async (req, res, next) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentYear = new Date().getFullYear();
    
    const totalMembers = await User.countDocuments({ status: 'active' });
    
    // Get all ledgers with member data
    const ledgers = await ContributionLedger.find().populate('memberId', 'fullName');
    let totalCollectedThisMonth = 0;
    let totalOutstanding = 0;
    let totalArrears = 0;
    let totalExpectedThisMonth = 0;
    let totalTreasuryBalance = 0;
    
    // Calculate totals
    for (const ledger of ledgers) {
      totalOutstanding += ledger.outstandingBalance || 0;
      totalArrears += ledger.arrears || 0;
      totalExpectedThisMonth += ledger.monthlyRequiredAmount || 0;
      
      const monthRecord = await ContributionMonth.findOne({
        ledgerId: ledger._id,
        month: currentMonth
      });
      
      if (monthRecord) {
        totalCollectedThisMonth += monthRecord.paidAmount || 0;
      }
    }
    
    // Get payments for current month, including external members
    const currentMonthPayments = await Installment.find({ 
      month: currentMonth, 
      status: 'approved' 
    });
    let totalCurrentMonthPayments = 0;
    for (const pmt of currentMonthPayments) {
      totalCurrentMonthPayments += pmt.amount;
    }
    
    // Get treasury account balance
    const TreasuryAccount = require('../models/TreasuryAccount');
    const treasuryAccounts = await TreasuryAccount.find({ isActive: true });
    totalTreasuryBalance = treasuryAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    
    const pendingPayments = await Installment.countDocuments({ status: 'pending' });
    const recentPayments = await Installment.find({ status: 'approved' })
      .sort('-createdAt')
      .limit(10)
      .populate('userId', 'fullName');
    
    const activeTargets = await FinanceTarget.find({ isActive: true, isCompleted: false });
    const totalTargetRaised = activeTargets.reduce((sum, t) => sum + (t.amountRaised || 0), 0);

    return success(res, {
      totalMembers,
      expectedThisMonth: totalExpectedThisMonth,
      collectedThisMonth: totalCurrentMonthPayments,
      outstandingBalance: totalOutstanding,
      totalArrears,
      activeTargets: activeTargets.length,
      targetFundsRaised: totalTargetRaised,
      pendingPayments,
      recentPayments,
      treasuryBalance: totalTreasuryBalance
    });
  } catch (err) { next(err); }
};

/**
 * Generate monthly records (manual trigger)
 */
exports.generateMonthlyRecords = async (req, res, next) => {
  try {
    const { month } = req.body;
    const result = await generateMonthlyRecords(month);
    return success(res, result, `Generated monthly records for ${result.count} members`);
  } catch (err) { next(err); }
};

/**
 * Export finance data
 */
exports.exportFinanceData = async (req, res, next) => {
  try {
    const { type = 'ledgers', format = 'csv' } = req.query;
    
    let data = [];
    let filename = '';
    
    if (type === 'ledgers') {
      const ledgers = await ContributionLedger.find()
        .populate('memberId', 'fullName email membershipType phone')
        .sort('-updatedAt');
      
      data = ledgers.map(ledger => ({
        'Member Name': ledger.memberId?.fullName || '',
        'Email': ledger.memberId?.email || '',
        'Phone': ledger.memberId?.phone || '',
        'Membership Type': ledger.membershipType,
        'Monthly Required': ledger.monthlyRequiredAmount,
        'Total Paid': ledger.totalPaid,
        'Outstanding': ledger.outstandingBalance,
        'Arrears': ledger.arrears,
        'Status': ledger.status,
        'Months Paid': ledger.monthsPaid,
        'Months Owing': ledger.monthsOwing,
        'Last Payment Date': ledger.lastPaymentDate
      }));
      
      filename = `voa-member-ledgers-${new Date().toISOString().slice(0,10)}`;
    } else if (type === 'payments') {
      const payments = await Installment.find()
        .populate('userId', 'fullName')
        .sort('-createdAt');
      
      data = payments.map(p => ({
        'Member Name': p.userId?.fullName || p.externalMemberName || '',
        'Type': p.userId ? 'Platform Member' : 'External Member',
        'Amount': p.amount,
        'Method': p.paymentMethod,
        'Receipt Number': p.receiptNumber,
        'Status': p.status,
        'Date': p.createdAt,
        'Month': p.month,
        'Notes': p.referenceNote
      }));
      
      filename = `voa-payments-${new Date().toISOString().slice(0,10)}`;
    } else if (type === 'targets') {
      const targets = await FinanceTarget.find().sort('-createdAt');
      
      data = targets.map(t => ({
        'Target Name': t.title,
        'Category': t.category,
        'Goal Amount': t.targetAmount,
        'Raised': t.amountRaised,
        'Remaining': t.targetAmount - t.amountRaised,
        'Status': t.isCompleted ? 'Completed' : 'Active',
        'Due Date': t.dueDate
      }));
      
      filename = `voa-targets-${new Date().toISOString().slice(0,10)}`;
    }
    
    // For now, return JSON; add Excel export library later
    return success(res, {
      type,
      format,
      filename,
      data,
      message: 'Data ready for export'
    });
  } catch (err) { next(err); }
};

module.exports = exports;
