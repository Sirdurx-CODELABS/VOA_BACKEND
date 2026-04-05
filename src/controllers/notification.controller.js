const Notification = require('../models/Notification');
const { success, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');

exports.getMyNotifications = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = { recipient: req.user._id };
    if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === 'true';

    const [notifications, total] = await Promise.all([
      Notification.find(filter).skip(skip).limit(limit).sort('-createdAt'),
      Notification.countDocuments(filter),
    ]);
    return paginated(res, notifications, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

exports.markAsRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true }
    );
    return success(res, null, 'Notification marked as read');
  } catch (err) { next(err); }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
    return success(res, null, 'All notifications marked as read');
  } catch (err) { next(err); }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    return success(res, { count });
  } catch (err) { next(err); }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
    return success(res, null, 'Notification deleted');
  } catch (err) { next(err); }
};
