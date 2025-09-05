const express = require('express');
const likeController = require('../controllers/likeController');
const { identifyAnonymousUser } = require('../middleware/anonymousAuth');

const router = express.Router();

// Like/unlike a blog or comment (toggle)
router.post('/', identifyAnonymousUser, likeController.toggleLike);

// Get like status for a blog or comment
router.get('/status', identifyAnonymousUser, likeController.getLikeStatus);

// Get all liked blogs and comments for current user/anonymous
router.get('/mine', identifyAnonymousUser, likeController.getMyLikes);

module.exports = router;