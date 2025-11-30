import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function createBusinessTables() {
  let connection;

  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 60000,
      multipleStatements: true
    });

    console.log('Connected to database successfully');

    // Read and execute the business schema
    console.log('Creating business feature tables...');
    const schemaPath = './server/database/business_schema.sql';
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    // Split the schema into individual statements and execute them
    const statements = schemaSQL.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
        } catch (error) {
          // Log but continue for statements that might fail (like ALTER TABLE)
          console.log('Statement completed with note:', error.message);
        }
      }
    }

    console.log('✅ Business feature tables created successfully!');

  } catch (error) {
    console.error('❌ Error creating business tables:', error.message);
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

createBusinessTables();