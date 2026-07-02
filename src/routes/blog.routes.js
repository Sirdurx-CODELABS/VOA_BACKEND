const router = require('express').Router();
const ctrl = require('../controllers/blog.controller');
const { protect, requirePermission } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/public/all', ctrl.getAllPublicBlogs);
router.get('/public/:slug', ctrl.getPublicBlogBySlug);

// Protected routes
router.use(protect);
router.get('/', requirePermission('view_blogs'), ctrl.getAllBlogs);
router.get('/:id', requirePermission('view_blogs'), ctrl.getBlogById);
router.post('/', requirePermission('manage_blogs'), upload.single('image'), ctrl.createBlog);
router.put('/:id', requirePermission('manage_blogs'), upload.single('image'), ctrl.updateBlog);
router.delete('/:id', requirePermission('manage_blogs'), ctrl.deleteBlog);

module.exports = router;
