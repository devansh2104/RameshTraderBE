const db = require('../db');

// Helper to build a consistent key for caching if needed later
function buildCacheKey(pageType, slug) {
  return `${pageType || 'generic'}::${slug || 'home'}`.toLowerCase();
}

// Generate fallback for a given type/slug (used especially for future blogs)
function generateFallbackFor(type, slug) {
  const humanize = (s) => (s || '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (m) => m.toUpperCase());
  const titleBase = humanize(slug || '');
  switch ((type || 'static').toLowerCase()) {
    case 'blog':
      return {
        title: titleBase ? `${titleBase} | Blog | Ramesh Trader` : 'Blog | Ramesh Trader',
        description: titleBase
          ? `Read about ${titleBase} on the Ramesh Trader blog. Quality insights, tips, and updates.`
          : 'Read the latest articles on the Ramesh Trader blog. Quality insights, tips, and updates.'
      };
    case 'category':
      return {
        title: titleBase ? `${titleBase} | Products | Ramesh Trader` : 'Products | Ramesh Trader',
        description: titleBase
          ? `Explore ${titleBase} products, specs, and availability from Ramesh Trader.`
          : 'Explore our product categories, specifications, and availability from Ramesh Trader.'
      };
    case 'item':
      return {
        title: titleBase ? `${titleBase} | Product | Ramesh Trader` : 'Product | Ramesh Trader',
        description: titleBase
          ? `View details, specifications, and availability for ${titleBase} at Ramesh Trader.`
          : 'View product details, specifications, and availability at Ramesh Trader.'
      };
    default:
      return {
        title: 'Ramesh Trader',
        description: 'Quality fly ash bricks and pavers. Contact us for pricing.'
      };
  }
}

// GET /api/meta/:slug?type=blog|category|item|static&autocreate=true
exports.getMetaBySlug = async (req, res) => {
  const { slug } = req.params;
  const pageType = (req.query.type || null);
  const autoCreate = String(req.query.autocreate || '').toLowerCase() === 'true';

  try {
    const [rows] = await db.promise().query(
      `SELECT id, page_type, slug, title, description, updated_at, created_at
       FROM seo_meta
       WHERE slug = ? AND (page_type = ? OR ? IS NULL)
       ORDER BY page_type DESC
       LIMIT 1`,
      [slug, pageType, pageType]
    );

    if (!rows || rows.length === 0) {
      // Try default by type
      if (pageType) {
        const [defRows] = await db.promise().query(
          `SELECT id, page_type, slug, title, description, updated_at, created_at
           FROM seo_meta
           WHERE slug = '__default__' AND page_type = ?
           LIMIT 1`,
          [pageType]
        );
        if (defRows && defRows.length > 0) {
          return res.json(defRows[0]);
        }
      }

      // If future blog (or others) – generate static fallback
      const fb = generateFallbackFor(pageType || 'static', slug);

      if (pageType && pageType.toLowerCase() === 'blog' && autoCreate) {
        try {
          const [ins] = await db.promise().query(
            `INSERT INTO seo_meta (page_type, slug, title, description) VALUES (?, ?, ?, ?)`,
            [pageType, slug, fb.title, fb.description]
          );
          return res.json({ id: ins.insertId, page_type: pageType, slug, title: fb.title, description: fb.description, created_at: new Date(), updated_at: new Date() });
        } catch (e) {
          console.error('META_AUTOCREATE_BLOG_ERROR', { slug, pageType, error: e.message });
        }
      }

      // Return generated fallback without inserting
      return res.status(200).json({ id: 0, page_type: pageType, slug, title: fb.title, description: fb.description, created_at: new Date(), updated_at: new Date() });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('META_GET_BY_SLUG_ERROR', { slug, pageType, error: err.message });
    res.status(500).json({ error: 'META_DB_ERROR', message: err.message });
  }
};

// GET /api/meta/default/:type
exports.getDefaultByType = async (req, res) => {
  const { type } = req.params;
  try {
    const [rows] = await db.promise().query(
      `SELECT id, page_type, slug, title, description, updated_at, created_at
       FROM seo_meta
       WHERE slug = '__default__' AND page_type = ?
       LIMIT 1`,
      [type]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'DEFAULT_META_NOT_FOUND', message: 'No default meta for type', type });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('META_GET_DEFAULT_ERROR', { type, error: err.message });
    res.status(500).json({ error: 'META_DB_ERROR', message: err.message });
  }
};

// POST /api/meta/:slug  { page_type?, title, description }  – create by slug
exports.createMetaBySlug = async (req, res) => {
  const { slug } = req.params;
  const { page_type, title, description } = req.body || {};
  if (!title || !description) {
    return res.status(400).json({ error: 'INVALID_BODY', message: 'title, description are required' });
  }
  try {
    const [result] = await db.promise().query(
      `INSERT INTO seo_meta (page_type, slug, title, description)
       VALUES (?, ?, ?, ?)`,
      [page_type || null, slug, title, description]
    );
    res.status(201).json({ id: result.insertId, page_type: page_type || null, slug, title, description });
  } catch (err) {
    console.error('META_CREATE_BY_SLUG_ERROR', { slug, body: req.body, error: err.message });
    res.status(500).json({ error: 'META_DB_ERROR', message: err.message });
  }
};

// PUT /api/meta/:slug  { title?, description? }
exports.updateMetaBySlug = async (req, res) => {
  const { slug } = req.params;
  const { title, description } = req.body || {};
  if (!title && !description) {
    return res.status(400).json({ error: 'INVALID_BODY', message: 'title or description required' });
  }
  try {
    const fields = [];
    const values = [];
    if (title) { fields.push('title = ?'); values.push(title); }
    if (description) { fields.push('description = ?'); values.push(description); }
    values.push(slug);

    const [result] = await db.promise().query(
      `UPDATE seo_meta SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE slug = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'META_NOT_FOUND' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('META_UPDATE_BY_SLUG_ERROR', { slug, error: err.message });
    res.status(500).json({ error: 'META_DB_ERROR', message: err.message });
  }
};

// DELETE /api/meta/:slug
exports.deleteMetaBySlug = async (req, res) => {
  const { slug } = req.params;
  try {
    const [result] = await db.promise().query(
      `DELETE FROM seo_meta WHERE slug = ?`,
      [slug]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'META_NOT_FOUND' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('META_DELETE_BY_SLUG_ERROR', { slug, error: err.message });
    res.status(500).json({ error: 'META_DB_ERROR', message: err.message });
  }
};

// GET /api/meta  → list all meta (optional filters: type, q)
exports.listAllMeta = async (req, res) => {
  const pageType = req.query.type || null;
  const q = req.query.q || '';
  const params = [];
  let where = '1=1';
  if (pageType) {
    where += ' AND (page_type = ?)';
    params.push(pageType);
  }
  if (q) {
    where += ' AND (slug LIKE ? OR title LIKE ? OR description LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  try {
    const [rows] = await db.promise().query(
      `SELECT id, page_type, slug, title, description, updated_at, created_at
       FROM seo_meta
       WHERE ${where}
       ORDER BY updated_at DESC, id DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('META_LIST_ALL_ERROR', { error: err.message });
    res.status(500).json({ error: 'META_DB_ERROR', message: err.message });
  }
};


