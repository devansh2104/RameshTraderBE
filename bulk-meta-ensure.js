/*
  Bulk ensure meta for all existing pages (static, categories, items, blogs).
  - Fetches lists from backend APIs
  - Generates title/description per slug/type
  - Creates meta via slug-only API if missing

  Usage:
    node bulk-meta-ensure.js

  Env:
    BE_BASE (default http://localhost:4001)
*/

const backendBase = process.env.BE_BASE || 'http://localhost:4001';

function humanize(slug) {
  return String(slug || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function genMeta(type, slug) {
  const pretty = humanize(slug);
  switch ((type || 'static').toLowerCase()) {
    case 'blog':
      return {
        title: pretty ? `${pretty} | Blog | Ramesh Trader` : 'Blog | Ramesh Trader',
        description: pretty
          ? `Read about ${pretty} on the Ramesh Trader blog. Quality insights, tips, and updates.`
          : 'Read the latest articles on the Ramesh Trader blog. Quality insights, tips, and updates.'
      };
    case 'category':
      return {
        title: pretty ? `${pretty} | Products | Ramesh Trader` : 'Products | Ramesh Trader',
        description: pretty
          ? `Explore ${pretty} products, specs, and availability from Ramesh Trader.`
          : 'Explore our product categories, specifications, and availability from Ramesh Trader.'
      };
    case 'item':
      return {
        title: pretty ? `${pretty} | Product | Ramesh Trader` : 'Product | Ramesh Trader',
        description: pretty
          ? `View details, specifications, and availability for ${pretty} at Ramesh Trader.`
          : 'View product details, specifications, and availability at Ramesh Trader.'
      };
    default:
      // static
      const staticMap = {
        'home': {
          title: 'Ramesh Trader | Home',
          description: 'Quality fly ash bricks and pavers in Telangana. Call for pricing and delivery.'
        },
        'about': {
          title: 'About Us | Ramesh Trader',
          description: 'Ramesh Trader supplies premium fly ash bricks and pavers with reliable service.'
        },
        'contact': {
          title: 'Contact | Ramesh Trader',
          description: 'Get in touch for product inquiries, quotes, and delivery information.'
        },
        'gallery': {
          title: 'Gallery | Ramesh Trader',
          description: 'Browse photos of our products, projects, and deliveries.'
        },
        'terms': {
          title: 'Terms & Conditions | Ramesh Trader',
          description: 'Read terms and conditions for using our website and services.'
        },
        'privacy-policy': {
          title: 'Privacy Policy | Ramesh Trader',
          description: 'Learn how we collect, use, and protect your data.'
        },
        'cookie-policy': {
          title: 'Cookie Policy | Ramesh Trader',
          description: 'Understand our use of cookies to improve your experience.'
        },
        'blogs': {
          title: 'Blogs | Ramesh Trader',
          description: 'Latest updates, guides, and tips from Ramesh Trader.'
        }
      };
      return staticMap[String(slug || 'home')] || { title: 'Ramesh Trader', description: 'Quality fly ash bricks and pavers. Contact us for pricing.' };
  }
}

async function http(method, path, body) {
  const url = `${backendBase}${path}`;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch (_) {}
  return { status: res.status, data: parsed ?? text };
}

async function ensureMeta(type, slug) {
  if (!slug) return { skipped: true, reason: 'no-slug' };
  const key = `${type}:${slug}`;
  const check = await http('GET', `/api/meta/${encodeURIComponent(slug)}?type=${encodeURIComponent(type)}`);
  // If API returns a generated fallback (id = 0), treat as missing and create a row
  const isGeneratedFallback = check.status === 200 && check.data && (check.data.id === 0 || check.data.id === '0');
  const existsPersisted = check.status === 200 && check.data && check.data.id && check.data.id !== 0 && check.data.title;
  if (existsPersisted && !isGeneratedFallback) {
    return { created: false, key };
  }
  const meta = genMeta(type, slug);
  const created = await http('POST', `/api/meta/${encodeURIComponent(slug)}`, { page_type: type, title: meta.title, description: meta.description });
  return { created: created.status === 201, key, status: created.status };
}

async function fetchAllCategories() {
  const res = await http('GET', '/api/categories');
  if (res.status !== 200 || !Array.isArray(res.data)) return [];
  return res.data.filter(Boolean);
}

async function fetchAllItems() {
  const res = await http('GET', '/api/items');
  // items endpoint should return an array; adapt if structure differs.
  if (res.status !== 200) return [];
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.items)) return res.data.items;
  return [];
}

async function fetchAllBlogs() {
  const res = await http('GET', '/api/blogs');
  if (res.status !== 200) return [];
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.blogs)) return res.data.blogs;
  return [];
}

async function run() {
  console.log('Backend base:', backendBase);
  const summary = { created: [], existing: [], failed: [] };

  // Static pages
  const staticSlugs = ['home','about','contact','gallery','terms','privacy-policy','cookie-policy','blogs'];
  for (const s of staticSlugs) {
    const r = await ensureMeta('static', s);
    console.log('STATIC', s, r);
    if (r.created) summary.created.push({ type: 'static', slug: s });
    else if (r.skipped) summary.failed.push({ type: 'static', slug: s, reason: r.reason || 'skipped' });
    else summary.existing.push({ type: 'static', slug: s });
  }

  // Categories
  const categories = await fetchAllCategories();
  console.log('Categories:', categories.length);
  for (const c of categories) {
    const slug = c.slug || c.category_slug || c.category_name_slug;
    const r = await ensureMeta('category', slug);
    console.log('CATEGORY', slug, r);
    if (r.created) summary.created.push({ type: 'category', slug });
    else if (r.skipped) summary.failed.push({ type: 'category', slug, reason: r.reason || 'skipped' });
    else summary.existing.push({ type: 'category', slug });
  }

  // Items
  const items = await fetchAllItems();
  console.log('Items:', items.length);
  for (const it of items) {
    const slug = it.slug || it.item_slug || it.name_slug;
    const r = await ensureMeta('item', slug);
    console.log('ITEM', slug, r);
    if (r.created) summary.created.push({ type: 'item', slug });
    else if (r.skipped) summary.failed.push({ type: 'item', slug, reason: r.reason || 'skipped' });
    else summary.existing.push({ type: 'item', slug });
  }

  // Blogs
  const blogs = await fetchAllBlogs();
  console.log('Blogs:', blogs.length);
  for (const b of blogs) {
    const slug = b.slug || b.blog_slug;
    const r = await ensureMeta('blog', slug);
    console.log('BLOG', slug, r);
    if (r.created) summary.created.push({ type: 'blog', slug });
    else if (r.skipped) summary.failed.push({ type: 'blog', slug, reason: r.reason || 'skipped' });
    else summary.existing.push({ type: 'blog', slug });
  }

  console.log('Bulk ensure meta completed.');
  console.log('Summary:');
  console.log('  Created:', summary.created.length);
  console.log('  Existing:', summary.existing.length);
  console.log('  Failed/Skipped:', summary.failed.length);
  if (summary.failed.length > 0) {
    console.log('Failed list:', summary.failed);
  }
}

run().catch((e) => {
  console.error('Bulk meta failed:', e);
  process.exit(1);
});


