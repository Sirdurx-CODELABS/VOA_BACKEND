const User = require('../models/User');
const Program = require('../models/Program');
const Attendance = require('../models/Attendance');
const Transaction = require('../models/Transaction');
const { success } = require('../utils/apiResponse');
const { detectInactiveUsers } = require('../services/engagement.service');
const { createNotification, notifyMany } = require('../services/notification.service');

exports.getMemberStats = async (req, res, next) => {
  try {
    const [active, inactive, total, byRole] = await Promise.all([
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'inactive' }),
      User.countDocuments(),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    ]);
    return success(res, { total, active, inactive, byRole });
  } catch (err) { next(err); }
};

exports.getLeaderboard = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leaders = await User.find({ status: 'active' })
      .sort('-engagementScore')
      .limit(limit)
      .select('fullName role engagementScore profileImage');
    return success(res, leaders);
  } catch (err) { next(err); }
};

exports.getProgramMetrics = async (req, res, next) => {
  try {
    const [upcoming, ongoing, completed, total] = await Promise.all([
      Program.countDocuments({ status: 'upcoming' }),
      Program.countDocuments({ status: 'ongoing' }),
      Program.countDocuments({ status: 'completed' }),
      Program.countDocuments(),
    ]);

    // Attendance rate across all programs
    const [present, totalAtt] = await Promise.all([
      Attendance.countDocuments({ status: 'present' }),
      Attendance.countDocuments(),
    ]);

    return success(res, {
      programs: { total, upcoming, ongoing, completed },
      attendance: { total: totalAtt, present, rate: totalAtt ? ((present / totalAtt) * 100).toFixed(1) : 0 },
    });
  } catch (err) { next(err); }
};

exports.getInactiveUsers = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 14;
    const users = await detectInactiveUsers(days);
    return success(res, { count: users.length, users });
  } catch (err) { next(err); }
};

exports.alertInactiveUsers = async (req, res, next) => {
  try {
    const users = await detectInactiveUsers(14);
    if (users.length) {
      await notifyMany(users.map((u) => u._id), {
        title: 'Inactivity Alert',
        message: 'You have been inactive for over 14 days. Please engage with the VOA System.',
        type: 'inactivity_alert',
      });
    }
    return success(res, { alerted: users.length }, `${users.length} users alerted`);
  } catch (err) { next(err); }
};

exports.getDashboardSummary = async (req, res, next) => {
  try {
    const [members, programs, income, expense] = await Promise.all([
      User.countDocuments({ status: 'active' }),
      Program.countDocuments(),
      Transaction.aggregate([{ $match: { type: 'income', status: 'approved' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Transaction.aggregate([{ $match: { type: 'expense', status: 'approved' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

    return success(res, {
      activeMembers: members,
      totalPrograms: programs,
      totalIncome: income[0]?.total || 0,
      totalExpense: expense[0]?.total || 0,
      balance: (income[0]?.total || 0) - (expense[0]?.total || 0),
    });
  } catch (err) { next(err); }
};
