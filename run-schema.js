const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runSchema() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '8498',
    multipleStatements: true
  });

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  
  try {
    await connection.query(schema);
    console.log('Schema applied successfully');
  } catch (err) {
    console.error('Schema error:', err.message);
  } finally {
    await connection.end();
  }
}

runSchema();
