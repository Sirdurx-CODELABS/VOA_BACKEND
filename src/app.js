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

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
}));

// Rate limiting — generous limits for dev, tighter for production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 200 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for super_admin (identified by header set after auth)
    return req.headers['x-bypass-ratelimit'] === process.env.JWT_SECRET?.slice(0, 8);
  },
  message: { success: false, message: 'Too many requests, please try again in a few minutes.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

app.use('/api/', limiter);
app.use('/api/auth', authLimiter);

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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
