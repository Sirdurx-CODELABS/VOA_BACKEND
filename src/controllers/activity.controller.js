const Activity = require('../models/Activity');
const ActivityParticipant = require('../models/ActivityParticipant');
const ActivityMedia = require('../models/ActivityMedia');
const User = require('../models/User');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');
const { createNotification } = require('../services/notification.service');
const { uploadToCloudinary } = require('../services/upload.service');
const { sendEmail } = require('../services/email.service');

const ACTIVITY_CREATORS = ['super_admin', 'chairman', 'vice_chairman', 'program_coordinator', 'secretary'];

const canCreate = (user) =>
  ACTIVITY_CREATORS.includes(user.role) || user.isVice;

// ── Filter members by activity targeting criteria ─────────────────────────────
const filterMembers = async (criteria) => {
  const { targetMembershipType, targetGender, targetAgeMin, targetAgeMax } = criteria;
  const query = { status: 'active' };
  if (targetMembershipType && targetMembershipType !== 'all') query.membershipType = targetMembershipType;
  if (targetGender && targetGender !== 'all') query.gender = targetGender;

  let users = await User.find(query).select('_id fullName email gender dob membershipType role');

  // Age filter (computed from DOB)
  if (targetAgeMin || targetAgeMax) {
    const today = new Date();
    users = users.filter(u => {
      if (!u.dob) return false;
      const birth = new Date(u.dob);
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      if (targetAgeMin && age < targetAgeMin) return false;
      if (targetAgeMax && age > targetAgeMax) return false;
      return true;
    });
  }
  return users;
};

// ── GET /activities — list (role-filtered) ────────────────────────────────────
exports.getActivities = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;

    // Members only see activities they are invited to
    if (req.user.role === 'member' && !req.user.isVice) {
      const myInvites = await ActivityParticipant.find({ userId: req.user._id, inviteStatus: 'invited' }).select('activityId');
      filter._id = { $in: myInvites.map(i => i.activityId) };
    }

    const [activities, total] = await Promise.all([
      Activity.find(filter).skip(skip).limit(limit)
        .populate('createdBy', 'fullName role')
        .sort('-date'),
      Activity.countDocuments(filter),
    ]);
    return paginated(res, activities, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

// ── GET /activities/:id ───────────────────────────────────────────────────────
exports.getActivity = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id).populate('createdBy', 'fullName role');
    if (!activity) return error(res, 'Activity not found', 404);
    const [participants, media] = await Promise.all([
      ActivityParticipant.find({ activityId: activity._id, inviteStatus: 'invited' })
        .populate('userId', 'fullName email gender membershipType profileImage dob'),
      ActivityMedia.find({ activityId: activity._id }).populate('uploadedBy', 'fullName'),
    ]);
    return success(res, { activity, participants, media });
  } catch (err) { next(err); }
};

// ── POST /activities — create ─────────────────────────────────────────────────
exports.createActivity = async (req, res, next) => {
  try {
    if (!canCreate(req.user)) return error(res, 'Not authorized to create activities', 403);

    const {
      title, type, description, date, startTime, endTime, venue,
      peopleNeeded, targetMembershipType, targetGender, targetAgeMin, targetAgeMax,
      customConditions, status, invitedUserIds,
    } = req.body;

    const activity = await Activity.create({
      title, type, description, date, startTime, endTime, venue,
      peopleNeeded: peopleNeeded || 0,
      targetMembershipType: targetMembershipType || 'all',
      targetGender: targetGender || 'all',
      targetAgeMin: targetAgeMin || null,
      targetAgeMax: targetAgeMax || null,
      customConditions: customConditions || '',
      createdBy: req.user._id,
      status: status || 'published',
    });

    // Invite selected members
    if (Array.isArray(invitedUserIds) && invitedUserIds.length > 0) {
      const participants = invitedUserIds.map(uid => ({
        activityId: activity._id,
        userId: uid,
        inviteStatus: 'invited',
        responseStatus: 'pending',
      }));
      await ActivityParticipant.insertMany(participants, { ordered: false }).catch(() => {});

      // Notify invited members
      const invitedUsers = await User.find({ _id: { $in: invitedUserIds } }).select('fullName email');
      for (const u of invitedUsers) {
        createNotification({
          recipient: u._id,
          title: `📅 You're invited: ${title}`,
          message: `You have been invited to "${title}" on ${new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}${venue ? ` at ${venue}` : ''}.`,
          type: 'general',
          relatedId: activity._id,
          relatedModel: 'Activity',
        }).catch(() => {});
      }
    }

    return success(res, activity, 'Activity created', 201);
  } catch (err) { next(err); }
};

