const { hasTestDb } = require('./helpers/testEnv');
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const { connectTestDb, clearDb, closeDb } = require('./helpers/db');
const app = require('../src/app');
const User = require('../src/models/User');
const { hashPassword, signToken } = require('../src/services/auth.service');
const { authenticate, authorize } = require('../src/middleware/auth');
const { errorHandler } = require('../src/middleware/errorHandler');

const skip = hasTestDb ? false : 'TEST_MONGODB_URI is not set';
const PASSWORD = 'Sup3rSecret99';
const customer = { name: 'Ali Khan', email: 'ali@example.com', password: PASSWORD, phone: '0300 1234567' };

async function registerCustomer(data = customer) {
  const res = await request(app).post('/api/auth/register').send(data);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data;
}

async function makeAdmin(email = 'boss@example.com') {
  return User.create({ name: 'Boss', email, password: await hashPassword('AdminPass12345'), role: 'admin' });
}

describe('auth', { skip }, () => {
  before(async () => {
    await connectTestDb();
    await User.init();
  });
  after(closeDb);
  beforeEach(clearDb);

  it('register: creates a customer, hashes the password, never returns it', async () => {
    const { user, token } = await registerCustomer();
    assert.equal(user.role, 'customer');
    assert.equal(user.email, 'ali@example.com');
    assert.equal(user.password, undefined);
    assert.ok(user.id && !user._id);
    assert.ok(token);
    const stored = await User.findOne({ email: 'ali@example.com' }).select('+password');
    assert.notEqual(stored.password, PASSWORD);
    assert.match(stored.password, /^\$2[aby]\$/);
  });

  it('register: cannot create an admin or set privileged fields', async () => {
    const { user } = await registerCustomer({
      ...customer,
      role: 'admin',
      isActive: false,
      tokenVersion: 99,
    });
    assert.equal(user.role, 'customer');
    assert.equal(user.isActive, true);
    const stored = await User.findOne({ email: customer.email });
    assert.equal(stored.tokenVersion, 0);
  });

  it('register: duplicate email (any letter case) is rejected with 409', async () => {
    await registerCustomer();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...customer, email: 'ALI@Example.com' });
    assert.equal(res.status, 409);
  });

  it('register: rejects weak password, bad email, short name', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'nope', password: 'short' });
    assert.equal(res.status, 400);
    const fields = res.body.errors.map((e) => e.field);
    assert.ok(fields.includes('body.name'));
    assert.ok(fields.includes('body.email'));
    assert.ok(fields.includes('body.password'));
    const noDigit = await request(app)
      .post('/api/auth/register')
      .send({ ...customer, password: 'onlyletters' });
    assert.equal(noDigit.status, 400);
  });

  it('login: success, case-insensitive email', async () => {
    await registerCustomer();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ALI@example.com', password: PASSWORD });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.password, undefined);
  });

  it('login: wrong password and unknown email give the same 401 message', async () => {
    await registerCustomer();
    const wrong = await request(app).post('/api/auth/login').send({ email: customer.email, password: 'WrongPass123' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'ghost@example.com', password: PASSWORD });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.body.message, unknown.body.message);
  });

  it('login: NoSQL operator injection is rejected', async () => {
    await registerCustomer();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } });
    assert.equal(res.status, 400);
    assert.equal(res.body.data, undefined);
  });

  it('protected route: rejects missing, malformed, wrongly-signed, expired and alg=none tokens', async () => {
    const { user } = await registerCustomer();
    const check = async (header) => {
      const req = request(app).get('/api/auth/me');
      if (header) req.set('Authorization', header);
      return (await req).status;
    };
    assert.equal(await check(null), 401);
    assert.equal(await check('Bearer garbage'), 401);
    assert.equal(await check('Basic abc'), 401);
    assert.equal(await check('Bearer ' + jwt.sign({ tv: 0 }, 'a-different-secret-a-different-secret-1', { subject: user.id })), 401);
    assert.equal(await check('Bearer ' + jwt.sign({ tv: 0 }, process.env.JWT_SECRET, { subject: user.id, expiresIn: -10 })), 401);
    assert.equal(await check('Bearer ' + jwt.sign({ tv: 0 }, '', { subject: user.id, algorithm: 'none' })), 401);
  });

  it('GET /me: returns the current user', async () => {
    const { token } = await registerCustomer();
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.email, customer.email);
  });

  it('PATCH /me: updates name, phone, addresses; ignores role and email', async () => {
    const { token } = await registerCustomer();
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Ali Raza',
        phone: '0321 7654321',
        role: 'admin',
        email: 'hacker@example.com',
        addresses: [
          { fullName: 'Ali Raza', phone: '0321 7654321', city: 'Lahore', address: 'House 1, Street 2', isDefault: true },
          { fullName: 'Ali Raza', phone: '0321 7654321', city: 'Karachi', address: 'Flat 5, Block B', isDefault: true },
        ],
      });
    assert.equal(res.status, 200);
    const u = res.body.data.user;
    assert.equal(u.name, 'Ali Raza');
    assert.equal(u.role, 'customer');
    assert.equal(u.email, customer.email);
    assert.equal(u.addresses.length, 2);
    assert.equal(u.addresses.filter((a) => a.isDefault).length, 1);
  });

  it('PATCH /me: an empty or privileged-only body is rejected', async () => {
    const { token } = await registerCustomer();
    const res = await request(app).patch('/api/auth/me').set('Authorization', `Bearer ${token}`).send({ role: 'admin' });
    assert.equal(res.status, 400);
  });

  it('change password: needs the current password; old tokens stop working, new token works', async () => {
    const { token: oldToken } = await registerCustomer();
    const bad = await request(app)
      .patch('/api/auth/me/password')
      .set('Authorization', `Bearer ${oldToken}`)
      .send({ currentPassword: 'WrongPass123', newPassword: 'Brand9NewPass' });
    assert.equal(bad.status, 401);

    const ok = await request(app)
      .patch('/api/auth/me/password')
      .set('Authorization', `Bearer ${oldToken}`)
      .send({ currentPassword: PASSWORD, newPassword: 'Brand9NewPass' });
    assert.equal(ok.status, 200);

    const withOld = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${oldToken}`);
    assert.equal(withOld.status, 401);
    const withNew = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${ok.body.data.token}`);
    assert.equal(withNew.status, 200);

    const loginOld = await request(app).post('/api/auth/login').send({ email: customer.email, password: PASSWORD });
    assert.equal(loginOld.status, 401);
    const loginNew = await request(app).post('/api/auth/login').send({ email: customer.email, password: 'Brand9NewPass' });
    assert.equal(loginNew.status, 200);
  });

  it('logout: invalidates the token on the server', async () => {
    const { token } = await registerCustomer();
    const out = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);
    assert.equal(out.status, 200);
    const after = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(after.status, 401);
  });

  it('deactivated account: existing token and new login are both refused', async () => {
    const { token, user } = await registerCustomer();
    await User.updateOne({ _id: user.id }, { isActive: false });
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(me.status, 403);
    const login = await request(app).post('/api/auth/login').send({ email: customer.email, password: PASSWORD });
    assert.equal(login.status, 403);
  });

  it('admin login: only admins can use /auth/admin/login', async () => {
    await registerCustomer();
    await makeAdmin();
    const asCustomer = await request(app).post('/api/auth/admin/login').send({ email: customer.email, password: PASSWORD });
    assert.equal(asCustomer.status, 401);
    const asAdmin = await request(app).post('/api/auth/admin/login').send({ email: 'boss@example.com', password: 'AdminPass12345' });
    assert.equal(asAdmin.status, 200);
    assert.equal(asAdmin.body.data.user.role, 'admin');
  });

  it('authorize("admin"): customer gets 403, admin passes, no token gets 401', async () => {
    const probe = express();
    probe.get('/admin-only', authenticate, authorize('admin'), (req, res) => res.json({ ok: true }));
    probe.use(errorHandler);

    const { token } = await registerCustomer();
    const admin = await makeAdmin();

    assert.equal((await request(probe).get('/admin-only')).status, 401);
    assert.equal((await request(probe).get('/admin-only').set('Authorization', `Bearer ${token}`)).status, 403);
    assert.equal((await request(probe).get('/admin-only').set('Authorization', `Bearer ${signToken(admin)}`)).status, 200);
  });

  it('role change in the database applies immediately (token role claim is not trusted)', async () => {
    const probe = express();
    probe.get('/admin-only', authenticate, authorize('admin'), (req, res) => res.json({ ok: true }));
    probe.use(errorHandler);
    const { token, user } = await registerCustomer();
    // Forge a token that CLAIMS role admin but belongs to a customer.
    const forged = jwt.sign({ role: 'admin', tv: 0 }, process.env.JWT_SECRET, { subject: user.id, expiresIn: '1h' });
    assert.equal((await request(probe).get('/admin-only').set('Authorization', `Bearer ${forged}`)).status, 403);
    assert.ok(token);
  });
});

