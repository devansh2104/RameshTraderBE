-- Add slug column to categories table
ALTER TABLE categories 
ADD COLUMN slug VARCHAR(255) NOT NULL UNIQUE AFTER name;

-- Create index for performance
CREATE INDEX idx_categories_slug ON categories(slug);

-- Update existing categories with slug based on name (if any exist)
-- This will generate slugs from existing category names
UPDATE categories SET slug = LOWER(REPLACE(REPLACE(REPLACE(name, ' ', '-'), '.', ''), ',', '')) WHERE slug IS NULL OR slug = '';
