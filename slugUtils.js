// Utility functions for generating URL-friendly slugs
const generateSlug = (text) => {
  if (!text) return '';
  
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars except hyphens
    .replace(/\-\-+/g, '-')      // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '')          // Trim hyphens from start
    .replace(/-+$/, '');         // Trim hyphens from end
};

// Check if slug is unique
const checkSlugUnique = async (db, table, slug, id = null) => {
  let query = `SELECT COUNT(*) as count FROM ${table} WHERE slug = ?`;
  let params = [slug];
  
  // If updating, exclude current record
  if (id) {
    query += ` AND ${table === 'blogs' ? 'id' : table === 'categories' ? 'category_id' : 'item_id'} != ?`;
    params.push(id);
  }
  
  const [results] = await db.promise().query(query, params);
  return results[0].count === 0;
};

module.exports = {
  generateSlug,
  checkSlugUnique
};
