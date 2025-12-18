import fs from 'fs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Build optional SSL config if DB_SSL is enabled
let sslOptions;
if (process.env.DB_SSL === 'true') {
  try {
    if (process.env.DB_SSL_CA_PATH) {
      sslOptions = { ca: fs.readFileSync(process.env.DB_SSL_CA_PATH) };
      console.log('🔒 DB SSL: using CA from', process.env.DB_SSL_CA_PATH);
    } else {
      // If DB_SSL is true but no CA path is provided, use default TLS mode (rejectUnauthorized true)
      sslOptions = { rejectUnauthorized: true };
      console.log('🔒 DB SSL: enabled (no CA provided), will require TLS');
    }
  } catch (err) {
    console.warn('⚠️  Could not read DB SSL CA file:', err.message);
    sslOptions = { rejectUnauthorized: true };
  }
}

// Create connection pool with better error handling
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 60000,
  idleTimeout: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ...(sslOptions ? { ssl: sslOptions } : {})
});

// Test connection with retry logic (modified for development)
const testConnection = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await pool.getConnection();
      console.log('✅ MySQL Database connected successfully');
      connection.release();
      return true;
    } catch (err) {
      console.error(`❌ MySQL Database connection attempt ${i + 1} failed:`, err.message);
      console.error('Connection details:', {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD ? '***SET***' : 'NOT SET'
      });
      if (i === retries - 1) {
        console.error('❌ All database connection attempts failed - running in offline mode');
        console.log('💡 Tip: Install MySQL locally or use Docker for full functionality');
        return false;
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

/**
 * Health check for database connection
 * @returns {Promise<boolean>} true if connection is healthy
 */
export const healthCheck = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.execute('SELECT 1 as health_check');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database health check failed:', error.message);
    return false;
  }
};

/**
 * Get connection pool statistics
 * @returns {Object} Pool statistics
 */
export const getPoolStats = () => {
  return {
    totalConnections: pool.totalCount,
    activeConnections: pool.activeCount,
    idleConnections: pool.idleCount,
    pendingRequests: pool.pendingCount
  };
};

testConnection();

// Add error handling for the pool
pool.on('error', (err) => {
  console.error('Database pool error:', err);
  if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
    console.log('Attempting to reconnect to database...');
    // The pool will automatically handle reconnection
  }
});

export default pool;
