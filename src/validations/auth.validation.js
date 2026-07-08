const Joi = require('joi');

const register = Joi.object({
  fullName: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().optional(),
  allianceOrganizationId: Joi.string().optional(),
  requestNewOrganization: Joi.string().max(200).optional(),
});

const login = Joi.object({
  identifier: Joi.string().required().messages({ 'any.required': 'Email or phone number is required' }),
  email: Joi.string().email().optional(),
  password: Joi.string().required(),
  portal: Joi.string().valid('org', 'hms').optional(),
});

const forgotPassword = Joi.object({
  email: Joi.string().email().required(),
});

const resetPassword = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(6).required(),
});

module.exports = { register, login, forgotPassword, resetPassword };
