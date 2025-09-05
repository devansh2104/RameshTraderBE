-- Users table for authentication (admin and user)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_admin TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick lookup
CREATE INDEX idx_users_email ON users(email);

/*
users table structure:
- id: Unique identifier
- name: User's name
- email: User's email (unique)
- password_hash: Encrypted password (bcrypt)
- is_admin: 1 for admin, 0 for user
- created_at: Timestamp
*/ 