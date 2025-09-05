const express = require('express');
const commentController = require('../controllers/commentController');
const { authenticateJWT } = require('../middleware/auth');
const { identifyAnonymousUser, canModifyComment } = require('../middleware/anonymousAuth');

// ✅ Import the public IP fetcher utility
const { getPublicIp } = require('../utils/ipFetcher');

const router = express.Router();

// ==================== CRUD OPERATIONS ====================

// Get all comments (with pagination and filtering)
router.get('/', commentController.getAllComments);

// Get comments for a specific blog
router.get('/blog/:blogId', commentController.getCommentsByBlogId);

// Create a new comment (public - no auth required)
router.post('/blog/:blogId', identifyAnonymousUser, async (req, res, next) => {
  try {
    // ✅ Fetch the exact public IP
    const publicIp = await getPublicIp();
    req.body.ipAddress = publicIp || req.body.ipAddress; // fallback just in case

    // Call the original createComment controller
    commentController.createComment(req, res, next);
  } catch (err) {
    next(err);
  }
});

// Get all likes for a comment (public)
router.get('/:commentId/likes', commentController.getCommentLikes);

// Get comment statistics (public)
router.get('/:commentId/stats', commentController.getCommentStats);

// Get like status for a comment (public - no auth required)
router.get('/:commentId/like/status', identifyAnonymousUser, commentController.getCommentLikeStatus);

// Get a single comment by ID (public)
router.get('/:commentId', commentController.getCommentById);

// Update a comment (requires auth - only comment author or admin)
router.put('/:commentId', canModifyComment, commentController.updateComment);

// Delete a comment (requires auth - only comment author or admin)
router.delete('/:commentId', canModifyComment, commentController.deleteComment);

// ==================== LIKE/UNLIKE OPERATIONS ====================

// Like or unlike a comment (toggle)
router.post('/:commentId/like', identifyAnonymousUser, commentController.toggleCommentLike);

module.exports = router;
