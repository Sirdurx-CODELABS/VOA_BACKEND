const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const log = async ({ actor, action, entity, entityId, details, ip }) => {
  try {
    await AuditLog.create({
      actor: actor._id || actor,
      actorRole: actor.role,
      action,
      entity,
      entityId,
      details,
      ip,
    });
  } catch (err) {
    logger.error(`Audit log failed: ${err.message}`);
  }
};

module.exports = { log };
