// Removes keys that could be used for MongoDB operator injection ("$gt", "a.b")
// from req.body and req.params. Query strings are NOT mutated here (Express 5 makes
// req.query read-only); they are checked by Zod schemas in the validate middleware.
function clean(value) {
  if (Array.isArray(value)) {
    value.forEach(clean);
  } else if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete value[key];
      } else {
        clean(value[key]);
      }
    }
  }
  return value;
}

function sanitize(req, res, next) {
  if (req.body) clean(req.body);
  if (req.params) clean(req.params);
  next();
}

module.exports = sanitize;
module.exports.clean = clean;
