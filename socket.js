const { Server } = require('socket.io');

let ioInstance = null;

/**
 * Initialize a singleton Socket.IO server on top of the provided HTTP server.
 * Sets up simple room semantics for blog detail pages: join/leave `blog:<id>`.
 */
function initSocket(httpServer) {
  if (ioInstance) {
    // Prevent multiple initializations
    console.warn('⚠️ Socket.IO already initialized. Returning existing instance.');
    return ioInstance;
  }

  ioInstance = new Server(httpServer, {
    cors: {
      // Allow local dev and production frontend origins
      // origin: ['http://localhost:4200', 'https://rameshtrader.com'],
      origin: '*',
      credentials: true, // allow cookies/auth headers if needed
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    }
  });

  ioInstance.on('connection', (socket) => {
    console.log(`✅ New client connected: ${socket.id}`);

    // Join a specific blog room
    socket.on('joinBlog', (blogId) => {
      if (!blogId) return;
      socket.join(`blog:${blogId}`);
      console.log(`👥 User ${socket.id} joined blog room: ${blogId}`);
    });

    // Leave a specific blog room
    socket.on('leaveBlog', (blogId) => {
      if (!blogId) return;
      socket.leave(`blog:${blogId}`);
      console.log(`👋 User ${socket.id} left blog room: ${blogId}`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  return ioInstance;
}

/**
 * Accessor for the initialized Socket.IO instance.
 * Controllers use this to emit events, e.g. io().to(`blog:${id}`).emit(...)
 */
function io() {
  if (!ioInstance) {
    throw new Error('❌ Socket.IO not initialized yet. Call initSocket(server) first.');
  }
  return ioInstance;
}

module.exports = { initSocket, io };
