// const { Socket } = require('socket.io');
const db = require('../db');
const { io } = require('../socket');


// ==================== SOCKET.IO HELPERS ====================

// ==================== Safety helpers for socket.io ====================
// These helpers are used to sanitize incoming query parameters (sort, order)
// so that no malicious or invalid values are passed to the database.
// This prevents SQL injection and ensures consistent query behavior.

const SAFE_SORT_COLUMNS = [
  'id', 'blog_id', 'user_id', 'anonymous_id', 'ip_address',
  'name', 'content', 'likes_count', 'created_at', 'updated_at'
];
const SAFE_ORDER_VALUES = ['ASC', 'DESC'];

// Sanitize the "sort" column name:
// If the requested sort column is not in SAFE_SORT_COLUMNS, default to "created_at".
function sanitizeSort(sort) {
  if (!SAFE_SORT_COLUMNS.includes(sort)) {
    return 'created_at';
  }
  return sort;
}

// Sanitize the "order" direction:
// If the requested order is not ASC or DESC, default to "DESC".
function sanitizeOrder(order) {
  if (!SAFE_ORDER_VALUES.includes(order)) {
    return 'DESC';
  }
  return order;
}

// Extract the first IP address from the request:
// This checks "x-forwarded-for" (proxy header), then req.ip,
// then the connection remote address. Returns "unknown" if not found.
function firstIp(req) {
  const xf = req.headers?.['x-forwarded-for'];
  const ip = xf ? xf.split(',')[0] : req.ip || req.connection.remoteAddress || 'unknown';
  return ip;
}

// Emit to all clients currently viewing the specified blog room
function emitToBlog(blogId, event, payload) {
  try {
    io().to(`blog:${blogId}`).emit(event, payload);
  } catch (e) {
    // Socket not initialized or emit failed — log and continue
    console.error('Socket emit failed:', e?.message || e);
  }
}

/*
==================== What this section does ====================

This section provides utility helpers for the WebSocket (Socket.IO) system:

1. Initializes Socket.IO with `initSocket(server)` so clients can connect.
2. Defines safety helpers:
   - `sanitizeSort(sort)` → ensures only safe DB columns can be used for sorting.
   - `sanitizeOrder(order)` → ensures only 'ASC' or 'DESC' are valid order values.
3. Provides `firstIp(req)` → extracts the real IP address from client requests.
4. Provides `emitToBlog(blogId, event, payload)` → 
   a wrapper to emit real-time events to all clients inside a specific blog room.

sql injection protection means - it is used to prevent sql injection

These helpers are important to keep data safe (SQL injection protection),
maintain consistent socket communication, and simplify broadcasting messages.
*/


// ==================== CRUD OPERATIONS ====================

