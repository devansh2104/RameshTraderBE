/*
  Seed meta titles/descriptions for specific slugs + existing static pages.

  1) Edit the arrays below (blogs, categories, items) with your slugs.
  2) Run with backend running:
       PowerShell:
         cd "d:\Office Task\Ramesh Traders\rameshtradersBE"
         $env:BE_BASE="http://localhost:4001"; node seed-meta-from-slugs.js

     CMD:
         cd "d:\Office Task\Ramesh Traders\rameshtradersBE"
         set BE_BASE=http://localhost:4001 && node seed-meta-from-slugs.js

  Notes:
  - The script will create rows via slug-only API if they are missing or if the API returns an auto-generated fallback (id = 0).
  - Titles/descriptions are generated from slugs; adjust generators if needed.
*/

const backendBase = process.env.BE_BASE || 'http://localhost:4001';

// EDIT THESE with your slugs
const input = {
  staticPages: ['home','about','contact','gallery','terms','privacy-policy','cookie-policy','blogs'],
  categories: [
    // 'fly-ash-bricks', 'aac-block-side-bricks', ...
  ],
  items: [
    // 'concrete-fly-ash-brick', 'red-clay-brick-standard', ...
  ],
  blogs: [
    // 'my-first-blog', 'test-blog-post', ...
  ]
};

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
      const staticMap = {
        'home': { title: 'Ramesh Trader | Home', description: 'Quality fly ash bricks and pavers in Telangana. Call for pricing and delivery.' },
        'about': { title: 'About Us | Ramesh Trader', description: 'Ramesh Trader supplies premium fly ash bricks and pavers with reliable service.' },
        'contact': { title: 'Contact | Ramesh Trader', description: 'Get in touch for product inquiries, quotes, and delivery information.' },
        'gallery': { title: 'Gallery | Ramesh Trader', description: 'Browse photos of our products, projects, and deliveries.' },
        'terms': { title: 'Terms & Conditions | Ramesh Trader', description: 'Read terms and conditions for using our website and services.' },
        'privacy-policy': { title: 'Privacy Policy | Ramesh Trader', description: 'Learn how we collect, use, and protect your data.' },
        'cookie-policy': { title: 'Cookie Policy | Ramesh Trader', description: 'Understand our use of cookies to improve your experience.' },
        'blogs': { title: 'Blogs | Ramesh Trader', description: 'Latest updates, guides, and tips from Ramesh Trader.' }
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

async function ensureCreate(type, slug) {
  if (!slug) return { skipped: true, type, slug, reason: 'no-slug' };
  const check = await http('GET', `/api/meta/${encodeURIComponent(slug)}?type=${encodeURIComponent(type)}`);
  const isGeneratedFallback = check.status === 200 && check.data && (check.data.id === 0 || check.data.id === '0');
  const existsPersisted = check.status === 200 && check.data && check.data.id && check.data.id !== 0 && check.data.title;
  if (existsPersisted && !isGeneratedFallback) {
    return { created: false, type, slug, status: check.status };
  }
  const meta = genMeta(type, slug);
  const created = await http('POST', `/api/meta/${encodeURIComponent(slug)}`, { page_type: type, title: meta.title, description: meta.description });
  return { created: created.status === 201, type, slug, status: created.status };
}

async function run() {
  console.log('Backend base:', backendBase);
  // Static pages
  for (const s of input.staticPages) {
    const r = await ensureCreate('static', s);
    console.log('STATIC', s, r);
  }
  // Categories
  for (const c of input.categories) {
    const r = await ensureCreate('category', c);
    console.log('CATEGORY', c, r);
  }
  // Items
  for (const i of input.items) {
    const r = await ensureCreate('item', i);
    console.log('ITEM', i, r);
  }
  // Blogs
  for (const b of input.blogs) {
    const r = await ensureCreate('blog', b);
    console.log('BLOG', b, r);
  }
  console.log('Seeding complete.');
}

run().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});