// ── PUT /activities/:id ───────────────────────────────────────────────────────
exports.updateActivity = async (req, res, next) => {
  try {
    if (!canCreate(req.user)) return error(res, 'Not authorized', 403);
    const allowed = ['title', 'type', 'description', 'date', 'startTime', 'endTime', 'venue',
      'peopleNeeded', 'targetMembershipType', 'targetGender', 'targetAgeMin', 'targetAgeMax',
      'customConditions', 'status'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const activity = await Activity.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!activity) return error(res, 'Activity not found', 404);
    return success(res, activity, 'Activity updated');
  } catch (err) { next(err); }
};

// ── DELETE /activities/:id ────────────────────────────────────────────────────
exports.deleteActivity = async (req, res, next) => {
  try {
    if (!canCreate(req.user)) return error(res, 'Not authorized', 403);
    await Activity.findByIdAndDelete(req.params.id);
    await ActivityParticipant.deleteMany({ activityId: req.params.id });
    await ActivityMedia.deleteMany({ activityId: req.params.id });
    return success(res, null, 'Activity deleted');
  } catch (err) { next(err); }
};

// ── POST /activities/filter-members — preview matching members ────────────────
exports.filterMembers = async (req, res, next) => {
  try {
    if (!canCreate(req.user)) return error(res, 'Not authorized', 403);
    const users = await filterMembers(req.body);
    return success(res, users);
  } catch (err) { next(err); }
};

// ── POST /activities/:id/invite — add invitees ────────────────────────────────
exports.inviteMembers = async (req, res, next) => {
  try {
    if (!canCreate(req.user)) return error(res, 'Not authorized', 403);
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) return error(res, 'userIds required', 400);

    const activity = await Activity.findById(req.params.id);
    if (!activity) return error(res, 'Activity not found', 404);

    const participants = userIds.map(uid => ({
      activityId: activity._id, userId: uid,
      inviteStatus: 'invited', responseStatus: 'pending',
    }));
    await ActivityParticipant.insertMany(participants, { ordered: false }).catch(() => {});

    const invitedUsers = await User.find({ _id: { $in: userIds } }).select('fullName email');
    for (const u of invitedUsers) {
      createNotification({
        recipient: u._id,
        title: `📅 You're invited: ${activity.title}`,
        message: `You have been invited to "${activity.title}" on ${new Date(activity.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}${activity.venue ? ` at ${activity.venue}` : ''}.`,
        type: 'general',
        relatedId: activity._id,
        relatedModel: 'Activity',
      }).catch(() => {});
    }

    return success(res, null, `${userIds.length} member(s) invited`);
  } catch (err) { next(err); }
};

// ── DELETE /activities/:id/invite/:userId — remove invitee ───────────────────
exports.removeInvitee = async (req, res, next) => {
  try {
    if (!canCreate(req.user)) return error(res, 'Not authorized', 403);
    await ActivityParticipant.findOneAndUpdate(
      { activityId: req.params.id, userId: req.params.userId },
      { inviteStatus: 'removed' }
    );
    return success(res, null, 'Invitee removed');
  } catch (err) { next(err); }
};

// ── PATCH /activities/:id/respond — member responds to invite ─────────────────
exports.respondToInvite = async (req, res, next) => {
  try {
    const { responseStatus, responseReason } = req.body;
    if (!['accepted', 'declined', 'absent'].includes(responseStatus)) {
      return error(res, 'Invalid response status', 400);
    }
    if (['declined', 'absent'].includes(responseStatus) && !responseReason) {
      return error(res, 'Reason is required when declining or marking absent', 400);
    }
    const participant = await ActivityParticipant.findOneAndUpdate(
      { activityId: req.params.id, userId: req.user._id, inviteStatus: 'invited' },
      { responseStatus, responseReason: responseReason || '', respondedAt: new Date() },
      { new: true }
    );
    if (!participant) return error(res, 'Invitation not found', 404);
    return success(res, participant, 'Response recorded');
  } catch (err) { next(err); }
};

