-- Comments table for blog comments
CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  blog_id INT NOT NULL,
  user_id INT,
  name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Blog likes table for tracking who liked which blogs
CREATE TABLE IF NOT EXISTS blog_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  blog_id INT NOT NULL,
  user_id INT,
  ip_address VARCHAR(45), -- For anonymous users
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_blog_like (blog_id, user_id, ip_address)
);

-- Comment likes table for tracking who liked which comments
CREATE TABLE IF NOT EXISTS comment_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  comment_id INT NOT NULL,
  user_id INT,
  ip_address VARCHAR(45), -- For anonymous users
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_comment_like (comment_id, user_id, ip_address)
);

-- Indexes for performance
CREATE INDEX idx_comments_blog_id ON comments(blog_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_blog_likes_blog_id ON blog_likes(blog_id);
CREATE INDEX idx_blog_likes_user_id ON blog_likes(user_id);
CREATE INDEX idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON comment_likes(user_id);

/*
comments table structure:
- id: Unique identifier
- blog_id: Blog post this comment belongs to
- user_id: User who made the comment (nullable for anonymous)
- name: Name to display (user name or 'Anonymous')
- content: Comment text
- likes_count: Number of likes on this comment
- created_at: Timestamp

blog_likes table structure:
- id: Unique identifier
- blog_id: Blog that was liked
- user_id: User who liked (nullable for anonymous)
- ip_address: IP address for anonymous users
- created_at: Timestamp

comment_likes table structure:
- id: Unique identifier
- comment_id: Comment that was liked
- user_id: User who liked (nullable for anonymous)
- ip_address: IP address for anonymous users
- created_at: Timestamp
*/ 