const db = require("../db");
const cloudinary = require("cloudinary").v2;
const { extractPublicId } = require("../cloudinaryUtils");
const { checkSlugUnique } = require("../slugUtils");
const { sendBlogMail } = require("./mailController");
const { sendBlogUpdateMail } = require("./mailController");

// Get all blogs with comprehensive data (no pagination, remove duplicate aggregates)
exports.getAllBlogs = (req, res) => {
  const { sort = "created_at", order = "DESC" } = req.query;

  const query = `
    SELECT 
      b.id, 
      b.title, 
      b.slug, 
      b.content, 
      b.cover_image, 
      b.alt_tag,
      b.is_published, 
      b.likes_count,
      b.comments_count,
      b.created_at, 
      b.updated_at,
      u.name as author_name,
      u.email as author_email
    FROM blogs b
    LEFT JOIN users u ON b.created_by = u.id
    ORDER BY b.${sort} ${order}
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const blogs = results.map((blog) => ({
      id: blog.id,
      title: blog.title,
      slug: blog.slug,
      content: blog.content,
      cover_image: blog.cover_image,
      alt_tag: blog.alt_tag,
      is_published: blog.is_published,
      likes_count: blog.likes_count || 0,
      comments_count: blog.comments_count || 0,
      created_at: blog.created_at,
      updated_at: blog.updated_at,
      author_info: blog.author_name
        ? {
            name: blog.author_name,
            email: blog.author_email,
          }
        : null,
    }));

    res.json({ blogs });
  });
};

// Get a single blog by ID with comprehensive data
exports.getBlogById = (req, res) => {
  const { id } = req.params;

  // First get the blog details with stored counts (these are updated by like/comment controllers)
  const blogQuery = `
    SELECT 
      b.id, 
      b.title, 
      b.slug, 
      b.content, 
      b.cover_image, 
      b.alt_tag,
      b.is_published, 
      b.likes_count,
      b.comments_count,
      b.created_at, 
      b.updated_at,
      u.name as author_name,
      u.email as author_email
    FROM blogs b
    LEFT JOIN users u ON b.created_by = u.id
    WHERE b.id = ?
  `;

  db.query(blogQuery, [id], (err, blogResults) => {
    if (err) {
      console.error("DB_ERROR get blog by id", { id, error: err });
      return res.status(500).json({ error: err.message });
    }
    if (blogResults.length === 0)
      return res.status(404).json({ error: "Blog not found" });

    const blog = blogResults[0];

    // Get ALL comments for this blog
    const commentsQuery = `
      SELECT 
        c.id,
        c.blog_id,
        c.user_id,
        c.name,
        c.content,
        c.likes_count,
        c.created_at,
        c.created_at AS updated_at,
        u.name as user_username,
        u.email as user_email
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.blog_id = ?
      ORDER BY c.created_at DESC
    `;

    db.query(commentsQuery, [id], (err, commentResults) => {
      if (err) {
        console.error("DB_ERROR get blog comments", { blogId: id, error: err });
        return res.status(500).json({ error: err.message });
      }

      let processedComments = 0;
      const comments = [];

      if (commentResults.length === 0) {
        getBlogLike();
        return;
      }

      commentResults.forEach((comment) => {
        const commentLikeQuery = `
          SELECT 
            l.id,
            l.blog_id,
            l.comment_id,
            l.user_id,
            l.ip_address,
            l.created_at,
            u.name as user_name,
            u.email as user_email
          FROM likes l
          LEFT JOIN users u ON l.user_id = u.id
          WHERE l.comment_id = ?
          ORDER BY l.created_at DESC
          LIMIT 1
        `;

        db.query(commentLikeQuery, [comment.id], (err, commentLikeResults) => {
          if (err) {
            console.error("DB_ERROR get comment like", {
              commentId: comment.id,
              error: err,
            });
            comments.push({
              id: comment.id,
              blog_id: comment.blog_id,
              user_id: comment.user_id,
              name: comment.name,
              content: comment.content,
              likes_count: comment.likes_count || 0,
              created_at: comment.created_at,
              updated_at: comment.updated_at,
              is_anonymous: !comment.user_id,
              user_info: comment.user_id
                ? {
                    username: comment.user_username,
                    email: comment.user_email,
                  }
                : null,
              like: null,
            });
          } else {
            const commentLike =
              commentLikeResults.length > 0 ? commentLikeResults[0] : null;

            comments.push({
              id: comment.id,
              blog_id: comment.blog_id,
              user_id: comment.user_id,
              name: comment.name,
              content: comment.content,
              likes_count: comment.likes_count || 0,
              created_at: comment.created_at,
              updated_at: comment.updated_at,
              is_anonymous: !comment.user_id,
              user_info: comment.user_id
                ? {
                    username: comment.user_username,
                    email: comment.user_email,
                  }
                : null,
              like: commentLike
                ? {
                    id: commentLike.id,
                    blog_id: commentLike.blog_id,
                    comment_id: commentLike.comment_id,
                    user_id: commentLike.user_id,
                    ip_address: commentLike.ip_address,
                    created_at: commentLike.created_at,
                    user_info: commentLike.user_id
                      ? {
                          name: commentLike.user_name,
                          email: commentLike.user_email,
                        }
                      : null,
                  }
                : null,
            });
          }

          processedComments++;
          if (processedComments === commentResults.length) {
            getBlogLike();
          }
        });
      });

      function getBlogLike() {
        const likesQuery = `
          SELECT 
            l.id,
            l.blog_id,
            l.user_id,
            l.ip_address,
            l.created_at,
            u.name as user_name,
            u.email as user_email
          FROM likes l
          LEFT JOIN users u ON l.user_id = u.id
          WHERE l.blog_id = ? AND l.comment_id IS NULL
          ORDER BY l.created_at DESC
          LIMIT 1
        `;

        db.query(likesQuery, [id], (err, likeResults) => {
          if (err) {
            console.error("DB_ERROR get blog likes", {
              blogId: id,
              error: err,
            });
            return res.status(500).json({ error: err.message });
          }

          const like = likeResults.length > 0 ? likeResults[0] : null;
          const likes = like ? [like] : [];

          const response = {
            id: blog.id,
            title: blog.title,
            slug: blog.slug,
            content: blog.content,
            cover_image: blog.cover_image,
            alt_tag: blog.alt_tag,
            is_published: blog.is_published,
            likes_count: blog.likes_count || 0,
            comments_count: blog.comments_count || 0,
            created_at: blog.created_at,
            updated_at: blog.updated_at,
            author_info: blog.author_name
              ? {
                  name: blog.author_name,
                  email: blog.author_email,
                }
              : null,
            comments: comments,
            likes: likes,
          };

          res.json(response);
        });
      }
    });
  });
};

// Get a single blog by slug with comprehensive data
exports.getBlogBySlug = (req, res) => {
  const { slug } = req.params;

  // First get the blog details with stored counts (these are updated by like/comment controllers)
  const blogQuery = `
    SELECT 
      b.id, 
      b.title, 
      b.slug, 
      b.content, 
      b.cover_image, 
      b.is_published, 
      b.likes_count,
      b.comments_count,
      b.created_at, 
      b.updated_at,
      u.name as author_name,
      u.email as author_email
    FROM blogs b
    LEFT JOIN users u ON b.created_by = u.id
    WHERE b.slug = ?
  `;

  db.query(blogQuery, [slug], (err, blogResults) => {
    if (err) {
      console.error("DB_ERROR get blog by slug", { slug, error: err });
      return res.status(500).json({ error: err.message });
    }
    if (blogResults.length === 0)
      return res.status(404).json({ error: "Blog not found" });

    const blog = blogResults[0];

    // Get ALL comments for this blog
    const commentsQuery = `
      SELECT 
        c.id,
        c.blog_id,
        c.user_id,
        c.name,
        c.content,
        c.likes_count,
        c.created_at,
        c.created_at AS updated_at,
        u.name as user_username,
        u.email as user_email
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.blog_id = ?
      ORDER BY c.created_at DESC
    `;

    db.query(commentsQuery, [blog.id], (err, commentResults) => {
      if (err) {
        console.error("DB_ERROR get blog comments", {
          blogId: blog.id,
          error: err,
        });
        return res.status(500).json({ error: err.message });
      }

      // Process each comment to get its most recent like
      let processedComments = 0;
      const comments = [];

      if (commentResults.length === 0) {
        // No comments, just get the blog like
        getBlogLike();
        return;
      }

      commentResults.forEach((comment, index) => {
        // Get only the most recent like for this comment
        const commentLikeQuery = `
          SELECT 
            l.id,
            l.blog_id,
            l.comment_id,
            l.user_id,
            l.ip_address,
            l.created_at,
            u.name as user_name,
            u.email as user_email
          FROM likes l
          LEFT JOIN users u ON l.user_id = u.id
          WHERE l.comment_id = ?
          ORDER BY l.created_at DESC
          LIMIT 1
        `;

        db.query(commentLikeQuery, [comment.id], (err, commentLikeResults) => {
          if (err) {
            console.error("DB_ERROR get comment likes", {
              commentId: comment.id,
              error: err,
            });
            return res.status(500).json({ error: err.message });
          }

          const like =
            commentLikeResults.length > 0 ? commentLikeResults[0] : null;
          const likes = like ? [like] : [];

          comments.push({
            id: comment.id,
            blog_id: comment.blog_id,
            user_id: comment.user_id,
            name: comment.name,
            content: comment.content,
            likes_count: comment.likes_count || 0,
            created_at: comment.created_at,
            updated_at: comment.updated_at,
            user_info: comment.user_username
              ? {
                  username: comment.user_username,
                  email: comment.user_email,
                }
              : null,
            likes: likes,
          });

          processedComments++;
          if (processedComments === commentResults.length) {
            getBlogLike();
          }
        });
      });

      function getBlogLike() {
        // Get only the most recent like for the blog
        const likesQuery = `
          SELECT 
            l.id,
            l.blog_id,
            l.user_id,
            l.ip_address,
            l.created_at,
            u.name as user_name,
            u.email as user_email
          FROM likes l
          LEFT JOIN users u ON l.user_id = u.id
          WHERE l.blog_id = ? AND l.comment_id IS NULL
          ORDER BY l.created_at DESC
          LIMIT 1
        `;

        db.query(likesQuery, [blog.id], (err, likeResults) => {
          if (err) {
            console.error("DB_ERROR get blog likes", {
              blogId: blog.id,
              error: err,
            });
            return res.status(500).json({ error: err.message });
          }

          const like = likeResults.length > 0 ? likeResults[0] : null;
          const likes = like ? [like] : [];

          const response = {
            id: blog.id,
            title: blog.title,
            slug: blog.slug,
            content: blog.content,
            cover_image: blog.cover_image,
            is_published: blog.is_published,
            likes_count: blog.likes_count || 0,
            comments_count: blog.comments_count || 0,
            created_at: blog.created_at,
            updated_at: blog.updated_at,
            author_info: blog.author_name
              ? {
                  name: blog.author_name,
                  email: blog.author_email,
                }
              : null,
            comments: comments,
            likes: likes,
          };

          res.json(response);
        });
      }
    });
  });
};

// Get published blogs only (no pagination, remove duplicate aggregates)
exports.getPublishedBlogs = (req, res) => {
  const { sort = "created_at", order = "DESC" } = req.query;

  const query = `
    SELECT 
      b.id, 
      b.title, 
      b.slug, 
      b.content, 
      b.cover_image,
      b.alt_tag, 
      b.is_published, 
      b.likes_count,
      b.comments_count,
      b.created_at, 
      b.updated_at,
      u.name as author_name,
      u.email as author_email
    FROM blogs b
    LEFT JOIN users u ON b.created_by = u.id
    WHERE b.is_published = 1
    ORDER BY b.${sort} ${order}
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const blogs = results.map((blog) => ({
      id: blog.id,
      title: blog.title,
      slug: blog.slug,
      content: blog.content,
      cover_image: blog.cover_image,
      is_published: blog.is_published,
      likes_count: blog.likes_count || 0,
      comments_count: blog.comments_count || 0,
      created_at: blog.created_at,
      updated_at: blog.updated_at,
      author_info: blog.author_name
        ? {
            name: blog.author_name,
            email: blog.author_email,
          }
        : null,
    }));

    res.json({ blogs });
  });
};

