// End-to-end realtime test for blog-detail page events
// - Connects to Socket.IO, joins blog room
// - Toggles blog like (like → unlike)
// - Creates, updates, likes, and deletes a comment
// - Verifies each server emit is received in realtime

/* How to run:
   1) Start backend: npm run dev (or npm start)
   2) Run this test:
      node tests/blog-realtime-e2e.js <BLOG_ID> [BASE]
      - BLOG_ID: numeric blog id to test against (required)
      - BASE: backend base URL, default http://localhost:4001
*/

const { io } = require('socket.io-client');
const axios = require('axios');

const BLOG_ID = Number(process.env.BLOG_ID || process.argv[2]);
const BASE = (process.env.BASE || process.argv[3] || 'https://rameshtrader.com').replace(/\/$/, '');

if (!BLOG_ID || Number.isNaN(BLOG_ID)) {
  console.error('Usage: node tests/blog-realtime-e2e.js <BLOG_ID> [BASE]');
  process.exit(1);
}

// Axios instance with a stable User-Agent so anonymous identity remains consistent
const api = axios.create({
  baseURL: `${BASE}/api`,
  headers: {
    'User-Agent': 'SocketRealtimeE2E/1.0',
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

function waitForEvent(socket, event, predicate, timeoutMs = 7000) {
  return new Promise((resolve, reject) => {
    const onEvent = (payload) => {
      try {
        if (!predicate || predicate(payload)) {
          cleanup();
          resolve(payload);
        }
      } catch (e) {
        cleanup();
        reject(e);
      }
    };
    const onTimeout = () => {
      cleanup();
      reject(new Error(`Timed out waiting for event: ${event}`));
    };
    const cleanup = () => {
      clearTimeout(tid);
      socket.off(event, onEvent);
    };
    const tid = setTimeout(onTimeout, timeoutMs);
    socket.on(event, onEvent);
  });
}

(async () => {
  console.log(`BASE: ${BASE}`);
  console.log(`BLOG_ID: ${BLOG_ID}`);

  // Connect Socket.IO and join the specific blog room
  const socket = io(BASE, {
    transports: ['websocket'],
    withCredentials: true,
    // Helps when server CORS expects a browser Origin; safe for local testing
    extraHeaders: { Origin: 'https://rameshtrader.com' }
  });

  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
  console.log('Socket connected:', socket.id);

  socket.emit('joinBlog', BLOG_ID);
  console.log(`Joined room blog:${BLOG_ID}`);

  // Helpful debug listeners (won't interfere with waitForEvent)
  socket.on('blog:likes', (p) => console.log('[listener] blog:likes', p));
  socket.on('comment:created', (p) => console.log('[listener] comment:created', p));
  socket.on('comment:updated', (p) => console.log('[listener] comment:updated', p));
  socket.on('comment:likes', (p) => console.log('[listener] comment:likes', p));
  socket.on('comment:deleted', (p) => console.log('[listener] comment:deleted', p));

  // 1) Toggle blog like (like)
  const blogLike1 = waitForEvent(socket, 'blog:likes', (p) => p && p.blog_id === BLOG_ID);
  await api.post('/likes', { blog_id: BLOG_ID });
  const blogLikePayload1 = await blogLike1;
  console.log('Received blog:likes (like):', blogLikePayload1);

  // 2) Create comment
  const onCreated = waitForEvent(socket, 'comment:created', (p) => p && p.comment && p.comment.blog_id === BLOG_ID);
  const { data: created } = await api.post(`/comments/blog/${BLOG_ID}`, {
    name: 'Realtime E2E',
    content: `Hello from e2e at ${new Date().toISOString()}`
  });
  const createdEvt = await onCreated;
  const commentId = created?.id || createdEvt?.comment?.id;
  console.log('Created comment id:', commentId);
  if (!commentId) throw new Error('No comment id returned; cannot continue');

  // 3) Update comment
  const onUpdated = waitForEvent(socket, 'comment:updated', (p) => p && p.comment && p.comment.id === commentId);
  await api.put(`/comments/${commentId}`, { content: 'Updated content (realtime test)' });
  const updatedEvt = await onUpdated;
  console.log('Received comment:updated:', updatedEvt.comment);

  // 4) Like comment (toggle on)
  const onCommentLike = waitForEvent(socket, 'comment:likes', (p) => p && p.blog_id === BLOG_ID && p.comment_id === commentId);
  await api.post('/likes', { blog_id: BLOG_ID, comment_id: commentId });
  const commentLikeEvt = await onCommentLike;
  console.log('Received comment:likes (like):', commentLikeEvt);

  // 5) Delete comment
  const onDeleted = waitForEvent(socket, 'comment:deleted', (p) => p && Number(p.blog_id) === Number(BLOG_ID) && Number(p.comment_id) === Number(commentId));
  await api.delete(`/comments/${commentId}`);
  const deletedEvt = await onDeleted;
  console.log('Received comment:deleted:', deletedEvt);

  // 6) Toggle blog like (unlike)
  const blogLike2 = waitForEvent(socket, 'blog:likes', (p) => p && p.blog_id === BLOG_ID);
  await api.post('/likes', { blog_id: BLOG_ID });
  const blogLikePayload2 = await blogLike2;
  console.log('Received blog:likes (unlike):', blogLikePayload2);

  socket.emit('leaveBlog', BLOG_ID);
  socket.disconnect();
  console.log('Test completed successfully.');
})().catch((err) => {
  console.error('E2E test failed:', err?.response?.data || err?.message || err);
  process.exit(1);
});


