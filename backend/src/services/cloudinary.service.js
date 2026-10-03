const { v2: cloudinary } = require('cloudinary');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const FOLDER = 'clenora/products';
let configured = false;

function ensureConfigured() {
  const { cloudName, apiKey, apiSecret } = env.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(503, 'Image uploads are not configured on the server');
  }
  if (!configured) {
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
    configured = true;
  }
}

// Only images inside our own folder may ever be deleted through the API.
function isManagedPublicId(id) {
  return typeof id === 'string' && id.startsWith(`${FOLDER}/`) && !id.includes('..');
}

function uploadImageBuffer(buffer) {
  ensureConfigured();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: FOLDER,
        resource_type: 'image',
        allowed_formats: ['jpg', 'png', 'webp'],
        transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
      },
      (err, result) => {
        if (err || !result) {
          console.error('Cloudinary upload failed:', err && err.message);
          return reject(new ApiError(502, 'Image upload failed, please try again'));
        }
        return resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

// Best effort: a failed delete is logged but never breaks the request.
async function deleteImage(publicId) {
  if (!isManagedPublicId(publicId)) return false;
  try {
    ensureConfigured();
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
    return true;
  } catch (err) {
    console.error('Cloudinary delete failed:', err.message);
    return false;
  }
}

module.exports = { uploadImageBuffer, deleteImage, isManagedPublicId, FOLDER };
