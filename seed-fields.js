require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mysql = require('mysql2/promise');

async function seedFields() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_HOST && process.env.DB_HOST.includes('aivencloud.com')
      ? { rejectUnauthorized: false }
      : undefined,
    multipleStatements: true
  });

  const fieldsSql = `
    INSERT IGNORE INTO fields (name, crop_type, planting_date, stage, assigned_agent_id, created_by, notes) VALUES
    ('North Field A', 'Maize', DATE_SUB(CURDATE(), INTERVAL 45 DAY), 'Growing', 2, 1, 'Good growth, needs irrigation'),
    ('South Field B', 'Wheat', DATE_SUB(CURDATE(), INTERVAL 20 DAY), 'Planted', 3, 1, 'Recently planted'),
    ('East Field C', 'Beans', DATE_SUB(CURDATE(), INTERVAL 90 DAY), 'Ready', 2, 1, 'Ready for harvest soon'),
    ('West Field D', 'Rice', DATE_SUB(CURDATE(), INTERVAL 150 DAY), 'Harvested', NULL, 1, 'Harvest completed'),
    ('Center Field E', 'Maize', DATE_SUB(CURDATE(), INTERVAL 35 DAY), 'Growing', 3, 1, 'Monitoring pest activity');
  `;

  const updatesSql = `
    INSERT INTO field_updates (field_id, agent_id, stage, notes) VALUES
    (1, 2, 'Growing', 'Crops growing well, soil moisture adequate'),
    (2, 3, 'Planted', 'Seeds sprouting, monitoring germination'),
    (3, 2, 'Ready', 'Approaching harvest maturity'),
    (1, 2, 'Growing', 'Applied fertilizer, observing response'),
    (5, 3, 'Growing', 'Observed some pest damage, sprayed pesticide');
  `;

  try {
    await connection.query(fieldsSql);
    console.log('Fields seeded successfully');
    await connection.query(updatesSql);
    console.log('Field updates seeded successfully');
  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    await connection.end();
  }
}

seedFields();
