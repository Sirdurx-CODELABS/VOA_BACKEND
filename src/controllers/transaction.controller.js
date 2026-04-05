const Transaction = require('../models/Transaction');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');
const { createNotification } = require('../services/notification.service');
const User = require('../models/User');

exports.createTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.create({ ...req.body, createdBy: req.user._id });
    // Notify chairman for expenses above threshold
    if (transaction.type === 'expense' && transaction.amount >= 10000) {
      const chairman = await User.findOne({ role: 'chairman' });
      if (chairman) {
        await createNotification({
          recipient: chairman._id,
          title: 'Large Expense Requires Approval',
          message: `Transaction "${transaction.title}" of ₦${transaction.amount} needs your approval`,
          type: 'general',
          relatedId: transaction._id,
          relatedModel: 'Transaction',
        });
      }
    }
    return success(res, transaction, 'Transaction created', 201);
  } catch (err) { next(err); }
};

exports.getAllTransactions = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.programId) filter.programId = req.query.programId;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter).skip(skip).limit(limit)
        .populate('createdBy', 'fullName role')
        .populate('approvedBy', 'fullName')
        .populate('programId', 'title')
        .sort('-createdAt'),
      Transaction.countDocuments(filter),
    ]);
    return paginated(res, transactions, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

exports.getTransactionById = async (req, res, next) => {
  try {
    const t = await Transaction.findById(req.params.id)
      .populate('createdBy', 'fullName role')
      .populate('approvedBy', 'fullName')
      .populate('programId', 'title date');
    if (!t) return error(res, 'Transaction not found', 404);
    return success(res, t);
  } catch (err) { next(err); }
};

exports.approveTransaction = async (req, res, next) => {
  try {
    const t = await Transaction.findById(req.params.id);
    if (!t) return error(res, 'Transaction not found', 404);
    if (t.status !== 'pending') return error(res, 'Transaction already processed', 400);

    t.status = 'approved';
    t.approvedBy = req.user._id;
    t.approvedAt = new Date();
    await t.save();

    await createNotification({
      recipient: t.createdBy,
      title: 'Transaction Approved',
      message: `Your transaction "${t.title}" has been approved`,
      type: 'general',
      relatedId: t._id,
      relatedModel: 'Transaction',
    });

    return success(res, t, 'Transaction approved');
  } catch (err) { next(err); }
};

exports.rejectTransaction = async (req, res, next) => {
  try {
    const t = await Transaction.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    );
    if (!t) return error(res, 'Transaction not found', 404);
    return success(res, t, 'Transaction rejected');
  } catch (err) { next(err); }
};

exports.getFinancialSummary = async (req, res, next) => {
  try {
    const filter = { status: 'approved' };
    if (req.query.programId) filter.programId = req.query.programId;

    const [income, expense] = await Promise.all([
      Transaction.aggregate([{ $match: { ...filter, type: 'income' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Transaction.aggregate([{ $match: { ...filter, type: 'expense' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

    const totalIncome = income[0]?.total || 0;
    const totalExpense = expense[0]?.total || 0;

    return success(res, {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      pending: await Transaction.countDocuments({ status: 'pending' }),
    });
  } catch (err) { next(err); }
};