// ── PATCH /activities/:id/attendance — member marks own attendance ─────────────
exports.markAttendance = async (req, res, next) => {
  try {
    const { attendanceStatus, attendanceReason } = req.body;
    if (!['present', 'absent'].includes(attendanceStatus)) return error(res, 'Invalid status', 400);
    if (attendanceStatus === 'absent' && !attendanceReason) return error(res, 'Reason required', 400);

    const participant = await ActivityParticipant.findOneAndUpdate(
      { activityId: req.params.id, userId: req.user._id, inviteStatus: 'invited' },
      { attendanceStatus, attendanceReason: attendanceReason || '' },
      { new: true }
    );
    if (!participant) return error(res, 'You are not invited to this activity', 404);
    return success(res, participant, 'Attendance marked');
  } catch (err) { next(err); }
};

// ── GET /activities/my — my invitations ───────────────────────────────────────
exports.getMyActivities = async (req, res, next) => {
  try {
    const participants = await ActivityParticipant.find({ userId: req.user._id, inviteStatus: 'invited' })
      .populate({ path: 'activityId', populate: { path: 'createdBy', select: 'fullName' } })
      .sort('-invitedAt');
    return success(res, participants);
  } catch (err) { next(err); }
};

// ── POST /activities/:id/media — upload images ────────────────────────────────
exports.uploadMedia = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) return error(res, 'Activity not found', 404);

    const files = req.files;
    if (!files || files.length === 0) return error(res, 'No images uploaded', 400);
    if (files.length > 10) return error(res, 'Maximum 10 images per upload', 400);

    const captions = Array.isArray(req.body.captions) ? req.body.captions : [req.body.captions || ''];

    const mediaItems = [];
    for (let i = 0; i < files.length; i++) {
      const url = await uploadToCloudinary(files[i].path, 'voa/gallery');
      mediaItems.push({
        activityId: activity._id,
        uploadedBy: req.user._id,
        imageUrl: url,
        caption: captions[i] || '',
      });
    }

    const created = await ActivityMedia.insertMany(mediaItems);
    return success(res, created, 'Images uploaded', 201);
  } catch (err) { next(err); }
};

// ── GET /activities/gallery — all media (gallery view) ───────────────────────
exports.getGallery = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.activityId) filter.activityId = req.query.activityId;

    const [media, total] = await Promise.all([
      ActivityMedia.find(filter).skip(skip).limit(limit)
        .populate('activityId', 'title type date venue')
        .populate('uploadedBy', 'fullName')
        .sort('-createdAt'),
      ActivityMedia.countDocuments(filter),
    ]);
    return paginated(res, media, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

// ── GET /activities/gallery/public/:token — public share ─────────────────────
exports.getPublicMedia = async (req, res, next) => {
  try {
    const media = await ActivityMedia.findOne({ shareToken: req.params.token })
      .populate('activityId', 'title type date venue description')
      .populate('uploadedBy', 'fullName');
    if (!media) return error(res, 'Image not found or link expired', 404);
    return success(res, media);
  } catch (err) { next(err); }
};

// ── DELETE /activities/media/:mediaId ─────────────────────────────────────────
exports.deleteMedia = async (req, res, next) => {
  try {
    const media = await ActivityMedia.findById(req.params.mediaId);
    if (!media) return error(res, 'Media not found', 404);
    // Only uploader or admin can delete
    if (media.uploadedBy.toString() !== req.user._id.toString() && !canCreate(req.user)) {
      return error(res, 'Not authorized', 403);
    }
    await ActivityMedia.findByIdAndDelete(req.params.mediaId);
    return success(res, null, 'Image deleted');
  } catch (err) { next(err); }
};
