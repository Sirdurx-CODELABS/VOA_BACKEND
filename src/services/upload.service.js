const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const logger = require('../utils/logger');

const uploadToCloudinary = async (filePath, folder = 'voa') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, { folder });
    // Remove local file after upload
    fs.unlink(filePath, () => {});
    return result.secure_url;
  } catch (err) {
    logger.error(`Cloudinary upload failed: ${err.message}`);
    throw err;
  }
};

const uploadMany = async (files, folder = 'voa') => {
  return Promise.all(files.map((f) => uploadToCloudinary(f.path, folder)));
};

module.exports = { uploadToCloudinary, uploadMany };
