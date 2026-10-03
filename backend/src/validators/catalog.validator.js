const { z } = require('zod');
const { FOLDER } = require('../services/cloudinary.service');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const blankToUndefined = (schema) => z.preprocess((v) => (v === '' ? undefined : v), schema.optional());
const boolFlag = blankToUndefined(z.enum(['true', 'false']).transform((v) => v === 'true'));
const intParam = (min, max) => z.coerce.number().int().min(min).max(max);

const idParam = z.object({ id: objectId });

// ---------- categories ----------
const categoryBase = {
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300),
  icon: z.string().trim().max(8),
  sortOrder: z.number().int().min(0).max(10000),
  isActive: z.boolean(),
};
const createCategory = z.object({
  name: categoryBase.name,
  description: categoryBase.description.optional(),
  icon: categoryBase.icon.optional(),
  sortOrder: categoryBase.sortOrder.optional(),
  isActive: categoryBase.isActive.optional(),
});
const updateCategory = createCategory
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

// ---------- products ----------
const image = z.object({
  url: z.string().max(500).refine((u) => /^https:\/\/[^\s]+$/.test(u), 'Image URL must start with https://'),
  publicId: z
    .string()
    .max(200)
    .refine((id) => id.startsWith(`${FOLDER}/`) && !id.includes('..'), 'Invalid image id')
    .nullable()
    .optional(),
});

const money = z.number().int('Must be a whole number').min(1).max(10000000);

// No .default() anywhere here: defaults live in the Mongoose model so a partial update never resets fields.
const productFields = {
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000),
  sku: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9._-]+$/, 'SKU may only contain letters, numbers, . _ -'),
  category: objectId,
  regularPrice: money,
  salePrice: money.nullable(),
  images: z.array(image).max(8),
  lowStockThreshold: z.number().int().min(0).max(100000),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  isBestSeller: z.boolean(),
  badge: z.string().trim().max(30),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().min(0).max(10000000),
};

const createProduct = z.object({
  name: productFields.name,
  sku: productFields.sku,
  category: productFields.category,
  regularPrice: productFields.regularPrice,
  salePrice: productFields.salePrice.optional(),
  description: productFields.description.optional(),
  images: productFields.images.optional(),
  lowStockThreshold: productFields.lowStockThreshold.optional(),
  isActive: productFields.isActive.optional(),
  isFeatured: productFields.isFeatured.optional(),
  isBestSeller: productFields.isBestSeller.optional(),
  badge: productFields.badge.optional(),
  rating: productFields.rating.optional(),
  reviewCount: productFields.reviewCount.optional(),
  // Initial stock can only be set here. Later changes go through inventory adjustments (stock history).
  stock: z.number().int().min(0).max(1000000).optional(),
});

const updateProduct = z
  .object(productFields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

// ---------- product queries ----------
const common = {
  search: blankToUndefined(z.string().trim().max(80)),
  minPrice: blankToUndefined(intParam(0, 10000000)),
  maxPrice: blankToUndefined(intParam(0, 10000000)),
  featured: boolFlag,
  bestSeller: boolFlag,
  onSale: boolFlag,
  inStock: boolFlag,
  minRating: blankToUndefined(z.coerce.number().min(0).max(5)),
  page: blankToUndefined(intParam(1, 100000)).transform((v) => v ?? 1),
  limit: blankToUndefined(intParam(1, 100)).transform((v) => v ?? 20),
};
const priceOrder = (v) => v.minPrice == null || v.maxPrice == null || v.minPrice <= v.maxPrice;
const priceOrderMsg = { message: 'minPrice cannot be greater than maxPrice', path: ['minPrice'] };

const publicProductQuery = z
  .object({
    ...common,
    category: blankToUndefined(z.string().trim().toLowerCase().max(80)),
    sort: blankToUndefined(z.enum(['featured', 'newest', 'price-asc', 'price-desc', 'rating', 'name'])).transform(
      (v) => v ?? 'featured'
    ),
  })
  .refine(priceOrder, priceOrderMsg);

const adminProductQuery = z
  .object({
    ...common,
    category: blankToUndefined(objectId),
    status: blankToUndefined(z.enum(['active', 'inactive', 'all'])).transform((v) => v ?? 'all'),
    stock: blankToUndefined(z.enum(['all', 'in', 'low', 'out'])).transform((v) => v ?? 'all'),
    sort: blankToUndefined(
      z.enum(['featured', 'newest', 'updated', 'price-asc', 'price-desc', 'rating', 'name', 'stock-asc'])
    ).transform((v) => v ?? 'newest'),
  })
  .refine(priceOrder, priceOrderMsg);

const productLookup = z.object({
  idOrSlug: z.string().trim().min(1).max(120),
});

const deleteUploadQuery = z.object({ publicId: z.string().min(1).max(200) });

module.exports = {
  idParam,
  createCategory,
  updateCategory,
  createProduct,
  updateProduct,
  publicProductQuery,
  adminProductQuery,
  productLookup,
  deleteUploadQuery,
};