// Get all comments (with pagination and filtering)
// what this function does is - it gets all the comments for a blog and returns it to the client
exports.getAllComments = (req, res) => {
  const { page = 1, limit = 10, blog_id, user_id } = req.query;

  // what this does is - it sanitizes the sort and order values
  // for example: if the sort value is not in the SAFE_SORT_COLUMNS array, then it will be set to 'created_at'
  // for example: if the order value is not in the SAFE_ORDER_VALUES array, then it will be set to 'DESC'
  const sort = sanitizeSort(req.query.sort || "created_at");
  const order = sanitizeOrder(req.query.order || "DESC");
  const offset = (page - 1) * limit;
  
  let whereClause = 'WHERE 1=1';
  let params = [];
  
  if (blog_id) {
    whereClause += ' AND c.blog_id = ?';
    params.push(blog_id);
  }
  
  if (user_id) {
    whereClause += ' AND c.user_id = ?';
    params.push(user_id);
  }
  
  const query = `
    SELECT 
      c.id,
      c.blog_id,
      c.user_id,
      c.anonymous_id,
      c.ip_address,
      c.name,
      c.content,
      c.likes_count,
      c.created_at,
      c.created_at AS updated_at,
      u.name as user_username,
      u.email as user_email,
      b.title as blog_title,
      b.slug as blog_slug
    FROM comments c
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN blogs b ON c.blog_id = b.id
    ${whereClause}
    ORDER BY c.${sort} ${order}
    LIMIT ? OFFSET ?
  `;
  
  params.push(parseInt(limit), offset);
  
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM comments c
      ${whereClause}
    `;
    
    db.query(countQuery, params.slice(0, -2), (err, countResult) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);
      
      const comments = results.map(comment => ({
        id: comment.id,
        blog_id: comment.blog_id,
        user_id: comment.user_id,
        anonymous_id: comment.anonymous_id,
        ip_address: comment.ip_address,
        name: comment.name,
        content: comment.content,
        likes_count: comment.likes_count,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        is_anonymous: !comment.user_id,
        user_info: comment.user_id ? {
          username: comment.user_username,
          email: comment.user_email
        } : null,
        blog_info: {
          title: comment.blog_title,
          slug: comment.blog_slug
        }
      }));

      // (Optional) Could emit fetched list for observers, but not required for blog-detail realtime


      // what it does is - it returns the comments to the client
      res.json({
        comments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    });
  });
};


// Get comments for a specific blog
exports.getCommentsByBlogId = (req, res) => {
  const { blogId } = req.params;
  const { page = 1, limit = 10, sort = 'created_at', order = 'DESC' } = req.query;
  const offset = (page - 1) * limit;
  
  const query = `
    SELECT 
      c.id,
      c.blog_id,
      c.user_id,
      c.anonymous_id,
      c.ip_address,
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
    ORDER BY c.${sort} ${order}
    LIMIT ? OFFSET ?
  `;
  
  db.query(query, [blogId, parseInt(limit), offset], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Get total count for this blog
    db.query('SELECT COUNT(*) as total FROM comments WHERE blog_id = ?', [blogId], (err, countResult) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);
      
      const comments = results.map(comment => ({
        id: comment.id,
        blog_id: comment.blog_id,
        user_id: comment.user_id,
        anonymous_id: comment.anonymous_id,
        ip_address: comment.ip_address,
        name: comment.name,
        content: comment.content,
        likes_count: comment.likes_count,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        is_anonymous: !comment.user_id,
        user_info: comment.user_id ? {
          username: comment.user_username,
          email: comment.user_email
        } : null
      }));
      

      // (Optional) Could emit fetched list for observers, but not required for blog-detail realtime

      // what it does is - it returns the comments to the client
      res.json({
        comments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    });
  });
};

// Get a single comment by ID
exports.getCommentById = (req, res) => {
  const { commentId } = req.params;

  // what this does is - it gets a single comment by id
  const query = `
    SELECT 
      c.id,
      c.blog_id,
      c.user_id,
      c.anonymous_id,
      c.ip_address,
      c.name,
      c.content,
      c.likes_count,
      c.created_at,
      c.created_at AS updated_at,
      u.name as user_username,
      u.email as user_email,
      b.title as blog_title,
      b.slug as blog_slug
    FROM comments c
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN blogs b ON c.blog_id = b.id
    WHERE c.id = ?
  `;
  
  db.query(query, [commentId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Comment not found' });
    
    const comment = results[0];
    const response = {
      id: comment.id,
      blog_id: comment.blog_id,
      user_id: comment.user_id,
      anonymous_id: comment.anonymous_id,
      ip_address: comment.ip_address,
      name: comment.name,
      content: comment.content,
      likes_count: comment.likes_count,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      is_anonymous: !comment.user_id,
      user_info: comment.user_id ? {
        username: comment.user_username,
        email: comment.user_email
      } : null,
      blog_info: {
        title: comment.blog_title,
        slug: comment.blog_slug
      }
    };

    // what it does is - it returns the comment to the client
    res.json(response);
  });
};

// Create a new comment
exports.createComment = (req, res) => {
  const { blogId } = req.params;
  const { content, name } = req.body;
  const userId = req.user ? req.user.id : null;
  const anonymousId = req.anonymousId || null;
  // Use the same IP extraction logic as the API
  let ipAddress = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress || req.socket?.remoteAddress;
  if (ipAddress && ipAddress.includes(',')) ipAddress = ipAddress.split(',')[0].trim();
  if (ipAddress && ipAddress.startsWith('::ffff:')) ipAddress = ipAddress.replace('::ffff:', '');
  if (ipAddress === '::1') ipAddress = '127.0.0.1';
  const ipv4Match = ipAddress && ipAddress.match(/(\d+\.\d+\.\d+\.\d+)/);
  if (ipv4Match) ipAddress = ipv4Match[1];
  console.log(`Comment created with IP: ${ipAddress}`);

  // Validate required fields
  if (!content || !blogId) {
    return res
      .status(400)
      .json({ error: "Missing required fields. content and blogId are required." });
  }

  // For anonymous users, name is required
  if (!userId && !name) {
    return res
      .status(400)
      .json({ error: "Name is required for anonymous comments." });
  }

  // Check if blog exists
  db.query("SELECT id FROM blogs WHERE id = ?", [blogId], (err, results) => {
    if (err) {
      console.error("DB_ERROR check blog exists", { blogId, error: err });
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0)
      return res.status(404).json({ error: "Blog not found" });

    // Get user info if logged in
    let displayName = name || "Anonymous";
    if (userId) {
      db.query(
        "SELECT name FROM users WHERE id = ?",
        [userId],
        (err, userResults) => {
          if (err) {
            console.error("DB_ERROR get user name", { userId, error: err });
            return res.status(500).json({ error: err.message });
          }
          if (userResults.length > 0) {
            displayName = userResults[0].name;
          }
          insertComment();
        }
      );
    } else {
      insertComment();
    }

    function insertComment() {
      const insertQuery = `
        INSERT INTO comments (blog_id, user_id, anonymous_id, ip_address, name, content) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      db.query(
        insertQuery,
        [blogId, userId, anonymousId, ipAddress, displayName, content],
        (err, result) => {
          if (err) {
            console.error("DB_ERROR insert comment", {
              blogId,
              userId,
              anonymousId,
              ipAddress,
              displayName,
              error: err,
            });
            return res.status(500).json({ error: err.message });
          }

          // Update blog comments count
          db.query(
            "UPDATE blogs SET comments_count = comments_count + 1 WHERE id = ?",
            [blogId],
            (err) => {
              if (err)
                console.error("DB_ERROR update blog comments_count +1", {
                  blogId,
                  error: err,
                });
            }
          );

          // Get the created comment with full details
          const getCommentQuery = `
            SELECT 
              c.id,
              c.blog_id,
              c.user_id,
              c.anonymous_id,
              c.ip_address,
              c.name,
              c.content,
              c.likes_count,
              c.created_at,
              c.created_at AS updated_at
            FROM comments c
            WHERE c.id = ?
          `;

          db.query(getCommentQuery, [result.insertId], (err, commentResults) => {
            if (err) {
              console.error("DB_ERROR get created comment", {
                commentId: result.insertId,
                error: err,
              });
              // Fallback to basic response + emit realtime create
              const created = {
                id: result.insertId,
                blog_id: parseInt(blogId, 10),
                user_id: userId,
                anonymous_id: anonymousId,
                ip_address: ipAddress,
                name: displayName,
                content,
                likes_count: 0,
                created_at: new Date(),
                is_anonymous: !userId,
              };
              emitToBlog(blogId, 'comment:created', { comment: created, delta: +1 });
              return res.status(201).json(created);
            } else {
              const comment = commentResults[0];
              const response = {
                id: comment.id,
                blog_id: comment.blog_id,
                user_id: comment.user_id,
                anonymous_id: comment.anonymous_id,
                ip_address: comment.ip_address,
                name: comment.name,
                content: comment.content,
                likes_count: comment.likes_count,
                created_at: comment.created_at,
                updated_at: comment.updated_at,
                is_anonymous: !comment.user_id,
              };

              // ✅ Emit real-time event to all clients in this blog room
              emitToBlog(blogId, 'comment:created', { comment: response, delta: +1 });

              return res.status(201).json(response);
            }
          });
        }
      );
    }
  });
};


