// ==========================================
// Load environment variables
// ==========================================
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Import public IP fetcher
const { getPublicIp } = require('./utils/ipFetcher'); // ✅ New import

// Initialize Socket.IO from our socket helper
const { initSocket } = require('./socket');


// ==========================================
// Ensure uploads directory exists
// ==========================================
const uploadDir = process.env.UPLOAD_PATH || 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`📁 Created uploads directory: ${uploadDir}`);
}

// ==========================================
// Database connection
// ==========================================
const db = require('./db');



// ==========================================
// Import API routes
// ==========================================
// Import routes
const stateRoutes = require('./routes/state');
const cityRoutes = require('./routes/city');
const bannerRoutes = require('./routes/banner');
const categoryRoutes = require('./routes/category');
const itemRoutes = require('./routes/item');
const enquiryRoutes = require('./routes/enquiry');
const blogRoutes = require('./routes/blog');
const galleryRoutes = require('./routes/gallery');
const userRoutes = require('./routes/user');
const commentRoutes = require('./routes/comments');
// const blogLikeRoutes = require('./routes/blogLikes'); // optional
const featuresRoutes = require('./routes/features');
const likeRoutes = require('./routes/likes');
const variantRoutes = require('./routes/variant');
const newsletterRoutes = require("./routes/newsletter");
const newsletterController = require("./controllers/newsletterController");
const cookieRoutes = require('./routes/cookies');
const metaRoutes = require('./routes/meta');

// ==========================================
// Express app & HTTP server
// ==========================================
const FRONTEND_ORIGIN = "https://rameshtrader.com" || "https://www.rameshtrader.com" || 'http://localhost:4001' || 'http://localhost:4200' || 'http://localhost:4000';


// const corsOptions = {
// 	origin: FRONTEND_ORIGIN,
// 	credentials: true,
// 	methods: ['GET','POST','PUT','DELETE','OPTIONS'],
// 	exposedHeaders: ['set-cookie']
// };

const app = express();
app.set('trust proxy', true); // Trust proxy for real IP
const PORT = process.env.PORT || 4001;



// ==========================================
// Initialize Socket.IO
// - attaches to the HTTP server
// - handles blog rooms and real-time events
// ==========================================
// Create HTTP server for Express + Socket.IO
const server = http.createServer(app);
initSocket(server);




// ==========================================
// CORS configuration
// ==========================================
const corsOptions = {
  // Dynamically reflect the request origin so cookies with credentials are allowed
  origin: (origin, callback) => callback(null, true),
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  exposedHeaders: ['set-cookie']
};



// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());

// ==========================================
// ✅ Utility function to extract real IP
// ==========================================
function getClientIp(req) {
  let ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress || req.socket.remoteAddress;
  if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();
  if (ip && ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
  if (ip === '::1') ip = '127.0.0.1';
  const ipv4Match = ip && ip.match(/(\d+\.\d+\.\d+\.\d+)/);
  if (ipv4Match) ip = ipv4Match[1];
  return ip;
}



// Request logger
// - Logs errors for debugging
// - Can log successful requests if needed
// ==========================================
app.use((req, res, next) => {
  const start = Date.now();
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    const durationMs = Date.now() - start;

    if (res.statusCode >= 400) {
      console.error('API_ERROR', {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs,
        params: req.params,
        query: req.query,
        body: req.body,
        response: body
      });
    }

    // Uncomment the following line to log successful requests
    // else console.log('API_OK', { method: req.method, path: req.originalUrl, status: res.statusCode, durationMs });

    return originalJson(body);
  };
  console.log(`User IP: ${getClientIp(req)}`);
  next();
});



// ==========================================
// API routes
// ==========================================

// API routes



app.use("/api/states", stateRoutes);
app.use("/api/cities", cityRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes);
// app.use('/api/blog-likes', blogLikeRoutes); // optional
app.use('/api/features', featuresRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/variants', variantRoutes);
app.use('/api/cookies', cookieRoutes);
app.use('/api/meta', metaRoutes);



// ==========================================
// Health check
// ==========================================
app.get('/', (req, res) => {
  res.json({
    message: 'rameshtradersBE API Server is running!',
    environment: process.env.NODE_ENV || 'development'
  });
});



// ==========================================
// Local/internal IP endpoint
// ==========================================
app.get('/api/user-ip', (req, res) => {
  const ip = getClientIp(req);
  console.log(`User IP requested: ${ip}`);
  res.json({ ip });
});






// ==========================================
// Public/external IP endpoint using utils/ipFetcher.js
// ==========================================
app.get('/api/user-ip-public', async (req, res) => {
  const ip = await getPublicIp();
  if (ip) res.json({ ip });
  else res.status(500).json({ error: 'Failed to fetch public IP' });
});



// ==========================================
// Global error handler
// - catches multer/cloudinary/runtime errors
// ==========================================
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  console.error('UNCAUGHT_ERROR', {
    method: req.method,
    path: req.originalUrl,
    status,
    message: err.message,
    stack: err.stack,
    details: err
  });

  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

// Legacy root-level endpoints removed to prevent ambiguous routing.


// ==========================================
// Start HTTP + Socket.IO server
// ==========================================
server.listen(PORT, () => {
  console.log(`🚀 rameshtradersBE server running on port ${PORT}`);
  console.log('🔌 Socket.IO server ready');
});
