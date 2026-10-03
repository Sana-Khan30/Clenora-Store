const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Counter = require('../models/Counter');
const InventoryTransaction = require('../models/InventoryTransaction');
const { getSettings, calculateShipping } = require('./settings.service');
const { runInTransaction } = require('../utils/transaction');
const ApiError = require('../utils/ApiError');

const MAX_QTY_PER_PRODUCT = 99;

// Allowed admin status moves. Cancelling is only possible before shipping.
const TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

// Same product twice in one request becomes one line.
function mergeItems(items) {
  const totals = new Map();
  for (const { productId, quantity } of items) {
    totals.set(productId, (totals.get(productId) || 0) + quantity);
  }
  return [...totals].map(([productId, quantity]) => {
    if (quantity > MAX_QTY_PER_PRODUCT) {
      throw ApiError.badRequest(`You can order at most ${MAX_QTY_PER_PRODUCT} of the same product`);
    }
    return { productId, quantity };
  });
}

const isSellable = (p) => Boolean(p && p.isActive && p.category && p.category.isActive);

// Read-only price check for the cart/checkout screens. Prices always come from the database.
async function quote(rawItems) {
  const lines = mergeItems(rawItems);
  const [products, settings] = await Promise.all([
    Product.find({ _id: { $in: lines.map((l) => l.productId) } })
      .populate('category', 'isActive')
      .lean(),
    getSettings(),
  ]);
  const byId = new Map(products.map((p) => [String(p._id), p]));

  let subtotal = 0;
  const items = lines.map((l) => {
    const p = byId.get(l.productId);
    const sellable = isSellable(p);
    const available = sellable && p.stock >= l.quantity;
    const unitPrice = p ? p.price : 0;
    const lineTotal = available ? unitPrice * l.quantity : 0;
    subtotal += lineTotal;
    return {
      productId: l.productId,
      name: p ? p.name : null,
      image: p && p.images && p.images[0] ? p.images[0].url : null,
      unitPrice,
      quantity: l.quantity,
      lineTotal,
      available,
      availableStock: sellable ? p.stock : 0,
    };
  });

  const shippingFee = calculateShipping(subtotal, settings);
  return {
    items,
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
    freeShippingThreshold: settings.freeShippingThreshold,
    allAvailable: items.every((i) => i.available),
  };
}

// Creates the order and takes the stock in ONE transaction. Each stock decrement is a conditional
// atomic update ("only if stock >= quantity"), so two customers can never buy the last unit twice.
async function placeOrder({ customer, items, paymentMethod }, user) {
  const lines = mergeItems(items);
  const settings = await getSettings();
  const orderId = new mongoose.Types.ObjectId();

  return runInTransaction(async (session) => {
    const orderItems = [];
    const logs = [];

    for (const line of lines) {
      const product = await Product.findOne({ _id: line.productId, isActive: true })
        .populate('category', 'isActive')
        .session(session);
      if (!isSellable(product)) {
        throw ApiError.conflict('An item in your cart is no longer available. Please review your cart.');
      }

      const before = await Product.findOneAndUpdate(
        { _id: product._id, isActive: true, stock: { $gte: line.quantity } },
        { $inc: { stock: -line.quantity } },
        { session, returnDocument: 'before' }
      );
      if (!before) {
        throw ApiError.conflict(`Not enough stock for "${product.name}" (available: ${product.stock})`);
      }

      const unitPrice = before.price;
      orderItems.push({
        product: before._id,
        name: before.name,
        sku: before.sku,
        image: before.images && before.images[0] ? before.images[0].url : '',
        unitPrice,
        quantity: line.quantity,
        lineTotal: unitPrice * line.quantity,
      });
      logs.push({
        product: before._id,
        productName: before.name,
        sku: before.sku,
        type: 'sale',
        quantityChange: -line.quantity,
        stockBefore: before.stock,
        stockAfter: before.stock - line.quantity,
        reason: 'Order placed',
        order: orderId,
        performedBy: user ? user._id : null,
      });
    }

    const subtotal = orderItems.reduce((sum, i) => sum + i.lineTotal, 0);
    const shippingFee = calculateShipping(subtotal, settings);

    const counter = await Counter.findOneAndUpdate(
      { _id: 'order' },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after', session }
    );

    const [order] = await Order.create(
      [
        {
          _id: orderId,
          orderNumber: `CLN-${String(counter.seq).padStart(6, '0')}`,
          user: user ? user._id : null,
          customer,
          items: orderItems,
          subtotal,
          shippingFee,
          total: subtotal + shippingFee,
          paymentMethod,
          statusHistory: [{ status: 'pending', by: user ? user._id : null, note: 'Order placed' }],
        },
      ],
      { session }
    );
    await InventoryTransaction.insertMany(logs, { session });
    return order;
  });
}

