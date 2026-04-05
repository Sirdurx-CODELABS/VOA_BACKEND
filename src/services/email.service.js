const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Create transporter fresh each call so env vars are always current
const createTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass || user === 'your_email@gmail.com') {
    return null; // not configured
  }

  // Gmail with App Password — must use service:'gmail' or port 465 with secure:true
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
};

/**
 * Send an email. NEVER throws — logs error and returns false on failure.
 */
const sendEmail = async ({ to, subject, html }) => {
  const transporter = createTransporter();

  if (!transporter) {
    logger.warn(`[EMAIL SKIPPED — not configured] To: ${to} | Subject: ${subject}`);
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"VOA System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    logger.info(`✉  Email sent → ${to} (messageId: ${info.messageId})`);
    return true;
  } catch (err) {
    logger.error(`✉  Email failed (non-fatal) → ${to}: ${err.message}`);
    return false;
  }
};

const sendVerificationEmail = (to, token) => {
  const url = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  // Always log the link so devs can verify manually if email fails
  logger.info(`🔗 [VERIFY LINK] ${to} → ${url}`);
  return sendEmail({
    to,
    subject: 'VOA System — Verify Your Email',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#4F46E5;margin-bottom:8px;">Welcome to VOA System 👋</h2>
        <p style="color:#374151;">Please verify your email address to activate your account.</p>
        <a href="${url}" style="display:inline-block;margin:20px 0;background:#4F46E5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
          Verify Email
        </a>
        <p style="color:#9ca3af;font-size:13px;">This link expires in 24 hours. If you didn't register, ignore this email.</p>
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:12px;">VOA Management System</p>
      </div>
    `,
  });
};

const sendPasswordResetEmail = (to, token) => {
  const url = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  logger.info(`🔗 [RESET LINK] ${to} → ${url}`);
  return sendEmail({
    to,
    subject: 'VOA System — Reset Your Password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#EF4444;margin-bottom:8px;">Password Reset Request</h2>
        <p style="color:#374151;">Click the button below to reset your password.</p>
        <a href="${url}" style="display:inline-block;margin:20px 0;background:#EF4444;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
          Reset Password
        </a>
        <p style="color:#9ca3af;font-size:13px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:12px;">VOA Management System</p>
      </div>
    `,
  });
};

const sendWelcomeEmail = (to, fullName) => {
  return sendEmail({
    to,
    subject: 'Welcome to VOA System — Account Approved',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#10B981;margin-bottom:8px;">You're in, ${fullName}! 🎉</h2>
        <p style="color:#374151;">Your VOA System account has been approved. You can now log in.</p>
        <a href="${process.env.CLIENT_URL}/login" style="display:inline-block;margin:20px 0;background:#10B981;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
          Login Now
        </a>
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:12px;">VOA Management System</p>
      </div>
    `,
  });
};

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail };
