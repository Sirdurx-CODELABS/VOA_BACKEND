const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors } = format;

// Color codes for console output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

const levelColors = {
  error: COLORS.red,
  warn: COLORS.yellow,
  info: COLORS.green,
  http: COLORS.cyan,
  debug: COLORS.gray,
};

const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  const color = levelColors[level] || COLORS.reset;
  const ts = `${COLORS.gray}${timestamp}${COLORS.reset}`;
  const lvl = `${color}${COLORS.bright}[${level.toUpperCase()}]${COLORS.reset}`;
  const msg = stack ? `${message}\n${COLORS.red}${stack}${COLORS.reset}` : message;
  return `${ts} ${lvl} ${msg}`;
});

const fileFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
});

const logger = createLogger({
  level: 'http',
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true })),
  transports: [
    new transports.Console({ format: combine(timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }), consoleFormat) }),
    new transports.File({ filename: 'logs/error.log', level: 'error', format: combine(timestamp(), fileFormat) }),
    new transports.File({ filename: 'logs/combined.log', format: combine(timestamp(), fileFormat) }),
  ],
});

module.exports = logger;
