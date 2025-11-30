import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function runSchema() {
  let connection;

  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true,
      connectTimeout: 60000,
      acquireTimeout: 60000,
      timeout: 60000
    });

    console.log('Connected to database successfully');

    const schemaPath = './server/database/schema.sql';
    console.log('Reading schema file...');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema...');
    await connection.execute(schema);

    console.log('✅ Schema executed successfully!');
    console.log('✅ All database tables have been created.');

  } catch (error) {
    console.error('❌ Error executing schema:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.sqlState) {
      console.error('SQL State:', error.sqlState);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

runSchema();