// Cancels and restores stock in one transaction. The status flip and stockRestored flag happen in a
// single conditional update, so a double click or two admins can never restore stock twice.
async function cancelOrder({ orderId, by, note = '', ownerId = null }) {
  const cancellable = by.role === 'customer' ? ['pending'] : ['pending', 'confirmed', 'processing'];

  const cancelled = await runInTransaction(async (session) => {
    const filter = { _id: orderId, status: { $in: cancellable }, stockRestored: false };
    if (ownerId) filter.user = ownerId;

    const order = await Order.findOneAndUpdate(
      filter,
      {
        $set: { status: 'cancelled', stockRestored: true, cancelledAt: new Date(), cancelledBy: by.role },
        $push: { statusHistory: { status: 'cancelled', by: by.id, note } },
      },
      { session, returnDocument: 'after' }
    );
    if (!order) return null;

    const logs = [];
    for (const item of order.items) {
      const prev = await Product.findOneAndUpdate(
        { _id: item.product },
        { $inc: { stock: item.quantity } },
        { session, returnDocument: 'before' }
      );
      if (!prev) continue; // product was deleted later: nothing to restore
      logs.push({
        product: prev._id,
        productName: item.name,
        sku: item.sku,
        type: 'cancellation',
        quantityChange: item.quantity,
        stockBefore: prev.stock,
        stockAfter: prev.stock + item.quantity,
        reason: `Order ${order.orderNumber} cancelled`,
        order: order._id,
        performedBy: by.id,
      });
    }
    if (logs.length) await InventoryTransaction.insertMany(logs, { session });
    return order;
  });

  if (cancelled) return cancelled;

  const existing = await Order.findOne(ownerId ? { _id: orderId, user: ownerId } : { _id: orderId }).select('status');
  if (!existing) throw ApiError.notFound('Order not found');
  throw ApiError.conflict(`An order that is ${existing.status} cannot be cancelled`);
}

async function updateStatus({ orderId, status, adminId, note = '' }) {
  if (status === 'cancelled') {
    return cancelOrder({ orderId, by: { role: 'admin', id: adminId }, note });
  }

  const current = await Order.findById(orderId).select('status');
  if (!current) throw ApiError.notFound('Order not found');
  if (!TRANSITIONS[current.status].includes(status)) {
    throw ApiError.conflict(`Cannot change an order from ${current.status} to ${status}`);
  }

  const set = { status };
  if (status === 'delivered') {
    set.deliveredAt = new Date();
    set.paymentStatus = 'paid'; // cash collected on delivery
  }
  // The filter includes the status we just read: if someone else changed it meanwhile, nothing is updated.
  const updated = await Order.findOneAndUpdate(
    { _id: orderId, status: current.status },
    { $set: set, $push: { statusHistory: { status, by: adminId, note } } },
    { returnDocument: 'after' }
  );
  if (!updated) throw ApiError.conflict('The order was changed by someone else. Refresh and try again.');
  return updated;
}

// Manual stock change by an admin (positive adds, negative removes). Never lets stock go below zero.
async function adjustStock({ productId, change, reason, adminId }) {
  const result = await runInTransaction(async (session) => {
    const filter = { _id: productId };
    if (change < 0) filter.stock = { $gte: -change };

    const before = await Product.findOneAndUpdate(filter, { $inc: { stock: change } }, { session, returnDocument: 'before' });
    if (!before) return null;

    await InventoryTransaction.create(
      [
        {
          product: before._id,
          productName: before.name,
          sku: before.sku,
          type: 'adjustment',
          quantityChange: change,
          stockBefore: before.stock,
          stockAfter: before.stock + change,
          reason,
          performedBy: adminId,
        },
      ],
      { session }
    );
    return { productId: String(before._id), name: before.name, stockBefore: before.stock, stockAfter: before.stock + change };
  });

  if (result) return result;
  const product = await Product.findById(productId).select('stock name');
  if (!product) throw ApiError.notFound('Product not found');
  throw ApiError.conflict(`Cannot remove ${-change}: only ${product.stock} in stock`);
}

module.exports = { quote, placeOrder, cancelOrder, updateStatus, adjustStock, TRANSITIONS };
