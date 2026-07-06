const router = require('express').Router();
const ctrl = require('../controllers/event.controller');
const { protect, isSuperAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/public/all', ctrl.getAllPublicEvents);
router.get('/public/:id', ctrl.getPublicEventById);
router.post('/public/:id/register', ctrl.registerForEvent);

// Protected routes — Super Admin only for content management
router.use(protect);
router.get('/', isSuperAdmin, ctrl.getAllEvents);
router.get('/:id', isSuperAdmin, ctrl.getEventById);
router.post('/', isSuperAdmin, upload.array('images', 10), ctrl.createEvent);
router.put('/:id', isSuperAdmin, upload.array('images', 10), ctrl.updateEvent);
router.delete('/:id', isSuperAdmin, ctrl.deleteEvent);

module.exports = router;
