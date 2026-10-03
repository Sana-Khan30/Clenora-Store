const crypto = require('crypto');

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

// Returns "base", or "base-2", "base-3"... if the slug is taken.
async function uniqueSlug(Model, text, excludeId) {
  const root = slugify(text) || `item-${crypto.randomBytes(3).toString('hex')}`;
  let slug = root;
  let n = 1;
  for (;;) {
    const query = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    if (!(await Model.exists(query))) return slug;
    n += 1;
    slug = `${root}-${n}`;
  }
}

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { slugify, uniqueSlug, escapeRegex };
