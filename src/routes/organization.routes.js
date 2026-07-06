const router = require('express').Router();
const ctrl = require('../controllers/organization.controller');
const { protect, isSuperAdmin, requirePermission } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public — list active organizations for registration dropdown
router.get('/public', ctrl.getActiveOrganizations);

// Public — request a new organization
router.post('/request', ctrl.requestNewOrganization);

// Chairman / Vice Chairman — get/update own organization
router.get('/me', protect, requirePermission('manage_organization'), ctrl.getMyOrganization);
router.put('/me', protect, requirePermission('manage_organization'), ctrl.updateMyOrganization);

// Logo upload / remove
router.put('/me/logo', protect, requirePermission('manage_organization'), upload.single('logo'), ctrl.uploadMyOrganizationLogo);
router.put('/me/logo/remove', protect, requirePermission('manage_organization'), ctrl.removeMyOrganizationLogo);

// Super Admin only below
router.get('/', protect, isSuperAdmin, ctrl.getAllOrganizations);
router.get('/:id', protect, isSuperAdmin, ctrl.getOrganizationById);
router.post('/', protect, isSuperAdmin, ctrl.createOrganization);
router.put('/:id', protect, isSuperAdmin, ctrl.updateOrganization);
router.patch('/:id/status', protect, isSuperAdmin, ctrl.updateOrganizationStatus);
router.delete('/:id', protect, isSuperAdmin, ctrl.deleteOrganization);

module.exports = router;
