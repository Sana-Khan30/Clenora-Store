const Setting = require('../models/Setting');
const { getSettings } = require('../services/settings.service');
const { ok } = require('../utils/response');

function shape(s) {
  return {
    storeName: s.storeName,
    whatsappNumber: s.whatsappNumber,
    // Plain click-to-chat link; the customer still has to press Send in WhatsApp.
    whatsappLink: s.whatsappNumber ? `https://wa.me/${s.whatsappNumber}` : null,
    shippingFee: s.shippingFee,
    freeShippingThreshold: s.freeShippingThreshold,
    currency: s.currency,
    currencySymbol: s.currencySymbol,
  };
}

async function getPublic(req, res) {
  return ok(res, { settings: shape(await getSettings()) });
}

async function getAdmin(req, res) {
  return ok(res, { settings: shape(await getSettings()) });
}

async function update(req, res) {
  await Setting.findOneAndUpdate(
    { key: 'store' },
    { $set: req.body },
    { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true }
  );
  return ok(res, { settings: shape(await getSettings()) }, { message: 'Settings saved' });
}

module.exports = { getPublic, getAdmin, update };
