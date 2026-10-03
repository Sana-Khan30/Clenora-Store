const { z } = require('zod');
const { ORDER_STATUSES, PAYMENT_METHODS } = require('../models/Order');
const { email, phone } = require('./auth.validator');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const blankToUndefined = (schema) => z.preprocess((v) => (v === '' ? undefined : v), schema.optional());
const intParam = (min, max) => z.coerce.number().int().min(min).max(max);
const paging = {
  page: blankToUndefined(intParam(1, 100000)).transform((v) => v ?? 1),
  limit: blankToUndefined(intParam(1, 100)).transform((v) => v ?? 20),
};

const idParam = z.object({ id: objectId });

// Only product id + quantity are accepted from the browser. Any price/total fields are ignored (stripped).
const cartItem = z.object({ productId: objectId, quantity: z.number().int().min(1).max(99) });
const items = z.array(cartItem).min(1, 'Your cart is empty').max(50);

const quoteBody = z.object({ items });

const createOrder = z.object({
  customer: z.object({
    fullName: z.string().trim().min(2).max(80),
    phone,
    email,
    city: z.string().trim().min(2).max(60),
    address: z.string().trim().min(5).max(250),
    notes: z.string().trim().max(500).optional(),
  }),
  items,
  paymentMethod: z.enum(PAYMENT_METHODS).default('cod'),
});

const myOrdersQuery = z.object({ ...paging });

const adminOrdersQuery = z
  .object({
    ...paging,
    status: blankToUndefined(z.enum(ORDER_STATUSES)),
    search: blankToUndefined(z.string().trim().max(80)),
    from: blankToUndefined(z.iso.date()),
    to: blankToUndefined(z.iso.date()),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, { message: 'from cannot be after to', path: ['from'] });

const statusBody = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(200).optional(),
});

const INVENTORY_TYPES = ['initial', 'adjustment', 'sale', 'cancellation', 'correction'];
const inventoryQuery = z.object({
  ...paging,
  product: blankToUndefined(objectId),
  type: blankToUndefined(z.enum(INVENTORY_TYPES)),
});

const adjustBody = z.object({
  productId: objectId,
  change: z
    .number()
    .int('Must be a whole number')
    .min(-1000000)
    .max(1000000)
    .refine((v) => v !== 0, 'Change cannot be zero'),
  reason: z.string().trim().min(3, 'Please give a short reason').max(200),
});

module.exports = { idParam, quoteBody, createOrder, myOrdersQuery, adminOrdersQuery, statusBody, inventoryQuery, adjustBody };
