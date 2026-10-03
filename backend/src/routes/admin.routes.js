const express = require('express');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadSingleImage } = require('../middleware/upload');
const schemas = require('../validators/catalog.validator');
const category = require('../controllers/category.controller');
const product = require('../controllers/product.controller');
const upload = require('../controllers/upload.controller');
const orderSchemas = require('../validators/order.validator');
const orders = require('../controllers/order.controller');
const inventory = require('../controllers/inventory.controller');
const adminSchemas = require('../validators/admin.validator');
const settings = require('../controllers/settings.controller');
const dashboard = require('../controllers/dashboard.controller');
const customers = require('../controllers/customer.controller');

const router = express.Router();

// Every /api/admin route requires a valid token AND the admin role (enforced on the server).
router.use(authenticate, authorize('admin'));

router.get('/categories', category.listAdmin);
router.post('/categories', validate({ body: schemas.createCategory }), category.create);
router.patch('/categories/:id', validate({ params: schemas.idParam, body: schemas.updateCategory }), category.update);
router.delete('/categories/:id', validate({ params: schemas.idParam }), category.remove);

router.get('/products', validate({ query: schemas.adminProductQuery }), product.listAdmin);
router.post('/products', validate({ body: schemas.createProduct }), product.create);
router.get('/products/:id', validate({ params: schemas.idParam }), product.getAdmin);
router.patch('/products/:id', validate({ params: schemas.idParam, body: schemas.updateProduct }), product.update);
router.delete('/products/:id', validate({ params: schemas.idParam }), product.remove);

router.post('/uploads/image', uploadSingleImage, upload.uploadImage);
router.delete('/uploads/image', validate({ query: schemas.deleteUploadQuery }), upload.deleteImage);

router.get('/orders', validate({ query: orderSchemas.adminOrdersQuery }), orders.listAdmin);
router.get('/orders/:id', validate({ params: orderSchemas.idParam }), orders.getAdmin);
router.patch(
  '/orders/:id/status',
  validate({ params: orderSchemas.idParam, body: orderSchemas.statusBody }),
  orders.updateStatus
);

router.get('/inventory/transactions', validate({ query: orderSchemas.inventoryQuery }), inventory.listTransactions);
router.post('/inventory/adjust', validate({ body: orderSchemas.adjustBody }), inventory.adjust);

router.get('/dashboard', dashboard.stats);

router.get('/settings', settings.getAdmin);
router.patch('/settings', validate({ body: adminSchemas.updateSettings }), settings.update);

router.get('/customers', validate({ query: adminSchemas.customersQuery }), customers.list);
router.get('/customers/:id', validate({ params: adminSchemas.idParam }), customers.get);
router.get(
  '/customers/:id/orders',
  validate({ params: adminSchemas.idParam, query: adminSchemas.customerOrdersQuery }),
  customers.orders
);
router.patch(
  '/customers/:id/status',
  validate({ params: adminSchemas.idParam, body: adminSchemas.customerStatusBody }),
  customers.setStatus
);

module.exports = router;
