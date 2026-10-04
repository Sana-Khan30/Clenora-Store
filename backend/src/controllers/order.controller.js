const Order = require('../models/Order');
const orderService = require('../services/order.service');
const { sendOrderConfirmationEmail } = require('../services/email.service');
const { pageMeta } = require('../services/product.service');
const escapeRegex = require('../utils/escapeRegex');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/response');

async function paginate(filter, q, { select = '' } = {}) {
  const [items, total] = await Promise.all([
    Order.find(filter)
      .select(select)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    Order.countDocuments(filter),
  ]);
  return { items, meta: pageMeta(q, total) };
}

// ---------- customer / guest ----------
async function quote(req, res) {
  return ok(res, await orderService.quote(req.body.items));
}

// Guests may order (optionalAuth); a logged-in customer's order is linked to their account.
async function create(req, res) {
  const order = await orderService.placeOrder(req.body, req.user || null);
  // Asynchronously trigger automated order confirmation email via Hostinger Mail API
  sendOrderConfirmationEmail(order).catch((err) => {
    console.error('Email confirmation error:', err.message);
  });
  return created(res, { order }, 'Order placed');
}

async function listMine(req, res) {
  const { items, meta } = await paginate({ user: req.user._id }, req.valid.query, { select: '-statusHistory' });
  return ok(res, { items }, { meta });
}

// Ownership check: the order must belong to the logged-in user, otherwise it "does not exist".
async function getMine(req, res) {
  const order = await Order.findOne({ _id: req.valid.params.id, user: req.user._id });
  if (!order) throw ApiError.notFound('Order not found');
  return ok(res, { order });
}

async function cancelMine(req, res) {
  const order = await orderService.cancelOrder({
    orderId: req.valid.params.id,
    by: { role: 'customer', id: req.user._id },
    ownerId: req.user._id,
    note: 'Cancelled by customer',
  });
  return ok(res, { order }, { message: 'Order cancelled' });
}

// ---------- admin ----------
async function listAdmin(req, res) {
  const q = req.valid.query;
  const filter = {};
  if (q.status) filter.status = q.status;
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ orderNumber: rx }, { 'customer.fullName': rx }, { 'customer.phone': rx }, { 'customer.email': rx }];
  }
  if (q.from || q.to) {
    filter.createdAt = {};
    if (q.from) filter.createdAt.$gte = new Date(`${q.from}T00:00:00.000Z`);
    if (q.to) filter.createdAt.$lte = new Date(`${q.to}T23:59:59.999Z`);
  }
  const { items, meta } = await paginate(filter, q, { select: '-statusHistory' });
  return ok(res, { items }, { meta });
}

async function getAdmin(req, res) {
  const order = await Order.findById(req.valid.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  return ok(res, { order });
}

async function updateStatus(req, res) {
  const order = await orderService.updateStatus({
    orderId: req.valid.params.id,
    status: req.body.status,
    note: req.body.note,
    adminId: req.user._id,
  });
  return ok(res, { order }, { message: `Order marked ${order.status}` });
}

module.exports = { quote, create, listMine, getMine, cancelMine, listAdmin, getAdmin, updateStatus };
