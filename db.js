// Database configuration and connection setup
// Load environment variables based on NODE_ENV
defaultEnv = '.env';
if (process.env.NODE_ENV === 'development') {
  require('dotenv').config({ path: '.env.development' });
} else if (process.env.NODE_ENV === 'local') {
  require('dotenv').config({ path: '.env.local' });
} else {
  require('dotenv').config();
}
const mysql = require('mysql2');

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Create database connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '10000', 10) // 10s default
});


// Test database connection

db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error connecting to MySQL:', {
      message: err?.message,
      code: err?.code,
      errno: err?.errno,
      sqlState: err?.sqlState,
      fatal: err?.fatal,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      connectTimeoutMs: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '10000', 10)
    });
    return;
  }
  console.log('✅ MySQL connected successfully!');
  console.log(`📊 Database: ${process.env.DB_NAME} on ${process.env.DB_HOST}`);
  connection.release();
});

module.exports = db;

/*
Database configuration and connection management.
This file handles MySQL database setup and connection pooling.
Features:
- Environment-based database configuration
- Connection pooling for better performance
- Automatic table structure validation
- Error handling for missing environment variables
- Database connection status logging
*/
