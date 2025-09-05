const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'myjwt_token_for_rameshtraders';
const JWT_EXPIRES_IN = '7d';

// Register user or admin
exports.register = async (req, res) => {
  const { name, email, password, is_admin } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  // Check if user already exists
  db.query('SELECT id FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length > 0) return res.status(409).json({ error: 'Email already registered.' });
    // Hash password
    const hash = await bcrypt.hash(password, 10);
    db.query(
      'INSERT INTO users (name, email, password_hash, is_admin) VALUES (?, ?, ?, ?)',
      [name, email, hash, is_admin ? 1 : 0],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Registration successful.' });
      }
    );
  });
};

// Login user or admin
exports.login = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(401).json({ error: 'Invalid credentials.' });
    const user = results[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials.' });
    // Generate JWT
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, is_admin: !!user.is_admin },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_admin: !!user.is_admin
      }
    });
  });
};

// Get current user info from JWT
exports.me = (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    is_admin: !!req.user.is_admin
  });
};

// Get all users (admin only)
exports.getAllUsers = (req, res) => {
  db.query('SELECT id, name, email, is_admin, created_at FROM users', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// Get user by ID (admin only)
exports.getUserById = (req, res) => {
  const { id } = req.params;
  db.query('SELECT id, name, email, is_admin, created_at FROM users WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(results[0]);
  });
};

// Delete test users by email (for test cleanup)
exports.deleteTestUsers = (req, res) => {
  const testEmails = [
    'admin@test.com',
    'user@test.com',
    'admin_blog_comment@test.com',
    'user_blog_comment@test.com'
  ];
  db.query('DELETE FROM users WHERE email IN (?)', [testEmails], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Test users deleted', affectedRows: result.affectedRows });
  });
};

// ✅ Use callback-based db.query for compatibility
exports.deleteUser = (req, res) => {
  const userId = req.params.id;

  // Optional: prevent admin from deleting self
  if (parseInt(userId) === req.user.id) {
    return res.status(400).json({ message: "You cannot delete your own account." });
  }

  db.query('DELETE FROM users WHERE id = ?', [userId], (err, result) => {
    if (err) {
      console.error('Delete error:', err);
      return res.status(500).json({ message: 'Internal server error.' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: 'User deleted successfully.' });
  });
};
