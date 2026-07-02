const router = require('express').Router();
const ctrl = require('../controllers/templateConfig.controller');
const { protect, requireRole } = require('../middleware/auth');

// Admin: list all template configs (with visibility and roles)
router.get('/', protect, requireRole('super_admin', 'chairman'), ctrl.getAll);

// Admin: update a single template config
router.put('/:templateType', protect, requireRole('super_admin', 'chairman'), ctrl.update);

// Public (auth required): get only visible templates
router.get('/visible', protect, ctrl.getVisible);

module.exports = router;