// Update a comment
exports.updateComment = (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;
  const userId = req.user ? req.user.id : null;
  const isAdmin = req.user ? req.user.is_admin : false;
  const anonymousId = req.anonymousId || null;
  
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }
  
  // Get comment details
  db.query('SELECT * FROM comments WHERE id = ?', [commentId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Comment not found' });
    
    const comment = results[0];
    
    // Check if user can update this comment
    let canUpdate = false;
    
    if (isAdmin) {
      canUpdate = true;
    } else if (userId && comment.user_id === userId) {
      canUpdate = true;
    } else if (anonymousId && comment.anonymous_id === anonymousId) {
      canUpdate = true;
    }
    
    if (!canUpdate) {
      return res.status(403).json({ error: 'Forbidden: You can only update your own comments' });
    }
    
    // Update comment
    const updateQuery = `
      UPDATE comments 
      SET content = ?
      WHERE id = ?
    `;
    
    db.query(updateQuery, [content, commentId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Get updated comment
      const getCommentQuery = `
        SELECT 
          c.id,
          c.blog_id,
          c.user_id,
          c.anonymous_id,
          c.name,
          c.content,
          c.likes_count,
          c.created_at,
          c.created_at AS updated_at,
          u.name as user_username,
          u.email as user_email
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
      `;
      
      db.query(getCommentQuery, [commentId], (err, commentResults) => {
        if (err) return res.status(500).json({ error: err.message });
        const updatedComment = commentResults[0];
        const response = {
          id: updatedComment.id,
          blog_id: updatedComment.blog_id,
          user_id: updatedComment.user_id,
          anonymous_id: updatedComment.anonymous_id,
          name: updatedComment.name,
          content: updatedComment.content,
          likes_count: updatedComment.likes_count,
          created_at: updatedComment.created_at,
          updated_at: updatedComment.updated_at,
          is_anonymous: !updatedComment.user_id,
          user_info: updatedComment.user_id ? {
            username: updatedComment.user_username,
            email: updatedComment.user_email
          } : null
        };

        // ✅ Broadcast updated comment to viewers of this blog
        emitToBlog(updatedComment.blog_id, 'comment:updated', { comment: response });

        // what it does is - it returns the comment to the client
        res.json(response);
      });
    });
  });
};

