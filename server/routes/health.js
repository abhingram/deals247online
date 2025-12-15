import express from 'express';
import healthService from '../services/healthService.js';
import logger from '../config/logger.js';

const router = express.Router();

// Basic health check
router.get('/health', async (req, res) => {
  try {
    const health = await healthService.getHealth();
    const statusCode = health.status === 'healthy' ? 200 : 503;

    // Log health check request
    logger.http(`Health check requested from ${req.ip} - Status: ${health.status}`);

    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check endpoint error:', error);
    res.status(503).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Detailed health check for monitoring systems
router.get('/health/detailed', async (req, res) => {
  try {
    const health = await healthService.getDetailedHealth();

    // Log detailed health check
    logger.http(`Detailed health check requested from ${req.ip}`);

    res.json(health);
  } catch (error) {
    logger.error('Detailed health check endpoint error:', error);
    res.status(503).json({
      status: 'error',
      message: 'Detailed health check failed',
      error: error.message
    });
  }
});

// Readiness probe for Kubernetes
router.get('/health/ready', async (req, res) => {
  try {
    const health = await healthService.getHealth();
    const isReady = health.status === 'healthy';

    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ready' : 'not ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Liveness probe for Kubernetes
router.get('/health/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime())
  });
});

// Metrics endpoint for Prometheus (basic implementation)
router.get('/metrics', async (req, res) => {
  try {
    const health = await healthService.getHealth();

    // Format as Prometheus metrics
    let metrics = '# HELP deals247_health_status Overall health status (1=healthy, 0=unhealthy)\n';
    metrics += '# TYPE deals247_health_status gauge\n';
    metrics += `deals247_health_status ${health.status === 'healthy' ? 1 : 0}\n\n`;

    metrics += '# HELP deals247_memory_usage_percent Memory usage percentage\n';
    metrics += '# TYPE deals247_memory_usage_percent gauge\n';
    metrics += `deals247_memory_usage_percent ${health.services.system.memory.usagePercent}\n\n`;

    metrics += '# HELP deals247_uptime_seconds Application uptime in seconds\n';
    metrics += '# TYPE deals247_uptime_seconds counter\n';
    metrics += `deals247_uptime_seconds ${health.services.application.uptime}\n`;

    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    logger.error('Metrics endpoint error:', error);
    res.status(500).send('# Error generating metrics\n');
  }
});

export default router;