const router = require('express').Router();
const ctrl = require('../controllers/transaction.controller');
const { protect, requirePermission, requireAnyPermission } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createTransaction } = require('../validations/transaction.validation');

router.use(protect);

router.get('/',          requireAnyPermission('view_finance', 'manage_finance'), ctrl.getAllTransactions);
router.get('/summary',   requireAnyPermission('view_finance', 'manage_finance'), ctrl.getFinancialSummary);
router.get('/:id',       requireAnyPermission('view_finance', 'manage_finance'), ctrl.getTransactionById);
router.post('/',         requirePermission('manage_finance'),  validate(createTransaction), ctrl.createTransaction);
router.patch('/:id/approve', requirePermission('approve_expense'), ctrl.approveTransaction);
router.patch('/:id/reject',  requirePermission('approve_expense'), ctrl.rejectTransaction);

module.exports = router;
