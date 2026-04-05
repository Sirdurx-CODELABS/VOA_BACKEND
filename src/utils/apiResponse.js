const success = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data });
};

const error = (res, message = 'Server Error', statusCode = 500, errors = null) => {
  const payload = { success: false, message };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
};

const paginated = (res, data, pagination, message = 'Success') => {
  return res.status(200).json({ success: true, message, pagination, data });
};

module.exports = { success, error, paginated };
