const Joi = require('joi');

// Strip unknown fields so frontend sending extra fields (like status) never causes errors
const createProgram = Joi.object({
  title: Joi.string().min(2).max(200).required(),
  description: Joi.string().optional().allow(''),
  date: Joi.date().required(),
  endDate: Joi.date().optional(),
  budget: Joi.number().min(0).optional(),
  venue: Joi.string().optional().allow(''),
  tags: Joi.array().items(Joi.string()).optional(),
  assignedMembers: Joi.array().items(Joi.string()).optional(),
}).options({ stripUnknown: true });

// Update allows status change + all create fields optional
const updateProgram = Joi.object({
  title: Joi.string().min(2).max(200).optional(),
  description: Joi.string().optional().allow(''),
  date: Joi.date().optional(),
  endDate: Joi.date().optional(),
  budget: Joi.number().min(0).optional(),
  venue: Joi.string().optional().allow(''),
  tags: Joi.array().items(Joi.string()).optional(),
  assignedMembers: Joi.array().items(Joi.string()).optional(),
  status: Joi.string().valid('upcoming', 'ongoing', 'completed').optional(),
}).options({ stripUnknown: true });

module.exports = { createProgram, updateProgram };
