const router = require('express').Router();
const ctrl = require('../controllers/contribution.controller');
const { protect, requirePermission } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);

// All authenticated users can see summary (transparency)
router.get('/summary', ctrl.getSummary);
router.get('/required-amount', ctrl.getRequiredAmount);

// View contributions
router.get('/', requirePermission('view_contributions'), ctrl.getAll);
router.get('/:id', requirePermission('view_contributions'), ctrl.getById);

// Member submits
router.post('/', requirePermission('submit_contribution'), upload.single('proofImage'), ctrl.submit);

// Treasurer approves/rejects
router.patch('/:id/approve', requirePermission('manage_contributions'), ctrl.approve);
router.patch('/:id/reject', requirePermission('manage_contributions'), ctrl.reject);

module.exports = router;
