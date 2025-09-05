-- Cookie Management Tables
-- These tables store cookie consent and cookie data with IP addresses

-- Table for storing visitor/user information
CREATE TABLE IF NOT EXISTS cookie_visitors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    visitor_id VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_visitor_id (visitor_id),
    INDEX idx_ip_address (ip_address)
);  

-- Table for storing cookie consent preferences
CREATE TABLE IF NOT EXISTS cookie_consents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    visitor_id INT NOT NULL,
    strictly_necessary BOOLEAN DEFAULT TRUE,
    functional BOOLEAN DEFAULT FALSE,
    performance BOOLEAN DEFAULT FALSE,
    marketing BOOLEAN DEFAULT FALSE,
    social BOOLEAN DEFAULT FALSE,
    rejected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visitor_id) REFERENCES cookie_visitors(id) ON DELETE CASCADE,
    INDEX idx_visitor_id (visitor_id),
    INDEX idx_created_at (created_at)
);

-- Table for storing individual cookie records with IP addresses
CREATE TABLE IF NOT EXISTS cookie_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    visitor_id INT NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    cookie_name VARCHAR(255) NOT NULL,
    cookie_value TEXT,
    category ENUM('Strictly Necessary', 'Functional', 'Performance', 'Marketing', 'Social', 'Security', 'E-commerce', 'Personalization', 'Third Party', 'Advertising', 'Analytics', 'Uncategorized') DEFAULT 'Uncategorized',
    http_only BOOLEAN DEFAULT FALSE,
    secure BOOLEAN DEFAULT FALSE,
    same_site VARCHAR(20) DEFAULT 'Lax',
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visitor_id) REFERENCES cookie_visitors(id) ON DELETE CASCADE,
    INDEX idx_visitor_id (visitor_id),
    INDEX idx_ip_address (ip_address),
    INDEX idx_cookie_name (cookie_name),
    INDEX idx_category (category),
    INDEX idx_created_at (created_at)
);

-- Table for cookie consent logs (audit trail)
CREATE TABLE IF NOT EXISTS cookie_consent_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    visitor_id INT NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    action ENUM('accept_all', 'accept_necessary', 'reject_all', 'update_preferences') NOT NULL,
    previous_consent JSON,
    new_consent JSON,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visitor_id) REFERENCES cookie_visitors(id) ON DELETE CASCADE,
    INDEX idx_visitor_id (visitor_id),
    INDEX idx_ip_address (ip_address),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);
