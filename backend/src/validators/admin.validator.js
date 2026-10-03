const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const blankToUndefined = (schema) => z.preprocess((v) => (v === '' ? undefined : v), schema.optional());
const intParam = (min, max) => z.coerce.number().int().min(min).max(max);
const paging = {
  page: blankToUndefined(intParam(1, 100000)).transform((v) => v ?? 1),
  limit: blankToUndefined(intParam(1, 100)).transform((v) => v ?? 20),
};

const idParam = z.object({ id: objectId });

// Accepts "+92 300 1234567" and stores digits only. Rejects a leading 0 (WhatsApp needs the country code).
const whatsappNumber = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s().+-]/g, ''))
  .pipe(z.string().regex(/^([1-9][0-9]{7,14})?$/, 'Use international format with country code and no leading 0, e.g. 923001234567'));

const updateSettings = z
  .object({
    storeName: z.string().trim().min(2).max(60),
    whatsappNumber,
    shippingFee: z.number().int('Must be a whole number').min(0).max(100000),
    freeShippingThreshold: z.number().int('Must be a whole number').min(0).max(10000000),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code, e.g. PKR'),
    currencySymbol: z.string().trim().min(1).max(6),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

const customersQuery = z.object({
  ...paging,
  search: blankToUndefined(z.string().trim().max(80)),
  status: blankToUndefined(z.enum(['active', 'inactive', 'all'])).transform((v) => v ?? 'all'),
});

const customerOrdersQuery = z.object({ ...paging });

const customerStatusBody = z.object({ isActive: z.boolean() });

module.exports = { idParam, updateSettings, customersQuery, customerOrdersQuery, customerStatusBody };
