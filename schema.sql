CREATE DATABASE IF NOT EXISTS shambarecords;
USE shambarecords;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'agent') NOT NULL DEFAULT 'agent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  crop_type VARCHAR(100) NOT NULL,
  planting_date DATE NOT NULL,
  stage ENUM('Planted', 'Growing', 'Ready', 'Harvested') NOT NULL DEFAULT 'Planted',
  assigned_agent_id INT,
  created_by INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_agent_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS field_updates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  field_id INT NOT NULL,
  agent_id INT NOT NULL,
  stage ENUM('Planted', 'Growing', 'Ready', 'Harvested') NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES users(id)
);

-- Seed data
INSERT INTO users (name, email, password, role) VALUES
('Admin Coordinator', 'admin@shambarecords.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('John Mwangi', 'agent@shambarecords.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'agent'),
('Mary Achieng', 'mary@shambarecords.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'agent');

-- Demo field data
INSERT INTO fields (name, crop_type, planting_date, stage, assigned_agent_id, created_by, notes) VALUES
('North Field A', 'Maize', DATE_SUB(CURDATE(), INTERVAL 45 DAY), 'Growing', 2, 1, 'Good growth, needs irrigation'),
('South Field B', 'Wheat', DATE_SUB(CURDATE(), INTERVAL 20 DAY), 'Planted', 3, 1, 'Recently planted'),
('East Field C', 'Beans', DATE_SUB(CURDATE(), INTERVAL 90 DAY), 'Ready', 2, 1, 'Ready for harvest soon'),
('West Field D', 'Rice', DATE_SUB(CURDATE(), INTERVAL 150 DAY), 'Harvested', NULL, 1, 'Harvest completed'),
('Center Field E', 'Maize', DATE_SUB(CURDATE(), INTERVAL 35 DAY), 'Growing', 3, 1, 'Monitoring pest activity');

-- Demo field updates
INSERT INTO field_updates (field_id, agent_id, stage, notes) VALUES
(1, 2, 'Growing', 'Crops growing well, soil moisture adequate'),
(2, 3, 'Planted', 'Seeds sprouting, monitoring germination'),
(3, 2, 'Ready', 'Approaching harvest maturity'),
(1, 2, 'Growing', 'Applied fertilizer, observing response'),
(5, 3, 'Growing', 'Observed some pest damage, sprayed pesticide');
