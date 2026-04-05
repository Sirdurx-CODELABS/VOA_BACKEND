const Notification = require('../models/Notification');
const logger = require('../utils/logger');

const createNotification = async ({ recipient, title, message, type = 'general', relatedId = null, relatedModel = null, link = null }) => {
  try {
    return await Notification.create({ recipient, title, message, type, relatedId, relatedModel, link });
  } catch (err) {
    logger.error(`Notification creation failed: ${err.message}`);
  }
};

const notifyMany = async (recipients, payload) => {
  const notifications = recipients.map((recipient) => ({ recipient, ...payload }));
  return Notification.insertMany(notifications);
};

module.exports = { createNotification, notifyMany };
