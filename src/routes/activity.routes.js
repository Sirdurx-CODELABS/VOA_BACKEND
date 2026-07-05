const router = require('express').Router();
const ctrl = require('../controllers/activity.controller');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes — no auth required
router.get('/gallery/public', ctrl.getPublicGallery);
router.get('/gallery/public/:token', ctrl.getPublicMedia);

router.use(protect);

// Gallery
router.get('/gallery', ctrl.getGallery);

// My invitations
router.get('/my', ctrl.getMyActivities);

// Filter members preview (for activity creation)
router.post('/filter-members', ctrl.filterMembers);

// Reports — placed before :id routes to avoid route conflicts
router.post('/:id/reports', upload.array('attachments', 5), ctrl.createReport);
router.get('/:id/reports', ctrl.getReports);
router.put('/:id/reports/:reportId', ctrl.updateReport);
router.delete('/:id/reports/:reportId', ctrl.deleteReport);

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
router.patch('/media/:mediaId/visibility', ctrl.toggleMediaVisibility);
router.delete('/media/:mediaId', ctrl.deleteMedia);

module.exports = router;
