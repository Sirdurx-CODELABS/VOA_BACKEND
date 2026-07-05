const Event = require('../models/Event');
const { success, error, paginated } = require('../utils/apiResponse');
const { paginate, paginationMeta } = require('../utils/pagination');
const { uploadToCloudinary } = require('../services/upload.service');

// Public controllers
exports.getAllPublicEvents = async (req, res, next) => {
  try {
    const filter = { isPublic: true };
    if (req.query.status) filter.status = req.query.status;
    
    const events = await Event.find(filter)
      .populate('createdBy', 'fullName role')
      .sort({ date: 1 });
    return success(res, events);
  } catch (err) { next(err); }
};

exports.getPublicEventById = async (req, res, next) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, isPublic: true })
      .populate('createdBy', 'fullName role');
    if (!event) return error(res, 'Event not found', 404);
    return success(res, event);
  } catch (err) { next(err); }
};

exports.registerForEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return error(res, 'Event not found', 404);
    if (!event.isPublic) return error(res, 'Event not open for registration', 403);
    
    const userId = req.user?._id;
    if (userId && event.attendees.includes(userId)) {
      return error(res, 'You are already registered for this event', 400);
    }
    
    if (event.seats && event.registered >= event.seats) {
      return error(res, 'Event is full', 400);
    }
    
    if (userId) event.attendees.push(userId);
    event.registered += 1;
    await event.save();
    return success(res, event, 'Registration successful');
  } catch (err) { next(err); }
};

// Admin controllers
exports.getAllEvents = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) filter.title = { $regex: req.query.search, $options: 'i' };
    if (!req.isSuperAdmin) {
      if (req.allianceOrganizationId) filter.allianceOrganizationId = req.allianceOrganizationId;
    } else if (req.query.allianceOrganizationId) {
      filter.allianceOrganizationId = req.query.allianceOrganizationId;
    }

    const [events, total] = await Promise.all([
      Event.find(filter).skip(skip).limit(limit).populate('createdBy', 'fullName role').populate('attendees', 'fullName email').sort({ date: -1 }),
      Event.countDocuments(filter),
    ]);
    return paginated(res, events, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

exports.getEventById = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (!req.isSuperAdmin && req.allianceOrganizationId) {
      query.allianceOrganizationId = req.allianceOrganizationId;
    }
    const event = await Event.findOne(query)
      .populate('createdBy', 'fullName role')
      .populate('attendees', 'fullName email phone');
    if (!event) return error(res, 'Event not found', 404);
    return success(res, event);
  } catch (err) { next(err); }
};

exports.createEvent = async (req, res, next) => {
  try {
    const data = { ...req.body, createdBy: req.user._id };
    data.allianceOrganizationId = req.allianceOrganizationId;
    
    if (req.files && req.files.images) {
      const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      const imageUrls = [];
      for (const file of files) {
        const url = await uploadToCloudinary(file.path, 'voa/events');
        imageUrls.push(url);
      }
      data.images = imageUrls;
      if (imageUrls.length > 0) data.image = imageUrls[0];
    } else if (req.file) {
      data.image = await uploadToCloudinary(req.file.path, 'voa/events');
    }
    
    const event = await Event.create(data);
    return success(res, event, 'Event created', 201);
  } catch (err) { next(err); }
};

exports.updateEvent = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (!req.isSuperAdmin && req.allianceOrganizationId) {
      query.allianceOrganizationId = req.allianceOrganizationId;
    }
    const event = await Event.findOne(query);
    if (!event) return error(res, 'Event not found', 404);

    const data = { ...req.body };
    
    if (req.files && req.files.images) {
      const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      const imageUrls = [...(event.images || [])];
      for (const file of files) {
        if (imageUrls.length >= 10) break;
        const url = await uploadToCloudinary(file.path, 'voa/events');
        imageUrls.push(url);
      }
      data.images = imageUrls.slice(0, 10);
      if (!data.image && imageUrls.length > 0) data.image = imageUrls[0];
    }
    
    Object.assign(event, data);
    await event.save();
    return success(res, event, 'Event updated');
  } catch (err) { next(err); }
};

exports.deleteEvent = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (!req.isSuperAdmin && req.allianceOrganizationId) {
      query.allianceOrganizationId = req.allianceOrganizationId;
    }
    const event = await Event.findOneAndDelete(query);
    if (!event) return error(res, 'Event not found', 404);
    return success(res, null, 'Event deleted');
  } catch (err) { next(err); }
};
