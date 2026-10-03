const mongoose = require('mongoose');
const { ZodError } = require('zod');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.path}`));
}

// Converts known library errors into { statusCode, message, details }.
function normalize(err) {
  if (err instanceof ApiError) {
    return { statusCode: err.statusCode, message: err.message, details: err.details };
  }
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return { statusCode: 400, message: 'Validation failed', details };
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return { statusCode: 400, message: 'Validation failed', details };
  }
  if (err instanceof mongoose.Error.CastError) {
    return { statusCode: 400, message: `Invalid value for ${err.path}` };
  }
  if (err && err.code === 11000) {
    const fields = Object.keys(err.keyPattern || {});
    return {
      statusCode: 409,
      message: fields.length ? `Duplicate value for: ${fields.join(', ')}` : 'Duplicate value',
    };
  }
  if (err && (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError')) {
    return { statusCode: 401, message: 'Invalid token' };
  }
  if (err && err.name === 'TokenExpiredError') {
    return { statusCode: 401, message: 'Token expired, please log in again' };
  }
  if (err && err.type === 'entity.parse.failed') {
    return { statusCode: 400, message: 'Request body is not valid JSON' };
  }
  if (err && err.type === 'entity.too.large') {
    return { statusCode: 413, message: 'Request body is too large' };
  }
  if (err && err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') return { statusCode: 413, message: 'Image is too large (maximum 5 MB each)' };
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return { statusCode: 400, message: 'Too many files, or wrong field name (use a single field named "image")' };
    }
    return { statusCode: 400, message: 'Invalid file upload' };
  }
  return null;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const known = normalize(err);
  const statusCode = known ? known.statusCode : 500;

  if (statusCode >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err && err.stack ? err.stack : err);
  }

  const body = {
    success: false,
    message: known ? known.message : 'Internal server error',
  };
  if (known && known.details) body.errors = known.details;
  if (!env.isProduction && !known && err && err.stack) body.stack = err.stack;

  res.status(statusCode).json(body);
}

module.exports = { notFound, errorHandler };
