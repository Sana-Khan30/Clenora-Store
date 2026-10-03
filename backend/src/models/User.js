const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, maxlength: 30, default: 'Home' },
    fullName: { type: String, trim: true, required: true, maxlength: 80 },
    phone: { type: String, trim: true, required: true, maxlength: 20 },
    city: { type: String, trim: true, required: true, maxlength: 60 },
    address: { type: String, trim: true, required: true, maxlength: 250 },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    password: { type: String, required: true, select: false },
    phone: { type: String, trim: true, maxlength: 20, default: '' },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer', index: true },
    isActive: { type: Boolean, default: true },
    addresses: { type: [addressSchema], default: [] },
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.password;
        delete ret.tokenVersion;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('User', userSchema);
