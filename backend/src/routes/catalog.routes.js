const express = require('express');
const validate = require('../middleware/validate');
const v = require('../validators/catalog.validator');
const categories = require('../controllers/category.controller');
const products = require('../controllers/product.controller');

// Public (no login): only active data is returned.
const router = express.Router();

router.get('/categories', categories.listPublic);
router.get('/products', validate({ query: v.publicProductQuery }), products.listPublic);
router.get('/products/:idOrSlug', validate({ params: v.slugOrIdParam }), products.getPublic);

module.exports = router;
