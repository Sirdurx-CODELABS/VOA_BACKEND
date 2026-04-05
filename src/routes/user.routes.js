const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const { protect, requirePermission, canChangeRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);

router.get('/',    requirePermission('view_all_users'),   ctrl.getAllUsers);
router.get('/:id', requirePermission('view_all_users'),   ctrl.getUserById);

// Self-profile update — available to ALL authenticated users
router.put('/me/profile', ctrl.updateMyProfile);
router.put('/profile/image', upload.single('image'), ctrl.uploadProfileImage);
router.put('/:id',           requirePermission('manage_users'), ctrl.updateUser);
router.delete('/:id',        requirePermission('manage_users'), ctrl.deleteUser);

router.patch('/:id/approve',     requirePermission('manage_users'),       ctrl.approveUser);
router.patch('/:id/reject',      requirePermission('manage_users'),       ctrl.rejectUser);
router.patch('/:id/assign-role', requirePermission('change_role_direct'), canChangeRole, ctrl.assignRole);

module.exports = router;
