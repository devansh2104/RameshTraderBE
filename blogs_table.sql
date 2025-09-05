-- Blogs table for blog posts
CREATE TABLE IF NOT EXISTS blogs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  content LONGTEXT NOT NULL,
  cover_image VARCHAR(500),
  is_published BOOLEAN DEFAULT FALSE,
  created_by INT,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Index for performance
CREATE INDEX idx_blogs_slug ON blogs(slug);
CREATE INDEX idx_blogs_published ON blogs(is_published);
CREATE INDEX idx_blogs_created_at ON blogs(created_at);

/*
blogs table structure:
- id: Unique identifier
- title: Blog post title
- slug: URL-friendly title (unique)
- content: Blog post content (HTML/text)
- cover_image: URL to cover image
- is_published: Whether the blog is published
- created_by: User who created the blog
- likes_count: Number of likes on the blog
- comments_count: Number of comments on the blog
- created_at: Timestamp when created
- updated_at: Timestamp when last updated
*/ 