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
const customerInfo = { fullName: 'Ali Khan', phone: '0300 1234567', email: 'ali@example.com', city: 'Karachi', address: 'House 1, Street 2' };

let admin;
let adminId;
let alice;
let aliceId;
let bobId;
let category;
let counter = 0;

const auth = (t) => ({ Authorization: `Bearer ${t}` });

async function makeUser(role, email, name = 'Test User') {
  const user = await User.create({ name, email, password: await hashPassword('Passw0rdPassw0rd'), role });
  return { token: signToken(user), id: String(user._id) };
}
async function mkProduct(o = {}) {
  counter += 1;
  return Product.create({ name: `Product ${counter}`, slug: `product-${counter}`, sku: `SKU-${counter}`, category: category._id, regularPrice: 800, stock: 20, ...o });
}
const place = (items, token) => {
  const req = request(app).post('/api/orders').send({ customer: customerInfo, items });
  return token ? req.set(auth(token)) : req;
};

describe('settings, dashboard and customers', { skip }, () => {
  before(async () => {
    await connectTestDb();
    await Promise.all([User, Category, Product, Order, Counter, Setting, InventoryTransaction].map((m) => m.init()));
  });
  after(async () => closeDb());
  beforeEach(async () => {
    await clearDb();
    const a = await makeUser('admin', 'admin@example.com', 'Admin');
    admin = a.token;
    adminId = a.id;
    const al = await makeUser('customer', 'alice@example.com', 'Alice Rahman');
    alice = al.token;
    aliceId = al.id;
    bobId = (await makeUser('customer', 'bob@example.com', 'Bob Siddiqui')).id;
    category = await Category.create({ name: 'Floor Care', slug: 'floor-care' });
  });

  it('public settings return defaults before anything is saved', async () => {
    const res = await request(app).get('/api/settings/public');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.settings, {
      storeName: 'CLENORA',
      whatsappNumber: '',
      whatsappLink: null,
      shippingFee: 150,
      freeShippingThreshold: 1500,
      currency: 'PKR',
      currencySymbol: 'Rs.',
    });
  });

  it('admin updates settings; public API and order quotes pick them up; customers cannot update', async () => {
    assert.equal((await request(app).patch('/api/admin/settings').set(auth(alice)).send({ shippingFee: 1 })).status, 403);
    const res = await request(app)
      .patch('/api/admin/settings')
      .set(auth(admin))
      .send({ whatsappNumber: '+92 300 1234567', shippingFee: 200, freeShippingThreshold: 1000 });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.settings.whatsappNumber, '923001234567');
    assert.equal(res.body.data.settings.whatsappLink, 'https://wa.me/923001234567');

    const pub = await request(app).get('/api/settings/public');
    assert.equal(pub.body.data.settings.shippingFee, 200);

    const p = await mkProduct({ regularPrice: 800 });
    const quote = await request(app).post('/api/orders/quote').send({ items: [{ productId: String(p._id), quantity: 1 }] });
    assert.equal(quote.body.data.shippingFee, 200);
    const order = await place([{ productId: String(p._id), quantity: 1 }]);
    assert.equal(order.body.data.order.shippingFee, 200);

    // A partial update keeps the other values.
    await request(app).patch('/api/admin/settings').set(auth(admin)).send({ shippingFee: 100 });
    const after = (await request(app).get('/api/admin/settings').set(auth(admin))).body.data.settings;
    assert.equal(after.shippingFee, 100);
    assert.equal(after.freeShippingThreshold, 1000);
    assert.equal(after.whatsappNumber, '923001234567');
    assert.equal(await Setting.countDocuments(), 1);
  });

  it('settings reject invalid input with 400', async () => {
    const bad = (body) => request(app).patch('/api/admin/settings').set(auth(admin)).send(body);
    assert.equal((await bad({ whatsappNumber: '03001234567' })).status, 400);
    assert.equal((await bad({ shippingFee: -5 })).status, 400);
    assert.equal((await bad({})).status, 400);
  });

  it('dashboard: correct counts, sales exclude cancelled orders, low stock and recent orders', async () => {
    const inStock = await mkProduct({ stock: 20 });
    await mkProduct({ stock: 3, lowStockThreshold: 5 });
    await mkProduct({ stock: 0 });
    await mkProduct({ stock: 50, isActive: false });

    const a = await place([{ productId: String(inStock._id), quantity: 1 }], alice); // 800 + 150 = 950
    await place([{ productId: String(inStock._id), quantity: 2 }], alice); // 1600, free shipping
    await request(app).post(`/api/orders/my/${a.body.data.order.id}/cancel`).set(auth(alice));

    assert.equal((await request(app).get('/api/admin/dashboard').set(auth(alice))).status, 403);
    const res = await request(app).get('/api/admin/dashboard').set(auth(admin));
    assert.equal(res.status, 200);
    const d = res.body.data;
    assert.equal(d.orders.total, 2);
    assert.equal(d.orders.pending, 1);
    assert.equal(d.orders.cancelled, 1);
    assert.equal(d.orders.completed, 0);
    assert.equal(d.sales.totalSales, 1600);
    assert.equal(d.sales.deliveredSales, 0);
    assert.equal(d.products.total, 4);
    assert.equal(d.products.active, 3);
    assert.equal(d.products.lowStock, 1);
    assert.equal(d.products.outOfStock, 1);
    assert.equal(d.customers.total, 2);
    assert.equal(d.lowStockProducts.length, 1);
    assert.equal(d.lowStockProducts[0].stock, 3);
    assert.equal(d.recentOrders.length, 2);
    assert.match(d.recentOrders[0].orderNumber, /^CLN-/);
  });

  it('dashboard counts delivered sales once an order is delivered', async () => {
    const p = await mkProduct();
    const id = (await place([{ productId: String(p._id), quantity: 2 }], alice)).body.data.order.id;
    for (const status of ['confirmed', 'processing', 'shipped', 'delivered']) {
      await request(app).patch(`/api/admin/orders/${id}/status`).set(auth(admin)).send({ status });
    }
    const d = (await request(app).get('/api/admin/dashboard').set(auth(admin))).body.data;
    assert.equal(d.orders.completed, 1);
    assert.equal(d.sales.deliveredSales, 1600);
  });

  it('customer list: only customers, search, status filter, pagination, order stats', async () => {
    const p = await mkProduct();
    await place([{ productId: String(p._id), quantity: 1 }], alice);
    let res = await request(app).get('/api/admin/customers').set(auth(admin));
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.total, 2, 'admin account must not be listed');
    const aliceRow = res.body.data.items.find((c) => c.id === aliceId);
    assert.equal(aliceRow.orderCount, 1);
    assert.equal(aliceRow.totalSpent, 950);
    assert.equal(aliceRow.password, undefined);
    assert.equal((await request(app).get('/api/admin/customers').set(auth(alice))).status, 403);

    res = await request(app).get('/api/admin/customers?search=siddiqui').set(auth(admin));
    assert.equal(res.body.meta.total, 1);
    res = await request(app).get('/api/admin/customers?limit=1&page=2').set(auth(admin));
    assert.equal(res.body.data.items.length, 1);
    assert.equal(res.body.meta.totalPages, 2);
    assert.equal((await request(app).get('/api/admin/customers?limit=500').set(auth(admin))).status, 400);
  });

  it('customer detail and order history; admin ids are not exposed here', async () => {
    const p = await mkProduct();
    await place([{ productId: String(p._id), quantity: 1 }], alice);
    await place([{ productId: String(p._id), quantity: 1 }], alice);
    let res = await request(app).get(`/api/admin/customers/${aliceId}`).set(auth(admin));
    assert.equal(res.body.data.customer.orderCount, 2);
    res = await request(app).get(`/api/admin/customers/${aliceId}/orders?limit=1`).set(auth(admin));
    assert.equal(res.body.data.items.length, 1);
    assert.equal(res.body.meta.total, 2);
    assert.equal((await request(app).get(`/api/admin/customers/${adminId}`).set(auth(admin))).status, 404);
    assert.equal((await request(app).get('/api/admin/customers/64b64b64b64b64b64b64b64b').set(auth(admin))).status, 404);
  });

  it('deactivating a customer blocks their token and login; reactivating restores access; admins cannot be deactivated', async () => {
    assert.equal((await request(app).get('/api/auth/me').set(auth(alice))).status, 200);
    const off = await request(app).patch(`/api/admin/customers/${aliceId}/status`).set(auth(admin)).send({ isActive: false });
    assert.equal(off.status, 200);
    assert.equal(off.body.data.customer.isActive, false);
    assert.equal((await request(app).get('/api/auth/me').set(auth(alice))).status, 403);
    const login = await request(app).post('/api/auth/login').send({ email: 'alice@example.com', password: 'Passw0rdPassw0rd' });
    assert.equal(login.status, 403);

    const on = await request(app).patch(`/api/admin/customers/${aliceId}/status`).set(auth(admin)).send({ isActive: true });
    assert.equal(on.status, 200);
    const relogin = await request(app).post('/api/auth/login').send({ email: 'alice@example.com', password: 'Passw0rdPassw0rd' });
    assert.equal(relogin.status, 200);
    // Deactivation invalidated her old tokens for good: reactivating does not revive them.
    assert.equal((await request(app).get('/api/auth/me').set(auth(alice))).status, 401);
    const freshAlice = relogin.body.data.token;
    assert.equal((await request(app).get('/api/auth/me').set(auth(freshAlice))).status, 200);

    assert.equal((await request(app).patch(`/api/admin/customers/${adminId}/status`).set(auth(admin)).send({ isActive: false })).status, 404);
    assert.equal((await request(app).patch(`/api/admin/customers/${bobId}/status`).set(auth(freshAlice)).send({ isActive: false })).status, 403);
    assert.equal((await User.findById(adminId)).isActive, true);
  });
});
