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
    const { fullName, email, password, phone } = req.body;

    // Check if email already used
    const existing = await User.findOne({ email });

    if (existing) {
      // If user exists but never verified — resend verification and tell them
      if (!existing.isEmailVerified && !isDev()) {
        const token = generateRandomToken();
        existing.emailVerificationToken = hashToken(token);
        existing.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
        await existing.save({ validateBeforeSave: false });
        sendVerificationEmail(email, token); // fire-and-forget
        return error(res, 'Email already registered but not verified. A new verification link has been sent.', 409);
      }
      return error(res, 'Email already registered', 409);
    }

    const verificationToken = generateRandomToken();
    const dev = isDev();

    const user = await User.create({
      fullName,
      email,
      password,
      phone,
      // Dev: auto-verify + auto-activate so you can log in right away
      isEmailVerified: dev ? true : false,
      status: dev ? 'active' : 'inactive',
      emailVerificationToken: dev ? undefined : hashToken(verificationToken),
      emailVerificationExpires: dev ? undefined : Date.now() + 24 * 60 * 60 * 1000,
    });

    // Send verification email — fire-and-forget, never blocks response
    if (!dev) {
      sendVerificationEmail(email, verificationToken);
    } else {
      logger.info(`[DEV] Auto-verified & activated: ${email}`);
    }

    return success(
      res,
      { id: user._id, email: user.email, isEmailVerified: user.isEmailVerified, status: user.status },
      dev
        ? 'Registration successful. You can log in immediately.'
        : 'Registration successful. A verification link has been sent to your email.',
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

    if (!user.isEmailVerified) {
      return error(res, 'Please verify your email before logging in. Check your inbox or request a new link.', 403);
    }

    if (user.status === 'inactive') {
      return error(res, 'Your account is pending approval by the Membership Coordinator.', 403);
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
