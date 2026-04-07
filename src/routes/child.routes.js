const router = require('express').Router();
const ctrl = require('../controllers/child.controller');
const { protect } = require('../middleware/auth');

router.use(protect);

// Own children
router.get('/my', ctrl.getMyChildren);
router.post('/my', ctrl.addChild);
router.put('/my/:childId', ctrl.updateChild);
router.delete('/my/:childId', ctrl.deleteChild);
router.post('/my/:childId/create-account', ctrl.createChildAccount);

// Admin: view any parent's children
router.get('/parent/:parentId', ctrl.getMyChildren);
router.post('/parent/:parentId', ctrl.addChild);

module.exports = router;
