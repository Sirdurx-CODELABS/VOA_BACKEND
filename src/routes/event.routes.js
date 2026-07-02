const router = require('express').Router();
const ctrl = require('../controllers/event.controller');
const { protect, requirePermission } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/public/all', ctrl.getAllPublicEvents);
router.get('/public/:id', ctrl.getPublicEventById);
router.post('/public/:id/register', ctrl.registerForEvent);

// Protected routes
router.use(protect);
router.get('/', requirePermission('view_events'), ctrl.getAllEvents);
router.get('/:id', requirePermission('view_events'), ctrl.getEventById);
router.post('/', requirePermission('manage_events'), upload.array('images', 10), ctrl.createEvent);
router.put('/:id', requirePermission('manage_events'), upload.array('images', 10), ctrl.updateEvent);
router.delete('/:id', requirePermission('manage_events'), ctrl.deleteEvent);

module.exports = router;
