const express = require('express');
const validate = require('../middleware/validate');
const schemas = require('../validators/catalog.validator');
const c = require('../controllers/product.controller');

const router = express.Router();
router.get('/', validate({ query: schemas.publicProductQuery }), c.listPublic);
router.get('/:idOrSlug', validate({ params: schemas.productLookup }), c.getPublic);

module.exports = router;
