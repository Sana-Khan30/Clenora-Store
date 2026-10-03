const { hasTestDb } = require('./helpers/testEnv');
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { connectTestDb, clearDb, closeDb } = require('./helpers/db');
const app = require('../src/app');
const User = require('../src/models/User');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');
const Counter = require('../src/models/Counter');
const Setting = require('../src/models/Setting');
const InventoryTransaction = require('../src/models/InventoryTransaction');
const { hashPassword, signToken } = require('../src/services/auth.service');

const skip = hasTestDb ? false : 'TEST_MONGODB_URI is not set';
const FAKE_ID = '64b64b64b64b64b64b64b64b';
const customerInfo = { fullName: 'Ali Khan', phone: '0300 1234567', email: 'ali@example.com', city: 'Karachi', address: 'House 1, Street 2' };

let admin;
let alice;
let bob;
let aliceId;
let category;
let counter = 0;

const auth = (t) => ({ Authorization: `Bearer ${t}` });

async function makeUser(role, email) {
  const user = await User.create({ name: 'Test User', email, password: await hashPassword('Passw0rdPassw0rd'), role });
  return { token: signToken(user), id: String(user._id) };
}
async function mkProduct(o = {}) {
  counter += 1;
  return Product.create({
    name: `Product ${counter}`,
    slug: `product-${counter}`,
    sku: `SKU-${counter}`,
    category: category._id,
    regularPrice: 800,
    stock: 10,
    ...o,
  });
}
const place = (items, token, extra = {}) => {
  const req = request(app).post('/api/orders').send({ customer: customerInfo, items, ...extra });
  return token ? req.set(auth(token)) : req;
};
const stockOf = async (p) => (await Product.findById(p._id)).stock;

