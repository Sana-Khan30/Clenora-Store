const { hasTestDb } = require('./helpers/testEnv');
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const request = require('supertest');

const { connectTestDb, clearDb, closeDb } = require('./helpers/db');
const app = require('../src/app');
const User = require('../src/models/User');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const InventoryTransaction = require('../src/models/InventoryTransaction');
const cloudinaryService = require('../src/services/cloudinary.service');
const { hashPassword, signToken } = require('../src/services/auth.service');

const skip = hasTestDb ? false : 'TEST_MONGODB_URI is not set';
const realUpload = cloudinaryService.uploadImageBuffer;
const realDelete = cloudinaryService.deleteImage;
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
const FAKE_ID = '64b64b64b64b64b64b64b64b';

let admin;
let customer;
let counter = 0;
let uploadCalls;
let deleteCalls;

const auth = (t) => ({ Authorization: `Bearer ${t}` });
const asAdmin = (req) => req.set(auth(admin));

async function makeUser(role, email) {
  const user = await User.create({ name: 'Test User', email, password: await hashPassword('Passw0rdPassw0rd'), role });
  return signToken(user);
}
async function mkCategory(name, extra = {}) {
  counter += 1;
  return Category.create({ name, slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${counter}`.replace(/-\d+$/, ''), ...extra });
}
async function mkProduct(category, o = {}) {
  counter += 1;
  const regularPrice = o.regularPrice ?? 1000;
  return Product.create({
    name: `Product ${counter}`,
    slug: `product-${counter}`,
    sku: `SKU-${counter}`,
    category: category._id,
    regularPrice,
    stock: 10,
    ...o,
  });
}
const body = (cat, o = {}) => ({ name: 'Floor Cleaner', sku: 'fc-001', category: String(cat._id), regularPrice: 1000, salePrice: 800, stock: 10, ...o });

describe('catalog', { skip }, () => {
  before(async () => {
    await connectTestDb();
    await Promise.all([User.init(), Category.init(), Product.init()]);
  });
  after(async () => {
    cloudinaryService.uploadImageBuffer = realUpload;
    cloudinaryService.deleteImage = realDelete;
    await closeDb();
  });
  beforeEach(async () => {
    await clearDb();
    uploadCalls = 0;
    deleteCalls = [];
    cloudinaryService.uploadImageBuffer = async () => {
      uploadCalls += 1;
      return { url: 'https://res.cloudinary.com/demo/image/upload/v1/clenora/products/abc.png', publicId: 'clenora/products/abc' };
    };
    cloudinaryService.deleteImage = async (id) => {
      deleteCalls.push(id);
      return true;
    };
    admin = await makeUser('admin', 'admin@example.com');
    customer = await makeUser('customer', 'cust@example.com');
  });

  // ---------------------------------------------------------------- public API
  describe('public categories and products', () => {
    it('lists only active categories, sorted', async () => {
      await mkCategory('Zeta', { sortOrder: 2 });
      await mkCategory('Alpha', { sortOrder: 1 });
      await mkCategory('Hidden', { isActive: false });
      const res = await request(app).get('/api/categories');
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.data.items.map((c) => c.name), ['Alpha', 'Zeta']);
      assert.equal(res.body.data.items[0].isActive, undefined);
    });

    it('lists active products only, hides inactive products and inactive categories, never leaks SKU/stock', async () => {
      const cat = await mkCategory('Kitchen');
      const hiddenCat = await mkCategory('Secret', { isActive: false });
      await mkProduct(cat, { name: 'Visible', salePrice: 800, regularPrice: 1000, stock: 3, lowStockThreshold: 5 });
      await mkProduct(cat, { name: 'Inactive', isActive: false });
      await mkProduct(hiddenCat, { name: 'In hidden category' });
      const res = await request(app).get('/api/products');
      assert.equal(res.status, 200);
      assert.equal(res.body.meta.total, 1);
      const p = res.body.data.items[0];
      assert.equal(p.name, 'Visible');
      assert.equal(p.price, 800);
      assert.equal(p.oldPrice, 1000);
      assert.equal(p.category, 'Kitchen');
      assert.equal(p.inStock, true);
      assert.equal(p.lowStock, true);
      for (const secret of ['sku', 'stock', 'regularPrice', 'salePrice', 'isActive', 'lowStockThreshold']) {
        assert.equal(p[secret], undefined, `${secret} must not be public`);
      }
    });

    it('product without sale has oldPrice null; zero stock is out of stock', async () => {
      const cat = await mkCategory('Laundry');
      await mkProduct(cat, { regularPrice: 500, stock: 0 });
      const p = (await request(app).get('/api/products')).body.data.items[0];
      assert.equal(p.price, 500);
      assert.equal(p.oldPrice, null);
      assert.equal(p.inStock, false);
    });

    it('searches name, description and category name; regex characters are harmless', async () => {
      const kitchen = await mkCategory('Kitchen');
      const bath = await mkCategory('Bathroom');
      await mkProduct(kitchen, { name: 'Grease Remover', description: 'cuts oil fast' });
      await mkProduct(bath, { name: 'Tile Shine', description: 'sparkle' });
      const names = async (q) => (await request(app).get('/api/products').query({ search: q })).body.data.items.map((p) => p.name);
      assert.deepEqual(await names('grease'), ['Grease Remover']);
      assert.deepEqual(await names('SPARK'), ['Tile Shine']);
      assert.deepEqual(await names('bathroom'), ['Tile Shine']);
      const weird = await request(app).get('/api/products').query({ search: '(.*[' });
      assert.equal(weird.status, 200);
      assert.equal(weird.body.meta.total, 0);
      assert.equal((await request(app).get('/api/products?search=')).body.meta.total, 2);
    });

    it('filters by category slug, price range, stock, sale, featured, rating', async () => {
      const kitchen = await mkCategory('Kitchen');
      const bath = await mkCategory('Bathroom');
      await mkProduct(kitchen, { name: 'Item A', regularPrice: 300, stock: 0 });
      await mkProduct(kitchen, { name: 'Item B', regularPrice: 900, salePrice: 700, isFeatured: true, rating: 4.5 });
      await mkProduct(bath, { name: 'Item C', regularPrice: 1500, rating: 3 });
      const q = async (params) => (await request(app).get('/api/products').query(params)).body.data.items.map((p) => p.name).sort();
      assert.deepEqual(await q({ category: kitchen.slug }), ['Item A', 'Item B']);
      assert.deepEqual(await q({ category: 'does-not-exist' }), []);
      assert.deepEqual(await q({ minPrice: 500, maxPrice: 1000 }), ['Item B']);
      assert.deepEqual(await q({ inStock: 'true' }), ['Item B', 'Item C']);
      assert.deepEqual(await q({ onSale: 'true' }), ['Item B']);
      assert.deepEqual(await q({ featured: 'true' }), ['Item B']);
      assert.deepEqual(await q({ minRating: 4 }), ['Item B']);
    });

    it('sorts by price both ways', async () => {
      const cat = await mkCategory('Kitchen');
      await mkProduct(cat, { name: 'Mid', regularPrice: 500 });
      await mkProduct(cat, { name: 'Low', regularPrice: 100 });
      await mkProduct(cat, { name: 'High', regularPrice: 900 });
      const order = async (sort) => (await request(app).get('/api/products').query({ sort })).body.data.items.map((p) => p.name);
      assert.deepEqual(await order('price-asc'), ['Low', 'Mid', 'High']);
      assert.deepEqual(await order('price-desc'), ['High', 'Mid', 'Low']);
    });

    it('paginates with stable, non-overlapping pages and correct meta', async () => {
      const cat = await mkCategory('Kitchen');
      for (let i = 0; i < 7; i += 1) await mkProduct(cat, { regularPrice: 100 + i });
      const p1 = await request(app).get('/api/products?limit=3&page=1&sort=price-asc');
      const p2 = await request(app).get('/api/products?limit=3&page=2&sort=price-asc');
      const p3 = await request(app).get('/api/products?limit=3&page=3&sort=price-asc');
      assert.deepEqual(p1.body.meta, { page: 1, limit: 3, total: 7, totalPages: 3 });
      const ids = [...p1.body.data.items, ...p2.body.data.items, ...p3.body.data.items].map((p) => p.id);
      assert.equal(ids.length, 7);
      assert.equal(new Set(ids).size, 7);
      assert.equal(p3.body.data.items.length, 1);
    });

    it('rejects bad query values', async () => {
      for (const qs of ['limit=101', 'limit=0', 'page=0', 'page=abc', 'sort=bogus', 'minPrice=900&maxPrice=100', 'inStock=maybe', 'minRating=9', 'page=1&page=2']) {
        const res = await request(app).get(`/api/products?${qs}`);
        assert.equal(res.status, 400, qs);
      }
    });

    it('operator-injection in the query string does not change results or crash', async () => {
      const cat = await mkCategory('Kitchen');
      await mkProduct(cat);
      const res = await request(app).get('/api/products?search[$ne]=x&category[$gt]=');
      assert.ok([200, 400].includes(res.status));
      if (res.status === 200) assert.equal(res.body.meta.total, 1);
    });

    it('gets one product by id or slug; hides inactive, unknown, and hidden-category products', async () => {
      const cat = await mkCategory('Kitchen');
      const hiddenCat = await mkCategory('Secret', { isActive: false });
      const p = await mkProduct(cat, { name: 'Findable' });
      const inactive = await mkProduct(cat, { isActive: false });
      const hidden = await mkProduct(hiddenCat);
      assert.equal((await request(app).get(`/api/products/${p.id}`)).body.data.product.name, 'Findable');
      assert.equal((await request(app).get(`/api/products/${p.slug}`)).status, 200);
      assert.equal((await request(app).get(`/api/products/${inactive.id}`)).status, 404);
      assert.equal((await request(app).get(`/api/products/${hidden.id}`)).status, 404);
      assert.equal((await request(app).get('/api/products/no-such-slug')).status, 404);
      assert.equal((await request(app).get(`/api/products/${FAKE_ID}`)).status, 404);
    });
  });

  // ---------------------------------------------------------------- admin access
  describe('admin authorization', () => {
    it('every admin endpoint: 401 without token, 403 for a customer', async () => {
      const routes = [
        ['get', '/api/admin/categories'],
        ['post', '/api/admin/categories'],
        ['patch', `/api/admin/categories/${FAKE_ID}`],
        ['delete', `/api/admin/categories/${FAKE_ID}`],
        ['get', '/api/admin/products'],
        ['post', '/api/admin/products'],
        ['get', `/api/admin/products/${FAKE_ID}`],
        ['patch', `/api/admin/products/${FAKE_ID}`],
        ['delete', `/api/admin/products/${FAKE_ID}`],
        ['post', '/api/admin/uploads/image'],
        ['delete', '/api/admin/uploads/image?publicId=clenora/products/x'],
      ];
      for (const [method, url] of routes) {
        const anon = await request(app)[method](url).send({});
        assert.equal(anon.status, 401, `${method} ${url} anonymous`);
        const cust = await request(app)[method](url).set(auth(customer)).send({});
        assert.equal(cust.status, 403, `${method} ${url} customer`);
      }
      assert.equal(uploadCalls, 0);
    });
  });

  // ---------------------------------------------------------------- admin categories
  describe('admin categories', () => {
    it('create / duplicate / update / delete rules', async () => {
      const created = await asAdmin(request(app).post('/api/admin/categories')).send({ name: 'Floor Care', icon: '🧹', sortOrder: 1 });
      assert.equal(created.status, 201);
      const c = created.body.data.category;
      assert.equal(c.slug, 'floor-care');
      assert.equal(c.productCount, 0);

      const dup = await asAdmin(request(app).post('/api/admin/categories')).send({ name: 'floor  care' });
      assert.equal(dup.status, 409);
      const dupExact = await asAdmin(request(app).post('/api/admin/categories')).send({ name: 'Floor Care' });
      assert.equal(dupExact.status, 409);

      const other = (await asAdmin(request(app).post('/api/admin/categories')).send({ name: 'Kitchen' })).body.data.category;
      const clash = await asAdmin(request(app).patch(`/api/admin/categories/${other.id}`)).send({ name: 'Floor Care' });
      assert.equal(clash.status, 409);

      const upd = await asAdmin(request(app).patch(`/api/admin/categories/${c.id}`)).send({ name: 'Floors', isActive: false });
      assert.equal(upd.status, 200);
      assert.equal(upd.body.data.category.slug, 'floor-care');
      assert.equal(upd.body.data.category.isActive, false);

      assert.equal((await asAdmin(request(app).patch(`/api/admin/categories/${c.id}`)).send({})).status, 400);
      assert.equal((await asAdmin(request(app).post('/api/admin/categories')).send({ name: 'x' })).status, 400);

      const catDoc = await Category.findById(other.id);
      await mkProduct(catDoc);
      const blocked = await asAdmin(request(app).delete(`/api/admin/categories/${other.id}`));
      assert.equal(blocked.status, 409);
      assert.equal((await asAdmin(request(app).delete(`/api/admin/categories/${c.id}`))).status, 200);
      assert.equal((await asAdmin(request(app).delete(`/api/admin/categories/${c.id}`))).status, 404);

      const list = await asAdmin(request(app).get('/api/admin/categories'));
      const kitchen = list.body.data.items.find((x) => x.name === 'Kitchen');
      assert.equal(kitchen.productCount, 1);
    });
  });

  // ---------------------------------------------------------------- admin products
  describe('admin products', () => {
    it('creates a product: slug, uppercase SKU, effective price, initial stock history; shows up on the public site', async () => {
      const cat = await mkCategory('Floor Care');
      const res = await asAdmin(request(app).post('/api/admin/products')).send(body(cat));
      assert.equal(res.status, 201, JSON.stringify(res.body));
      const p = res.body.data.product;
      assert.equal(p.slug, 'floor-cleaner');
      assert.equal(p.sku, 'FC-001');
      assert.equal(p.price, 800);
      assert.equal(p.stock, 10);
      assert.equal(p.category.name, 'Floor Care');

      const tx = await InventoryTransaction.find({ product: p.id });
      assert.equal(tx.length, 1);
      assert.equal(tx[0].type, 'initial');
      assert.equal(tx[0].stockAfter, 10);
      assert.equal(String(tx[0].performedBy) !== 'null', true);

      const second = await asAdmin(request(app).post('/api/admin/products')).send(body(cat, { sku: 'FC-002' }));
      assert.equal(second.body.data.product.slug, 'floor-cleaner-2');

      const pub = await request(app).get('/api/products');
      assert.equal(pub.body.meta.total, 2);
      assert.equal(pub.body.data.items.find((x) => x.slug === 'floor-cleaner').oldPrice, 1000);
    });

    it('rejects bad input: duplicate SKU, sale >= regular, decimals, bad/unknown category, bad images', async () => {
      const cat = await mkCategory('Floor Care');
      assert.equal((await asAdmin(request(app).post('/api/admin/products')).send(body(cat))).status, 201);
      const post = (o) => asAdmin(request(app).post('/api/admin/products')).send(body(cat, { name: 'Other', sku: 'NEW-1', ...o }));

      assert.equal((await asAdmin(request(app).post('/api/admin/products')).send(body(cat, { name: 'Other', sku: 'Fc-001' }))).status, 409);
      assert.equal((await post({ salePrice: 1000 })).status, 400);
      assert.equal((await post({ salePrice: 1200 })).status, 400);
      assert.equal((await post({ regularPrice: 99.5, salePrice: null })).status, 400);
      assert.equal((await post({ regularPrice: -5, salePrice: null })).status, 400);
      assert.equal((await post({ stock: -1 })).status, 400);
      assert.equal((await post({ stock: 2.5 })).status, 400);
      assert.equal((await post({ category: 'not-an-id' })).status, 400);
      const unknownCat = await post({ category: FAKE_ID });
      assert.equal(unknownCat.status, 400);
      assert.match(unknownCat.body.message, /Category not found/);
      assert.equal((await post({ images: [{ url: 'http://insecure.example/a.png' }] })).status, 400);
      assert.equal((await post({ images: [{ url: 'https://x.example/a.png', publicId: 'someone-else/folder/a' }] })).status, 400);
      const nine = Array.from({ length: 9 }, (_, i) => ({ url: `https://x.example/${i}.png` }));
      assert.equal((await post({ images: nine })).status, 400);
      assert.equal(await Product.countDocuments(), 1);
    });

    it('update: ignores stock/price/slug from the client, recalculates the effective price', async () => {
      const cat = await mkCategory('Floor Care');
      const p = (await asAdmin(request(app).post('/api/admin/products')).send(body(cat))).body.data.product;

      const res = await asAdmin(request(app).patch(`/api/admin/products/${p.id}`)).send({ name: 'Renamed', stock: 999, price: 1, slug: 'hacked' });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.product.name, 'Renamed');
      assert.equal(res.body.data.product.stock, 10);
      assert.equal(res.body.data.product.price, 800);
      assert.equal(res.body.data.product.slug, 'floor-cleaner');

      const noSale = await asAdmin(request(app).patch(`/api/admin/products/${p.id}`)).send({ salePrice: null });
      assert.equal(noSale.body.data.product.price, 1000);
      assert.equal(noSale.body.data.product.salePrice, null);

      const sale = await asAdmin(request(app).patch(`/api/admin/products/${p.id}`)).send({ salePrice: 700 });
      assert.equal(sale.body.data.product.price, 700);

      const bad = await asAdmin(request(app).patch(`/api/admin/products/${p.id}`)).send({ regularPrice: 600 });
      assert.equal(bad.status, 400);
      assert.equal((await Product.findById(p.id)).regularPrice, 1000);

      assert.equal((await asAdmin(request(app).patch(`/api/admin/products/${p.id}`)).send({})).status, 400);
      assert.equal((await asAdmin(request(app).patch(`/api/admin/products/${FAKE_ID}`)).send({ name: 'Nope' })).status, 404);
    });

    it('removing an image deletes it from Cloudinary; images without a managed id are left alone', async () => {
      const cat = await mkCategory('Floor Care');
      const images = [
        { url: 'https://res.cloudinary.com/demo/a.png', publicId: 'clenora/products/a' },
        { url: 'https://res.cloudinary.com/demo/b.png', publicId: 'clenora/products/b' },
        { url: 'https://images.example/external.png' },
      ];
      const p = (await asAdmin(request(app).post('/api/admin/products')).send(body(cat, { images }))).body.data.product;
      assert.equal(p.images.length, 3);
      const res = await asAdmin(request(app).patch(`/api/admin/products/${p.id}`)).send({ images: [images[1], images[2]] });
      assert.equal(res.status, 200);
      assert.deepEqual(deleteCalls, ['clenora/products/a']);
    });

    it('deactivating hides the product publicly but not in the admin list', async () => {
      const cat = await mkCategory('Floor Care');
      const p = (await asAdmin(request(app).post('/api/admin/products')).send(body(cat))).body.data.product;
      await asAdmin(request(app).patch(`/api/admin/products/${p.id}`)).send({ isActive: false });
      assert.equal((await request(app).get('/api/products')).body.meta.total, 0);
      const adminList = await asAdmin(request(app).get('/api/admin/products?status=inactive'));
      assert.equal(adminList.body.meta.total, 1);
      assert.equal((await asAdmin(request(app).get('/api/admin/products?status=active'))).body.meta.total, 0);
    });

    it('delete removes the product and its managed images but keeps stock history', async () => {
      const cat = await mkCategory('Floor Care');
      const p = (
        await asAdmin(request(app).post('/api/admin/products')).send(
          body(cat, { images: [{ url: 'https://res.cloudinary.com/demo/a.png', publicId: 'clenora/products/a' }] })
        )
      ).body.data.product;
      assert.equal((await asAdmin(request(app).delete(`/api/admin/products/${p.id}`))).status, 200);
      assert.equal((await asAdmin(request(app).get(`/api/admin/products/${p.id}`))).status, 404);
      assert.deepEqual(deleteCalls, ['clenora/products/a']);
      assert.equal(await InventoryTransaction.countDocuments({ product: p.id }), 1);
      assert.equal((await asAdmin(request(app).delete(`/api/admin/products/${p.id}`))).status, 404);
    });

    it('admin list: search by SKU, stock filters (low/out/in), includes stock data', async (t) => {
      const cat = await mkCategory('Kitchen');
      await mkProduct(cat, { name: 'Plenty', sku: 'AAA-1', stock: 50, lowStockThreshold: 5 });
      await mkProduct(cat, { name: 'Running low', sku: 'BBB-2', stock: 3, lowStockThreshold: 5 });
      await mkProduct(cat, { name: 'Gone', sku: 'CCC-3', stock: 0, lowStockThreshold: 5 });
      const names = async (qs) => (await asAdmin(request(app).get(`/api/admin/products?${qs}`))).body.data.items.map((p) => p.name).sort();
      assert.deepEqual(await names('search=bbb'), ['Running low']);
      // "low" compares two fields ($expr). Real MongoDB/Atlas supports it; the local FerretDB test server does not.
      const supportsExpr = await Product.countDocuments({ $expr: { $lte: ['$stock', '$lowStockThreshold'] } }).then(() => true, () => false);
      if (supportsExpr) assert.deepEqual(await names('stock=low'), ['Running low']);
      else t.diagnostic('stock=low NOT verified: this test database does not support $expr. Run the tests against Atlas.');
      assert.deepEqual(await names('stock=out'), ['Gone']);
      assert.deepEqual(await names('stock=in'), ['Plenty', 'Running low']);
      const first = (await asAdmin(request(app).get('/api/admin/products?search=ccc'))).body.data.items[0];
      assert.equal(first.stock, 0);
      assert.equal(first.stockStatus, 'out');
      assert.equal((await asAdmin(request(app).get('/api/admin/products?stock=weird'))).status, 400);
    });

    it('the database refuses negative stock', async () => {
      const cat = await mkCategory('Kitchen');
      await assert.rejects(mkProduct(cat, { stock: -1 }), /stock/);
    });
  });

  // ---------------------------------------------------------------- uploads
  describe('image upload', () => {
    const send = (buf, opts) => asAdmin(request(app).post('/api/admin/uploads/image')).attach('image', buf, opts);

    it('accepts a real PNG and returns url + publicId', async () => {
      const res = await send(PNG, { filename: 'a.png', contentType: 'image/png' });
      assert.equal(res.status, 201, JSON.stringify(res.body));
      assert.equal(res.body.data.image.publicId, 'clenora/products/abc');
      assert.equal(uploadCalls, 1);
    });

    it('rejects: no file, wrong type, fake image content, oversized file', async () => {
      const none = await asAdmin(request(app).post('/api/admin/uploads/image'));
      assert.equal(none.status, 400);
      const text = await send(Buffer.from('hello world, not an image'), { filename: 'a.txt', contentType: 'text/plain' });
      assert.equal(text.status, 400);
      const fake = await send(Buffer.from('this is plain text pretending to be a png'), { filename: 'a.png', contentType: 'image/png' });
      assert.equal(fake.status, 400);
      const big = Buffer.alloc(6 * 1024 * 1024, 1);
      PNG.copy(big);
      const huge = await send(big, { filename: 'big.png', contentType: 'image/png' });
      assert.equal(huge.status, 413);
      assert.equal(uploadCalls, 0);
    });

    it('returns 503 when Cloudinary is not configured', async () => {
      cloudinaryService.uploadImageBuffer = realUpload;
      const log = console.error;
      console.error = () => {};
      try {
        const res = await send(PNG, { filename: 'a.png', contentType: 'image/png' });
        assert.equal(res.status, 503);
      } finally {
        console.error = log;
      }
    });

    it('delete endpoint only accepts images in the managed folder', async () => {
      const foreign = await asAdmin(request(app).delete('/api/admin/uploads/image')).query({ publicId: 'other/folder/x' });
      assert.equal(foreign.status, 400);
      const traversal = await asAdmin(request(app).delete('/api/admin/uploads/image')).query({ publicId: 'clenora/products/../../x' });
      assert.equal(traversal.status, 400);
      const ok = await asAdmin(request(app).delete('/api/admin/uploads/image')).query({ publicId: 'clenora/products/abc' });
      assert.equal(ok.status, 200);
      assert.deepEqual(deleteCalls, ['clenora/products/abc']);
      assert.equal(await realDelete('other/folder/x'), false);
    });
  });

  // ---------------------------------------------------------------- seed
  describe('seed-catalog script', () => {
    it('loads 6 categories and 24 products with stock history; running twice adds nothing', async () => {
      const script = path.join(__dirname, '../src/scripts/seedCatalog.js');
      const run = () => spawnSync('node', [script], { env: { ...process.env }, encoding: 'utf8' });
      const first = run();
      assert.equal(first.status, 0, first.stderr);
      assert.equal(await Category.countDocuments(), 6);
      assert.equal(await Product.countDocuments(), 24);
      assert.equal(await InventoryTransaction.countDocuments({ type: 'initial' }), 24);
      const second = run();
      assert.equal(second.status, 0, second.stderr);
      assert.match(second.stdout, /Products:\s+0 added, 24 already existed/);
      assert.equal(await Product.countDocuments(), 24);

      const pub = await request(app).get('/api/products?limit=100');
      assert.equal(pub.body.meta.total, 24);
      assert.ok(pub.body.data.items.every((p) => p.image && p.price > 0));
      const cats = await request(app).get('/api/categories');
      assert.equal(cats.body.data.items.length, 6);
      assert.ok(cats.body.data.items.every((c) => c.icon));
    });
  });
});
