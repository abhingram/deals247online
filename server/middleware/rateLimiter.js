import rateLimit from 'express-rate-limit';
import logger from '../config/logger.js';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip} - ${req.method} ${req.originalUrl}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(res.get('Retry-After') / 60) + ' minutes'
    });
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path.startsWith('/api/health');
  }
});

// Stricter limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many login attempts. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip} - ${req.method} ${req.originalUrl}`);
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Account temporarily locked due to too many failed attempts.',
      retryAfter: Math.ceil(res.get('Retry-After') / 60) + ' minutes'
    });
  }
});

// Limiter for search endpoints
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 search requests per minute
  message: {
    error: 'Too many search requests',
    message: 'Search rate limit exceeded. Please wait before searching again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Search rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Search rate limit exceeded',
      message: 'Too many search requests. Please try again in a minute.',
      retryAfter: '1 minute'
    });
  }
});

// Limiter for deal creation/updates (admin operations)
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit admin operations
  message: {
    error: 'Too many admin operations',
    message: 'Admin operation rate limit exceeded.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Admin rate limit exceeded for IP: ${req.ip} - ${req.method} ${req.originalUrl}`);
    res.status(429).json({
      error: 'Admin rate limit exceeded',
      message: 'Too many administrative operations. Please slow down.',
      retryAfter: '1 minute'
    });
  }
});

// Create custom limiter function
export const createCustomLimiter = (options) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: options.message || {
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Custom rate limit exceeded for IP: ${req.ip} - ${req.method} ${req.originalUrl}`);
      res.status(429).json(options.message || {
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(res.get('Retry-After') / 60) + ' minutes'
      });
    },
    skip: options.skip
  });
};