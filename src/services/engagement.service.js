const User = require('../models/User');
const Attendance = require('../models/Attendance');
const logger = require('../utils/logger');

const POINTS = {
  present: 10,
  absent: -2,
};

const updateEngagementScore = async (userId, action) => {
  try {
    const points = POINTS[action] || 0;
    await User.findByIdAndUpdate(userId, { $inc: { engagementScore: points } });
  } catch (err) {
    logger.error(`Engagement score update failed: ${err.message}`);
  }
};

const recalculateEngagement = async (userId) => {
  const records = await Attendance.find({ userId });
  let score = 0;
  records.forEach((r) => { score += POINTS[r.status] || 0; });
  await User.findByIdAndUpdate(userId, { engagementScore: Math.max(0, score) });
  return score;
};

const detectInactiveUsers = async (days = 14) => {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return User.find({ lastActiveAt: { $lt: cutoff }, status: 'active' }).select('fullName email lastActiveAt');
};

module.exports = { updateEngagementScore, recalculateEngagement, detectInactiveUsers };
