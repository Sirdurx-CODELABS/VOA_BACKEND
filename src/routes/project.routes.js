const router = require('express').Router();
const ctrl = require('../controllers/project.controller');
const { protect, isSuperAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/public/all', ctrl.getAllPublicProjects);
router.get('/public/:id', ctrl.getPublicProjectById);

// Protected routes — Super Admin only for content management
router.use(protect);
router.get('/', isSuperAdmin, ctrl.getAllProjects);
router.get('/:id', isSuperAdmin, ctrl.getProjectById);
router.post('/', isSuperAdmin, upload.array('images', 10), ctrl.createProject);
router.put('/:id', isSuperAdmin, upload.array('images', 10), ctrl.updateProject);
router.delete('/:id', isSuperAdmin, ctrl.deleteProject);

module.exports = router;
