// Every successful response: { success: true, data, message?, meta? }
function ok(res, data = null, { message, meta, status = 200 } = {}) {
  const body = { success: true };
  if (message) body.message = message;
  body.data = data;
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

function created(res, data = null, message) {
  return ok(res, data, { message, status: 201 });
}

module.exports = { ok, created };
