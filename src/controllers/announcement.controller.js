const Announcement = require('../models/Announcement');
const User = require('../models/User');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');
const { notifyMany } = require('../services/notification.service');
const { uploadMany } = require('../services/upload.service');

exports.createAnnouncement = async (req, res, next) => {
  try {
    let attachments = [];
    if (req.files?.length) {
      attachments = await uploadMany(req.files, 'voa/announcements');
    }
    const announcement = await Announcement.create({ ...req.body, createdBy: req.user._id, attachments });

    // Notify all active members for internal announcements
    if (announcement.visibility === 'internal') {
      const members = await User.find({ status: 'active' }).select('_id');
      await notifyMany(members.map((m) => m._id), {
        title: announcement.title,
        message: announcement.message.substring(0, 100),
        type: 'announcement',
        relatedId: announcement._id,
        relatedModel: 'Announcement',
      });
    }

    return success(res, announcement, 'Announcement created', 201);
  } catch (err) { next(err); }
};

exports.getAllAnnouncements = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};

    // Non-members can only see public announcements
    if (!req.user || req.user.role === 'member') {
      filter.visibility = req.query.visibility || 'internal';
    } else if (req.query.visibility) {
      filter.visibility = req.query.visibility;
    }

    const [announcements, total] = await Promise.all([
      Announcement.find(filter).skip(skip).limit(limit)
        .populate('createdBy', 'fullName role')
        .sort({ isPinned: -1, createdAt: -1 }),
      Announcement.countDocuments(filter),
    ]);
    return paginated(res, announcements, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

exports.getAnnouncementById = async (req, res, next) => {
  try {
    const a = await Announcement.findById(req.params.id).populate('createdBy', 'fullName role');
    if (!a) return error(res, 'Announcement not found', 404);
    return success(res, a);
  } catch (err) { next(err); }
};

exports.updateAnnouncement = async (req, res, next) => {
  try {
    const a = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!a) return error(res, 'Announcement not found', 404);
    return success(res, a, 'Announcement updated');
  } catch (err) { next(err); }
};

exports.deleteAnnouncement = async (req, res, next) => {
  try {
    const a = await Announcement.findByIdAndDelete(req.params.id);
    if (!a) return error(res, 'Announcement not found', 404);
    return success(res, null, 'Announcement deleted');
  } catch (err) { next(err); }
};

exports.getPublicAnnouncements = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const [announcements, total] = await Promise.all([
      Announcement.find({ visibility: 'public' }).skip(skip).limit(limit).sort({ isPinned: -1, createdAt: -1 }),
      Announcement.countDocuments({ visibility: 'public' }),
    ]);
    return paginated(res, announcements, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};
