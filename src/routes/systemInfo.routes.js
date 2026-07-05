const router = require('express').Router();
const ctrl = require('../controllers/systemInfo.controller');
const SystemInfo = require('../models/SystemInfo');
const { success } = require('../utils/apiResponse');
const { protect, isSuperAdmin } = require('../middleware/auth');

// Public endpoint — returns non-sensitive info for the website
router.get('/public', async (req, res, next) => {
  try {
    let info = await SystemInfo.findOne();
    if (!info) info = await SystemInfo.create({});
    return success(res, info, 'System info retrieved');
  } catch (err) { next(err); }
});

router.get('/', protect, ctrl.getSystemInfo);
router.put('/', protect, isSuperAdmin, ctrl.updateSystemInfo);

module.exports = router;
