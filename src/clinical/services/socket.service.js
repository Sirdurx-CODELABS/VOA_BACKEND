const { Server } = require('socket.io');

let io = null;

const CLINICAL_EVENTS = {
  TRIAGE_PENDING: 'clinical:triage:pending',
  TRIAGE_COMPLETED: 'clinical:triage:completed',
  VITALS_RECORDED: 'clinical:vitals:recorded',
  PATIENT_ESCALATED: 'clinical:patient:escalated',
  PRESCRIPTION_PENDING: 'clinical:prescription:pending',
  PRESCRIPTION_DISPENSED: 'clinical:prescription:dispensed',
  SAMPLE_COLLECTED: 'clinical:lab:sample_collected',
  LAB_RESULT_UPLOADED: 'clinical:lab:result_uploaded',
  LAB_CRITICAL_FLAGGED: 'clinical:lab:critical_flagged',
  COUNSELING_SESSION: 'clinical:counseling:created',
  CASE_OPENED: 'clinical:case:opened',
  CASE_UPDATED: 'clinical:case:updated',
  REFERRAL_SENT: 'clinical:referral:sent',
  NOTIFICATION: 'notification:new',
};

function initSocketIO(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));

    const jwt = require('jsonwebtoken');
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role || 'unknown';
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Join role-specific room
    if (socket.userRole) {
      socket.join(`role:${socket.userRole}`);
    }

    socket.on('clinical:join:hospital', (hospitalId) => {
      if (hospitalId) socket.join(`hospital:${hospitalId}`);
    });

    socket.on('clinical:leave:hospital', (hospitalId) => {
      if (hospitalId) socket.leave(`hospital:${hospitalId}`);
    });

    socket.on('disconnect', () => {});
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

/**
 * Emit an event to all relevant rooms for a clinical action.
 * Rooms: user-specific, role-specific, hospital-wide.
 */
function emitClinicalEvent({ event, data, recipientUserId, recipientRole, hospitalId }) {
  if (!io) return;
  const rooms = [];
  if (recipientUserId) rooms.push(`user:${recipientUserId}`);
  if (recipientRole) rooms.push(`role:${recipientRole}`);
  if (hospitalId) rooms.push(`hospital:${hospitalId}`);
  // Fallback: emit to all if no specific target
  if (rooms.length === 0) {
    io.emit(event, data);
    return;
  }
  rooms.forEach((room) => io.to(room).emit(event, data));
}

module.exports = { initSocketIO, getIO, emitClinicalEvent, CLINICAL_EVENTS };
