const ContributionLedger = require('../models/ContributionLedger');
const ContributionMonth = require('../models/ContributionMonth');
const User = require('../models/User');
const { calculateRequiredContribution } = require('./contributionCalc.service');

/**
 * Get or create a contribution ledger for a member
 */
const getOrCreateLedger = async (userId) => {
  let ledger = await ContributionLedger.findOne({ memberId: userId });
  
  if (!ledger) {
    const user = await User.findById(userId);
    const { requiredAmount } = await calculateRequiredContribution(user);
    
    ledger = await ContributionLedger.create({
      memberId: userId,
      membershipType: user.membershipType || 'adolescent',
      monthlyRequiredAmount: requiredAmount,
      totalPaid: 0,
      outstandingBalance: 0,
      arrears: 0,
      status: 'outstanding',
      monthsPaid: 0,
      monthsOwing: 0,
      lastPaymentDate: null
    });
  }
  
  return ledger;
};

/**
 * Get or create a contribution month record
 */
const getOrCreateMonth = async (ledgerId, userId, month) => {
  const [year, monthNum] = month.split('-').map(Number);
  let contributionMonth = await ContributionMonth.findOne({ ledgerId, month });
  
  if (!contributionMonth) {
    const user = await User.findById(userId);
    const { requiredAmount } = await calculateRequiredContribution(user);
    
    contributionMonth = await ContributionMonth.create({
      ledgerId,
      memberId: userId,
      month,
      year,
      requiredAmount,
      paidAmount: 0,
      outstandingAmount: requiredAmount,
      status: 'unpaid',
      payments: []
    });
  }
  
  return contributionMonth;
};

/**
 * Update ledger status based on paid amounts
 */
const calculateLedgerStatus = (totalPaid, requiredAmount, monthsOwing) => {
  if (totalPaid > requiredAmount) {
    return 'overpaid';
  } else if (totalPaid >= requiredAmount && monthsOwing === 0) {
    return 'fully_paid';
  } else if (totalPaid > 0) {
    return 'partially_paid';
  }
  return 'outstanding';
};

/**
 * Recalculate and update a member's ledger
 */
const updateLedger = async (ledgerId) => {
  const ledger = await ContributionLedger.findById(ledgerId);
  if (!ledger) throw new Error('Ledger not found');

  const months = await ContributionMonth.find({ ledgerId }).sort('month');
  
  let totalPaid = 0;
  let totalArrears = 0;
  let monthsPaid = 0;
  let monthsOwing = 0;
  let lastPaymentDate = null;

  months.forEach(month => {
    totalPaid += month.paidAmount;
    if (month.status === 'paid' || month.status === 'overpaid') {
      monthsPaid++;
    } else if (month.status === 'partially_paid' || month.status === 'unpaid') {
      monthsOwing++;
    }
    totalArrears += month.outstandingAmount;
    
    // Find last payment date
    if (month.paidAmount > 0 && (!lastPaymentDate || month.updatedAt > lastPaymentDate)) {
      lastPaymentDate = month.updatedAt;
    }
  });

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthRecord = months.find(m => m.month === currentMonth);
  const currentMonthRequired = currentMonthRecord ? currentMonthRecord.outstandingAmount : ledger.monthlyRequiredAmount;
  
  const outstandingBalance = totalArrears;

  const status = calculateLedgerStatus(totalPaid, ledger.monthlyRequiredAmount, monthsOwing);

  ledger.totalPaid = totalPaid;
  ledger.arrears = totalArrears;
  ledger.outstandingBalance = outstandingBalance;
  ledger.monthsPaid = monthsPaid;
  ledger.monthsOwing = monthsOwing;
  ledger.lastPaymentDate = lastPaymentDate;
  ledger.status = status;

  await ledger.save();
  
  return ledger;
};

/**
 * Allocate payment to oldest unpaid months first (FIFO)
 */
const allocatePaymentFIFO = async (ledgerId, amount, paymentId) => {
  const ledger = await ContributionLedger.findById(ledgerId);
  if (!ledger) throw new Error('Ledger not found');
  
  let remainingAmount = amount;

  // Get unpaid months sorted oldest first
  const unpaidMonths = await ContributionMonth.find({ 
    ledgerId, 
    status: { $in: ['unpaid', 'partially_paid'] }
  }).sort('month');

  for (const month of unpaidMonths) {
    if (remainingAmount <= 0) break;

    const amountToApply = Math.min(remainingAmount, month.outstandingAmount);
    
    month.paidAmount += amountToApply;
    month.outstandingAmount = month.requiredAmount - month.paidAmount;
    month.payments.push(paymentId);

    // Update month status
    if (month.paidAmount >= month.requiredAmount) {
      month.status = month.paidAmount > month.requiredAmount ? 'overpaid' : 'paid';
    } else if (month.paidAmount > 0) {
      month.status = 'partially_paid';
    }

    await month.save();
    remainingAmount -= amountToApply;
  }

  // If still remaining amount, add to current month as extra
  if (remainingAmount > 0) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    let currentMonthRecord = await getOrCreateMonth(ledgerId, ledger.memberId, currentMonth);
    
    currentMonthRecord.paidAmount += remainingAmount;
    currentMonthRecord.outstandingAmount = currentMonthRecord.requiredAmount - currentMonthRecord.paidAmount;
    currentMonthRecord.payments.push(paymentId);
    
    if (currentMonthRecord.paidAmount >= currentMonthRecord.requiredAmount) {
      currentMonthRecord.status = currentMonthRecord.paidAmount > currentMonthRecord.requiredAmount ? 'overpaid' : 'paid';
    }
    
    await currentMonthRecord.save();
  }

  await updateLedger(ledgerId);
  
  return true;
};

/**
 * Manually assign payment to specific months
 */
const assignPaymentToMonths = async (ledgerId, paymentId, months) => {
  const ledger = await ContributionLedger.findById(ledgerId);
  if (!ledger) throw new Error('Ledger not found');

  for (const monthData of months) {
    let contributionMonth = await getOrCreateMonth(ledgerId, ledger.memberId, monthData.month);
    
    contributionMonth.paidAmount += monthData.amount;
    contributionMonth.outstandingAmount = contributionMonth.requiredAmount - contributionMonth.paidAmount;
    contributionMonth.payments.push(paymentId);

    if (contributionMonth.paidAmount >= contributionMonth.requiredAmount) {
      contributionMonth.status = contributionMonth.paidAmount > contributionMonth.requiredAmount ? 'overpaid' : 'paid';
    } else if (contributionMonth.paidAmount > 0) {
      contributionMonth.status = 'partially_paid';
    }

    await contributionMonth.save();
  }

  await updateLedger(ledgerId);
  
  return true;
};

/**
 * Generate monthly contribution records for all active members
 */
const generateMonthlyRecords = async (month) => {
  const activeMembers = await User.find({ status: 'active' });
  
  for (const member of activeMembers) {
    const ledger = await getOrCreateLedger(member._id);
    await getOrCreateMonth(ledger._id, member._id, month);
    await updateLedger(ledger._id);
  }
  
  return { count: activeMembers.length };
};

module.exports = {
  getOrCreateLedger,
  getOrCreateMonth,
  calculateLedgerStatus,
  updateLedger,
  allocatePaymentFIFO,
  assignPaymentToMonths,
  generateMonthlyRecords
};
