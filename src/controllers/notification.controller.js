const Notification = require('../models/Notification');
const { success, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');

exports.getMyNotifications = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = { recipient: req.user._id };

    if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === 'true';
    if (req.query.type) filter.type = req.query.type;
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { message: { $regex: req.query.search, $options: 'i' } },
      ];
    }
    if (!req.isSuperAdmin) {
      filter.allianceOrganizationId = req.allianceOrganizationId;
    } else if (req.query.allianceOrganizationId) {
      filter.allianceOrganizationId = req.query.allianceOrganizationId;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(filter).skip(skip).limit(limit).sort('-createdAt').lean(),
      Notification.countDocuments(filter),
    ]);
    return paginated(res, notifications, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const readFilter = { _id: req.params.id, recipient: req.user._id };
    if (!req.isSuperAdmin && req.allianceOrganizationId) {
      readFilter.allianceOrganizationId = req.allianceOrganizationId;
    }
    await Notification.findOneAndUpdate(
      readFilter,
      { isRead: true }
    );
    return success(res, null, 'Notification marked as read');
  } catch (err) { next(err); }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    const markAllFilter = { recipient: req.user._id, isRead: false };
    if (!req.isSuperAdmin) {
      markAllFilter.allianceOrganizationId = req.allianceOrganizationId;
    } else if (req.query.allianceOrganizationId) {
      markAllFilter.allianceOrganizationId = req.query.allianceOrganizationId;
    }
    await Notification.updateMany(markAllFilter, { isRead: true });
    return success(res, null, 'All notifications marked as read');
  } catch (err) { next(err); }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const unreadFilter = { recipient: req.user._id, isRead: false };
    if (!req.isSuperAdmin) {
      unreadFilter.allianceOrganizationId = req.allianceOrganizationId;
    } else if (req.query.allianceOrganizationId) {
      unreadFilter.allianceOrganizationId = req.query.allianceOrganizationId;
    }
    const count = await Notification.countDocuments(unreadFilter);
    return success(res, { count });
  } catch (err) { next(err); }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    const deleteNotifFilter = { _id: req.params.id, recipient: req.user._id };
    if (!req.isSuperAdmin && req.allianceOrganizationId) {
      deleteNotifFilter.allianceOrganizationId = req.allianceOrganizationId;
    }
    await Notification.findOneAndDelete(deleteNotifFilter);
    return success(res, null, 'Notification deleted');
  } catch (err) { next(err); }
};
