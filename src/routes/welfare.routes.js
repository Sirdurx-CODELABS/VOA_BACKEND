const router = require('express').Router();
const ctrl = require('../controllers/welfare.controller');
const { protect, requirePermission, requireAnyPermission } = require('../middleware/auth');
const upload = require('../middleware/upload');
const validate = require('../middleware/validate');
const v = require('../validations/welfare.validation');

router.use(protect);

router.get('/',    requirePermission('manage_welfare'), ctrl.getAllRequests);
router.get('/:id', requireAnyPermission('manage_welfare', 'submit_welfare_request'), ctrl.getRequestById);

// Member creates — only type+message allowed (status stripped by schema)
router.post('/',
  requireAnyPermission('submit_welfare_request', 'manage_welfare'),
  upload.array('attachments', 3),
  validate(v.createWelfareRequest),
  ctrl.createRequest
);

// Welfare officer updates status — only status+note allowed
router.patch('/:id/status',
  requirePermission('manage_welfare'),
  validate(v.updateWelfareStatus),
  ctrl.updateRequestStatus
);

// Follow-up note
router.post('/:id/follow-up',
  requirePermission('manage_welfare'),
  validate(v.addFollowUp),
  ctrl.addFollowUp
);

module.exports = router;
