const router = require('express').Router();
const ctrl = require('../controllers/report.controller');
const { protect, requirePermission, requireAnyPermission } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);

router.get('/',    requireAnyPermission('view_reports', 'create_reports'), ctrl.getAllReports);
router.get('/:id', requireAnyPermission('view_reports', 'create_reports'), ctrl.getReportById);
router.post('/',   requirePermission('create_reports'), upload.array('attachments', 5), ctrl.createReport);
router.put('/:id', requirePermission('create_reports'), ctrl.updateReport);
router.delete('/:id', requirePermission('create_reports'), ctrl.deleteReport);

module.exports = router;
