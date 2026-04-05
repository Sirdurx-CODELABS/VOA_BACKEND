const Joi = require('joi');

const createTransaction = Joi.object({
  title: Joi.string().required(),
  amount: Joi.number().min(0).required(),
  type: Joi.string().valid('income', 'expense').required(),
  programId: Joi.string().optional(),
  description: Joi.string().optional(),
});

module.exports = { createTransaction };
