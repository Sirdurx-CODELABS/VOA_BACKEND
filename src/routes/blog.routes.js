const router = require('express').Router();
const ctrl = require('../controllers/blog.controller');
const { protect, isSuperAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/public/all', ctrl.getAllPublicBlogs);
router.get('/public/:slug', ctrl.getPublicBlogBySlug);

// Protected routes — Super Admin only for content management
router.use(protect);
router.get('/', isSuperAdmin, ctrl.getAllBlogs);
router.get('/:id', isSuperAdmin, ctrl.getBlogById);
router.post('/', isSuperAdmin, upload.single('image'), ctrl.createBlog);
router.put('/:id', isSuperAdmin, upload.single('image'), ctrl.updateBlog);
router.delete('/:id', isSuperAdmin, ctrl.deleteBlog);

module.exports = router;
