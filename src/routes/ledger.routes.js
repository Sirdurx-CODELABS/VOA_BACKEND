const express = require('express');
const router = express.Router();
const ledgerController = require('../controllers/ledger.controller');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// Get finance dashboard stats
router.get('/dashboard', 
  authorize('treasurer', 'vice_treasurer', 'chairman', 'super_admin'),
  ledgerController.getFinanceDashboardStats
);

// Get all ledgers
router.get('/', 
  authorize('treasurer', 'vice_treasurer', 'chairman', 'super_admin'),
  ledgerController.getAllLedgers
);

// Get current user's ledger
router.get('/my', ledgerController.getMemberLedger);

// Get specific member's ledger
router.get('/member/:memberId', 
  authorize('treasurer', 'vice_treasurer', 'chairman', 'super_admin'),
  ledgerController.getMemberLedger
);

// Add manual payment
router.post('/manual-payment', 
  authorize('treasurer', 'vice_treasurer', 'chairman', 'super_admin'),
  ledgerController.addManualPayment
);

// Mark month as paid
router.post('/mark-month-paid', 
  authorize('treasurer', 'vice_treasurer', 'chairman', 'super_admin'),
  ledgerController.markMonthPaid
);

// Allocate payment to months
router.post('/allocate-payment', 
  authorize('treasurer', 'vice_treasurer', 'chairman', 'super_admin'),
  ledgerController.allocatePayment
);

// Allocate to targets
router.post('/allocate-targets', 
  authorize('treasurer', 'vice_treasurer', 'chairman', 'super_admin'),
  ledgerController.allocateToTargets
);

// Get member's target contributions
router.get('/target-contributions', ledgerController.getMemberTargetContributions);
router.get('/target-contributions/:memberId', 
  authorize('treasurer', 'vice_treasurer', 'chairman', 'super_admin'),
  ledgerController.getMemberTargetContributions
);

// Generate monthly records
router.post('/generate-records', 
  authorize('treasurer', 'vice_treasurer', 'chairman', 'super_admin'),
  ledgerController.generateMonthlyRecords
);

// Export finance data
router.get('/export', 
  authorize('treasurer', 'vice_treasurer', 'chairman', 'super_admin'),
  ledgerController.exportFinanceData
);

module.exports = router;
