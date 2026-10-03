const mongoose = require('mongoose');

const isWhole = { validator: (v) => v == null || Number.isInteger(v), message: '{PATH} must be a whole number' };

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, maxlength: 500 },
    publicId: { type: String, maxlength: 200, default: null },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 40 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },

    // Prices are whole PKR (rupees). "price" is what the customer pays (sale price when set).
    regularPrice: { type: Number, required: true, min: 1, max: 10000000, validate: isWhole },
    salePrice: {
      type: Number,
      default: null,
      min: 1,
      validate: [
        isWhole,
        {
          validator(v) {
            return v == null || v < this.regularPrice;
          },
          message: 'Sale price must be lower than the regular price',
        },
      ],
    },
    price: { type: Number, required: true, min: 1 },

    images: {
      type: [imageSchema],
      default: [],
      validate: { validator: (v) => v.length <= 8, message: 'A product can have at most 8 images' },
    },

    stock: { type: Number, default: 0, min: 0, validate: isWhole },
    lowStockThreshold: { type: Number, default: 5, min: 0, validate: isWhole },

    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    badge: { type: String, trim: true, maxlength: 30, default: '' },
    // Entered by the admin; there is no customer review system yet.
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0, validate: isWhole },
  },
  { timestamps: true }
);

productSchema.pre('validate', function setEffectivePrice() {
  if (this.regularPrice != null) {
    this.price = this.salePrice != null ? this.salePrice : this.regularPrice;
  }
});

productSchema.index({ category: 1, isActive: 1, price: 1 });
productSchema.index({ isActive: 1, isFeatured: -1, createdAt: -1 });
productSchema.index({ stock: 1 });

module.exports = mongoose.model('Product', productSchema);
