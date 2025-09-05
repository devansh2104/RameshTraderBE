-- Add slug column to items table
ALTER TABLE items 
ADD COLUMN slug VARCHAR(255) NOT NULL UNIQUE AFTER name;

-- Create index for performance
CREATE INDEX idx_items_slug ON items(slug);

-- Update existing items with slug based on name (if any exist)
-- This will generate slugs from existing item names
UPDATE items SET slug = LOWER(REPLACE(REPLACE(REPLACE(name, ' ', '-'), '.', ''), ',', '')) WHERE slug IS NULL OR slug = '';
