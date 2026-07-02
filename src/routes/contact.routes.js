const router = require('express').Router();
const ctrl = require('../controllers/contact.controller');
const { protect, requirePermission } = require('../middleware/auth');

// Public routes
router.post('/public/message', ctrl.submitContactMessage);

// Protected routes
router.use(protect);
router.get('/', requirePermission('view_contact'), ctrl.getAllContactMessages);
router.get('/:id', requirePermission('view_contact'), ctrl.getContactMessageById);
router.post('/:id/reply', requirePermission('manage_contact'), ctrl.replyToContactMessage);
router.put('/:id/status', requirePermission('manage_contact'), ctrl.updateContactMessageStatus);
router.delete('/:id', requirePermission('manage_contact'), ctrl.deleteContactMessage);

module.exports = router;
