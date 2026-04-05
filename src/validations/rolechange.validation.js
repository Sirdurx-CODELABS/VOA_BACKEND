const Joi = require('joi');

// Membership Coordinator initiates a role change request
const createRoleChange = Joi.object({
  userId: Joi.string().required(),
  requestedRole: Joi.string().required(),
  reason: Joi.string().min(10).max(500).required(),
}).options({ stripUnknown: true });

// Chairman approves/rejects
const chairmanDecision = Joi.object({
  decision: Joi.string().valid('approve', 'reject').required(),
  note: Joi.string().max(500).optional(),
}).options({ stripUnknown: true });

module.exports = { createRoleChange, chairmanDecision };
