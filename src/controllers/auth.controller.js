const crypto = require('crypto');
const User = require('../models/User');
const { generateAccessToken, generateRandomToken } = require('../utils/generateToken');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email.service');
const { success, error } = require('../utils/apiResponse');
const logger = require('../utils/logger');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const isDev = () => process.env.NODE_ENV !== 'production';

// ─── REGISTER ─────────────────────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { fullName, email, password, phone, gender, dob, address, interests, children } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.status === 'pending') {
        return error(res, 'Your account is already registered and awaiting approval by the Membership Coordinator.', 409);
      }
      return error(res, 'Email already registered', 409);
    }

    // Validate DOB if provided
    if (dob && new Date(dob) > new Date()) {
      return error(res, 'Date of birth cannot be in the future', 400);
    }

    // Auto-derive membership type from DOB — client-sent membershipType is ignored
    const { deriveMembershipType } = require('../services/contributionCalc.service');
    // At registration, parent_guardian only if they explicitly added children
    const hasChildren = Array.isArray(children) && children.filter(c => c.childName && c.childDob).length > 0;
    const derivedMembershipType = dob ? deriveMembershipType(dob, hasChildren) : 'adolescent';

    const user = await User.create({
      fullName, email, password, phone,
      gender: gender || 'other',
      dob: dob || null,
      membershipType: derivedMembershipType,
      address: address || '',
      interests: Array.isArray(interests) ? interests : [],
      isEmailVerified: true,
      status: 'pending',
      role: 'member',
    });

    // Save children if provided
    if (hasChildren) {
      const Child = require('../models/Child');
      const validChildren = children.filter(c => c.childName && c.childDob);
      for (const c of validChildren) {
        if (new Date(c.childDob) < new Date()) {
          await Child.create({
            parentId: user._id,
            childName: c.childName,
            childDob: c.childDob,
            childGender: c.childGender || 'other',
            relationship: c.relationship || 'other',
          }).catch(() => {});
        }
      }
    }

    logger.info(`New registration (pending approval): ${email}`);

    // Award founding member bonus to first 20 users (fire-and-forget)
    const { awardRegistrationBonus } = require('../services/points.service');
    awardRegistrationBonus(user._id).catch(() => {});

    // Notify membership coordinators and chairman
    const approvers = await User.find({
      role: { $in: ['super_admin', 'chairman', 'membership_coordinator'] },
      status: 'active',
    }).select('_id');

    const { createNotification } = require('../services/notification.service');
    for (const approver of approvers) {
      createNotification({
        recipient: approver._id,
        title: 'New Member Registration',
        message: `${fullName} has registered and is awaiting account approval.`,
        type: 'general',
      }).catch(() => {});
    }

    return success(
      res,
      { id: user._id, email: user.email, status: user.status },
      'Registration successful! Your account is pending approval. You will be notified once approved.',
      201
    );
  } catch (err) {
    next(err);
  }
};

// ─── VERIFY EMAIL ─────────────────────────────────────────────────────────────
exports.verifyEmail = async (req, res, next) => {
  try {
    const hashed = hashToken(req.params.token);
    const user = await User.findOne({
      emailVerificationToken: hashed,
      emailVerificationExpires: { $gt: Date.now() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) return error(res, 'Verification link is invalid or has expired. Please request a new one.', 400);

    user.isEmailVerified = true;
    user.status = 'active';
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    logger.info(`Email verified: ${user.email}`);
    return success(res, { email: user.email }, 'Email verified successfully. You can now log in.');
  } catch (err) {
    next(err);
  }
};

// ─── RESEND VERIFICATION ──────────────────────────────────────────────────────
exports.resendVerification = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email }).select('+emailVerificationToken +emailVerificationExpires');
    if (!user) return error(res, 'No account found with that email', 404);
    if (user.isEmailVerified) return error(res, 'Email is already verified', 400);

    const token = generateRandomToken();
    user.emailVerificationToken = hashToken(token);
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    sendVerificationEmail(user.email, token); // fire-and-forget
    return success(res, null, 'Verification email sent. Check your inbox (and spam folder).');
  } catch (err) {
    next(err);
  }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) return error(res, 'Invalid email or password', 401);

    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) return error(res, 'Invalid email or password', 401);

    // Account must be approved (active) — no email verification required
    if (user.status === 'pending') {
      return error(res, 'Your account is pending approval. You will be notified once a Membership Coordinator or Chairman approves your account.', 403);
    }

    if (user.status === 'inactive') {
      return error(res, 'Your account has been deactivated. Please contact the Membership Coordinator.', 403);
    }

    const token = generateAccessToken(user._id);
    user.lastActiveAt = new Date();
    await user.save({ validateBeforeSave: false });

    logger.info(`Login: ${user.email} [${user.role}]`);

    return success(res, {
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVice: user.isVice,
        status: user.status,
        engagementScore: user.engagementScore,
        profileImage: user.profileImage,
        gender: user.gender,
        dob: user.dob,
        membershipType: user.membershipType,
        age: user.age,
        interests: user.interests,
        bio: user.bio,
        state: user.state,
        address: user.address,
        emergencyContact: user.emergencyContact,
        totalPoints: user.totalPoints,
        points: user.points,
        isFoundingMember: user.isFoundingMember,
        foundingMemberRank: user.foundingMemberRank,
        earlyContributorBonusAwarded: user.earlyContributorBonusAwarded,
        createdAt: user.createdAt,
      },
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    // Always return success to prevent email enumeration
    if (!user) return success(res, null, 'If that email exists, a reset link has been sent.');

    const resetToken = generateRandomToken();
    user.passwordResetToken = hashToken(resetToken);
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    sendPasswordResetEmail(user.email, resetToken); // fire-and-forget
    return success(res, null, 'Password reset link sent. Check your inbox (and spam folder).');
  } catch (err) {
    next(err);
  }
};

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const hashed = hashToken(req.body.token);
    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) return error(res, 'Reset link is invalid or has expired. Please request a new one.', 400);

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    logger.info(`Password reset: ${user.email}`);
    return success(res, null, 'Password reset successful. You can now log in.');
  } catch (err) {
    next(err);
  }
};

// ─── GET ME ───────────────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  return success(res, req.user);
};

// ─── CHANGE PASSWORD ──────────────────────────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(req.body.currentPassword))) {
      return error(res, 'Current password is incorrect', 400);
    }
    user.password = req.body.newPassword;
    await user.save();
    return success(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};
