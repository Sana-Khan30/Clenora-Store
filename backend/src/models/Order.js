const mongoose = require('mongoose');

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
// Add 'card' / gateway names here when a real payment gateway is integrated later.
const PAYMENT_METHODS = ['cod'];

const itemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    // Snapshots: later edits to the product never change a placed order.
    name: { type: String, required: true },
    sku: { type: String, required: true },
    image: { type: String, default: '' },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const historySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    note: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = guest checkout
    customer: {
      fullName: { type: String, required: true, trim: true, maxlength: 80 },
      phone: { type: String, required: true, trim: true, maxlength: 20 },
      email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
      city: { type: String, required: true, trim: true, maxlength: 60 },
      address: { type: String, required: true, trim: true, maxlength: 250 },
      notes: { type: String, trim: true, maxlength: 500, default: '' },
    },
    items: { type: [itemSchema], validate: { validator: (v) => v.length > 0, message: 'An order needs at least one item' } },
    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'cod' },
    paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending' },
    statusHistory: { type: [historySchema], default: [] },
    // Set to true in the same atomic update that cancels the order: guarantees stock is restored only once.
    stockRestored: { type: Boolean, default: false },
    cancelledAt: { type: Date },
    cancelledBy: { type: String, enum: ['customer', 'admin'] },
    deliveredAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.stockRestored;
        return ret;
      },
    },
  }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'customer.phone': 1 });

module.exports = mongoose.model('Order', orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
