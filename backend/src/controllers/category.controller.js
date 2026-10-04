const Category = require('../models/Category');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/response');
const { slugify, uniqueSlug } = require('../utils/slugify');

const publicCategory = (c) => ({
  id: String(c._id),
  slug: c.slug,
  name: c.name,
  description: c.description,
  icon: c.icon,
  sortOrder: c.sortOrder,
});

const adminCategory = (c, productCount) => ({
  ...publicCategory(c),
  isActive: c.isActive,
  productCount,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

async function assertNameFree(name, excludeId) {
  const query = { $or: [{ name }, { slug: slugify(name) }] };
  if (excludeId) query._id = { $ne: excludeId };
  if (await Category.exists(query)) throw ApiError.conflict('A category with this name already exists');
}

async function listPublic(req, res) {
  const items = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
  res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
  return ok(res, { items: items.map(publicCategory) });
}

async function listAdmin(req, res) {
  const items = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
  const counts = await Promise.all(items.map((c) => Product.countDocuments({ category: c._id })));
  return ok(res, { items: items.map((c, i) => adminCategory(c, counts[i])) });
}

async function create(req, res) {
  await assertNameFree(req.body.name);
  const slug = await uniqueSlug(Category, slugify(req.body.name));
  const category = await Category.create({ ...req.body, slug });
  return created(res, { category: adminCategory(category.toObject(), 0) }, 'Category created');
}

async function update(req, res) {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');
  if (req.body.name && req.body.name !== category.name) await assertNameFree(req.body.name, category._id);
  // The slug stays the same after creation so existing links and filters keep working.
  category.set(req.body);
  await category.save();
  const count = await Product.countDocuments({ category: category._id });
  return ok(res, { category: adminCategory(category.toObject(), count) }, { message: 'Category updated' });
}

async function remove(req, res) {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');
  if (await Product.exists({ category: category._id })) {
    throw ApiError.conflict('This category still has products. Move or delete them first, or deactivate the category instead.');
  }
  await category.deleteOne();
  return ok(res, null, { message: 'Category deleted' });
}

module.exports = { listPublic, listAdmin, create, update, remove };
