const User = require('../models/User');
const Order = require('../models/Order');
const { pageMeta } = require('../services/product.service');
const escapeRegex = require('../utils/escapeRegex');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/response');

// Only role "customer" is ever returned or changed here, so admin accounts cannot be touched from this API.
const CUSTOMER = { role: 'customer' };

async function statsFor(userIds) {
  const rows = await Order.aggregate([
    { $match: { user: { $in: userIds } } },
    {
      $group: {
        _id: '$user',
        orderCount: { $sum: 1 },
        totalSpent: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, '$total', 0] } },
        lastOrderAt: { $max: '$createdAt' },
      },
    },
  ]);
  return new Map(rows.map((r) => [String(r._id), r]));
}

function withStats(user, stats) {
  const s = stats.get(String(user._id)) || {};
  return { ...user.toJSON(), orderCount: s.orderCount || 0, totalSpent: s.totalSpent || 0, lastOrderAt: s.lastOrderAt || null };
}

async function list(req, res) {
  const q = req.valid.query;
  const filter = { ...CUSTOMER };
  if (q.status === 'active') filter.isActive = true;
  if (q.status === 'inactive') filter.isActive = false;
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    User.countDocuments(filter),
  ]);
  const stats = await statsFor(users.map((u) => u._id));
  return ok(res, { items: users.map((u) => withStats(u, stats)) }, { meta: pageMeta(q, total) });
}

async function loadCustomer(id) {
  const user = await User.findOne({ _id: id, ...CUSTOMER });
  if (!user) throw ApiError.notFound('Customer not found');
  return user;
}

async function get(req, res) {
  const user = await loadCustomer(req.valid.params.id);
  const stats = await statsFor([user._id]);
  return ok(res, { customer: withStats(user, stats) });
}

async function orders(req, res) {
  const q = req.valid.query;
  const user = await loadCustomer(req.valid.params.id);
  const filter = { user: user._id };
  const [items, total] = await Promise.all([
    Order.find(filter)
      .select('-statusHistory')
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    Order.countDocuments(filter),
  ]);
  return ok(res, { items }, { meta: pageMeta(q, total) });
}

// Deactivating also invalidates the customer's existing tokens (tokenVersion bump).
async function setStatus(req, res) {
  const { isActive } = req.body;
  const update = { $set: { isActive } };
  if (!isActive) update.$inc = { tokenVersion: 1 };
  const user = await User.findOneAndUpdate({ _id: req.valid.params.id, ...CUSTOMER }, update, { returnDocument: 'after' });
  if (!user) throw ApiError.notFound('Customer not found');
  return ok(res, { customer: user }, { message: isActive ? 'Customer activated' : 'Customer deactivated' });
}

module.exports = { list, get, orders, setStatus };
