const ApiError = require('../utils/ApiError');

// Usage: router.post('/x', validate({ body: schema, query: schema, params: schema }), handler)
// Parsed (and stripped) values are available as req.valid.body / req.valid.query / req.valid.params.
// Unknown fields are removed by the schemas; handlers must read from req.valid, not raw req.query.
function validate(schemas) {
  return (req, res, next) => {
    const errors = [];
    req.valid = {};

    for (const part of ['params', 'query', 'body']) {
      if (!schemas[part]) continue;
      const result = schemas[part].safeParse(req[part]);
      if (result.success) {
        req.valid[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          errors.push({ field: [part, ...issue.path].join('.'), message: issue.message });
        }
      }
    }

    if (errors.length > 0) {
      return next(ApiError.badRequest('Validation failed', errors));
    }
    if (req.valid.body) req.body = req.valid.body;
    next();
  };
}

module.exports = validate;
