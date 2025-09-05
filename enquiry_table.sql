-- Create enquiry table for storing user enquiries and service bookings
CREATE TABLE IF NOT EXISTS enquiry (
  enquiry_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  message TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  delivery_date DATE,
  address VARCHAR(255),
  selectedItemsByCategory JSON,
  enquiry_type VARCHAR(50),
  service_type VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);