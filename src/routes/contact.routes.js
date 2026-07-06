const router = require('express').Router();
const ctrl = require('../controllers/contact.controller');
const { protect, isSuperAdmin } = require('../middleware/auth');

// Public routes
router.post('/public/message', ctrl.submitContactMessage);

// Protected routes — Super Admin only for content management
router.use(protect);
router.get('/', isSuperAdmin, ctrl.getAllContactMessages);
router.get('/:id', isSuperAdmin, ctrl.getContactMessageById);
router.post('/:id/reply', isSuperAdmin, ctrl.replyToContactMessage);
router.put('/:id/status', isSuperAdmin, ctrl.updateContactMessageStatus);
router.delete('/:id', isSuperAdmin, ctrl.deleteContactMessage);

module.exports = router;
