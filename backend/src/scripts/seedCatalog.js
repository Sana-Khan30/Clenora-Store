// Loads your existing demo catalog (6 categories, 24 products) into MongoDB.
// Safe to run more than once: anything that already exists (same slug / SKU) is skipped.
//   npm run seed-catalog
require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const Category = require('../models/Category');
const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');
const { slugify, uniqueSlug } = require('../utils/slugify');
const catalog = require('./seedData/catalog.json');

async function main() {
  await connectDB();
  await Promise.all([Category.init(), Product.init()]);

  const categoryIds = {};
  let newCategories = 0;
  for (const c of catalog.categories) {
    let doc = await Category.findOne({ slug: c.slug });
    if (!doc) {
      doc = await Category.create(c);
      newCategories += 1;
    }
    categoryIds[c.slug] = doc._id;
  }

  let newProducts = 0;
  for (const p of catalog.products) {
    if (await Product.exists({ sku: p.sku })) continue;
    const { categorySlug, ...fields } = p;
    const product = await Product.create({
      ...fields,
      category: categoryIds[categorySlug],
      slug: await uniqueSlug(Product, slugify(p.name)),
    });
    if (product.stock > 0) {
      await InventoryTransaction.create({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        type: 'initial',
        quantityChange: product.stock,
        stockBefore: 0,
        stockAfter: product.stock,
        reason: 'Initial stock (seed)',
      });
    }
    newProducts += 1;
  }

  console.log(`Categories: ${newCategories} added, ${catalog.categories.length - newCategories} already existed.`);
  console.log(`Products:   ${newProducts} added, ${catalog.products.length - newProducts} already existed.`);
}

main()
  .then(async () => {
    await disconnectDB();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Seeding failed:', err.message);
    await disconnectDB().catch(() => {});
    process.exit(1);
  });
