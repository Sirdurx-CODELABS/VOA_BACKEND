const router = require('express').Router();
const ctrl = require('../controllers/program.controller');
const { protect, requirePermission } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validations/program.validation');

router.use(protect);

router.get('/',    requirePermission('view_programs'),   ctrl.getAllPrograms);
router.get('/:id', requirePermission('view_programs'),   ctrl.getProgramById);
router.post('/',   requirePermission('manage_programs'), validate(v.createProgram), ctrl.createProgram);
router.put('/:id', requirePermission('manage_programs'), validate(v.updateProgram), ctrl.updateProgram);
router.delete('/:id', requirePermission('manage_programs'), ctrl.deleteProgram);
router.post('/:id/assign-members', requirePermission('manage_programs'), ctrl.assignMembers);
router.post('/:id/remove-members', requirePermission('manage_programs'), ctrl.removeMembers);

module.exports = router;
