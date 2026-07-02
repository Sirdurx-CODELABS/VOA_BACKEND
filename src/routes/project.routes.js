const router = require('express').Router();
const ctrl = require('../controllers/project.controller');
const { protect, requirePermission } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/public/all', ctrl.getAllPublicProjects);
router.get('/public/:id', ctrl.getPublicProjectById);

// Protected routes
router.use(protect);
router.get('/', requirePermission('view_projects'), ctrl.getAllProjects);
router.get('/:id', requirePermission('view_projects'), ctrl.getProjectById);
router.post('/', requirePermission('manage_projects'), upload.array('images', 10), ctrl.createProject);
router.put('/:id', requirePermission('manage_projects'), upload.array('images', 10), ctrl.updateProject);
router.delete('/:id', requirePermission('manage_projects'), ctrl.deleteProject);

module.exports = router;