describe('orders and inventory', { skip }, () => {
  before(async () => {
    await connectTestDb();
    await Promise.all([User, Category, Product, Order, Counter, Setting, InventoryTransaction].map((m) => m.init()));
  });
  after(async () => closeDb());
  beforeEach(async () => {
    await clearDb();
    admin = (await makeUser('admin', 'admin@example.com')).token;
    const a = await makeUser('customer', 'alice@example.com');
    alice = a.token;
    aliceId = a.id;
    bob = (await makeUser('customer', 'bob@example.com')).token;
    category = await Category.create({ name: 'Floor Care', slug: 'floor-care' });
  });

  it('quote: totals come from the database; shipping Rs.150 below 1500, free from 1500', async () => {
    const p = await mkProduct({ regularPrice: 1000, salePrice: 800 });
    let res = await request(app).post('/api/orders/quote').send({ items: [{ productId: String(p._id), quantity: 1 }], price: 1 });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.subtotal, 800);
    assert.equal(res.body.data.shippingFee, 150);
    assert.equal(res.body.data.total, 950);
    res = await request(app).post('/api/orders/quote').send({ items: [{ productId: String(p._id), quantity: 2 }] });
    assert.equal(res.body.data.subtotal, 1600);
    assert.equal(res.body.data.shippingFee, 0);
  });

  it('quote uses admin-edited shipping settings', async () => {
    await Setting.create({ key: 'store', shippingFee: 200, freeShippingThreshold: 1000 });
    const p = await mkProduct({ regularPrice: 800 });
    const res = await request(app).post('/api/orders/quote').send({ items: [{ productId: String(p._id), quantity: 1 }] });
    assert.equal(res.body.data.shippingFee, 200);
    assert.equal(res.body.data.total, 1000);
  });

  it('create order: ignores tampered prices/totals, takes stock, logs a sale, numbers the order', async () => {
    const p = await mkProduct({ regularPrice: 800, stock: 10 });
    const res = await place([{ productId: String(p._id), quantity: 2, price: 1 }], alice, { total: 1, shippingFee: 0, subtotal: 1 });
    assert.equal(res.status, 201);
    const o = res.body.data.order;
    assert.match(o.orderNumber, /^CLN-\d{6}$/);
    assert.equal(o.subtotal, 1600);
    assert.equal(o.shippingFee, 0);
    assert.equal(o.total, 1600);
    assert.equal(o.paymentMethod, 'cod');
    assert.equal(o.paymentStatus, 'pending');
    assert.equal(o.status, 'pending');
    assert.equal(o.items[0].unitPrice, 800);
    assert.equal(o.user, aliceId);
    assert.equal(await stockOf(p), 8);
    const log = await InventoryTransaction.findOne({ product: p._id, type: 'sale' });
    assert.equal(log.quantityChange, -2);
    assert.equal(log.stockBefore, 10);
    assert.equal(log.stockAfter, 8);
  });

  it('order keeps its price snapshot after the product price changes', async () => {
    const p = await mkProduct({ regularPrice: 800 });
    const res = await place([{ productId: String(p._id), quantity: 1 }], alice);
    await Product.updateOne({ _id: p._id }, { $set: { price: 5000, regularPrice: 5000 } });
    const again = await request(app).get(`/api/orders/my/${res.body.data.order.id}`).set(auth(alice));
    assert.equal(again.body.data.order.items[0].unitPrice, 800);
  });

  it('guest checkout works without a token and is not linked to a user', async () => {
    const p = await mkProduct();
    const res = await place([{ productId: String(p._id), quantity: 1 }]);
    assert.equal(res.status, 201);
    assert.equal(res.body.data.order.user, null);
  });

  it('rejects card payment, unknown, inactive and hidden-category products', async () => {
    const p = await mkProduct();
    let res = await place([{ productId: String(p._id), quantity: 1 }], null, { paymentMethod: 'card' });
    assert.equal(res.status, 400);
    res = await place([{ productId: FAKE_ID, quantity: 1 }]);
    assert.equal(res.status, 409);
    const inactive = await mkProduct({ isActive: false });
    res = await place([{ productId: String(inactive._id), quantity: 1 }]);
    assert.equal(res.status, 409);
    const hidden = await Category.create({ name: 'Hidden', slug: 'hidden', isActive: false });
    const inHidden = await mkProduct({ category: hidden._id });
    res = await place([{ productId: String(inHidden._id), quantity: 1 }]);
    assert.equal(res.status, 409);
    assert.equal(await Order.countDocuments(), 0);
  });

  it('insufficient stock: 409, nothing changes, even when another line in the cart was fine', async () => {
    const ok = await mkProduct({ stock: 5 });
    const low = await mkProduct({ stock: 1 });
    const res = await place([
      { productId: String(ok._id), quantity: 2 },
      { productId: String(low._id), quantity: 2 },
    ]);
    assert.equal(res.status, 409);
    assert.equal(await stockOf(ok), 5);
    assert.equal(await stockOf(low), 1);
    assert.equal(await Order.countDocuments(), 0);
    assert.equal(await InventoryTransaction.countDocuments({ type: 'sale' }), 0);
  });

  it('same product twice in one cart is merged and checked as one quantity', async () => {
    const p = await mkProduct({ stock: 3 });
    const res = await place([
      { productId: String(p._id), quantity: 2 },
      { productId: String(p._id), quantity: 2 },
    ]);
    assert.equal(res.status, 409);
    assert.equal(await stockOf(p), 3);
  });

  it('concurrency: 10 simultaneous orders for 5 units sell exactly 5, never negative', async () => {
    const p = await mkProduct({ stock: 5 });
    const results = await Promise.all(
      Array.from({ length: 10 }, () => place([{ productId: String(p._id), quantity: 1 }]))
    );
    const created = results.filter((r) => r.status === 201).length;
    const rejected = results.filter((r) => r.status === 409).length;
    assert.equal(created, 5);
    assert.equal(rejected, 5);
    assert.equal(await stockOf(p), 0);
    assert.equal(await Order.countDocuments(), 5);
    const numbers = (await Order.find()).map((o) => o.orderNumber);
    assert.equal(new Set(numbers).size, 5, 'order numbers must be unique');
  });

  it('customer history and privacy: own orders only, others get 404', async () => {
    const p = await mkProduct();
    const mine = await place([{ productId: String(p._id), quantity: 1 }], alice);
    await place([{ productId: String(p._id), quantity: 1 }], bob);
    const list = await request(app).get('/api/orders/my').set(auth(alice));
    assert.equal(list.body.data.items.length, 1);
    assert.equal(list.body.meta.total, 1);
    const id = mine.body.data.order.id;
    assert.equal((await request(app).get(`/api/orders/my/${id}`).set(auth(alice))).status, 200);
    assert.equal((await request(app).get(`/api/orders/my/${id}`).set(auth(bob))).status, 404);
    assert.equal((await request(app).post(`/api/orders/my/${id}/cancel`).set(auth(bob))).status, 404);
    assert.equal((await Order.findById(id)).status, 'pending');
  });

  it('customer cancels a pending order: stock restored exactly once', async () => {
    const p = await mkProduct({ stock: 10 });
    const o = await place([{ productId: String(p._id), quantity: 3 }], alice);
    const id = o.body.data.order.id;
    assert.equal(await stockOf(p), 7);
    const [a, b] = await Promise.all([
      request(app).post(`/api/orders/my/${id}/cancel`).set(auth(alice)),
      request(app).post(`/api/orders/my/${id}/cancel`).set(auth(alice)),
    ]);
    assert.deepEqual([a.status, b.status].sort(), [200, 409]);
    assert.equal(await stockOf(p), 10);
    assert.equal(await InventoryTransaction.countDocuments({ product: p._id, type: 'cancellation' }), 1);
    const again = await request(app).post(`/api/orders/my/${id}/cancel`).set(auth(alice));
    assert.equal(again.status, 409);
    assert.equal(await stockOf(p), 10);
  });

  it('admin routes: customers get 403, admins get access', async () => {
    assert.equal((await request(app).get('/api/admin/orders').set(auth(alice))).status, 403);
    assert.equal((await request(app).post('/api/admin/inventory/adjust').set(auth(alice)).send({})).status, 403);
    assert.equal((await request(app).get('/api/admin/orders').set(auth(admin))).status, 200);
  });

  it('admin lists with filters and pagination', async () => {
    const p = await mkProduct({ stock: 50 });
    for (let i = 0; i < 3; i += 1) await place([{ productId: String(p._id), quantity: 1 }], alice);
    const first = await Order.findOne().sort({ createdAt: 1 });
    await request(app).patch(`/api/admin/orders/${first._id}/status`).set(auth(admin)).send({ status: 'confirmed' });
    let res = await request(app).get('/api/admin/orders?limit=2&page=1').set(auth(admin));
    assert.equal(res.body.data.items.length, 2);
    assert.equal(res.body.meta.total, 3);
    assert.equal(res.body.meta.totalPages, 2);
    res = await request(app).get('/api/admin/orders?status=confirmed').set(auth(admin));
    assert.equal(res.body.meta.total, 1);
    res = await request(app).get('/api/admin/orders?search=ali@example.com').set(auth(admin));
    assert.equal(res.body.meta.total, 3);
    assert.equal((await request(app).get('/api/admin/orders?status=bogus').set(auth(admin))).status, 400);
    assert.equal((await request(app).get('/api/admin/orders?limit=1000').set(auth(admin))).status, 400);
  });

  it('status flow: valid steps work, invalid jumps are 409, delivered marks COD as paid', async () => {
    const p = await mkProduct();
    const id = (await place([{ productId: String(p._id), quantity: 1 }], alice)).body.data.order.id;
    const move = (status) => request(app).patch(`/api/admin/orders/${id}/status`).set(auth(admin)).send({ status });
    assert.equal((await move('shipped')).status, 409);
    assert.equal((await move('delivered')).status, 409);
    for (const s of ['confirmed', 'processing', 'shipped', 'delivered']) assert.equal((await move(s)).status, 200, s);
    const order = (await request(app).get(`/api/admin/orders/${id}`).set(auth(admin))).body.data.order;
    assert.equal(order.status, 'delivered');
    assert.equal(order.paymentStatus, 'paid');
    assert.equal(order.statusHistory.length, 5);
    assert.equal((await move('cancelled')).status, 409);
    assert.equal((await move('pending')).status, 409);
  });

  it('admin cancel restores stock once; shipped orders cannot be cancelled; customer cannot cancel confirmed', async () => {
    const p = await mkProduct({ stock: 10 });
    const id = (await place([{ productId: String(p._id), quantity: 4 }], alice)).body.data.order.id;
    const move = (status) => request(app).patch(`/api/admin/orders/${id}/status`).set(auth(admin)).send({ status });
    await move('confirmed');
    assert.equal((await request(app).post(`/api/orders/my/${id}/cancel`).set(auth(alice))).status, 409);
    assert.equal(await stockOf(p), 6);
    assert.equal((await move('cancelled')).status, 200);
    assert.equal(await stockOf(p), 10);
    assert.equal((await move('cancelled')).status, 409);
    assert.equal(await stockOf(p), 10);

    const id2 = (await place([{ productId: String(p._id), quantity: 1 }], alice)).body.data.order.id;
    for (const s of ['confirmed', 'processing', 'shipped']) await request(app).patch(`/api/admin/orders/${id2}/status`).set(auth(admin)).send({ status: s });
    const res = await request(app).patch(`/api/admin/orders/${id2}/status`).set(auth(admin)).send({ status: 'cancelled' });
    assert.equal(res.status, 409);
    assert.equal(await stockOf(p), 9);
  });

  it('inventory adjust: add, remove, never below zero, history recorded', async () => {
    const p = await mkProduct({ stock: 4 });
    const adjust = (change, reason = 'stock count') =>
      request(app).post('/api/admin/inventory/adjust').set(auth(admin)).send({ productId: String(p._id), change, reason });
    let res = await adjust(6);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.stockAfter, 10);
    res = await adjust(-3, 'damaged');
    assert.equal(res.body.data.stockAfter, 7);
    assert.equal((await adjust(-8)).status, 409);
    assert.equal((await adjust(0)).status, 400);
    assert.equal(await stockOf(p), 7);
    const hist = await request(app).get(`/api/admin/inventory/transactions?product=${p._id}`).set(auth(admin));
    assert.equal(hist.body.data.items.length, 2);
    assert.equal(hist.body.data.items[0].quantityChange, -3);
    assert.equal((await request(app).post('/api/admin/inventory/adjust').set(auth(admin)).send({ productId: FAKE_ID, change: 1, reason: 'test' })).status, 404);
  });
});
