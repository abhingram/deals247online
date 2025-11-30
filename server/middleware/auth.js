import db from '../config/database.js';

// Helper function to execute database queries with retry logic
const executeQueryWithRetry = async (query, params, retries = 2) => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await db.query(query, params);
    } catch (error) {
      console.error(`Database query attempt ${i + 1} failed:`, error.message);

      // If it's the last retry, throw the error
      if (i === retries) {
        throw error;
      }

      // For connection errors, wait before retrying
      if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.log(`Retrying database query in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // For other errors, don't retry
        throw error;
      }
    }
  }
};

// Middleware to authenticate user (basic check for firebase_uid)
export const authenticateToken = async (req, res, next) => {
  try {
    // Check for firebase_uid in query params, body, or headers
    const firebase_uid = req.query.firebase_uid || req.body?.firebase_uid || req.headers['firebase-uid'];

    if (!firebase_uid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user exists with retry logic
    const [users] = await executeQueryWithRetry(
      'SELECT id, firebase_uid, email, display_name, role FROM users WHERE firebase_uid = ?',
      [firebase_uid]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request
    req.user = users[0];
    next();
  } catch (error) {
    console.error('Authentication error:', error);

    // Provide more specific error messages
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Database connection error. Please try again.' });
    }

    res.status(500).json({ error: 'Server error' });
  }
};

// Middleware to check if user is admin
export const requireAdmin = async (req, res, next) => {
  try {
    // Check for firebase_uid in query params, body, or headers (prioritize query params for GET requests)
    const firebase_uid = req.query.firebase_uid || req.body?.firebase_uid || req.headers['firebase-uid'];

    if (!firebase_uid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [users] = await executeQueryWithRetry(
      'SELECT role FROM users WHERE firebase_uid = ?',
      [firebase_uid]
    );

    if (users.length === 0 || users[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);

    // Provide more specific error messages
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Database connection error. Please try again.' });
    }

    res.status(500).json({ error: 'Server error' });
  }
};

// Middleware to authenticate admin user (combines authentication and admin check)
export const authenticateAdmin = async (req, res, next) => {
  try {
    // Check for firebase_uid in query params, body, or headers
    const firebase_uid = req.query.firebase_uid || req.body?.firebase_uid || req.headers['firebase-uid'];

    if (!firebase_uid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user exists and is admin with retry logic
    const [users] = await executeQueryWithRetry(
      'SELECT id, firebase_uid, email, display_name, role FROM users WHERE firebase_uid = ?',
      [firebase_uid]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (users[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Attach user to request
    req.user = users[0];
    next();
  } catch (error) {
    console.error('Admin authentication error:', error);

    // Provide more specific error messages
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Database connection error. Please try again.' });
    }

    res.status(500).json({ error: 'Server error' });
  }
};
