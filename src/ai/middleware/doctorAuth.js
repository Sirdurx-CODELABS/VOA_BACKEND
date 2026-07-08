const jwt = require('jsonwebtoken');
const AIDoctor = require('../models/AIDoctor');
const { error } = require('../../utils/apiResponse');

const doctorProtect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return error(res, 'Not authorized — no token provided', 401);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const doctor = await AIDoctor.findById(decoded.id);
    if (!doctor) return error(res, 'Doctor not found', 401);

    req.doctor = doctor;
    next();
  } catch (err) {
    return error(res, 'Not authorized — invalid or expired token', 401);
  }
};

module.exports = { doctorProtect };
