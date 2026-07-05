const ContactMessage = require('../models/ContactMessage');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');
const { sendWelcomeEmail } = require('../services/email.service');

// Public controllers
exports.submitContactMessage = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (req.user?._id) data.user = req.user._id;
    const message = await ContactMessage.create(data);
    return success(res, message, 'Message submitted successfully', 201);
  } catch (err) { next(err); }
};

// Admin controllers
exports.getAllContactMessages = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { subject: { $regex: req.query.search, $options: 'i' } },
      ];
    }
    if (!req.isSuperAdmin) {
      if (req.allianceOrganizationId) filter.allianceOrganizationId = req.allianceOrganizationId;
    } else if (req.query.allianceOrganizationId) {
      filter.allianceOrganizationId = req.query.allianceOrganizationId;
    }

    const [messages, total] = await Promise.all([
      ContactMessage.find(filter).skip(skip).limit(limit).populate('user', 'fullName email').populate('replies.repliedBy', 'fullName role').sort({ createdAt: -1 }),
      ContactMessage.countDocuments(filter),
    ]);
    return paginated(res, messages, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

exports.getContactMessageById = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (!req.isSuperAdmin && req.allianceOrganizationId) {
      query.allianceOrganizationId = req.allianceOrganizationId;
    }
    const message = await ContactMessage.findOne(query)
      .populate('user', 'fullName email phone')
      .populate('replies.repliedBy', 'fullName role');
    if (!message) return error(res, 'Message not found', 404);
    
    if (message.status === 'new') {
      message.status = 'read';
      await message.save();
    }
    
    return success(res, message);
  } catch (err) { next(err); }
};

exports.replyToContactMessage = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (!req.isSuperAdmin && req.allianceOrganizationId) {
      query.allianceOrganizationId = req.allianceOrganizationId;
    }
    const message = await ContactMessage.findOne(query);
    if (!message) return error(res, 'Message not found', 404);

    const reply = {
      content: req.body.content,
      repliedBy: req.user._id,
    };
    message.replies.push(reply);
    message.status = 'replied';
    await message.save();
    
    // Send email notification
    try {
      // In real app, you would use sendGrid/nodemailer to send the reply email
      // For now, we'll just log it
      console.log(`Would send reply email to ${message.email}: ${req.body.content}`);
    } catch (emailErr) {
      console.error('Failed to send reply email:', emailErr);
    }
    
    return success(res, message, 'Reply sent successfully');
  } catch (err) { next(err); }
};

exports.updateContactMessageStatus = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (!req.isSuperAdmin && req.allianceOrganizationId) {
      query.allianceOrganizationId = req.allianceOrganizationId;
    }
    const message = await ContactMessage.findOne(query);
    if (!message) return error(res, 'Message not found', 404);
    message.status = req.body.status;
    await message.save();
    return success(res, message, 'Status updated');
  } catch (err) { next(err); }
};

exports.deleteContactMessage = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (!req.isSuperAdmin && req.allianceOrganizationId) {
      query.allianceOrganizationId = req.allianceOrganizationId;
    }
    const message = await ContactMessage.findOneAndDelete(query);
    if (!message) return error(res, 'Message not found', 404);
    return success(res, null, 'Message deleted');
  } catch (err) { next(err); }
};
