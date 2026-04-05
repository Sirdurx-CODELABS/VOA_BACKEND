const router = require('express').Router();
const ctrl = require('../controllers/account.controller');
const { protect, requirePermission } = require('../middleware/auth');

router.use(protect);

router.get('/', requirePermission('view_accounts'), ctrl.getAll);
router.post('/', requirePermission('manage_accounts'), ctrl.create);
router.put('/:id', requirePermission('manage_accounts'), ctrl.update);
router.delete('/:id', requirePermission('manage_accounts'), ctrl.delete);

module.exports = router;
