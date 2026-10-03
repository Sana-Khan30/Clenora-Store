const { z } = require('zod');

const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254));

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{10,20}$/, 'Enter a valid phone number');

const name = z.string().trim().min(2, 'Name is too short').max(60, 'Name is too long');

const address = z.object({
  label: z.string().trim().max(30).optional(),
  fullName: z.string().trim().min(2).max(80),
  phone,
  city: z.string().trim().min(2).max(60),
  address: z.string().trim().min(5).max(250),
  isDefault: z.boolean().optional(),
});

const register = z.object({ name, email, password, phone: phone.optional() });

const login = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(72),
});

const updateProfile = z
  .object({
    name: name.optional(),
    phone: phone.or(z.literal('')).optional(),
    addresses: z.array(address).max(5).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

const changePassword = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(72),
  newPassword: password,
});

module.exports = { register, login, updateProfile, changePassword, password, email, phone };
