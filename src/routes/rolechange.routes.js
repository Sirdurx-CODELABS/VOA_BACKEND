const router = require('express').Router();
const ctrl = require('../controllers/rolechange.controller');
const { protect, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validations/rolechange.validation');

router.use(protect);

router.get('/', ctrl.getAll);

// Membership Coordinator initiates
router.post('/',
  requireRole('membership_coordinator', 'super_admin'),
  validate(v.createRoleChange),
  ctrl.create
);

// Chairman decision
router.patch('/:id/chairman-approve',
  requireRole('chairman', 'super_admin'),
  validate(v.chairmanDecision),
  ctrl.chairmanDecision
);

// Super admin bypass
router.patch('/:id/superadmin-approve',
  requireRole('super_admin'),
  ctrl.superAdminApprove
);

module.exports = router;
