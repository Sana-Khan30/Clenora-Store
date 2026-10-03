const mongoose = require('mongoose');

// One document per named sequence (used for order numbers). Incremented atomically.
const counterSchema = new mongoose.Schema({ _id: { type: String }, seq: { type: Number, default: 0 } }, { versionKey: false });

module.exports = mongoose.model('Counter', counterSchema);
