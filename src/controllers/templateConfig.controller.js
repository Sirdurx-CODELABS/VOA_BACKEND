const TemplateConfig = require('../models/TemplateConfig');
const { success, error } = require('../utils/apiResponse');

const TEMPLATE_NAMES = {
  letterhead: 'Letterhead',
  membership_card: 'Membership ID Card',
  meeting_agenda: 'Meeting Agenda',
  official_invitation: 'Official Invitation',
  financial_request: 'Financial Request',
  activity_report: 'Activity Report',
  official_receipt: 'Official Receipt',
  mou: 'MOU Template',
  email_signature: 'Email Signature',
  certificate: 'Certificate',
};

const ALL_ROLES = ['super_admin', 'chairman', 'vice_chairman', 'secretary',
  'treasurer', 'pro', 'program_coordinator', 'membership_coordinator', 'welfare_officer', 'member'];

// Seed defaults on first access
const ensureDefaults = async () => {
  const count = await TemplateConfig.countDocuments();
  if (count === 0) {
    const defaults = Object.entries(TEMPLATE_NAMES).map(([templateType, name]) => ({
      templateType, name, isVisible: true, allowedRoles: ALL_ROLES,
    }));
    await TemplateConfig.insertMany(defaults);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    await ensureDefaults();
    const configs = await TemplateConfig.find().sort({ templateType: 1 });
    return success(res, configs);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { isVisible, allowedRoles } = req.body;
    const config = await TemplateConfig.findOne({ templateType: req.params.templateType });
    if (!config) return error(res, 'Template config not found', 404);
    if (typeof isVisible === 'boolean') config.isVisible = isVisible;
    if (allowedRoles) config.allowedRoles = allowedRoles;
    await config.save();
    return success(res, config, 'Template config updated');
  } catch (err) { next(err); }
};

exports.getVisible = async (req, res, next) => {
  try {
    await ensureDefaults();
    const configs = await TemplateConfig.find({ isVisible: true }).sort({ templateType: 1 });
    return success(res, configs);
  } catch (err) { next(err); }
};
