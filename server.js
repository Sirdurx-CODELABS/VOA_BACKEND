require('./dns-fix');
require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const logger = require('./src/utils/logger');
const { getAIService } = require('./src/ai/services');
const ReminderScheduler = require('./src/ai/services/ReminderScheduler');
const { initSocketIO } = require('./src/clinical/services/socket.service');
const mongoose = require('mongoose');
const fs = require('fs');

// Ensure required directories exist
['logs', 'uploads'].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const PORT = process.env.PORT || 5000;
const ENV = process.env.NODE_ENV || 'development';

// ─── Console Colors ───────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bright: '\x1b[1m', dim: '\x1b[2m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', magenta: '\x1b[35m', blue: '\x1b[34m',
  gray: '\x1b[90m', white: '\x1b[37m',
};

const printBanner = (actualPort) => {
  const line = `${C.cyan}${'═'.repeat(60)}${C.reset}`;
  console.log('\n' + line);
  console.log(`${C.cyan}║${C.reset}${C.bright}${C.white}${'  VOA SYSTEM — Organization Management Platform'.padEnd(59)}${C.reset}${C.cyan}║${C.reset}`);
  console.log(line);
  console.log(`  ${C.green}${C.bright}✔ Server${C.reset}        ${C.white}http://localhost:${actualPort || PORT}${C.reset}`);
  console.log(`  ${C.green}${C.bright}✔ Environment${C.reset}   ${C.yellow}${ENV}${C.reset}`);
  console.log(`  ${C.green}${C.bright}✔ MongoDB${C.reset}       ${C.white}${process.env.MONGO_URI}${C.reset}`);
  console.log(`  ${C.green}${C.bright}✔ DB Status${C.reset}     ${mongoose.connection.readyState === 1 ? `${C.green}Connected` : `${C.red}Disconnected`}${C.reset}`);
  console.log(`  ${C.green}${C.bright}✔ DB Host${C.reset}       ${C.white}${mongoose.connection.host || 'N/A'}${C.reset}`);
  console.log(`  ${C.green}${C.bright}✔ DB Name${C.reset}       ${C.white}${mongoose.connection.name || 'N/A'}${C.reset}`);
  console.log(`  ${C.green}${C.bright}✔ Email${C.reset}         ${C.white}${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT} (${process.env.EMAIL_USER})${C.reset}`);
  console.log(`  ${C.green}${C.bright}✔ Cloudinary${C.reset}    ${process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' ? `${C.green}Configured` : `${C.yellow}Not configured`}${C.reset}`);
  console.log(`  ${C.green}${C.bright}✔ JWT${C.reset}           ${C.white}Expires in ${process.env.JWT_EXPIRES_IN}${C.reset}`);
  console.log(`  ${C.green}${C.bright}✔ Rate Limit${C.reset}    ${C.white}100 req / 15min (auth: 10 req / 15min)${C.reset}`);
  console.log(`  ${C.green}${C.bright}✔ File Upload${C.reset}   ${C.white}Max 10MB — uploads/ directory${C.reset}`);

  // AI Provider Status
  try {
    const ai = getAIService();
    const providerStatus = ai.getProviderStatus();
    const configured = Object.entries(providerStatus)
      .filter(([, v]) => v.available)
      .map(([k]) => k);
    const aiLine = configured.length
      ? `${C.green}${C.bright}✔ AI${C.reset}           ${C.white}${configured.join(', ')}${C.reset}`
      : `${C.yellow}○ AI${C.reset}           ${C.dim}No API keys configured${C.reset}`;
    console.log(`  ${aiLine}`);
  } catch {
    console.log(`  ${C.yellow}○ AI${C.reset}           ${C.dim}Not initialized${C.reset}`);
  }

  console.log(line);
  console.log(`${C.gray}  API Base: http://localhost:${actualPort || PORT}/api${C.reset}`);
  console.log(`${C.gray}  Health:   http://localhost:${actualPort || PORT}/health${C.reset}`);
  console.log(`${C.gray}  Routes:   /auth /users /programs /attendance /transactions${C.reset}`);
  console.log(`${C.gray}            /reports /announcements /welfare /analytics /notifications${C.reset}`);
  console.log(`${C.gray}            /ai ${C.dim}(chat, summary, risk, translate, providers, health)${C.reset}`);
  console.log(line + '\n');
};

const start = async () => {
  await connectDB();

  let currentPort = PORT;
  const maxAttempts = 10;

  const tryListen = () => {
    const httpServer = http.createServer(app);
    initSocketIO(httpServer);
    const server = httpServer.listen(currentPort)
      .on('listening', () => {
        printBanner(currentPort);
        logger.info(`VOA System API is live on port ${currentPort}`);
        // Start background reminder scheduler
        try {
          ReminderScheduler.start();
          logger.info('Reminder Scheduler started');
        } catch (err) {
          logger.warn(`Reminder Scheduler not started: ${err.message}`);
        }
      })
      .on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          if (currentPort - PORT < maxAttempts) {
            currentPort++;
            logger.warn(`Port ${currentPort - 1} in use — trying port ${currentPort}`);
            tryListen();
          } else {
            logger.error(`Cannot find available port after ${maxAttempts} attempts`);
            process.exit(1);
          }
        } else {
          logger.error(`Cannot start server: ${err.message}`);
          process.exit(1);
        }
      });
  };

  tryListen();
};

start();

// ─── Mongoose connection events ───────────────────────────────────────────────
mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
mongoose.connection.on('error', (err) => logger.error(`MongoDB error: ${err.message}`));

// ─── Process events ───────────────────────────────────────────────────────────
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  mongoose.connection.close(() => {
    logger.info('MongoDB connection closed');
    process.exit(0);
  });
});
