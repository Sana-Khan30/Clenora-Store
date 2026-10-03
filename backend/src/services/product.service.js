const Category = require('../models/Category');
const Product = require('../models/Product');
const escapeRegex = require('../utils/escapeRegex');

const SORTS = {
  featured: { isFeatured: -1, isBestSeller: -1, createdAt: -1, _id: 1 },
  newest: { createdAt: -1, _id: 1 },
  updated: { updatedAt: -1, _id: 1 },
  'price-asc': { price: 1, _id: 1 },
  'price-desc': { price: -1, _id: 1 },
  rating: { rating: -1, reviewCount: -1, _id: 1 },
  name: { name: 1, _id: 1 },
  'stock-asc': { stock: 1, _id: 1 },
};

const isOnSale = (p) => p.salePrice != null && p.salePrice < p.regularPrice;

// Shape used by the customer website. Keeps the field names the React components already use.
function publicProduct(p) {
  const images = (p.images || []).map((i) => i.url);
  return {
    id: String(p._id),
    slug: p.slug,
    name: p.name,
    description: p.description,
    category: (p.category && p.category.name) || '',
    categorySlug: (p.category && p.category.slug) || '',
    price: p.price,
    oldPrice: isOnSale(p) ? p.regularPrice : null,
    images,
    image: images[0] || null,
    badge: p.badge || '',
    featured: p.isFeatured,
    bestSeller: p.isBestSeller,
    rating: p.rating,
    reviews: p.reviewCount,
    inStock: p.stock > 0,
    lowStock: p.stock > 0 && p.stock <= p.lowStockThreshold,
    createdAt: p.createdAt,
  };
}

// Shape used by the admin panel (includes stock, SKU, raw prices, image ids).
function adminProduct(p) {
  const cat = p.category && p.category._id ? p.category : null;
  return {
    id: String(p._id),
    slug: p.slug,
    name: p.name,
    description: p.description,
    sku: p.sku,
    category: cat ? { id: String(cat._id), name: cat.name, slug: cat.slug } : { id: String(p.category) },
    regularPrice: p.regularPrice,
    salePrice: p.salePrice,
    price: p.price,
    images: (p.images || []).map((i) => ({ url: i.url, publicId: i.publicId || null })),
    stock: p.stock,
    lowStockThreshold: p.lowStockThreshold,
    stockStatus: p.stock === 0 ? 'out' : p.stock <= p.lowStockThreshold ? 'low' : 'in',
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    isBestSeller: p.isBestSeller,
    badge: p.badge || '',
    rating: p.rating,
    reviewCount: p.reviewCount,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// Builds the MongoDB filter and runs the query. Only called with already-validated input.
async function listProducts(q, { admin = false } = {}) {
  const filter = {};
  const empty = { items: [], total: 0 };

  if (admin) {
    if (q.status === 'active') filter.isActive = true;
    if (q.status === 'inactive') filter.isActive = false;
    if (q.category) filter.category = q.category;
  } else {
    filter.isActive = true;
    if (q.category) {
      const cat = await Category.findOne({ slug: q.category, isActive: true }).select('_id').lean();
      if (!cat) return empty;
      filter.category = cat._id;
    } else {
      // Products in a hidden (inactive) category are hidden too.
      const active = await Category.find({ isActive: true }).select('_id').lean();
      filter.category = { $in: active.map((c) => c._id) };
    }
  }

  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    const cats = await Category.find({ name: rx }).select('_id').lean();
    const or = [{ name: rx }, { description: rx }];
    if (admin) or.push({ sku: rx });
    if (cats.length) or.push({ category: { $in: cats.map((c) => c._id) } });
    filter.$or = or;
  }

  if (q.minPrice != null || q.maxPrice != null) {
    filter.price = {};
    if (q.minPrice != null) filter.price.$gte = q.minPrice;
    if (q.maxPrice != null) filter.price.$lte = q.maxPrice;
  }
  if (q.featured) filter.isFeatured = true;
  if (q.bestSeller) filter.isBestSeller = true;
  if (q.onSale) filter.salePrice = { $ne: null };
  if (q.minRating != null) filter.rating = { $gte: q.minRating };
  if (q.inStock) filter.stock = { $gt: 0 };

  if (admin) {
    if (q.stock === 'in') filter.stock = { $gt: 0 };
    if (q.stock === 'out') filter.stock = 0;
    if (q.stock === 'low') {
      filter.stock = { $gt: 0 };
      filter.$expr = { $lte: ['$stock', '$lowStockThreshold'] };
    }
  }

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort(SORTS[q.sort])
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate('category', 'name slug')
      .lean(),
    Product.countDocuments(filter),
  ]);
  return { items, total };
}

function pageMeta(q, total) {
  return { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) };
}

module.exports = { publicProduct, adminProduct, listProducts, pageMeta };
