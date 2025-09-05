// middleware/anonymousAuth.js
const crypto = require('crypto');

function normalizeIp(ip) {
  if (!ip) return 'unknown';
  if (ip === '::1') return '127.0.0.1';
  if (ip.startsWith('::ffff:')) return ip.substring('::ffff:'.length);
  return ip;
}

function getClientIp(req) {
  const cf = req.headers['cf-connecting-ip'];
  const xri = req.headers['x-real-ip'];
  const xff = req.headers['x-forwarded-for'];
  const fromXff = xff ? xff.split(',')[0].trim() : null;
  const raw = cf || xri || fromXff || req.ip || (req.connection && req.connection.remoteAddress) || 'unknown';
  return normalizeIp(raw);
}

// Generate a unique identifier for anonymous users based on client IP and user agent
function generateAnonymousId(req) {
  const ip = getClientIp(req);
  const userAgent = (req.headers['user-agent'] || 'unknown').trim();
  const combined = `${ip}-${userAgent}`;
  return crypto.createHash('md5').update(combined).digest('hex');
}

// Middleware to identify anonymous users
function identifyAnonymousUser(req, res, next) {
  if (req.user) return next();
  req.anonymousId = generateAnonymousId(req);
  req.isAnonymous = true;
  next();
}

// Middleware to check if user can modify a comment (owner or admin)
function canModifyComment(req, res, next) {
  if (req.user) return next();
  if (!req.anonymousId) {
    req.anonymousId = generateAnonymousId(req);
    req.isAnonymous = true;
  }
  next();
}

module.exports = { 
  identifyAnonymousUser, 
  canModifyComment,
  generateAnonymousId 
};
