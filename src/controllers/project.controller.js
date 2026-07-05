const Project = require('../models/Project');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');
const { uploadToCloudinary } = require('../services/upload.service');

// Public controllers
exports.getAllPublicProjects = async (req, res, next) => {
  try {
    const filter = { isPublic: true };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    
    const projects = await Project.find(filter)
      .populate('createdBy', 'fullName role')
      .sort({ createdAt: -1 });
    return success(res, projects);
  } catch (err) { next(err); }
};

exports.getPublicProjectById = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, isPublic: true })
      .populate('createdBy', 'fullName role');
    if (!project) return error(res, 'Project not found', 404);
    return success(res, project);
  } catch (err) { next(err); }
};

// Admin controllers
exports.getAllProjects = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) filter.title = { $regex: req.query.search, $options: 'i' };
    if (!req.isSuperAdmin) {
      if (req.allianceOrganizationId) filter.allianceOrganizationId = req.allianceOrganizationId;
    } else if (req.query.allianceOrganizationId) {
      filter.allianceOrganizationId = req.query.allianceOrganizationId;
    }

    const [projects, total] = await Promise.all([
      Project.find(filter).skip(skip).limit(limit).populate('createdBy', 'fullName role').sort({ createdAt: -1 }),
      Project.countDocuments(filter),
    ]);
    return paginated(res, projects, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

exports.getProjectById = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (!req.isSuperAdmin && req.allianceOrganizationId) {
      query.allianceOrganizationId = req.allianceOrganizationId;
    }
    const project = await Project.findOne(query).populate('createdBy', 'fullName role');
    if (!project) return error(res, 'Project not found', 404);
    return success(res, project);
  } catch (err) { next(err); }
};

exports.createProject = async (req, res, next) => {
  try {
    const data = { ...req.body, createdBy: req.user._id };
    data.allianceOrganizationId = req.allianceOrganizationId;
    
    if (req.files && req.files.images) {
      const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      const imageUrls = [];
      for (const file of files) {
        const url = await uploadToCloudinary(file.path, 'voa/projects');
        imageUrls.push(url);
      }
      data.images = imageUrls;
      if (imageUrls.length > 0) data.image = imageUrls[0];
    } else if (req.file) {
      data.image = await uploadToCloudinary(req.file.path, 'voa/projects');
    }
    
    const project = await Project.create(data);
    return success(res, project, 'Project created', 201);
  } catch (err) { next(err); }
};

exports.updateProject = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (!req.isSuperAdmin && req.allianceOrganizationId) {
      query.allianceOrganizationId = req.allianceOrganizationId;
    }
    const project = await Project.findOne(query);
    if (!project) return error(res, 'Project not found', 404);

    const data = { ...req.body };
    
    if (req.files && req.files.images) {
      const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      const imageUrls = [...(project.images || [])];
      for (const file of files) {
        if (imageUrls.length >= 10) break;
        const url = await uploadToCloudinary(file.path, 'voa/projects');
        imageUrls.push(url);
      }
      data.images = imageUrls.slice(0, 10);
      if (!data.image && imageUrls.length > 0) data.image = imageUrls[0];
    }
    
    Object.assign(project, data);
    await project.save();
    return success(res, project, 'Project updated');
  } catch (err) { next(err); }
};

exports.deleteProject = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (!req.isSuperAdmin && req.allianceOrganizationId) {
      query.allianceOrganizationId = req.allianceOrganizationId;
    }
    const project = await Project.findOneAndDelete(query);
    if (!project) return error(res, 'Project not found', 404);
    return success(res, null, 'Project deleted');
  } catch (err) { next(err); }
};
