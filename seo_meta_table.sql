CREATE TABLE IF NOT EXISTS `seo_meta` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `page_type` VARCHAR(50) NULL,
  `slug` VARCHAR(255) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_type_slug` (`page_type`, `slug`),
  INDEX `idx_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed some defaults
INSERT INTO `seo_meta` (`page_type`, `slug`, `title`, `description`) VALUES
('static', '__default__', 'Ramesh Trader', 'Quality fly ash bricks and pavers. Contact us for pricing.'),
('blog', '__default__', 'Blogs - Ramesh Trader', 'Latest updates and articles from Ramesh Trader.'),
('category', '__default__', 'Products - Ramesh Trader', 'Browse our product categories and specifications.'),
('item', '__default__', 'Product - Ramesh Trader', 'View product details, specifications, and availability.');


