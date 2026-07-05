const router = require('express').Router();
const ctrl = require('../controllers/socialChannel.controller');
const { protect, requirePermission } = require('../middleware/auth');

// Public — get active channels
router.get('/active', ctrl.getActive);

router.use(protect);

router.get('/',    requirePermission('manage_announcements'), ctrl.getAll);
router.get('/:id', requirePermission('manage_announcements'), ctrl.getById);
router.post('/',   requirePermission('manage_announcements'), ctrl.create);
router.put('/:id', requirePermission('manage_announcements'), ctrl.update);
router.delete('/:id', requirePermission('manage_announcements'), ctrl.delete);

module.exports = router;
