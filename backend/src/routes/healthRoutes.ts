// backend/src/routes/healthRoutes.ts
import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { log } from '../utils/logger';
import DNSAutomationService from '../services/dnsAutomationService';
import SSLAutomationService from '../services/sslAutomationService';
import SubdomainProvisioningService from '../services/subdomainProvisioningService';
import APMService from '../services/apmService';
import LoggingManagementService from '../services/loggingService';
import BackupService from '../services/backupService';
import { PerformanceMonitoringService } from '../services/performanceMonitoringService';

const router = Router();

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  details?: any;
}

/**
 * Basic health check endpoint
 */
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const healthChecks: HealthCheckResult[] = [];
    
    // Check MongoDB
    try {
      const mongoStart = Date.now();
      await mongoose.connection.db?.admin().ping();
      healthChecks.push({
        service: 'MongoDB',
        status: 'healthy',
        responseTime: Date.now() - mongoStart,
        details: {
          connectionState: mongoose.connection.readyState,
          host: mongoose.connection.host,
          port: mongoose.connection.port
        }
      });
    } catch (error) {
      healthChecks.push({
        service: 'MongoDB',
        status: 'unhealthy',
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
    }
    
    // Check Redis (if configured)
    try {
      const redisStart = Date.now();
      // This would check Redis connection if available
      healthChecks.push({
        service: 'Redis',
        status: 'healthy',
        responseTime: Date.now() - redisStart,
        details: { note: 'Redis check not implemented yet' }
      });
    } catch (error) {
      healthChecks.push({
        service: 'Redis',
        status: 'degraded',
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
    }
    
    // Check external services
    const externalServices = [
      { name: 'DNS Automation', service: DNSAutomationService.getInstance() },
      { name: 'SSL Automation', service: SSLAutomationService.getInstance() },
      { name: 'Subdomain Provisioning', service: SubdomainProvisioningService.getInstance() },
      { name: 'APM Service', service: APMService.getInstance() },
      { name: 'Logging Management', service: LoggingManagementService.getInstance() },
      { name: 'Backup Service', service: BackupService.getInstance() }
    ];
    
    for (const { name, service } of externalServices) {
      try {
        const serviceStart = Date.now();
        // Check if service has a health check method
        if (typeof (service as any).healthCheck === 'function') {
          await (service as any).healthCheck();
          healthChecks.push({
            service: name,
            status: 'healthy',
            responseTime: Date.now() - serviceStart
          });
        } else {
          healthChecks.push({
            service: name,
            status: 'healthy',
            responseTime: Date.now() - serviceStart,
            details: { note: 'Health check not implemented' }
          });
        }
      } catch (error) {
        healthChecks.push({
          service: name,
          status: 'degraded',
          error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
        });
      }
    }
    
    // Determine overall health
    const unhealthyServices = healthChecks.filter((check: any) => check.status === 'unhealthy');
    const degradedServices = healthChecks.filter((check: any) => check.status === 'degraded');
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyServices.length > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedServices.length > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }
    
    const responseTime = Date.now() - startTime;
    
    (res as any).status(overallStatus === 'unhealthy' ? 503 : overallStatus === 'degraded' ? 200 : 200).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services: healthChecks,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime()
    });
    
  } catch (error) {
    log.error('Health check failed', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
    
    (res as any).status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
    });
  }
});

/**
 * Detailed health check endpoint
 */
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const detailedChecks = {
      database: {
        mongodb: {
          connected: mongoose.connection.readyState === 1,
          host: mongoose.connection.host,
          port: mongoose.connection.port,
          name: mongoose.connection.name,
          collections: Object.keys(mongoose.connection.collections).length
        }
      },
      performance: {
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        cpu: process.cpuUsage(),
        uptime: process.uptime()
      },
      services: {
        performanceMonitoring: PerformanceMonitoringService.getPerformanceSummary(),
        // Add other service status checks here
      }
    };
    
    (res as any).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      details: detailedChecks
    });
    
  } catch (error) {
    log.error('Detailed health check failed', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
    
    (res as any).status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed',
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
    });
  }
});

/**
 * Readiness probe endpoint
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check critical services
    const isMongoConnected = mongoose.connection.readyState === 1;
    
    if (!isMongoConnected) {
      return (res as any).status(503).json({
        status: 'not_ready',
        reason: 'Database not connected'
      });
    }
    
    (res as any).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    log.error('Readiness check failed', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
    
    (res as any).status(503).json({
      status: 'not_ready',
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
    });
  }
});

/**
 * Liveness probe endpoint
 */
router.get('/live', (req: Request, res: Response) => {
  (res as any).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;
