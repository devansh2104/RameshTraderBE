-- Create category_services table for mapping categories to services
CREATE TABLE IF NOT EXISTS category_services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  service_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);