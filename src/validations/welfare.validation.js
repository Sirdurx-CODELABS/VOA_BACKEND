const Joi = require('joi');

// Member creates a request — only type + message allowed
const createWelfareRequest = Joi.object({
  type: Joi.string().valid('financial', 'personal', 'other').required(),
  message: Joi.string().min(10).max(1000).required(),
  // attachments handled by multer, not body
}).options({ stripUnknown: true });

// Welfare officer updates status — only status + note
const updateWelfareStatus = Joi.object({
  status: Joi.string().valid('pending', 'in-progress', 'resolved').required(),
  note: Joi.string().max(500).optional(),
}).options({ stripUnknown: true });

// Add follow-up note
const addFollowUp = Joi.object({
  note: Joi.string().min(2).max(500).required(),
}).options({ stripUnknown: true });

module.exports = { createWelfareRequest, updateWelfareStatus, addFollowUp };
