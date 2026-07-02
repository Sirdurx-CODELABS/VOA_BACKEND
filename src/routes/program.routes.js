const router = require('express').Router();
const ctrl = require('../controllers/program.controller');
const { protect, requirePermission } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validations/program.validation');
const upload = require('../middleware/upload');

// Public endpoints
router.get('/public/all', ctrl.getPublicPrograms);
router.get('/public/:id', ctrl.getProgramById);
router.post('/public/:id/join', ctrl.submitJoinRequest);

// Protected endpoints
router.use(protect);

router.get('/', requirePermission('view_programs'), ctrl.getAllPrograms);
router.get('/:id', requirePermission('view_programs'), ctrl.getProgramById);
router.get('/:id/join-requests', requirePermission('manage_programs'), ctrl.getJoinRequests);
router.put('/:id/join-requests', requirePermission('manage_programs'), ctrl.updateJoinRequestStatus);

router.post('/', requirePermission('manage_programs'), upload.array('images', 10), ctrl.createProgram);
router.put('/:id', requirePermission('manage_programs'), upload.array('images', 10), ctrl.updateProgram);
router.delete('/:id', requirePermission('manage_programs'), ctrl.deleteProgram);
router.post('/:id/assign-members', requirePermission('manage_programs'), ctrl.assignMembers);
router.post('/:id/remove-members', requirePermission('manage_programs'), ctrl.removeMembers);

module.exports = router;
