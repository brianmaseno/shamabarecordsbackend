const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function runSchema() {
  const dbHost = process.env.DB_HOST;
  const dbPort = Number(process.env.DB_PORT || 3306);
  const dbUser = process.env.DB_USER;
  const dbPassword = process.env.DB_PASSWORD;
  const dbName = process.env.DB_NAME;

  if (!dbHost || !dbUser || !dbName) {
    throw new Error('Missing required DB env vars: DB_HOST, DB_USER, DB_NAME');
  }

  const connection = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    ssl: dbHost.includes('aivencloud.com') ? { rejectUnauthorized: false } : undefined,
    multipleStatements: true
  });

  const schemaFile = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const schema = schemaFile
    .replace(/^\s*CREATE\s+DATABASE\s+IF\s+NOT\s+EXISTS\s+[^;]+;\s*$/gim, '')
    .replace(/^\s*USE\s+[^;]+;\s*$/gim, '');
  
  try {
    await connection.query(schema);
    console.log(`Schema applied successfully on database: ${dbName}`);
  } catch (err) {
    console.error('Schema error:', err.message);
  } finally {
    await connection.end();
  }
}

runSchema();
