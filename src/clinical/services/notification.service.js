const Notification = require('../../ai/models/Notification');
const { emitClinicalEvent, CLINICAL_EVENTS } = require('./socket.service');

/**
 * Create a notification and emit a real-time socket event.
 */
async function notify({ recipient, role, hospital, type, title, message, patient, patientName, link, metadata, priority }) {
  const notification = await Notification.create({
    recipient, role, hospital, type, title, message,
    patient, patientName, link, metadata: metadata || {},
    priority: priority || 'normal',
  });

  emitClinicalEvent({
    event: CLINICAL_EVENTS.NOTIFICATION,
    data: notification.toObject(),
    recipientUserId: recipient,
    recipientRole: role,
    hospitalId: hospital,
  });

  return notification;
}

/**
 * Create notifications for all users with a specific role in a hospital.
 */
async function notifyRole(hospitalId, role, data) {
  const User = require('../../models/User');
  const users = await User.find({ role, status: 'active', hospital: hospitalId }).select('_id');
  const results = [];
  for (const user of users) {
    const n = await notify({ ...data, recipient: user._id, role, hospital: hospitalId });
    results.push(n);
  }
  return results;
}

/**
 * Create notifications for all clinical staff in a hospital.
 */
async function notifyHospital(hospitalId, data, excludeRoles = []) {
  const User = require('../../models/User');
  const { isClinicalRole } = require('../../config/permissions');
  const allUsers = await User.find({ status: 'active' }).select('_id role');
  const clinical = allUsers.filter(u => isClinicalRole(u.role) && !excludeRoles.includes(u.role));
  const results = [];
  for (const user of clinical) {
    const n = await notify({ ...data, recipient: user._id, role: user.role, hospital: hospitalId });
    results.push(n);
  }
  return results;
}

/**
 * Fetch notifications for a user.
 */
async function getNotifications(userId, options = {}) {
  const { limit = 50, unreadOnly = false } = options;
  const filter = { recipient: userId };
  if (unreadOnly) filter.read = false;
  return Notification.find(filter).sort({ createdAt: -1 }).limit(limit);
}

/**
 * Mark a single notification as read.
 */
async function markRead(notificationId, userId) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { $set: { read: true, readAt: new Date() } },
    { new: true }
  );
}

/**
 * Mark all notifications as read for a user.
 */
async function markAllRead(userId) {
  return Notification.updateMany(
    { recipient: userId, read: false },
    { $set: { read: true, readAt: new Date() } }
  );
}

/**
 * Get unread count for a user.
 */
async function getUnreadCount(userId) {
  return Notification.countDocuments({ recipient: userId, read: false });
}

module.exports = { notify, notifyRole, notifyHospital, getNotifications, markRead, markAllRead, getUnreadCount };
