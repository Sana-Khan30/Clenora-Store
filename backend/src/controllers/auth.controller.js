const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/response');
const { hashPassword, verifyPassword, signToken } = require('../services/auth.service');

const INVALID_LOGIN = 'Invalid email or password';

async function register(req, res) {
  const { name, email, password, phone } = req.body;

  if (await User.exists({ email })) {
    throw ApiError.conflict('An account with this email already exists');
  }

  // role is never read from the request: public registration always creates a customer.
  const user = await User.create({
    name,
    email,
    phone: phone || '',
    password: await hashPassword(password),
    role: 'customer',
  });

  return created(res, { user, token: signToken(user) }, 'Account created');
}

async function authenticateCredentials(email, password, requiredRole) {
  const user = await User.findOne({ email }).select('+password');
  const valid = await verifyPassword(password, user && user.password);
  if (!user || !valid) throw ApiError.unauthorized(INVALID_LOGIN);
  if (requiredRole && user.role !== requiredRole) throw ApiError.unauthorized(INVALID_LOGIN);
  if (!user.isActive) throw ApiError.forbidden('Your account has been deactivated');

  user.lastLoginAt = new Date();
  await user.save();
  return user;
}

async function login(req, res) {
  const user = await authenticateCredentials(req.body.email, req.body.password);
  return ok(res, { user, token: signToken(user) }, { message: 'Logged in' });
}

async function adminLogin(req, res) {
  const user = await authenticateCredentials(req.body.email, req.body.password, 'admin');
  return ok(res, { user, token: signToken(user) }, { message: 'Logged in' });
}

// Bumping tokenVersion invalidates every token issued to this user (logs out all devices).
async function logout(req, res) {
  req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
  await req.user.save();
  return ok(res, null, { message: 'Logged out' });
}

async function getMe(req, res) {
  return ok(res, { user: req.user });
}

async function updateMe(req, res) {
  const { name, phone, addresses } = req.body;
  if (name !== undefined) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;
  if (addresses !== undefined) {
    // Keep at most one default address.
    let defaultSeen = false;
    req.user.addresses = addresses.map((a) => {
      const isDefault = Boolean(a.isDefault) && !defaultSeen;
      defaultSeen = defaultSeen || isDefault;
      return { ...a, isDefault };
    });
    if (!defaultSeen && req.user.addresses.length > 0) req.user.addresses[0].isDefault = true;
  }
  await req.user.save();
  return ok(res, { user: req.user }, { message: 'Profile updated' });
}

async function changePassword(req, res) {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await verifyPassword(req.body.currentPassword, user.password))) {
    throw ApiError.unauthorized('Current password is incorrect');
  }
  user.password = await hashPassword(req.body.newPassword);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  return ok(res, { token: signToken(user) }, { message: 'Password changed' });
}

module.exports = { register, login, adminLogin, logout, getMe, updateMe, changePassword };
