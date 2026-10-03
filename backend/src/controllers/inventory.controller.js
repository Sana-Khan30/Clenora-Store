const InventoryTransaction = require('../models/InventoryTransaction');
const orderService = require('../services/order.service');
const { pageMeta } = require('../services/product.service');
const { ok } = require('../utils/response');

async function listTransactions(req, res) {
  const q = req.valid.query;
  const filter = {};
  if (q.product) filter.product = q.product;
  if (q.type) filter.type = q.type;

  const [items, total] = await Promise.all([
    InventoryTransaction.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    InventoryTransaction.countDocuments(filter),
  ]);
  return ok(res, { items }, { meta: pageMeta(q, total) });
}

async function adjust(req, res) {
  const result = await orderService.adjustStock({ ...req.body, adminId: req.user._id });
  return ok(res, result, { message: 'Stock updated' });
}

module.exports = { listTransactions, adjust };
