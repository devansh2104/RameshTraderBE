const db = require('../db');
const { io } = require('../socket'); // Used to broadcast realtime like updates
const { getPublicIp } = require('../utils/ipFetcher'); // ✅ New: import IP fetcher

// Like or unlike a blog or comment (toggle)
exports.toggleLike = async (req, res) => { // ✅ Updated: made async to use getPublicIp
  const { blog_id, comment_id } = req.body;
  const user_id = req.user ? req.user.id : null;
  const anonymous_id = req.anonymousId || null;

  if (!blog_id) {
    return res.status(400).json({ error: 'blog_id is required' });
  }

  // If comment_id is provided, check that comment belongs to blog
  if (comment_id) {
    db.query('SELECT id, blog_id FROM comments WHERE id = ?', [comment_id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0 || results[0].blog_id !== blog_id) {
        return res.status(400).json({ error: 'Invalid comment_id or blog_id' });
      }
      handleLike();
    });
  } else {
    handleLike();
  }

  async function handleLike() {
    // ✅ New: fetch server-side public IP from ipFetcher.js
    const ip_address = await getPublicIp() || 'unknown';

    // Check if already liked
    let checkQuery, checkParams;
    
    if (user_id) {
      // Authenticated user
      checkQuery = 'SELECT id FROM likes WHERE blog_id = ? AND comment_id <=> ? AND user_id = ?';
      checkParams = [blog_id, comment_id || null, user_id];
    } else if (anonymous_id) {
      // Anonymous user with anonymous_id
      checkQuery = 'SELECT id FROM likes WHERE blog_id = ? AND comment_id <=> ? AND anonymous_id = ?';
      checkParams = [blog_id, comment_id || null, anonymous_id];
    } else {
      // Fallback to IP address
      checkQuery = 'SELECT id FROM likes WHERE blog_id = ? AND comment_id <=> ? AND ip_address = ?';
      checkParams = [blog_id, comment_id || null, ip_address];
    }

    db.query(checkQuery, checkParams, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length > 0) {
        // Unlike (delete)
        db.query('DELETE FROM likes WHERE id = ?', [results[0].id], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          updateLikesCount(-1);
        });
      } else {
        // Like (insert)
        const insertQuery = `
          INSERT INTO likes (blog_id, comment_id, user_id, anonymous_id, ip_address) 
          VALUES (?, ?, ?, ?, ?)
        `;
        db.query(insertQuery, [blog_id, comment_id || null, user_id, anonymous_id, ip_address], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          updateLikesCount(1);
        });
      }
    });
  }

  function updateLikesCount(delta) {
    let updateQuery, updateParams;
    if (comment_id) {
      updateQuery = 'UPDATE comments SET likes_count = GREATEST(likes_count + ?, 0) WHERE id = ?';
      updateParams = [delta, comment_id];
    } else {
      updateQuery = 'UPDATE blogs SET likes_count = GREATEST(likes_count + ?, 0) WHERE id = ?';
      updateParams = [delta, blog_id];
    }
    db.query(updateQuery, updateParams, (err) => {
      if (err) return res.status(500).json({ error: err.message });

      if (comment_id) {
        // After updating, fetch fresh count and broadcast to the blog room
        db.query('SELECT likes_count, blog_id FROM comments WHERE id = ?', [comment_id], (err2, rows) => {
          const likes_count = rows?.[0]?.likes_count ?? null;
          const bId = rows?.[0]?.blog_id ?? blog_id;
          try {
            io().to(`blog:${bId}`).emit('comment:likes', {
              blog_id: bId,
              comment_id,
              delta,
              likes_count
            });
          } catch {}
          res.json({ message: delta > 0 ? 'Liked' : 'Unliked' });
        });
      } else {
        // Blog like: fetch fresh count and broadcast
        db.query('SELECT likes_count FROM blogs WHERE id = ?', [blog_id], (err2, rows) => {
          const likes_count = rows?.[0]?.likes_count ?? null;
          try {
            io().to(`blog:${blog_id}`).emit('blog:likes', {
              blog_id,
              delta,
              likes_count
            });
          } catch {}
          res.json({ message: delta > 0 ? 'Liked' : 'Unliked' });
        });
      }
    });
  }
};

// Get like status for a blog or comment
exports.getLikeStatus = (req, res) => {
  const { blog_id, comment_id } = req.query;
  const user_id = req.user ? req.user.id : null;
  const anonymous_id = req.anonymousId || null;
  const ip_address = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';

  if (!blog_id) {
    return res.status(400).json({ error: 'blog_id is required' });
  }

  let checkQuery, checkParams;
  
  if (user_id) {
    // Authenticated user
    checkQuery = 'SELECT id FROM likes WHERE blog_id = ? AND comment_id <=> ? AND user_id = ?';
    checkParams = [blog_id, comment_id || null, user_id];
  } else if (anonymous_id) {
    // Anonymous user with anonymous_id
    checkQuery = 'SELECT id FROM likes WHERE blog_id = ? AND comment_id <=> ? AND anonymous_id = ?';
    checkParams = [blog_id, comment_id || null, anonymous_id];
  } else {
    // Fallback to IP address
    checkQuery = 'SELECT id FROM likes WHERE blog_id = ? AND comment_id <=> ? AND ip_address = ?';
    checkParams = [blog_id, comment_id || null, ip_address];
  }

  db.query(checkQuery, checkParams, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ liked: results.length > 0 });
  });
};

// Get all liked blogs and comments for current user/anonymous
exports.getMyLikes = (req, res) => {
  const user_id = req.user ? req.user.id : null;
  const anonymous_id = req.anonymousId || null;
  const ip_address = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';

  let selectorClause, selectorParam;
  if (user_id) {
    selectorClause = 'user_id = ?';
    selectorParam = user_id;
  } else if (anonymous_id) {
    selectorClause = 'anonymous_id = ?';
    selectorParam = anonymous_id;
  } else {
    selectorClause = 'ip_address = ?';
    selectorParam = ip_address;
  }

  const blogLikesQuery = `
    SELECT DISTINCT blog_id
    FROM likes
    WHERE ${selectorClause} AND comment_id IS NULL AND blog_id IS NOT NULL
  `;

  const commentLikesQuery = `
    SELECT blog_id, comment_id
    FROM likes
    WHERE ${selectorClause} AND comment_id IS NOT NULL
  `;

  db.query(blogLikesQuery, [selectorParam], (err, blogRows) => {
    if (err) return res.status(500).json({ error: err.message });

    db.query(commentLikesQuery, [selectorParam], (err2, commentRows) => {
      if (err2) return res.status(500).json({ error: err2.message });

      const likedBlogs = blogRows.map(row => row.blog_id);
      const likedComments = commentRows.map(row => ({ blog_id: row.blog_id, comment_id: row.comment_id }));

      res.json({ likedBlogs, likedComments });
    });
  });
};
