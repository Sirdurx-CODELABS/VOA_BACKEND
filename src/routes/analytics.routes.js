const router = require('express').Router();
const ctrl = require('../controllers/analytics.controller');
const { protect, requirePermission } = require('../middleware/auth');

router.use(protect);

router.get('/dashboard',      ctrl.getDashboardSummary);
router.get('/my-dashboard',   ctrl.getMyDashboard);
router.get('/members',        requirePermission('view_analytics'), ctrl.getMemberStats);
router.get('/leaderboard',    ctrl.getLeaderboard);
router.get('/programs',       ctrl.getProgramMetrics);
router.get('/inactive-users', requirePermission('view_analytics'), ctrl.getInactiveUsers);
router.post('/alert-inactive', requirePermission('view_analytics'), ctrl.alertInactiveUsers);

module.exports = router;
