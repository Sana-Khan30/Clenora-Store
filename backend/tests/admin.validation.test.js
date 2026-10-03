// No database needed: validation rules and login gates for the Phase 6 routes.
require('./helpers/testEnv');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const { updateSettings, customersQuery, customerStatusBody } = require('../src/validators/admin.validator');

const ID = '64b64b64b64b64b64b64b64b';

describe('admin settings/customers validation (no database)', () => {
  it('WhatsApp number: formatting is stripped, leading 0 and letters rejected, empty clears it', () => {
    assert.equal(updateSettings.parse({ whatsappNumber: '+92 300 1234567' }).whatsappNumber, '923001234567');
    assert.equal(updateSettings.parse({ whatsappNumber: '' }).whatsappNumber, '');
    assert.equal(updateSettings.safeParse({ whatsappNumber: '0300 1234567' }).success, false);
    assert.equal(updateSettings.safeParse({ whatsappNumber: 'call me' }).success, false);
    assert.equal(updateSettings.safeParse({ whatsappNumber: '12345' }).success, false);
  });

  it('shipping values: whole, non-negative numbers only; at least one field required', () => {
    assert.equal(updateSettings.safeParse({ shippingFee: -1 }).success, false);
    assert.equal(updateSettings.safeParse({ shippingFee: 99.5 }).success, false);
    assert.equal(updateSettings.safeParse({ freeShippingThreshold: '1500' }).success, false);
    assert.equal(updateSettings.safeParse({}).success, false);
    assert.deepEqual(updateSettings.parse({ shippingFee: 200, freeShippingThreshold: 2000, hack: 1 }), {
      shippingFee: 200,
      freeShippingThreshold: 2000,
    });
  });

  it('customer queries and status body are validated', () => {
    assert.equal(customersQuery.parse({}).limit, 20);
    assert.equal(customersQuery.safeParse({ limit: '1000' }).success, false);
    assert.equal(customersQuery.safeParse({ status: 'banned' }).success, false);
    assert.equal(customerStatusBody.safeParse({ isActive: 'false' }).success, false);
    assert.equal(customerStatusBody.safeParse({ isActive: false }).success, true);
  });

  it('HTTP: every new admin route requires login', async () => {
    for (const [method, url] of [
      ['get', '/api/admin/dashboard'],
      ['get', '/api/admin/settings'],
      ['patch', '/api/admin/settings'],
      ['get', '/api/admin/customers'],
      ['get', `/api/admin/customers/${ID}`],
      ['get', `/api/admin/customers/${ID}/orders`],
      ['patch', `/api/admin/customers/${ID}/status`],
    ]) {
      const res = await request(app)[method](url);
      assert.equal(res.status, 401, `${method.toUpperCase()} ${url} should be 401`);
    }
  });
});
