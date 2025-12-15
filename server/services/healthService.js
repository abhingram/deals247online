import os from 'os';
import pool from '../config/database.js';
import logger from '../config/logger.js';

class HealthService {
  constructor() {
    this.startTime = Date.now();
  }

  // Check database connectivity
  async checkDatabase() {
    try {
      const connection = await pool.getConnection();
      await connection.execute('SELECT 1');
      connection.release();
      return { status: 'healthy', responseTime: Date.now() };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return { status: 'unhealthy', error: error.message };
    }
  }

  // Check system resources
  checkSystem() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = Math.round((usedMemory / totalMemory) * 100);

    const loadAverage = os.loadavg();

    return {
      memory: {
        total: Math.round(totalMemory / 1024 / 1024), // MB
        used: Math.round(usedMemory / 1024 / 1024), // MB
        free: Math.round(freeMemory / 1024 / 1024), // MB
        usagePercent: memoryUsagePercent
      },
      cpu: {
        loadAverage: loadAverage.map(load => Math.round(load * 100) / 100)
      },
      uptime: Math.round(os.uptime())
    };
  }

  // Check application health
  checkApplication() {
    const uptime = Math.round((Date.now() - this.startTime) / 1000); // seconds

    return {
      uptime,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      platform: process.platform,
      arch: process.arch
    };
  }

  // Comprehensive health check
  async getHealth() {
    const [dbHealth, systemHealth, appHealth] = await Promise.all([
      this.checkDatabase(),
      this.checkSystem(),
      this.checkApplication()
    ]);

    const overallStatus = dbHealth.status === 'healthy' ? 'healthy' : 'unhealthy';

    const health = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        system: systemHealth,
        application: appHealth
      }
    };

    // Log health check results
    if (overallStatus === 'unhealthy') {
      logger.error('Health check failed:', health);
    } else {
      logger.info('Health check passed');
    }

    return health;
  }

  // Detailed health check for monitoring systems
  async getDetailedHealth() {
    const health = await this.getHealth();

    // Add additional metrics for monitoring
    health.metrics = {
      process: {
        pid: process.pid,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        databaseHost: process.env.DB_HOST ? 'configured' : 'not configured'
      }
    };

    return health;
  }
}

export default new HealthService();