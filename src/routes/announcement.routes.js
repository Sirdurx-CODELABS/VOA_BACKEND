const router = require('express').Router();
const ctrl = require('../controllers/announcement.controller');
const { protect, requirePermission, requireAnyPermission } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public
router.get('/public', ctrl.getPublicAnnouncements);

router.use(protect);

// Get allowed categories for current user's role
router.get('/my-categories', ctrl.getAllowedCategories);

// Read
router.get('/',    requireAnyPermission('view_announcements', 'manage_announcements'), ctrl.getAllAnnouncements);
router.get('/:id', requireAnyPermission('view_announcements', 'manage_announcements'), ctrl.getAnnouncementById);

// Write — any role with manage_announcements can post (category validated in controller)
router.post('/',      requirePermission('manage_announcements'), upload.array('attachments', 3), ctrl.createAnnouncement);
router.put('/:id',    requirePermission('manage_announcements'), ctrl.updateAnnouncement);
router.delete('/:id', requirePermission('manage_announcements'), ctrl.deleteAnnouncement);

module.exports = router;
