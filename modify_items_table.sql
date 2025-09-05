-- Modify items table to add new columns and change price structure
ALTER TABLE items 
ADD COLUMN price_range VARCHAR(100) AFTER price,
ADD COLUMN price_per_piece DECIMAL(10,2) AFTER price_range,
ADD COLUMN features VARCHAR(255) AFTER price_per_piece,
ADD COLUMN bricks_type VARCHAR(100) AFTER features,
ADD COLUMN material VARCHAR(100) AFTER bricks_type,
ADD COLUMN type VARCHAR(100) AFTER material,
ADD COLUMN color VARCHAR(50) AFTER type,
ADD COLUMN size VARCHAR(50) AFTER color,
ADD COLUMN shape VARCHAR(50) AFTER size,
ADD COLUMN porosity VARCHAR(50) AFTER shape;

-- Update existing price data to price_per_piece
UPDATE items SET price_per_piece = price WHERE price IS NOT NULL;

-- Create index for better performance