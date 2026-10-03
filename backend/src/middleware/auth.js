const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../services/auth.service');

function readBearer(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

// Verifies the token, then loads the user so deactivation and password changes take effect immediately.
async function loadUser(token) {
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }
  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('Invalid or expired token');
  if (!user.isActive) throw ApiError.forbidden('Your account has been deactivated');
  // tokenVersion changes on logout and password change, which invalidates all older tokens.
  if ((payload.tv || 0) !== (user.tokenVersion || 0)) {
    throw ApiError.unauthorized('Session expired, please log in again');
  }
  return user;
}

async function authenticate(req, res, next) {
  const token = readBearer(req);
  if (!token) throw ApiError.unauthorized();
  req.user = await loadUser(token);
  next();
}

// For routes open to guests that behave differently when logged in (guest checkout).
async function optionalAuth(req, res, next) {
  const token = readBearer(req);
  if (token) req.user = await loadUser(token);
  next();
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) throw ApiError.unauthorized();
    if (!roles.includes(req.user.role)) throw ApiError.forbidden();
    next();
  };
}

module.exports = { authenticate, optionalAuth, authorize };
