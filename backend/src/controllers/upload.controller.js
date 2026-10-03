const cloudinaryService = require('../services/cloudinary.service');
const ApiError = require('../utils/ApiError');
const { detectImageType } = require('../utils/imageType');
const { ok, created } = require('../utils/response');

async function uploadImage(req, res) {
  if (!req.file) throw ApiError.badRequest('No image received. Send it as multipart/form-data in a field named "image".');
  const real = detectImageType(req.file.buffer);
  if (!real || real !== req.file.mimetype) {
    throw ApiError.badRequest('The file is not a valid JPG, PNG or WebP image');
  }
  const image = await cloudinaryService.uploadImageBuffer(req.file.buffer);
  return created(res, { image }, 'Image uploaded');
}

// For images that were uploaded but never attached to a product.
async function deleteImage(req, res) {
  const { publicId } = req.valid.query;
  if (!cloudinaryService.isManagedPublicId(publicId)) throw ApiError.badRequest('Invalid image id');
  const deleted = await cloudinaryService.deleteImage(publicId);
  return ok(res, { deleted });
}

module.exports = { uploadImage, deleteImage };