// Get blog statistics
exports.getBlogStats = (req, res) => {
  const { id } = req.params;

  const statsQuery = `
    SELECT 
      b.id,
      b.title,
      b.alt_tag,
      b.likes_count,
      b.comments_count,
      b.created_at,
      b.updated_at
    FROM blogs b
    WHERE b.id = ?
  `;

  db.query(statsQuery, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0)
      return res.status(404).json({ error: "Blog not found" });

    const stats = results[0];
    res.json({
      blog_id: stats.id,
      title: stats.title,
      likes_count: stats.likes_count || 0,
      comments_count: stats.comments_count || 0,
      created_at: stats.created_at,
      updated_at: stats.updated_at,
    });
  });
};

// Create a new blog
exports.createBlog = async (req, res) => {
  try {
    const { title, slug, content, is_published, created_by } = req.body;
    const cover_image = req.file ? req.file.path : null;

    if (!title || !slug || !content) {
      return res.status(400).json({
        error:
          "Missing required fields. title, slug, and content are required.",
      });
    }

    const isUnique = await checkSlugUnique(db, "blogs", slug);
    if (!isUnique) {
      return res.status(400).json({
        error: "Slug already exists. Please choose a different slug.",
      });
    }

    db.query(
      "INSERT INTO blogs (title, slug, content, cover_image, is_published, created_by) VALUES (?, ?, ?, ?, ?, ?)",
      [
        title,
        slug,
        content,
        cover_image,
        is_published || false,
        created_by || null,
      ],
      (err, result) => {
        if (err) {
          console.error("Database error creating blog:", err);
          return res.status(500).json({ error: err.message });
        }
        const newBlog = {
          id: result.insertId,
          title,
          slug,
          content,
          cover_image,
          is_published: !!is_published,
          created_by: created_by || null,
        };

        // ✅ Send mail to subscribers
        sendBlogMail(newBlog);

        res.status(201).json(newBlog);
      }
    );
  } catch (error) {
    console.error("Error in createBlog:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Update a blog by ID
exports.updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, slug, content, alt_tag, is_published, created_by } =
      req.body;
    const cover_image = req.file ? req.file.path : req.body.cover_image || null;

    if (!title || !slug || !content) {
      return res.status(400).json({
        error:
          "Missing required fields. title, slug, and content are required.",
      });
    }

    const isUnique = await checkSlugUnique(db, "blogs", slug, id);
    if (!isUnique) {
      return res.status(400).json({
        error: "Slug already exists. Please choose a different slug.",
      });
    }

    db.query(
      `UPDATE blogs 
   SET title = ?, 
       slug = ?, 
       content = ?, 
       cover_image = ?, 
       alt_tag = ?, 
       is_published = ?, 
       created_by = ? 
   WHERE id = ?`,
      [
        title,
        slug,
        content,
        cover_image,
        alt_tag,
        is_published || false,
        created_by || null,
        id,
      ],
      (err, result) => {
        if (err) {
          console.error("Database error updating blog:", err);
          return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Blog not found" });
        }

        const updatedBlog = {
          id,
          title,
          slug,
          content,
          cover_image,
          alt_tag,
          is_published: !!is_published,
          created_by: created_by || null,
        };

        // ✅ Send mail to subscribers
        sendBlogUpdateMail(updatedBlog);

        res.json(updatedBlog);
      }
    );
  } catch (error) {
    console.error("Error in updateBlog:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Delete a blog by ID
exports.deleteBlog = (req, res) => {
  const { id } = req.params;
  // First, get the cover_image for the blog
  db.query(
    "SELECT cover_image FROM blogs WHERE id = ?",
    [id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0)
        return res.status(404).json({ error: "Blog not found" });
      const cover_image = results[0].cover_image;
      const publicId = extractPublicId(cover_image);
      if (publicId) {
        cloudinary.uploader.destroy(publicId, (error, result) => {
          if (error) {
            console.log("Error deleting image from Cloudinary:", error);
          } else {
            console.log("Cloudinary delete result:", result);
          }
          // Proceed to delete the DB record regardless of Cloudinary result
          db.query("DELETE FROM blogs WHERE id = ?", [id], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Blog deleted successfully" });
          });
        });
      } else {
        // No Cloudinary image to delete, just delete from DB
        db.query("DELETE FROM blogs WHERE id = ?", [id], (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: "Blog deleted successfully" });
        });
      }
    }
  );
};

// Get blog counts
exports.getBlogCounts = (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as total_blogs,
      COUNT(CASE WHEN is_published = 1 THEN 1 END) as published_blogs,
      COUNT(CASE WHEN is_published = 0 THEN 1 END) as draft_blogs,
      SUM(likes_count) as total_likes,
      SUM(comments_count) as total_comments
    FROM blogs
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const counts = results[0];
    res.json({
      total_blogs: counts.total_blogs || 0,
      published_blogs: counts.published_blogs || 0,
      draft_blogs: counts.draft_blogs || 0,
      total_likes: counts.total_likes || 0,
      total_comments: counts.total_comments || 0,
    });
  });
};

// Cleanup test blogs
exports.cleanupTestBlogs = (req, res) => {
  const query =
    "DELETE FROM blogs WHERE title LIKE '%Test%' OR slug LIKE '%test%'";
  db.query(query, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      message: "Test blogs cleaned up successfully",
      deleted_count: result.affectedRows,
    });
  });
};
