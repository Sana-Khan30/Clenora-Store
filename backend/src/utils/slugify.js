function slugify(text) {
  return (
    String(text)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'item'
  );
}

// Returns base, base-2, base-3 ... whichever is free.
async function uniqueSlug(Model, base, excludeId) {
  let slug = base;
  let n = 1;
  for (;;) {
    const query = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    if (!(await Model.exists(query))) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

module.exports = { slugify, uniqueSlug };
