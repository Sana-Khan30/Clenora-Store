// These tests need NO database: they check validation, auth gates and pure logic.
require('./helpers/testEnv');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const { createOrder, quoteBody, adjustBody, statusBody } = require('../src/validators/order.validator');
const { calculateShipping } = require('../src/services/settings.service');
const { TRANSITIONS } = require('../src/services/order.service');

const ID = '64b64b64b64b64b64b64b64b';
const customer = { fullName: 'Ali Khan', phone: '0300 1234567', email: 'ali@example.com', city: 'Karachi', address: 'House 1, Street 2' };

describe('order validation (no database)', () => {
  it('shipping: Rs.150 below Rs.1500, free at or above the threshold', () => {
    const s = { shippingFee: 150, freeShippingThreshold: 1500 };
    assert.equal(calculateShipping(1499, s), 150);
    assert.equal(calculateShipping(1500, s), 0);
    assert.equal(calculateShipping(0, s), 0);
    assert.equal(calculateShipping(900, { shippingFee: 200, freeShippingThreshold: 1000 }), 200);
  });

  it('status transitions: delivered and cancelled are final; cancel only before shipping', () => {
    assert.deepEqual(TRANSITIONS.delivered, []);
    assert.deepEqual(TRANSITIONS.cancelled, []);
    assert.ok(!TRANSITIONS.shipped.includes('cancelled'));
    assert.ok(!TRANSITIONS.pending.includes('shipped'));
  });

  it('createOrder strips client-supplied prices and totals, defaults to COD', () => {
    const parsed = createOrder.parse({
      customer,
      items: [{ productId: ID, quantity: 2, price: 1, unitPrice: 1 }],
      subtotal: 1,
      shippingFee: 0,
      total: 1,
      grandTotal: 1,
    });
    assert.deepEqual(parsed.items, [{ productId: ID, quantity: 2 }]);
    assert.equal(parsed.paymentMethod, 'cod');
    assert.equal(parsed.total, undefined);
    assert.equal(parsed.shippingFee, undefined);
  });

  it('createOrder rejects card payments, empty carts, bad quantities and bad ids', () => {
    assert.equal(createOrder.safeParse({ customer, items: [{ productId: ID, quantity: 1 }], paymentMethod: 'card' }).success, false);
    assert.equal(createOrder.safeParse({ customer, items: [] }).success, false);
    assert.equal(createOrder.safeParse({ customer, items: [{ productId: ID, quantity: 0 }] }).success, false);
    assert.equal(createOrder.safeParse({ customer, items: [{ productId: ID, quantity: 1.5 }] }).success, false);
    assert.equal(createOrder.safeParse({ customer, items: [{ productId: 'abc', quantity: 1 }] }).success, false);
    assert.equal(quoteBody.safeParse({ items: [{ productId: ID, quantity: 100 }] }).success, false);
  });

  it('adjustBody and statusBody validate input', () => {
    assert.equal(adjustBody.safeParse({ productId: ID, change: 0, reason: 'recount' }).success, false);
    assert.equal(adjustBody.safeParse({ productId: ID, change: 2.5, reason: 'recount' }).success, false);
    assert.equal(adjustBody.safeParse({ productId: ID, change: -3, reason: 'ab' }).success, false);
    assert.equal(adjustBody.safeParse({ productId: ID, change: -3, reason: 'damaged' }).success, true);
    assert.equal(statusBody.safeParse({ status: 'teleported' }).success, false);
  });

  it('HTTP: bad order body is rejected with 400 before touching the database', async () => {
    const res = await request(app).post('/api/orders').send({ customer, items: [] });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('HTTP: customer order history and all admin order/inventory routes require login', async () => {
    for (const [method, url] of [
      ['get', '/api/orders/my'],
      ['get', `/api/orders/my/${ID}`],
      ['post', `/api/orders/my/${ID}/cancel`],
      ['get', '/api/admin/orders'],
      ['get', `/api/admin/orders/${ID}`],
      ['patch', `/api/admin/orders/${ID}/status`],
      ['get', '/api/admin/inventory/transactions'],
      ['post', '/api/admin/inventory/adjust'],
    ]) {
      const res = await request(app)[method](url);
      assert.equal(res.status, 401, `${method.toUpperCase()} ${url} should be 401`);
    }
  });
});
