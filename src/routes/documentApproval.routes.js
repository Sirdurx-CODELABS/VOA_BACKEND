const express = require('express');
const {
  createApprovals, getMyPendingApprovals, getApprovalsForDocument,
  approve, reject, getPendingCount
} = require('../controllers/documentApproval.controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .post(createApprovals);

router.get('/my-pending', getMyPendingApprovals);
router.get('/pending-count', getPendingCount);
router.get('/document/:id', getApprovalsForDocument);

router.put('/:id/approve', approve);
router.put('/:id/reject', reject);

module.exports = router;