describe('create-admin script', { skip }, () => {
  const script = path.join(__dirname, '../src/scripts/createAdmin.js');
  const run = (extra = {}, args = []) =>
    spawnSync('node', [script, ...args], {
      env: {
        ...process.env,
        ADMIN_NAME: 'Store Owner',
        ADMIN_EMAIL: 'owner@example.com',
        ADMIN_PASSWORD: 'OwnerPass123456',
        ...extra,
      },
      encoding: 'utf8',
    });

  before(async () => {
    await connectTestDb();
    await User.init();
  });
  after(closeDb);
  beforeEach(clearDb);

  it('creates an admin who can log in; rerunning changes nothing; password is never printed', async () => {
    const first = run();
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /Admin created/);
    assert.ok(!first.stdout.includes('OwnerPass123456') && !first.stderr.includes('OwnerPass123456'));

    const login = await request(app).post('/api/auth/admin/login').send({ email: 'owner@example.com', password: 'OwnerPass123456' });
    assert.equal(login.status, 200);

    const second = run();
    assert.equal(second.status, 0);
    assert.match(second.stdout, /already exists/);
    assert.equal(await User.countDocuments({ role: 'admin' }), 1);
  });

  it('rejects a weak admin password and missing settings', () => {
    const weak = run({ ADMIN_PASSWORD: 'short1' });
    assert.equal(weak.status, 1);
    const missing = run({ ADMIN_EMAIL: '' });
    assert.equal(missing.status, 1);
  });

  it('refuses to touch an existing customer unless --promote is given', async () => {
    await registerCustomer({ ...customer, email: 'owner@example.com' });
    const refused = run();
    assert.equal(refused.status, 1);
    assert.equal((await User.findOne({ email: 'owner@example.com' })).role, 'customer');

    const promoted = run({}, ['--promote']);
    assert.equal(promoted.status, 0, promoted.stderr);
    assert.equal((await User.findOne({ email: 'owner@example.com' })).role, 'admin');
    // Password was NOT replaced by ADMIN_PASSWORD.
    const login = await request(app).post('/api/auth/login').send({ email: 'owner@example.com', password: PASSWORD });
    assert.equal(login.status, 200);
  });
});
