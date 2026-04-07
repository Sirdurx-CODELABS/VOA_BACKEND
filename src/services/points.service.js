const User = require('../models/User');
const PointTransaction = require('../models/PointTransaction');
const logger = require('../utils/logger');

const POINTS_CONFIG = {
  REGISTRATION_BONUS: 50,        // first 20 users
  EARLY_CONTRIBUTOR_BONUS: 30,   // first 10 contributors
  CONTRIBUTION_BASE: 10,         // every approved contribution
  EXTRA_PER_500: 1,              // +1 pt per ₦500 above minimum
  FOUNDING_MEMBER_SLOTS: 20,
  EARLY_CONTRIBUTOR_SLOTS: 10,
};

/**
 * Award registration bonus to the first 20 users.
 * Called after a new user is created.
 */
const awardRegistrationBonus = async (userId) => {
  try {
    // Count how many users already got the bonus
    const bonusCount = await User.countDocuments({ registrationBonusAwarded: true });
    if (bonusCount >= POINTS_CONFIG.FOUNDING_MEMBER_SLOTS) return; // slots full

    const rank = bonusCount + 1;
    const pts = POINTS_CONFIG.REGISTRATION_BONUS;

    await User.findByIdAndUpdate(userId, {
      $inc: { points: pts, totalPoints: pts, engagementScore: pts },
      registrationBonusAwarded: true,
      isFoundingMember: true,
      foundingMemberRank: rank,
    });

    await PointTransaction.create({
      userId,
      type: 'registration_bonus',
      source: `Founding Member #${rank} — Early Registration Bonus`,
      points: pts,
    });

    logger.info(`[POINTS] Registration bonus (${pts} pts) awarded to user ${userId} — Founding Member #${rank}`);
  } catch (err) {
    logger.error(`[POINTS] Registration bonus failed: ${err.message}`);
  }
};

/**
 * Award early contributor bonus to the first 10 approved contributors.
 * Called when a contribution is approved.
 */
const awardEarlyContributorBonus = async (userId, contributionId) => {
  try {
    // Check if user already got this bonus
    const user = await User.findById(userId);
    if (user.earlyContributorBonusAwarded) return;

    // Count how many users already got the early contributor bonus
    const bonusCount = await User.countDocuments({ earlyContributorBonusAwarded: true });
    if (bonusCount >= POINTS_CONFIG.EARLY_CONTRIBUTOR_SLOTS) return;

    const pts = POINTS_CONFIG.EARLY_CONTRIBUTOR_BONUS;

    await User.findByIdAndUpdate(userId, {
      $inc: { points: pts, totalPoints: pts, engagementScore: pts },
      earlyContributorBonusAwarded: true,
    });

    await PointTransaction.create({
      userId,
      type: 'early_contributor_bonus',
      source: `Early Contributor Bonus — Top ${POINTS_CONFIG.EARLY_CONTRIBUTOR_SLOTS} contributor`,
      points: pts,
      referenceId: contributionId,
    });

    logger.info(`[POINTS] Early contributor bonus (${pts} pts) awarded to user ${userId}`);
  } catch (err) {
    logger.error(`[POINTS] Early contributor bonus failed: ${err.message}`);
  }
};

/**
 * Award contribution points based on amount.
 * Base: 10 pts. Extra: +1 per ₦500 above minimum.
 */
const awardContributionPoints = async (userId, contributionId, amount, minimum) => {
  try {
    const basePts = POINTS_CONFIG.CONTRIBUTION_BASE;
    const extra = Math.max(0, amount - minimum);
    const extraPts = Math.floor(extra / 500) * POINTS_CONFIG.EXTRA_PER_500;
    const totalPts = basePts + extraPts;

    await User.findByIdAndUpdate(userId, {
      $inc: { points: totalPts, totalPoints: totalPts, engagementScore: totalPts },
    });

    // Log base points
    await PointTransaction.create({
      userId,
      type: 'contribution_base',
      source: `Contribution base points`,
      points: basePts,
      referenceId: contributionId,
    });

    // Log extra points if any
    if (extraPts > 0) {
      await PointTransaction.create({
        userId,
        type: 'contribution_extra',
        source: `Extra contribution bonus (+₦${extra.toLocaleString()} above minimum)`,
        points: extraPts,
        referenceId: contributionId,
      });
    }

    return totalPts;
  } catch (err) {
    logger.error(`[POINTS] Contribution points failed: ${err.message}`);
    return 0;
  }
};

/**
 * Get points history for a user.
 */
const getPointsHistory = async (userId) => {
  return PointTransaction.find({ userId }).sort('-createdAt').limit(50);
};

module.exports = {
  POINTS_CONFIG,
  awardRegistrationBonus,
  awardEarlyContributorBonus,
  awardContributionPoints,
  getPointsHistory,
};
