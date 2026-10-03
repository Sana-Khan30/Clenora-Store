require('./helpers/testEnv');
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { z } = require('zod');

const app = require('../src/app');
const env = require('../src/config/env');
const sanitize = require('../src/middleware/sanitize');
const validate = require('../src/middleware/validate');
const { errorHandler } = require('../src/middleware/errorHandler');
const ApiError = require('../src/utils/ApiError');

test('health: returns 503 JSON when database is not connected', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 503);
  assert.equal(res.body.success, false);
  assert.equal(res.body.data.database, 'disconnected');
});

test('unknown route: 404 in the standard error format', async () => {
  const res = await request(app).get('/api/nope');
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Route not found/);
});

test('malformed JSON: 400, no stack trace', async () => {
  const res = await request(app).post('/api/nope').set('Content-Type', 'application/json').send('{bad');
  assert.equal(res.status, 400);
  assert.equal(res.body.message, 'Request body is not valid JSON');
  assert.equal(res.body.stack, undefined);
});

test('oversized body: 413', async () => {
  const res = await request(app).post('/api/nope').send({ data: 'x'.repeat(200 * 1024) });
  assert.equal(res.status, 413);
});

test('CORS: allowed origin is echoed, other origins get no CORS header', async () => {
  const allowed = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
  assert.equal(allowed.headers['access-control-allow-origin'], 'http://localhost:5173');
  const blocked = await request(app).get('/api/health').set('Origin', 'https://evil.example');
  assert.equal(blocked.headers['access-control-allow-origin'], undefined);
});

test('helmet: security headers present, x-powered-by removed', async () => {
  const res = await request(app).get('/api/health');
  assert.ok(res.headers['x-content-type-options']);
  assert.equal(res.headers['x-powered-by'], undefined);
});

test('sanitize: strips $operator and dotted keys recursively', () => {
  const body = { email: { $gt: '' }, nested: { 'a.b': 1, ok: 2 }, list: [{ $where: 'x', fine: 1 }] };
  const req = { body, params: {} };
  sanitize(req, {}, () => {});
  assert.deepEqual(req.body, { email: {}, nested: { ok: 2 }, list: [{ fine: 1 }] });
});

test('validate: rejects bad input with field errors and strips unknown fields', () => {
  const mw = validate({ body: z.object({ name: z.string().min(2) }) });
  let err;
  mw({ body: { name: 'a' }, query: {}, params: {} }, {}, (e) => (err = e));
  assert.equal(err.statusCode, 400);
  assert.equal(err.details[0].field, 'body.name');

  const req = { body: { name: 'ok', admin: true }, query: {}, params: {} };
  mw(req, {}, () => {});
  assert.deepEqual(req.body, { name: 'ok' });
});

function fakeRes() {
  return {
    statusCode: 0,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

test('errorHandler: unknown errors are masked as 500 in production', () => {
  const originalLog = console.error;
  console.error = () => {};
  env.isProduction = true;
  try {
    const res = fakeRes();
    errorHandler(new Error('secret db password leaked'), { method: 'GET', originalUrl: '/x' }, res, () => {});
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, 'Internal server error');
    assert.equal(res.body.stack, undefined);
  } finally {
    env.isProduction = false;
    console.error = originalLog;
  }
});

test('errorHandler: maps Mongo duplicate key, bad JWT and ApiError', () => {
  const dup = fakeRes();
  errorHandler({ code: 11000, keyPattern: { email: 1 } }, {}, dup, () => {});
  assert.equal(dup.statusCode, 409);

  const jwt = fakeRes();
  errorHandler({ name: 'JsonWebTokenError' }, {}, jwt, () => {});
  assert.equal(jwt.statusCode, 401);

  const forbidden = fakeRes();
  errorHandler(ApiError.forbidden(), {}, forbidden, () => {});
  assert.equal(forbidden.statusCode, 403);
  assert.equal(forbidden.body.success, false);
});