// Delete a comment (only by comment author or admin)
exports.deleteComment = (req, res) => {
  const { commentId } = req.params;
  const userId = req.user ? req.user.id : null;
  const isAdmin = req.user ? req.user.is_admin : false;
  const anonymousId = req.anonymousId || null;
  
  // Get comment details
  db.query('SELECT * FROM comments WHERE id = ?', [commentId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Comment not found' });
    
    const comment = results[0];
    
    // Check if user can delete this comment
    let canDelete = false;
    
    if (isAdmin) {
      canDelete = true;
    } else if (userId && comment.user_id === userId) {
      canDelete = true;
    } else if (anonymousId && comment.anonymous_id === anonymousId) {
      canDelete = true;
    }
    
    if (!canDelete) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own comments' });
    }
    
    // Delete comment
    db.query('DELETE FROM comments WHERE id = ?', [commentId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Update blog comments count
      db.query('UPDATE blogs SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = ?', [comment.blog_id], (err) => {
        if (err) console.error('Error updating blog comments count:', err);
      });

      // ✅ Broadcast deletion to viewers of this blog (ensure numeric id for consistency)
      emitToBlog(comment.blog_id, 'comment:deleted', { blog_id: comment.blog_id, comment_id: Number(commentId) });
      
      res.json({ message: 'Comment deleted successfully' });
    });
  });
};

// ==================== LIKE/UNLIKE OPERATIONS ====================

// Like or unlike a comment (toggle)
exports.toggleCommentLike = (req, res) => {
  const { commentId } = req.params;
  const userId = req.user ? req.user.id : null;
  const anonymousId = req.anonymousId || null;
  const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
  
  // Check if comment exists
  db.query('SELECT id, blog_id FROM comments WHERE id = ?', [commentId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Comment not found' });
    
    const comment = results[0];
    
    // Check if already liked
    let checkQuery, checkParams;
    
    if (userId) {
      // Authenticated user
      checkQuery = 'SELECT id FROM likes WHERE comment_id = ? AND user_id = ?';
      checkParams = [commentId, userId];
    } else if (anonymousId) {
      // Anonymous user with anonymous_id
      checkQuery = 'SELECT id FROM likes WHERE comment_id = ? AND anonymous_id = ?';
      checkParams = [commentId, anonymousId];
    } else {
      // Fallback to IP address
      checkQuery = 'SELECT id FROM likes WHERE comment_id = ? AND ip_address = ?';
      checkParams = [commentId, ipAddress];
    }
    
    db.query(checkQuery, checkParams, (err, likeResults) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (likeResults.length > 0) {
        // Unlike (delete)
        db.query('DELETE FROM likes WHERE id = ?', [likeResults[0].id], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          
          // Update comment likes count
          db.query('UPDATE comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?', [commentId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            // ✅ Emit fresh count after unlike
            db.query('SELECT likes_count, blog_id FROM comments WHERE id = ?', [commentId], (err2, rows) => {
              const likes_count = rows?.[0]?.likes_count ?? null;
              const blog_id = rows?.[0]?.blog_id ?? comment.blog_id;
              emitToBlog(blog_id, 'comment:likes', { blog_id, comment_id: commentId, delta: -1, likes_count });
              res.json({ message: 'Comment unliked successfully', liked: false });
            });
          });
        });
      } else {
        // Like (insert)
        const insertQuery = `
          INSERT INTO likes (comment_id, user_id, anonymous_id, ip_address) 
          VALUES (?, ?, ?, ?)
        `;
        
        db.query(insertQuery, [commentId, userId, anonymousId, ipAddress], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          
          // Update comment likes count
          db.query('UPDATE comments SET likes_count = likes_count + 1 WHERE id = ?', [commentId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            // ✅ Emit fresh count after like
            db.query('SELECT likes_count, blog_id FROM comments WHERE id = ?', [commentId], (err2, rows) => {
              const likes_count = rows?.[0]?.likes_count ?? null;
              const blog_id = rows?.[0]?.blog_id ?? comment.blog_id;
              emitToBlog(blog_id, 'comment:likes', { blog_id, comment_id: commentId, delta: +1, likes_count });
              res.json({ message: 'Comment liked successfully', liked: true });
            });
          });
        });
      }
    });
  });
};

