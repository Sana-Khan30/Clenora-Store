const multer = require('multer');
const ApiError = require('../utils/ApiError');

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 },
  fileFilter(req, file, cb) {
    if (!ALLOWED.includes(file.mimetype)) {
      return cb(ApiError.badRequest('Only JPG, PNG or WebP images are allowed'));
    }
    return cb(null, true);
  },
});

module.exports = { uploadSingleImage: upload.single('image') };
