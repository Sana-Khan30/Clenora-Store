const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

function build(options) {
  return rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => env.isTest,
    handler: (req, res, next) => next(new ApiError(429, 'Too many requests, please try again later')),
    ...options,
  });
}

// Applied to every route. Sized for normal browsing plus admin panel use from one IP.
const globalLimiter = build({ windowMs: 15 * 60 * 1000, limit: 1000 });

// Stricter limit for login/register (used from Phase 3).
const authLimiter = build({ windowMs: 15 * 60 * 1000, limit: 20 });

// Placing orders: stops scripts from flooding the store with fake orders.
const orderLimiter = build({ windowMs: 60 * 60 * 1000, limit: 30 });

module.exports = { globalLimiter, authLimiter, orderLimiter };
