const Setting = require('../models/Setting');

const DEFAULTS = {
  storeName: 'CLENORA',
  whatsappNumber: '',
  shippingFee: 150,
  freeShippingThreshold: 1500,
  currency: 'PKR',
  currencySymbol: 'Rs.',
};

// Always returns a complete settings object (defaults fill anything not saved yet).
async function getSettings() {
  const doc = (await Setting.findOne({ key: 'store' }).lean()) || {};
  return {
    storeName: doc.storeName ?? DEFAULTS.storeName,
    whatsappNumber: doc.whatsappNumber ?? DEFAULTS.whatsappNumber,
    shippingFee: doc.shippingFee ?? DEFAULTS.shippingFee,
    freeShippingThreshold: doc.freeShippingThreshold ?? DEFAULTS.freeShippingThreshold,
    currency: doc.currency ?? DEFAULTS.currency,
    currencySymbol: doc.currencySymbol ?? DEFAULTS.currencySymbol,
  };
}

// The only place shipping is calculated. Free shipping once subtotal reaches the threshold.
function calculateShipping(subtotal, settings) {
  if (subtotal <= 0) return 0;
  return subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFee;
}

module.exports = { getSettings, calculateShipping, DEFAULTS };
