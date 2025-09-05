const express = require("express");
const multer = require("multer");
const { storage } = require("../cloudinaryConfig");
const blogController = require("../controllers/blogController");
const { authenticateJWT, isAdmin } = require("../middleware/auth");

const router = express.Router();
const upload = multer({ storage });

// ==================== BLOG CRUD OPERATIONS ====================

// Get all blogs with comprehensive data (pagination, filtering, sorting)
router.get("/", blogController.getAllBlogs);

// Get published blogs only
router.get("/published", blogController.getPublishedBlogs);

// Get blog counts
router.get("/count/total", blogController.getBlogCounts);

// Get blog statistics
router.get("/:id/stats", blogController.getBlogStats);

// Get a single blog by slug with comprehensive data (comments, likes)
router.get("/slug/:slug", blogController.getBlogBySlug);
// Get a single blog by ID with comprehensive data (comments, likes)
router.get("/:id", blogController.getBlogById);

// Create a new blog (with optional cover image)
router.post(
  "/",
  authenticateJWT,
  isAdmin,
  upload.single("cover_image"),
  blogController.createBlog
);

// Update a blog by ID (with optional cover image)
router.put(
  "/:id",
  authenticateJWT,
  isAdmin,
  upload.single("cover_image"),
  blogController.updateBlog
);

// Delete a blog by ID
router.delete("/:id", authenticateJWT, isAdmin, blogController.deleteBlog);

// ==================== BLOG CLEANUP ====================

// Cleanup test blogs (for test cleanup)
router.delete(
  "/test/cleanup",
  authenticateJWT,
  isAdmin,
  blogController.cleanupTestBlogs
);

module.exports = router;
