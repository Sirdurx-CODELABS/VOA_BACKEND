const router = require('express').Router();
const ctrl = require('../controllers/superadmin.controller');
const { protect, isSuperAdmin } = require('../middleware/auth');

// All routes require auth + super_admin role
router.use(protect, isSuperAdmin);

// System
router.get('/stats', ctrl.getSystemStats);
router.get('/audit-logs', ctrl.getAuditLogs);

// Users
router.get('/users', ctrl.getUsers);
router.post('/users', ctrl.createUser);
router.put('/users/:id', ctrl.updateUser);
router.delete('/users/:id', ctrl.deleteUser);
router.patch('/users/:id/reset-password', ctrl.resetUserPassword);
router.patch('/users/:id/toggle-status', ctrl.toggleUserStatus);

// Programs
router.get('/programs', ctrl.getPrograms);
router.post('/programs', ctrl.createProgram);
router.put('/programs/:id', ctrl.updateProgram);
router.delete('/programs/:id', ctrl.deleteProgram);

// Transactions
router.get('/transactions', ctrl.getTransactions);
router.put('/transactions/:id', ctrl.updateTransaction);
router.delete('/transactions/:id', ctrl.deleteTransaction);

// Welfare
router.get('/welfare', ctrl.getWelfare);
router.put('/welfare/:id', ctrl.updateWelfare);
router.delete('/welfare/:id', ctrl.deleteWelfare);

// Announcements
router.delete('/announcements/:id', ctrl.deleteAnnouncement);

// Reports
router.delete('/reports/:id', ctrl.deleteReport);

module.exports = router;
