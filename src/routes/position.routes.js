const router = require('express').Router();
const ctrl = require('../controllers/position.controller');
const { protect, requirePermission, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validations/position.validation');

router.use(protect);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);

// Any authenticated user can submit (member role enforced by permission)
router.post('/', validate(v.submitApplication), ctrl.submit);

// Membership Coordinator review
router.patch('/:id/membership-review',
  requireRole('membership_coordinator', 'super_admin'),
  validate(v.membershipReview),
  ctrl.membershipReview
);

// Chairman final decision
router.patch('/:id/chairman-review',
  requireRole('chairman', 'super_admin'),
  validate(v.chairmanReview),
  ctrl.chairmanReview
);

// Super admin direct approve
router.patch('/:id/superadmin-approve',
  requireRole('super_admin'),
  ctrl.superAdminApprove
);

module.exports = router;
