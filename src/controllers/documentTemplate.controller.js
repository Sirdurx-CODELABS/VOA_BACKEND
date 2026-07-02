const DocumentTemplate = require('../models/DocumentTemplate');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');
const logger = require('../utils/logger');
const { uploadToCloudinary } = require('../services/upload.service');

exports.createDocumentTemplate = async (req, res, next) => {
  try {
    const { name, templateType, data, pdfUrl } = req.body;
    const userId = req.user._id;

    const documentTemplate = await DocumentTemplate.create({
      name,
      templateType,
      userId,
      data,
      pdfUrl
    });

    logger.info(`New document template created: ${templateType} by ${userId}`);
    return success(res, documentTemplate, 'Document template created successfully!', 201);
  } catch (err) {
    next(err);
  }
};

exports.getDocumentTemplatesByUser = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const filter = (userRole === 'super_admin' || userRole === 'chairman') ? {} : { userId };
    const { page, limit, skip } = paginate(req.query);
    const [templates, total] = await Promise.all([
      DocumentTemplate.find(filter, { data: 0 })
        .skip(skip).limit(limit)
        .populate('userId', 'fullName email role')
        .sort({ createdAt: -1 })
        .lean(),
      DocumentTemplate.countDocuments(filter),
    ]);
    return paginated(res, templates, paginationMeta(total, page, limit), 'Document templates retrieved successfully!');
  } catch (err) {
    next(err);
  }
};

exports.getDocumentTemplateById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const documentTemplate = await DocumentTemplate.findById(id);
    if (!documentTemplate) {
      return error(res, 'Document template not found!', 404);
    }
    if (!canManageDocument(req.user, documentTemplate)) {
      return error(res, 'Not authorized to access this template!', 403);
    }
    return success(res, documentTemplate, 'Document template retrieved successfully!');
  } catch (err) {
    next(err);
  }
};

const canManageDocument = (user, documentTemplate) => {
  const ownerId = documentTemplate.userId?.toString();
  return ownerId === user._id.toString()
    || user.role === 'super_admin'
    || user.role === 'chairman';
};

exports.updateDocumentTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, data, pdfUrl } = req.body;
    const userId = req.user._id;

    const documentTemplate = await DocumentTemplate.findById(id);
    if (!documentTemplate) {
      return error(res, 'Document template not found!', 404);
    }
    if (!canManageDocument(req.user, documentTemplate)) {
      return error(res, 'Not authorized to update this template!', 403);
    }

    if (name !== undefined) documentTemplate.name = name;
    if (data !== undefined) documentTemplate.data = data;
    if (pdfUrl !== undefined) documentTemplate.pdfUrl = pdfUrl;

    await documentTemplate.save();
    logger.info(`Document template updated: ${id} by ${userId}`);
    return success(res, documentTemplate, 'Document template updated successfully!');
  } catch (err) {
    next(err);
  }
};

exports.deleteDocumentTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const documentTemplate = await DocumentTemplate.findById(id);
    if (!documentTemplate) {
      return error(res, 'Document template not found!', 404);
    }
    if (!canManageDocument(req.user, documentTemplate)) {
      return error(res, 'Not authorized to delete this template!', 403);
    }

    await DocumentTemplate.findByIdAndDelete(id);
    logger.info(`Document template deleted: ${id} by ${userId}`);
    return success(res, null, 'Document template deleted successfully!');
  } catch (err) {
    next(err);
  }
};

exports.getAllDocumentTemplates = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const [templates, total] = await Promise.all([
      DocumentTemplate.find({}, { data: 0 })
        .skip(skip).limit(limit)
        .populate('userId', 'fullName email role')
        .sort({ createdAt: -1 })
        .lean(),
      DocumentTemplate.countDocuments(),
    ]);
    return paginated(res, templates, paginationMeta(total, page, limit), 'All document templates retrieved');
  } catch (err) { next(err); }
};

exports.copyDocumentTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const documentTemplate = await DocumentTemplate.findById(id);
    if (!documentTemplate) {
      return error(res, 'Document template not found!', 404);
    }
    if (!canManageDocument(req.user, documentTemplate)) {
      return error(res, 'Not authorized to copy this template!', 403);
    }

    // Create copy
    const copy = await DocumentTemplate.create({
      name: `${documentTemplate.name} (Copy)`,
      templateType: documentTemplate.templateType,
      userId,
      data: documentTemplate.data,
      pdfUrl: documentTemplate.pdfUrl
    });

    logger.info(`Document template copied: ${id} to ${copy._id} by ${userId}`);
    return success(res, copy, 'Document template copied successfully!', 201);
  } catch (err) {
    next(err);
  }
};

exports.uploadDocumentFile = async (req, res, next) => {
  try {
    if (!req.file) return error(res, 'No file uploaded', 400);
    const url = await uploadToCloudinary(req.file.path, 'voa/documents');
    logger.info(`File uploaded to document: ${url} by ${req.user._id}`);
    return success(res, { url, originalName: req.file.originalname }, 'File uploaded successfully!');
  } catch (err) { next(err); }
};
