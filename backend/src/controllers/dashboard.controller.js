const { getDashboard } = require('../services/dashboard.service');
const { ok } = require('../utils/response');

async function stats(req, res) {
  return ok(res, await getDashboard());
}

module.exports = { stats };
