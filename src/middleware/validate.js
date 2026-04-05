const { error } = require('../utils/apiResponse');

/**
 * Validation middleware.
 * Always strips unknown fields so extra frontend fields never cause "X is not allowed" errors.
 * Individual schemas can still use .options({ allowUnknown: false }) to override.
 */
const validate = (schema) => (req, res, next) => {
  const { error: validationError, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,   // ← silently remove any field not in schema
  });

  if (validationError) {
    const errors = validationError.details.map((d) => d.message);
    return error(res, 'Validation failed', 400, errors);
  }

  // Replace req.body with the sanitized value (unknown fields stripped)
  req.body = value;
  next();
};

module.exports = validate;
