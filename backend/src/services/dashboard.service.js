const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

const count = (cond) => ({ $sum: { $cond: [cond, 1, 0] } });

// Sales = money from orders that were not cancelled (placed COD orders). deliveredSales = cash actually collected.
async function getDashboard() {
  const DAY = 24 * 60 * 60 * 1000;
  const since30 = new Date(Date.now() - 30 * DAY);
  const since14 = new Date(Date.now() - 13 * DAY);
  since14.setUTCHours(0, 0, 0, 0);

  const [orderGroups, productGroups, lowStockProducts, totalCustomers, recentOrders, last30, daily] = await Promise.all([
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, sales: { $sum: '$total' } } }]),
    Product.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: count('$isActive'),
          outOfStock: count({ $eq: ['$stock', 0] }),
          lowStock: count({ $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }] }),
        },
      },
    ]),
    Product.find({ isActive: true, stock: { $gt: 0 }, $expr: { $lte: ['$stock', '$lowStockThreshold'] } })
      .sort({ stock: 1, _id: 1 })
      .limit(10)
      .select('name sku stock lowStockThreshold')
      .lean(),
    User.countDocuments({ role: 'customer' }),
    Order.find().sort({ createdAt: -1, _id: -1 }).limit(5).select('orderNumber customer.fullName total status createdAt'),
    Order.aggregate([
      { $match: { createdAt: { $gte: since30 }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, orders: { $sum: 1 }, sales: { $sum: '$total' } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: since14 }, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          sales: { $sum: '$total' },
        },
      },
    ]),
  ]);

  const byStatus = { pending: 0, confirmed: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
  let totalOrders = 0;
  let totalSales = 0;
  for (const g of orderGroups) {
    byStatus[g._id] = g.count;
    totalOrders += g.count;
    if (g._id !== 'cancelled') totalSales += g.sales;
  }
  const deliveredSales = (orderGroups.find((g) => g._id === 'delivered') || {}).sales || 0;
  const p = productGroups[0] || { total: 0, active: 0, outOfStock: 0, lowStock: 0 };
  const nonCancelled = totalOrders - byStatus.cancelled;
  const l30 = last30[0] || { orders: 0, sales: 0 };

  // One entry per day (UTC), including days without orders.
  const byDay = new Map(daily.map((d) => [d._id, d]));
  const dailySales = [];
  for (let i = 0; i < 14; i += 1) {
    const key = new Date(since14.getTime() + i * DAY).toISOString().slice(0, 10);
    const d = byDay.get(key);
    dailySales.push({ date: key, orders: d ? d.orders : 0, sales: d ? d.sales : 0 });
  }

  return {
    sales: {
      totalSales,
      deliveredSales,
      averageOrderValue: nonCancelled > 0 ? Math.round(totalSales / nonCancelled) : 0,
      last30Days: { orders: l30.orders, sales: l30.sales },
      daily: dailySales,
    },
    orders: {
      total: totalOrders,
      pending: byStatus.pending,
      inProgress: byStatus.confirmed + byStatus.processing + byStatus.shipped,
      completed: byStatus.delivered,
      cancelled: byStatus.cancelled,
      byStatus,
    },
    products: { total: p.total, active: p.active, lowStock: p.lowStock, outOfStock: p.outOfStock },
    customers: { total: totalCustomers },
    lowStockProducts: lowStockProducts.map((x) => ({
      id: String(x._id),
      name: x.name,
      sku: x.sku,
      stock: x.stock,
      lowStockThreshold: x.lowStockThreshold,
    })),
    recentOrders,
  };
}

module.exports = { getDashboard };
