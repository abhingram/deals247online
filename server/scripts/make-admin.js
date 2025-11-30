import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

async function makeUserAdmin() {
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Update the user with email ebizwriters@gmail.com to admin role
    const [result] = await connection.execute(
      'UPDATE users SET role = "admin", updated_at = CURRENT_TIMESTAMP WHERE email = ?',
      ['ebizwriters@gmail.com']
    );

    if (result.affectedRows > 0) {
      console.log('✅ Successfully made ebizwriters@gmail.com an admin user');
    } else {
      console.log('⚠️  User ebizwriters@gmail.com not found in database');
      console.log('   Make sure the user has registered first, then run this script again');
    }

    // Verify the change
    const [users] = await connection.execute(
      'SELECT id, email, role, created_at FROM users WHERE email = ?',
      ['ebizwriters@gmail.com']
    );

    if (users.length > 0) {
      console.log('\n📋 User Details:');
      console.log(`   ID: ${users[0].id}`);
      console.log(`   Email: ${users[0].email}`);
      console.log(`   Role: ${users[0].role}`);
      console.log(`   Created: ${users[0].created_at}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the script
makeUserAdmin();