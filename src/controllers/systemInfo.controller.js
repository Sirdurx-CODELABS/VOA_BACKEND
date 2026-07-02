const SystemInfo = require('../models/SystemInfo');
const { success, error } = require('../utils/apiResponse');

exports.getSystemInfo = async (req, res, next) => {
  try {
    let info = await SystemInfo.findOne();
    if (!info) {
      info = await SystemInfo.create({});
    }
    return success(res, info, 'System info retrieved');
  } catch (err) { next(err); }
};

exports.updateSystemInfo = async (req, res, next) => {
  try {
    let info = await SystemInfo.findOne();
    if (!info) {
      info = new SystemInfo();
    }
    const allowed = ['email', 'phone', 'website', 'address', 'contactNumbers', 'socialMedia', 'documentSystemUrl'];
    allowed.forEach(f => {
      if (req.body[f] !== undefined) info[f] = req.body[f];
    });
    await info.save();
    return success(res, info, 'System info updated');
  } catch (err) { next(err); }
};
