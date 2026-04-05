const router = require('express').Router();
const ctrl = require('../controllers/attendance.controller');
const { protect, requirePermission, requireAnyPermission } = require('../middleware/auth');

router.use(protect);

router.post('/',      requirePermission('manage_attendance'), ctrl.recordAttendance);
router.post('/bulk',  requirePermission('manage_attendance'), ctrl.bulkRecordAttendance);
router.get('/program/:programId',         requireAnyPermission('view_attendance', 'manage_attendance'), ctrl.getProgramAttendance);
router.get('/program/:programId/summary', requireAnyPermission('view_attendance', 'manage_attendance'), ctrl.getAttendanceSummary);
router.get('/user/:userId', requireAnyPermission('view_attendance', 'manage_attendance'), ctrl.getUserAttendance);
router.get('/me', ctrl.getUserAttendance); // self — always allowed

module.exports = router;
