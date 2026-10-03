const mongoose = require('mongoose');

// Append-only stock history. Phase 5 adds sale / cancellation / adjustment entries.
const inventoryTransactionSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    type: {
      type: String,
      enum: ['initial', 'adjustment', 'sale', 'cancellation', 'correction'],
      required: true,
    },
    quantityChange: { type: Number, required: true },
    stockBefore: { type: Number, required: true, min: 0 },
    stockAfter: { type: Number, required: true, min: 0 },
    reason: { type: String, trim: true, maxlength: 200, default: '' },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

inventoryTransactionSchema.index({ product: 1, createdAt: -1 });
inventoryTransactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
