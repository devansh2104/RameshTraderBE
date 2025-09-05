// Direct production listener test for https://www.rameshtrader.com
// Joins the specified blog rooms and logs all realtime events without mutating data.
// Usage:
//   node tests/blog-realtime-www-test.js 49 18 9

const { io } = require('socket.io-client');

const BLOG_IDS = process.argv.slice(2).filter((v) => /^\d+$/.test(v)).map((v) => Number(v));
if (BLOG_IDS.length === 0) {
  console.error('Usage: node tests/blog-realtime-www-test.js <BLOG_ID> [<BLOG_ID> ...]');
  process.exit(1);
}

const BASE = 'https://www.rameshtrader.com';

console.log('BASE:', BASE);
console.log('BLOG_IDS:', BLOG_IDS.join(', '));

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

['blog:likes','comment:created','comment:updated','comment:deleted','comment:likes']
  .forEach((ev) => socket.on(ev, (p) => console.log(`[event ${ev}]`, p)));

// Keep the process alive; Ctrl+C to stop.
process.stdin.resume();


