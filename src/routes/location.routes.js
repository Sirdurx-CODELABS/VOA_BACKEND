const router = require('express').Router();
const ctrl = require('../controllers/location.controller');

router.get('/states', ctrl.getStates);
router.get('/states/:state/lgas', ctrl.getLGAs);
router.get('/hospitals/search', ctrl.searchHospitalsByLocation);

module.exports = router;
