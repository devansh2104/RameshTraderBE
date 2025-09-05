// Multi-blog Socket.IO listener for production/staging
// Connects to Socket.IO, joins multiple blog rooms, and logs realtime events.
// By default it ONLY LISTENS and does NOT mutate data.
//
// Usage:
//   BASE=https://rameshtrader.com node tests/blog-realtime-multi.js 49 18 9
//   node tests/blog-realtime-multi.js 49 18 9 https://rameshtrader.com
//
// Env vars:
//   BASE           Backend origin (default: https://rameshtrader.com)
//   DURATION_SEC   How long to listen before exiting (default: 120)

const { io } = require('socket.io-client');

const argv = process.argv.slice(2);
const idsFromArgs = argv.filter((v) => /^\d+$/.test(v)).map((v) => Number(v));
const lastArgUrl = argv.find((v) => /^https?:\/\//i.test(v));

const BLOG_IDS = idsFromArgs.length > 0 ? idsFromArgs : [49, 18, 9];
const BASE = (process.env.BASE || lastArgUrl || 'https://rameshtrader.com').replace(/\/$/, '');
const DURATION_SEC = Number(process.env.DURATION_SEC || 120);

console.log('BASE:', BASE);
console.log('BLOG_IDS:', BLOG_IDS.join(', '));
console.log('DURATION_SEC:', DURATION_SEC);

const socket = io(BASE, {
  withCredentials: true,
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  timeout: 15000,
  extraHeaders: { Origin: BASE }
});

socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
  BLOG_IDS.forEach((id) => {
    socket.emit('joinBlog', id);
    console.log(`Joined room blog:${id}`);
  });
});

socket.on('disconnect', (reason) => console.log('Socket disconnected:', reason));
socket.on('connect_error', (err) => console.error('connect_error:', err?.message || err));
socket.on('error', (err) => console.error('socket error:', err));

// Helpful listeners
['blog:likes','comment:created','comment:updated','comment:deleted','comment:likes']
  .forEach((ev) => socket.on(ev, (p) => console.log(`[event ${ev}]`, p)));

// Exit after duration
setTimeout(() => {
  console.log(`Exiting after ${DURATION_SEC}s of listening...`);
  try {
    BLOG_IDS.forEach((id) => socket.emit('leaveBlog', id));
    socket.disconnect();
  } catch {}
  process.exit(0);
}, DURATION_SEC * 1000);


