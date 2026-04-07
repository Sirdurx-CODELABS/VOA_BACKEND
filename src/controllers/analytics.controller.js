const User = require('../models/User');
const Program = require('../models/Program');
const Attendance = require('../models/Attendance');
const Transaction = require('../models/Transaction');
const Child = require('../models/Child');
const { success } = require('../utils/apiResponse');
const { detectInactiveUsers } = require('../services/engagement.service');
const { createNotification, notifyMany } = require('../services/notification.service');

exports.getMemberStats = async (req, res, next) => {
  try {
    const [active, inactive, pending, total, byRole, byMembershipType, totalChildren] = await Promise.all([
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'inactive' }),
      User.countDocuments({ status: 'pending' }),
      User.countDocuments(),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      User.aggregate([{ $group: { _id: '$membershipType', count: { $sum: 1 } } }]),
      Child.countDocuments(),
    ]);
    return success(res, { total, active, inactive, pending, byRole, byMembershipType, totalChildren });
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

/**
 * Role-based personalised dashboard data.
 * Returns only what the requesting user's role needs.
 */
exports.getMyDashboard = async (req, res, next) => {
  try {
    const user = req.user;
    const role = user.role;
    const MonthlyContribution = require('../models/MonthlyContribution');
    const Installment = require('../models/Installment');
    const Announcement = require('../models/Announcement');
    const WelfareRequest = require('../models/WelfareRequest');
    const Notification = require('../models/Notification');
    const { calculateRequiredContribution } = require('../services/contributionCalc.service');
    const currentMonth = new Date().toISOString().slice(0, 7);

    // ── Data every user gets ──────────────────────────────────────────────
    const [myContrib, myInstallments, unreadNotifs, recentAnnouncements] = await Promise.all([
      MonthlyContribution.findOne({ userId: user._id, month: currentMonth }),
      Installment.find({ userId: user._id, month: currentMonth }).sort('-createdAt').limit(5),
      Notification.countDocuments({ recipient: user._id, isRead: false }),
      Announcement.find({ status: 'published' }).sort('-createdAt').limit(3).select('title category createdAt'),
    ]);

    const requiredContrib = await calculateRequiredContribution(user);

    const base = {
      user: {
        fullName: user.fullName,
        role: user.role,
        isVice: user.isVice,
        membershipType: user.membershipType,
        status: user.status,
        engagementScore: user.engagementScore,
        totalPoints: user.totalPoints,
        points: user.points,
        profileImage: user.profileImage,
        dob: user.dob,
        createdAt: user.createdAt,
        isFoundingMember: user.isFoundingMember,
        foundingMemberRank: user.foundingMemberRank,
      },
      contribution: {
        required: requiredContrib.requiredAmount,
        paid: myContrib?.amountPaid ?? 0,
        remaining: Math.max(0, requiredContrib.requiredAmount - (myContrib?.amountPaid ?? 0)),
        isCompleted: myContrib?.isCompleted ?? false,
        progressPercent: myContrib?.progressPercent ?? 0,
        extraAmount: myContrib?.extraAmount ?? 0,
        breakdown: requiredContrib.breakdown ?? [],
        calculationSource: requiredContrib.calculationSource,
        recentInstallments: myInstallments,
      },
      notifications: { unread: unreadNotifs },
      recentAnnouncements,
    };

    // ── Role-specific extras ──────────────────────────────────────────────
    let roleData = {};

    if (['super_admin', 'chairman', 'vice_chairman'].includes(role)) {
      const [totalMembers, activeMembers, pendingMembers, totalContribMonth, completedContrib,
        pendingInstallments, totalIncome, totalExpense, pendingWelfare] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ status: 'active' }),
        User.countDocuments({ status: 'pending' }),
        MonthlyContribution.aggregate([{ $match: { month: currentMonth } }, { $group: { _id: null, total: { $sum: '$amountPaid' } } }]),
        MonthlyContribution.countDocuments({ month: currentMonth, isCompleted: true }),
        Installment.countDocuments({ status: 'pending' }),
        Transaction.aggregate([{ $match: { type: 'income', status: 'approved' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
        Transaction.aggregate([{ $match: { type: 'expense', status: 'approved' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
        WelfareRequest.countDocuments({ status: 'pending' }),
      ]);
      const byMembership = await User.aggregate([{ $group: { _id: '$membershipType', count: { $sum: 1 } } }]);
      roleData = {
        members: { total: totalMembers, active: activeMembers, pending: pendingMembers },
        finance: {
          monthlyCollected: totalContribMonth[0]?.total ?? 0,
          completedContributions: completedContrib,
          pendingInstallments,
          totalIncome: totalIncome[0]?.total ?? 0,
          totalExpense: totalExpense[0]?.total ?? 0,
          balance: (totalIncome[0]?.total ?? 0) - (totalExpense[0]?.total ?? 0),
        },
        welfare: { pending: pendingWelfare },
        membershipBreakdown: byMembership,
      };
    }

    if (role === 'treasurer') {
      const [monthlyCollected, completedContrib, pendingInstallments, totalInstallments,
        totalIncome, totalExpense, recentPending] = await Promise.all([
        MonthlyContribution.aggregate([{ $match: { month: currentMonth } }, { $group: { _id: null, total: { $sum: '$amountPaid' } } }]),
        MonthlyContribution.countDocuments({ month: currentMonth, isCompleted: true }),
        Installment.countDocuments({ status: 'pending' }),
        MonthlyContribution.countDocuments({ month: currentMonth }),
        Transaction.aggregate([{ $match: { type: 'income', status: 'approved' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
        Transaction.aggregate([{ $match: { type: 'expense', status: 'approved' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
        Installment.find({ status: 'pending' }).sort('-createdAt').limit(5)
          .populate('userId', 'fullName membershipType'),
      ]);
      const FinanceTarget = require('../models/FinanceTarget');
      const activeTargets = await FinanceTarget.find({ isActive: true, isCompleted: false }).limit(3);
      roleData = {
        finance: {
          monthlyCollected: monthlyCollected[0]?.total ?? 0,
          completedContributions: completedContrib,
          totalContributors: totalInstallments,
          pendingInstallments,
          totalIncome: totalIncome[0]?.total ?? 0,
          totalExpense: totalExpense[0]?.total ?? 0,
          balance: (totalIncome[0]?.total ?? 0) - (totalExpense[0]?.total ?? 0),
        },
        recentPendingPayments: recentPending,
        activeTargets,
      };
    }

    if (role === 'membership_coordinator') {
      const [totalMembers, activeMembers, pendingMembers, newThisMonth] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ status: 'active' }),
        User.countDocuments({ status: 'pending' }),
        User.countDocuments({ createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } }),
      ]);
      const byMembership = await User.aggregate([{ $group: { _id: '$membershipType', count: { $sum: 1 } } }]);
      const recentPending = await User.find({ status: 'pending' }).sort('-createdAt').limit(5).select('fullName email membershipType createdAt');
      roleData = {
        members: { total: totalMembers, active: activeMembers, pending: pendingMembers, newThisMonth },
        membershipBreakdown: byMembership,
        recentPendingMembers: recentPending,
      };
    }

    if (role === 'secretary' || role === 'program_coordinator') {
      const [totalPrograms, upcoming, ongoing, completed, totalAttendance, presentCount] = await Promise.all([
        Program.countDocuments(),
        Program.countDocuments({ status: 'upcoming' }),
        Program.countDocuments({ status: 'ongoing' }),
        Program.countDocuments({ status: 'completed' }),
        Attendance.countDocuments(),
        Attendance.countDocuments({ status: 'present' }),
      ]);
      const myAttendance = await Attendance.countDocuments({ userId: user._id, status: 'present' });
      roleData = {
        programs: { total: totalPrograms, upcoming, ongoing, completed },
        attendance: {
          total: totalAttendance,
          present: presentCount,
          rate: totalAttendance ? ((presentCount / totalAttendance) * 100).toFixed(1) : 0,
          myPresent: myAttendance,
        },
      };
    }

    if (role === 'pro') {
      const [totalAnnouncements, publishedAnnouncements, draftAnnouncements] = await Promise.all([
        Announcement.countDocuments({ createdBy: user._id }),
        Announcement.countDocuments({ createdBy: user._id, status: 'published' }),
        Announcement.countDocuments({ createdBy: user._id, status: 'draft' }),
      ]);
      const myRecent = await Announcement.find({ createdBy: user._id }).sort('-createdAt').limit(5).select('title status createdAt');
      roleData = {
        announcements: { total: totalAnnouncements, published: publishedAnnouncements, draft: draftAnnouncements },
        myRecentAnnouncements: myRecent,
      };
    }

    if (role === 'welfare_officer') {
      const [pending, inProgress, resolved] = await Promise.all([
        WelfareRequest.countDocuments({ status: 'pending' }),
        WelfareRequest.countDocuments({ status: 'in-progress' }),
        WelfareRequest.countDocuments({ status: 'resolved' }),
      ]);
      const recentRequests = await WelfareRequest.find().sort('-createdAt').limit(5)
        .populate('userId', 'fullName').select('type status createdAt');
      roleData = {
        welfare: { pending, inProgress, resolved, total: pending + inProgress + resolved },
        recentWelfareRequests: recentRequests,
      };
    }

    // Member attendance stats (all roles get their own)
    const [myTotalAttendance, myPresentCount] = await Promise.all([
      Attendance.countDocuments({ userId: user._id }),
      Attendance.countDocuments({ userId: user._id, status: 'present' }),
    ]);

    return success(res, {
      ...base,
      attendance: {
        total: myTotalAttendance,
        present: myPresentCount,
        rate: myTotalAttendance ? ((myPresentCount / myTotalAttendance) * 100).toFixed(1) : 0,
      },
      roleData,
    });
  } catch (err) { next(err); }
};
