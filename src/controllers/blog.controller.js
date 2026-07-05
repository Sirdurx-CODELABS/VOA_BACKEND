const Blog = require('../models/Blog');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');
const { uploadToCloudinary } = require('../services/upload.service');

// Public controllers
exports.getAllPublicBlogs = async (req, res, next) => {
  try {
    const filter = { status: 'published' };
    if (req.query.category) filter.category = req.query.category;
    
    const blogs = await Blog.find(filter)
      .populate('author', 'fullName role')
      .sort({ createdAt: -1 });
    return success(res, blogs);
  } catch (err) { next(err); }
};

exports.getPublicBlogBySlug = async (req, res, next) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, status: 'published' })
      .populate('author', 'fullName role');
    if (!blog) return error(res, 'Blog not found', 404);
    
    // Increment views
    blog.views += 1;
    await blog.save();
    return success(res, blog);
  } catch (err) { next(err); }
};

// Admin controllers
exports.getAllBlogs = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.search) filter.title = { $regex: req.query.search, $options: 'i' };
    if (!req.isSuperAdmin) {
      if (req.allianceOrganizationId) filter.allianceOrganizationId = req.allianceOrganizationId;
    } else if (req.query.allianceOrganizationId) {
      filter.allianceOrganizationId = req.query.allianceOrganizationId;
    }

    const [blogs, total] = await Promise.all([
      Blog.find(filter).skip(skip).limit(limit).populate('author', 'fullName role').sort({ createdAt: -1 }),
      Blog.countDocuments(filter),
    ]);
    return paginated(res, blogs, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

exports.getBlogById = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (!req.isSuperAdmin && req.allianceOrganizationId) {
      query.allianceOrganizationId = req.allianceOrganizationId;
    }
    const blog = await Blog.findOne(query).populate('author', 'fullName role');
    if (!blog) return error(res, 'Blog not found', 404);
    return success(res, blog);
  } catch (err) { next(err); }
};

exports.createBlog = async (req, res, next) => {
  try {
    const data = { ...req.body, author: req.user._id };
    data.allianceOrganizationId = req.allianceOrganizationId;
    
    if (req.file) {
      data.image = await uploadToCloudinary(req.file.path, 'voa/blogs');
    }
    
    // Auto-generate slug if not provided
    if (!data.slug) {
      data.slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    
    const blog = await Blog.create(data);
    return success(res, blog, 'Blog created', 201);
  } catch (err) { next(err); }
};

exports.updateBlog = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (!req.isSuperAdmin && req.allianceOrganizationId) {
      query.allianceOrganizationId = req.allianceOrganizationId;
    }
    const blog = await Blog.findOne(query);
    if (!blog) return error(res, 'Blog not found', 404);

    const data = { ...req.body };
    
    if (req.file) {
      data.image = await uploadToCloudinary(req.file.path, 'voa/blogs');
    }
    
    Object.assign(blog, data);
    await blog.save();
    return success(res, blog, 'Blog updated');
  } catch (err) { next(err); }
};

exports.deleteBlog = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (!req.isSuperAdmin && req.allianceOrganizationId) {
      query.allianceOrganizationId = req.allianceOrganizationId;
    }
    const blog = await Blog.findOneAndDelete(query);
    if (!blog) return error(res, 'Blog not found', 404);
    return success(res, null, 'Blog deleted');
  } catch (err) { next(err); }
};
