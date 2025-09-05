/*
  Local test for META slug API
  Usage: node test-meta-api.js
  Ensure backend is running on http://localhost:4001
*/

const backendBase = process.env.BE_BASE || 'http://localhost:4001';

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

async function run() {
  const slug = 'local-test-slug';
  console.log('--- GET default type blog');
  console.log(await http('GET', `/api/meta/default/blog`));

  console.log('--- Ensure clean state: delete by slug (ignore errors)');
  await http('DELETE', `/api/meta/${slug}`);

  console.log('--- GET by slug missing with autocreate (blog)');
  console.log(await http('GET', `/api/meta/${slug}?type=blog&autocreate=true`));

  console.log('--- GET again by slug (should exist)');
  console.log(await http('GET', `/api/meta/${slug}?type=blog`));

  console.log('--- UPDATE by slug (title)');
  console.log(await http('PUT', `/api/meta/${slug}`, { title: 'Updated Local Test Title' }));

  console.log('--- GET after update');
  console.log(await http('GET', `/api/meta/${slug}?type=blog`));

  console.log('--- DELETE by slug');
  console.log(await http('DELETE', `/api/meta/${slug}`));

  console.log('--- GET after delete (should fallback)');
  console.log(await http('GET', `/api/meta/${slug}?type=blog`));

  console.log('Done.');
}

run().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});


