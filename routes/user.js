const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateJWT, isAdmin } = require('../middleware/auth');

// Register (user or admin)
router.post('/register', userController.register);
// Login (user or admin)
router.post('/login', userController.login);
// Get current user info
router.get('/me', authenticateJWT, userController.me);

// Get all users (admin only)
router.get('/', authenticateJWT, isAdmin, userController.getAllUsers);

// Get user by ID (admin only)
router.get('/:id', authenticateJWT, isAdmin, userController.getUserById);

// Delete test users (for test cleanup)
router.delete('/test/cleanup', userController.deleteTestUsers);
router.delete('/:id', authenticateJWT, isAdmin, userController.deleteUser);


module.exports = router;