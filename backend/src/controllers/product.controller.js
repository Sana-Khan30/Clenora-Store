const Category = require('../models/Category');
const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');
const cloudinaryService = require('../services/cloudinary.service');
const { publicProduct, adminProduct, listProducts, pageMeta } = require('../services/product.service');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/response');
const { slugify, uniqueSlug } = require('../utils/slugify');

const OBJECT_ID = /^[a-f\d]{24}$/i;

async function assertCategoryExists(id) {
  if (!(await Category.exists({ _id: id }))) throw ApiError.badRequest('Category not found');
}

// ---------- public ----------
async function listPublic(req, res) {
  const q = req.valid.query;
  const { items, total } = await listProducts(q);
  return ok(res, { items: items.map(publicProduct) }, { meta: pageMeta(q, total) });
}

async function getPublic(req, res) {
  const { idOrSlug } = req.valid.params;
  const where = OBJECT_ID.test(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug.toLowerCase() };
  const product = await Product.findOne({ ...where, isActive: true }).populate('category', 'name slug isActive').lean();
  if (!product || !product.category || !product.category.isActive) throw ApiError.notFound('Product not found');
  return ok(res, { product: publicProduct(product) });
}

// ---------- admin ----------
async function listAdmin(req, res) {
  const q = req.valid.query;
  const { items, total } = await listProducts(q, { admin: true });
  return ok(res, { items: items.map(adminProduct) }, { meta: pageMeta(q, total) });
}

async function loadAdminProduct(id) {
  const product = await Product.findById(id).populate('category', 'name slug').lean();
  if (!product) throw ApiError.notFound('Product not found');
  return product;
}

async function getAdmin(req, res) {
  return ok(res, { product: adminProduct(await loadAdminProduct(req.params.id)) });
}

async function create(req, res) {
  await assertCategoryExists(req.body.category);
  const { stock = 0, ...fields } = req.body;
  const slug = await uniqueSlug(Product, slugify(fields.name));

  const product = await Product.create({ ...fields, slug, stock });

  if (stock > 0) {
    await InventoryTransaction.create({
      product: product._id,
      productName: product.name,
      sku: product.sku,
      type: 'initial',
      quantityChange: stock,
      stockBefore: 0,
      stockAfter: stock,
      reason: 'Initial stock',
      performedBy: req.user._id,
    });
  }
  return created(res, { product: adminProduct(await loadAdminProduct(product._id)) }, 'Product created');
}

async function update(req, res) {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  if (req.body.category) await assertCategoryExists(req.body.category);

  const before = product.images.map((i) => i.publicId).filter(Boolean);
  product.set(req.body); // stock is not part of the update schema; it only changes through inventory adjustments
  await product.save();

  if (req.body.images) {
    const after = new Set(product.images.map((i) => i.publicId).filter(Boolean));
    await Promise.all(before.filter((id) => !after.has(id)).map((id) => cloudinaryService.deleteImage(id)));
  }
  return ok(res, { product: adminProduct(await loadAdminProduct(product._id)) }, { message: 'Product updated' });
}

async function remove(req, res) {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  const imageIds = product.images.map((i) => i.publicId).filter(Boolean);
  await product.deleteOne();
  await Promise.all(imageIds.map((id) => cloudinaryService.deleteImage(id)));
  return ok(res, null, { message: 'Product deleted' });
}

module.exports = { listPublic, getPublic, listAdmin, getAdmin, create, update, remove };
