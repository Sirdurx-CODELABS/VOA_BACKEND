const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validations/auth.validation');

router.post('/register', validate(v.register), ctrl.register);
router.post('/login', validate(v.login), ctrl.login);
router.get('/verify-email/:token', ctrl.verifyEmail);
router.post('/resend-verification', ctrl.resendVerification);
router.post('/forgot-password', validate(v.forgotPassword), ctrl.forgotPassword);
router.post('/reset-password', validate(v.resetPassword), ctrl.resetPassword);
router.get('/me', protect, ctrl.getMe);
router.put('/change-password', protect, ctrl.changePassword);

module.exports = router;
