const router = require('express').Router();
const ctrl = require('../controllers/systemInfo.controller');
const { protect, isSuperAdmin } = require('../middleware/auth');

router.get('/', protect, ctrl.getSystemInfo);
router.put('/', protect, isSuperAdmin, ctrl.updateSystemInfo);

module.exports = router;
