const router = require('express').Router();
const ctrl = require('../controllers/financeTarget.controller');
const { protect, requirePermission } = require('../middleware/auth');

// Public summary — all authenticated users
router.get('/summary', protect, ctrl.getPublicSummary);

router.use(protect);

router.get('/',       ctrl.getAll);
router.get('/:id',    ctrl.getById);
router.post('/',      requirePermission('manage_finance'), ctrl.create);
router.put('/:id',    requirePermission('manage_finance'), ctrl.update);
router.patch('/:id/complete', requirePermission('manage_finance'), ctrl.markComplete);
router.delete('/:id', requirePermission('manage_finance'), ctrl.delete);

module.exports = router;
