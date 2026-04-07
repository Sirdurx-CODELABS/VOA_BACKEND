const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// ─── Request / Response Logger ───────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bright: '\x1b[1m', dim: '\x1b[2m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', magenta: '\x1b[35m', blue: '\x1b[34m', gray: '\x1b[90m',
  white: '\x1b[37m', bgGreen: '\x1b[42m', bgRed: '\x1b[41m', bgYellow: '\x1b[43m',
};

const methodColor = (m) => ({ GET: C.cyan, POST: C.green, PUT: C.yellow, PATCH: C.magenta, DELETE: C.red }[m] || C.white);
const statusColor = (s) => s >= 500 ? C.red : s >= 400 ? C.yellow : s >= 300 ? C.cyan : C.green;

const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  // Log incoming request
  const mColor = methodColor(method);
  logger.http(
    `${C.bright}${C.blue}──► INCOMING${C.reset}  ` +
    `${mColor}${C.bright}${method.padEnd(7)}${C.reset} ` +
    `${C.white}${originalUrl}${C.reset}  ` +
    `${C.gray}from ${ip}${C.reset}` +
    (Object.keys(req.body || {}).length ? `\n        ${C.gray}Body: ${JSON.stringify(req.body)}${C.reset}` : '')
  );

  // Intercept response
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    const ms = Date.now() - start;
    const sColor = statusColor(res.statusCode);
    const statusIcon = res.statusCode < 400 ? '✔' : '✖';

    logger.http(
      `${C.bright}${C.magenta}◄── RESPONSE${C.reset}  ` +
      `${mColor}${C.bright}${method.padEnd(7)}${C.reset} ` +
      `${C.white}${originalUrl}${C.reset}  ` +
      `${sColor}${C.bright}${statusIcon} ${res.statusCode}${C.reset}  ` +
      `${C.gray}${ms}ms${C.reset}` +
      (body ? `\n        ${C.gray}Response: ${JSON.stringify(body).substring(0, 200)}${body && JSON.stringify(body).length > 200 ? '...' : ''}${C.reset}` : '')
    );
    return originalJson(body);
  };

  next();
};

// Route imports
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const programRoutes = require('./routes/program.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const transactionRoutes = require('./routes/transaction.routes');
const reportRoutes = require('./routes/report.routes');
const announcementRoutes = require('./routes/announcement.routes');
const welfareRoutes = require('./routes/welfare.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const notificationRoutes = require('./routes/notification.routes');
const superadminRoutes = require('./routes/superadmin.routes');
const positionRoutes = require('./routes/position.routes');
const roleChangeRoutes = require('./routes/rolechange.routes');
const contributionRoutes = require('./routes/contribution.routes');
const accountRoutes = require('./routes/account.routes');
const childRoutes = require('./routes/child.routes');
const financeTargetRoutes = require('./routes/financeTarget.routes');
const activityRoutes = require('./routes/activity.routes');

// Ensure models are registered
require('./models/MonthlyContribution');
require('./models/Installment');
require('./models/FinanceTarget');
require('./models/PointTransaction');
require('./models/Activity');
require('./models/ActivityParticipant');
require('./models/ActivityMedia');

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
}));

// Trust proxy — needed when behind nginx/load balancer so req.ip is the real client IP
app.set('trust proxy', 1);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
// Strategy:
//   • Authenticated requests → keyed by userId (not IP), very high limit
//     → multiple users on the same network/IP never interfere with each other
//   • Unauthenticated general requests → keyed by IP, generous limit
//   • Auth endpoints (login/register/forgot-password) → keyed by IP, tighter to prevent brute force

// Helper: extract JWT userId without full verification (just for key generation)
const extractUserIdFromToken = (req) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    const token = auth.split(' ')[1];
    // Decode payload without verifying (key generation only — not a security decision)
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.id || payload._id || payload.sub || null;
  } catch { return null; }
};

// General API limiter — authenticated users get their own bucket (userId), very high cap
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req) => {
    const userId = extractUserIdFromToken(req);
    // Authenticated: 2000 req/15min per user (≈133/min — more than enough)
    // Unauthenticated: 300 req/15min per IP
    return userId ? 2000 : 300;
  },
  keyGenerator: (req) => {
    const userId = extractUserIdFromToken(req);
    return userId ? `user:${userId}` : (req.ip || req.headers['x-forwarded-for'] || 'unknown');
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down and try again shortly.' },
  skip: () => process.env.NODE_ENV === 'development', // no limits in dev
});

// Auth limiter — only for login/register/forgot-password (unauthenticated, IP-based)
// Generous enough for a shared office/network: 100 attempts per 15min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 500,
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts from this network. Please wait 15 minutes and try again.' },
  skip: () => process.env.NODE_ENV === 'development',
});

app.use('/api/', limiter);
// Auth limiter only on the heavy endpoints — not on /me or /verify-email
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Detailed request/response logging
app.use(requestLogger);

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', system: 'VOA System', timestamp: new Date() }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/welfare', welfareRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/position-applications', positionRoutes);
app.use('/api/role-change-requests', roleChangeRoutes);
app.use('/api/contributions', contributionRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/children', childRoutes);
app.use('/api/finance-targets', financeTargetRoutes);
app.use('/api/activities', activityRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
