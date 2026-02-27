/**
 * ✅ HEALTH CHECK ENDPOINTS
 * Monitor system health and dependencies
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db/pool';
import { logger } from '../config/logger';

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: HealthStatus;
    memory: HealthStatus;
    disk?: HealthStatus;
  };
}

interface HealthStatus {
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  details?: Record<string, any>;
}

/**
 * Register health check routes
 */
export async function registerHealthChecks(app: FastifyInstance) {
  // Basic liveness check (always returns 200 if server is running)
  app.get('/health/live', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Detailed health check
  app.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    const health = await performHealthCheck();
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 503 : 503;
    return reply.code(statusCode).send(health);
  });

  // Readiness check (includes dependency checks)
  app.get('/health/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    const health = await performHealthCheck();
    const isReady = health.status === 'healthy';
    const statusCode = isReady ? 200 : 503;
    return reply.code(statusCode).send({ ready: isReady, ...health });
  });
}

/**
 * Perform comprehensive health check
 */
async function performHealthCheck(): Promise<HealthCheckResponse> {
  const checks = {
    database: await checkDatabase(),
    memory: checkMemory(),
  };

  // Determine overall status
  const hasFailures = Object.values(checks).some(c => c.status === 'fail');
  const hasWarnings = Object.values(checks).some(c => c.status === 'warn');

  const status = hasFailures ? 'unhealthy' : hasWarnings ? 'degraded' : 'healthy';

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    checks,
  };
}

/**
 * Check database connectivity and performance
 */
async function checkDatabase(): Promise<HealthStatus> {
  try {
    const start = Date.now();
    const result = await pool.query('SELECT 1 as health_check');
    const duration = Date.now() - start;

    if (result.rows[0]?.health_check !== 1) {
      return {
        status: 'fail',
        message: 'Database query returned unexpected result',
      };
    }

    // Warn if query takes more than 100ms
    if (duration > 100) {
      return {
        status: 'warn',
        message: 'Database response time is slow',
        details: { responseTimeMs: duration },
      };
    }

    return {
      status: 'pass',
      message: 'Database connection healthy',
      details: { responseTimeMs: duration },
    };
  } catch (error: any) {
    logger.error({ err: error }, 'Database health check failed');
    return {
      status: 'fail',
      message: 'Database connection failed',
      details: { error: error.message },
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): HealthStatus {
  const usage = process.memoryUsage();
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
  const rssMB = Math.round(usage.rss / 1024 / 1024);

  // Warn if heap usage exceeds 80%
  const heapUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;

  if (heapUsagePercent > 90) {
    return {
      status: 'fail',
      message: 'Memory usage critically high',
      details: { heapUsedMB, heapTotalMB, rssMB, heapUsagePercent: heapUsagePercent.toFixed(2) },
    };
  }

  if (heapUsagePercent > 80) {
    return {
      status: 'warn',
      message: 'Memory usage high',
      details: { heapUsedMB, heapTotalMB, rssMB, heapUsagePercent: heapUsagePercent.toFixed(2) },
    };
  }

  return {
    status: 'pass',
    message: 'Memory usage normal',
    details: { heapUsedMB, heapTotalMB, rssMB, heapUsagePercent: heapUsagePercent.toFixed(2) },
  };
}
