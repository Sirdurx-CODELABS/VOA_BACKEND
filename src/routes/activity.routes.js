const router = require('express').Router();
const ctrl = require('../controllers/activity.controller');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public share route — no auth required
router.get('/gallery/public/:token', ctrl.getPublicMedia);

router.use(protect);

// Gallery
router.get('/gallery', ctrl.getGallery);

// My invitations
router.get('/my', ctrl.getMyActivities);

// Filter members preview (for activity creation)
router.post('/filter-members', ctrl.filterMembers);

// CRUD
router.get('/',    ctrl.getActivities);
router.post('/',   ctrl.createActivity);
router.get('/:id', ctrl.getActivity);
router.put('/:id', ctrl.updateActivity);
router.delete('/:id', ctrl.deleteActivity);

// Invitations
router.post('/:id/invite',              ctrl.inviteMembers);
router.delete('/:id/invite/:userId',    ctrl.removeInvitee);

// Member response
router.patch('/:id/respond',     ctrl.respondToInvite);
router.patch('/:id/attendance',  ctrl.markAttendance);

// Media upload (up to 10 images)
router.post('/:id/media', upload.array('images', 10), ctrl.uploadMedia);
router.delete('/media/:mediaId', ctrl.deleteMedia);

module.exports = router;