// Get like status for a comment
exports.getCommentLikeStatus = (req, res) => {
  const { commentId } = req.params;
  const userId = req.user ? req.user.id : null;
  const anonymousId = req.anonymousId || null;
  
  // Check if comment exists
  db.query('SELECT id FROM comments WHERE id = ?', [commentId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Comment not found' });
    
    // Check if user has liked this comment
    let checkQuery, checkParams;
    
    if (userId) {
      // Authenticated user
      checkQuery = 'SELECT id FROM likes WHERE comment_id = ? AND user_id = ?';
      checkParams = [commentId, userId];
    } else if (anonymousId) {
      // Anonymous user with anonymous_id
      checkQuery = 'SELECT id FROM likes WHERE comment_id = ? AND anonymous_id = ?';
      checkParams = [commentId, anonymousId];
    } else {
      // Fallback to IP address
      const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
      checkQuery = 'SELECT id FROM likes WHERE comment_id = ? AND ip_address = ?';
      checkParams = [commentId, ipAddress];
    }
    
    db.query(checkQuery, checkParams, (err, likeResults) => {
      if (err) return res.status(500).json({ error: err.message });
      
      res.json({ 
        liked: likeResults.length > 0,
        comment_id: commentId,
        user_id: userId,
        anonymous_id: anonymousId,
        is_anonymous: !userId
      });
    });
  });
};

// Get all likes for a comment
exports.getCommentLikes = (req, res) => {
  const { commentId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  
  // Check if comment exists
  db.query('SELECT id FROM comments WHERE id = ?', [commentId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Comment not found' });
    
    // Get likes with user info
    const query = `
      SELECT 
        l.id,
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
      LIMIT ? OFFSET ?
    `;
    
    db.query(query, [commentId, parseInt(limit), offset], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Get total count
      db.query('SELECT COUNT(*) as total FROM likes WHERE comment_id = ?', [commentId], (err, countResult) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);
        
        const likes = results.map(like => ({
          id: like.id,
          comment_id: like.comment_id,
          user_id: like.user_id,
          ip_address: like.ip_address,
          created_at: like.created_at,
          user_info: like.user_id ? {
            name: like.user_name,
            email: like.user_email
          } : null
        }));
        
        res.json({
          likes,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        });
      });
    });
  });
};

// Get comment statistics
exports.getCommentStats = (req, res) => {
  const { commentId } = req.params;
  
  // Check if comment exists
  db.query('SELECT id FROM comments WHERE id = ?', [commentId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Comment not found' });
    
    // Get comment details with stats
    const query = `
      SELECT 
        c.id,
        c.blog_id,
        c.user_id,
        c.name,
        c.content,
        c.likes_count,
        c.created_at,
        c.created_at AS updated_at,
        (SELECT COUNT(*) FROM likes WHERE comment_id = c.id) as total_likes,
        (SELECT COUNT(*) FROM comments WHERE blog_id = c.blog_id) as total_comments_in_blog
      FROM comments c
      WHERE c.id = ?
    `;
    
    db.query(query, [commentId], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const comment = results[0];
      const stats = {
        comment_id: comment.id,
        likes_count: comment.likes_count,
        total_likes: comment.total_likes,
        total_comments_in_blog: comment.total_comments_in_blog,
        created_at: comment.created_at,
        updated_at: comment.updated_at
      };

      // (Optional) Could emit stats, but not required for realtime UX on blog detail
      
      res.json(stats);
    });
  });
};
