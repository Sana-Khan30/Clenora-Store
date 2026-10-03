const express = require('express');
const validate = require('../middleware/validate');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { orderLimiter } = require('../middleware/rateLimiters');
const v = require('../validators/order.validator');
const c = require('../controllers/order.controller');

const router = express.Router();

router.post('/quote', validate({ body: v.quoteBody }), c.quote);
router.post('/', orderLimiter, optionalAuth, validate({ body: v.createOrder }), c.create);

router.get('/my', authenticate, validate({ query: v.myOrdersQuery }), c.listMine);
router.get('/my/:id', authenticate, validate({ params: v.idParam }), c.getMine);
router.post('/my/:id/cancel', authenticate, validate({ params: v.idParam }), c.cancelMine);

module.exports = router;
