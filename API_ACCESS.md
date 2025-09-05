Production API and WebSocket Access

This document explains how to access the HTTP API and Socket.IO realtime endpoints when the backend is running behind PM2 on your server.

Service status (PM2)

- Inspect the backend process:
  - pm2 show rameshtrader-backend
  - pm2 logs rameshtrader-backend --lines 1000
  - pm2 monit
- Script path: /root/myfolder/myProjects/rameshtrader/backend/server.js
- Node version: 22.17.1
- Exec mode: fork_mode

Base URL

- Production base URL: https://rameshtrader.com
- HTTP API base path: https://rameshtrader.com/api
- Socket.IO base path: https://rameshtrader.com/socket.io/

Reverse proxy requirements (Nginx example)

Ensure WebSocket upgrade headers and the Socket.IO path are properly proxied:

location /socket.io/ {
  proxy_pass         http://127.0.0.1:4001;
  proxy_http_version 1.1;
  proxy_set_header   Upgrade $http_upgrade;
  proxy_set_header   Connection "upgrade";
  proxy_set_header   Host $host;
  proxy_read_timeout 600s;
}

location /api/ {
  proxy_pass         http://127.0.0.1:4001;
  proxy_http_version 1.1;
  proxy_set_header   Host $host;
  proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header   X-Forwarded-Proto $scheme;
}

If using a CDN/WAF (e.g., Cloudflare), enable WebSocket support.

CORS

Socket.IO server is configured to allow:
- Origins: https://rameshtrader.com (and optionally https://www.rameshtrader.com)
- Credentials: true

HTTP CORS for REST is permissive by default; adjust as needed.

Quick connectivity checks

- Polling endpoint check:
curl -i 'https://rameshtrader.com/socket.io/?EIO=4&transport=polling'
Expect HTTP 200 and an Engine.IO payload. If not, fix reverse-proxy/CORS.

- API health:
curl -s https://rameshtrader.com/

Using from frontend (Angular)

- Environment config:
export const environment = {
  production: true,
  BASE_URL: 'https://rameshtrader.com'
};

- Socket.IO client:
import { io } from 'socket.io-client';
const socket = io(environment.BASE_URL, {
  withCredentials: true,
  path: '/socket.io/',
  transports: ['websocket', 'polling']
});

- Join a blog room to receive realtime updates:
socket.emit('joinBlog', blogId);

- Events emitted by backend (room: blog:<id>):
- blog:likes { blog_id, delta?, likes_count? }
- comment:likes { blog_id, comment_id, delta?, likes_count? }
- comment:created { comment, delta? }
- comment:updated { comment }
- comment:deleted { blog_id, comment_id, delta? }

Testing in production

- Multi-blog listener (no writes):
BASE=https://rameshtrader.com node tests/blog-realtime-multi.js 49 18 9

- End-to-end test (writes data):
BASE=https://rameshtrader.com node tests/blog-realtime-e2e.js <BLOG_ID>
Use a test blog and be aware this creates/updates/deletes comments and toggles likes.

Troubleshooting

- websocket error or connect_error in clients:
  - Confirm /socket.io/ is proxied and upgrade headers are forwarded.
  - Allow both websocket and polling transports on clients.
  - Ensure server CORS origins include your site.
- 500 on /api/likes with FK error:
  - Use a valid blog_id that exists in blogs table.
- Permission issues updating/deleting comments as anonymous:
  - Anonymous identity is based on IP + User-Agent; ensure requests originate from same device/UA.


