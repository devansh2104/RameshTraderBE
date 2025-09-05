-- Create features table
CREATE TABLE IF NOT EXISTS features (
    id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    features JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert sample features data for bricks
INSERT INTO features (features) VALUES 
('{"bricks_type": "Clay Bricks", "material": "Clay", "type": "Handmade Bricks", "color": "Gray", "size": "Standard", "shape": "Rectangular", "porosity": "Solid"}'),
('{"bricks_type": "Concrete Bricks", "material": "Concrete", "type": "Machine Made", "color": "Gray", "size": "Standard", "shape": "Rectangular", "porosity": "Solid"}'),
('{"bricks_type": "Fly Ash Bricks", "material": "Fly Ash", "type": "Machine Made", "color": "Light Gray", "size": "Standard", "shape": "Rectangular", "porosity": "Solid"}'); 