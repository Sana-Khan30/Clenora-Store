const mongoose = require('mongoose');

const isWhole = { validator: (v) => Number.isInteger(v), message: '{PATH} must be a whole number' };

// Exactly one document (key: "store"). Reads fall back to defaults when it does not exist yet.
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'store' },
    storeName: { type: String, trim: true, maxlength: 60, default: 'CLENORA' },
    // Digits only, international format without "+" (e.g. 923001234567). Empty = not set.
    whatsappNumber: { type: String, trim: true, default: '', match: [/^([0-9]{8,15})?$/, 'WhatsApp number must be 8-15 digits'] },
    shippingFee: { type: Number, default: 150, min: 0, max: 100000, validate: isWhole },
    freeShippingThreshold: { type: Number, default: 1500, min: 0, max: 10000000, validate: isWhole },
    // Display only: prices are stored as whole numbers and are NOT converted when the currency changes.
    currency: { type: String, trim: true, uppercase: true, default: 'PKR', match: [/^[A-Z]{3}$/, 'Currency must be a 3-letter code'] },
    currencySymbol: { type: String, trim: true, maxlength: 6, default: 'Rs.' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);
