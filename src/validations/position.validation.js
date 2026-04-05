const Joi = require('joi');

const LEADERSHIP_ROLES = [
  'vice_chairman', 'secretary', 'treasurer', 'pro',
  'program_coordinator', 'membership_coordinator', 'welfare_officer',
];

// Member submits application — no status/approval fields allowed
const submitApplication = Joi.object({
  appliedPosition: Joi.string().valid(...LEADERSHIP_ROLES).required(),
  reasonStatement: Joi.string().min(20).max(2000).required(),
  experience: Joi.string().max(1000).optional(),
  skills: Joi.array().items(Joi.string()).optional(),
  availability: Joi.string().max(500).optional(),
  supportingNote: Joi.string().max(1000).optional(),
}).options({ stripUnknown: true });

// Membership Coordinator review — only decision + note
const membershipReview = Joi.object({
  decision: Joi.string().valid('accept', 'reject').required(),
  note: Joi.string().max(500).optional(),
}).options({ stripUnknown: true });

// Chairman final decision — only decision + note
const chairmanReview = Joi.object({
  decision: Joi.string().valid('approve', 'reject').required(),
  note: Joi.string().max(500).optional(),
}).options({ stripUnknown: true });

module.exports = { submitApplication, membershipReview, chairmanReview, LEADERSHIP_ROLES };
