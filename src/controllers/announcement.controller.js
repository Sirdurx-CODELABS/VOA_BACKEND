const Announcement = require('../models/Announcement');
const User = require('../models/User');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');
const { notifyMany } = require('../services/notification.service');
const { uploadMany } = require('../services/upload.service');
const { canPostCategory, getAllowedCategories, CATEGORY_META } = require('../config/announcementCategories');

exports.createAnnouncement = async (req, res, next) => {
  try {
    const { title, message, category, visibility, targetRoles, departmentTag, status } = req.body;

    // Validate category is allowed for this role
    if (!canPostCategory(req.user.role, category)) {
      const allowed = getAllowedCategories(req.user.role) || [];
      return error(res, `Your role (${req.user.role}) cannot post announcements in the '${category}' category. Allowed: ${allowed.join(', ')}`, 403);
    }

    let attachments = [];
    if (req.files?.length) {
      attachments = await uploadMany(req.files, 'voa/announcements');
    }

    const announcement = await Announcement.create({
      title, message, category,
      visibility: visibility || 'internal',
      targetRoles: targetRoles || [],
      departmentTag: departmentTag || '',
      status: status || 'published',
      createdBy: req.user._id,
      createdByRole: req.user.role,
      attachments,
    });

    // Notify based on visibility
    if (announcement.status === 'published') {
      let recipients = [];
      if (announcement.visibility === 'internal') {
        const members = await User.find({ status: 'active' }).select('_id');
        recipients = members.map(m => m._id);
      } else if (announcement.visibility === 'specific_roles' && announcement.targetRoles?.length) {
        const members = await User.find({ status: 'active', role: { $in: announcement.targetRoles } }).select('_id');
        recipients = members.map(m => m._id);
      }

      if (recipients.length) {
        const meta = CATEGORY_META[category] || CATEGORY_META.general;
        await notifyMany(recipients, {
          title: `${meta.icon} ${announcement.title}`,
          message: announcement.message.substring(0, 120),
          type: 'announcement',
          relatedId: announcement._id,
          relatedModel: 'Announcement',
        });
      }
    }

    return success(res, announcement, 'Announcement created', 201);
  } catch (err) { next(err); }
};

exports.getAllAnnouncements = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = { status: { $ne: 'archived' } };

    if (req.query.category) filter.category = req.query.category;
    if (req.query.visibility) filter.visibility = req.query.visibility;
    if (req.query.status) filter.status = req.query.status;

    // Members only see announcements targeted to them or internal
    if (req.user.role === 'member') {
      filter.$or = [
        { visibility: 'internal' },
        { visibility: 'specific_roles', targetRoles: 'member' },
      ];
    }

    const [announcements, total] = await Promise.all([
      Announcement.find(filter).skip(skip).limit(limit)
        .populate('createdBy', 'fullName role profileImage')
        .sort({ isPinned: -1, createdAt: -1 }),
      Announcement.countDocuments(filter),
    ]);
    return paginated(res, announcements, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

exports.getAnnouncementById = async (req, res, next) => {
  try {
    const a = await Announcement.findById(req.params.id).populate('createdBy', 'fullName role profileImage');
    if (!a) return error(res, 'Announcement not found', 404);
    return success(res, a);
  } catch (err) { next(err); }
};

exports.updateAnnouncement = async (req, res, next) => {
  try {
    const a = await Announcement.findById(req.params.id);
    if (!a) return error(res, 'Announcement not found', 404);

    // Only creator or super_admin/chairman can edit
    const canEdit = req.user.role === 'super_admin' ||
      req.user.role === 'chairman' ||
      a.createdBy.toString() === req.user._id.toString();
    if (!canEdit) return error(res, 'Not authorized to edit this announcement', 403);

    // If category is being changed, validate it
    if (req.body.category && req.body.category !== a.category) {
      if (!canPostCategory(req.user.role, req.body.category)) {
        return error(res, `Cannot change to category '${req.body.category}'`, 403);
      }
    }

    const allowed = ['title', 'message', 'category', 'visibility', 'targetRoles', 'departmentTag', 'status', 'isPinned'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const updated = await Announcement.findByIdAndUpdate(req.params.id, updates, { new: true });
    return success(res, updated, 'Announcement updated');
  } catch (err) { next(err); }
};

exports.deleteAnnouncement = async (req, res, next) => {
  try {
    const a = await Announcement.findById(req.params.id);
    if (!a) return error(res, 'Announcement not found', 404);

    const canDelete = req.user.role === 'super_admin' ||
      req.user.role === 'chairman' ||
      a.createdBy.toString() === req.user._id.toString();
    if (!canDelete) return error(res, 'Not authorized to delete this announcement', 403);

    await Announcement.findByIdAndDelete(req.params.id);
    return success(res, null, 'Announcement deleted');
  } catch (err) { next(err); }
};

exports.getPublicAnnouncements = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const [announcements, total] = await Promise.all([
      Announcement.find({ visibility: 'public', status: 'published' })
        .skip(skip).limit(limit)
        .populate('createdBy', 'fullName role')
        .sort({ isPinned: -1, createdAt: -1 }),
      Announcement.countDocuments({ visibility: 'public', status: 'published' }),
    ]);
    return paginated(res, announcements, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

// Get allowed categories for the current user's role
exports.getAllowedCategories = async (req, res) => {
  const { getAllowedCategories: getCategories, CATEGORY_META } = require('../config/announcementCategories');
  const allowed = getCategories(req.user.role);
  const categories = allowed === null
    ? Object.entries(CATEGORY_META).map(([value, meta]) => ({ value, ...meta }))
    : (allowed || []).map(value => ({ value, ...CATEGORY_META[value] }));
  return res.json({ success: true, data: categories });
};
