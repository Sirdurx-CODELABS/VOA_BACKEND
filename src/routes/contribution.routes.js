const router = require('express').Router();
const ctrl = require('../controllers/contribution.controller');
const { protect, requirePermission } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { getPointsHistory } = require('../services/points.service');
const { success } = require('../utils/apiResponse');

router.use(protect);

// Transparency summary — all authenticated
router.get('/summary', ctrl.getSummary);

// Required amount for current user
router.get('/required-amount', ctrl.getRequiredAmount);

// Monthly status for current user
router.get('/monthly-status', ctrl.getMonthlyStatus);

// Recalculate required amount (call after profile/children changes)
router.post('/recalculate', ctrl.recalculateMyContribution);

// Points history
router.get('/my-points', async (req, res, next) => {
  try {
    const history = await getPointsHistory(req.user._id);
    return success(res, history);
  } catch (err) { next(err); }
});

// All installments (treasurer sees all, member sees own)
router.get('/installments', ctrl.getAllInstallments);

// All monthly records
router.get('/monthly-records', ctrl.getAllMonthlyRecords);

// Submit installment
router.post('/installments', requirePermission('submit_contribution'), upload.single('proofImage'), ctrl.submitInstallment);

// Approve / reject
router.patch('/installments/:id/approve', requirePermission('manage_contributions'), ctrl.approveInstallment);
router.patch('/installments/:id/reject', requirePermission('manage_contributions'), ctrl.rejectInstallment);

module.exports = router;
