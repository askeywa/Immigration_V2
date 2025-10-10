// backend/src/controllers/requestLoggingController.ts
import { Request, Response } from 'express';
import { TenantRequest } from '../middleware/tenantResolution';
import { RequestResponseLoggingService } from '../middleware/requestResponseLogging';
import { log } from '../utils/logger';

export class RequestLoggingController {
  /**
   * Get performance metrics
   * GET /api/request-logging/metrics
   */
  static async getMetrics(req: TenantRequest, res: Response): Promise<void> {
    try {
      const metrics = RequestResponseLoggingService.getPerformanceMetrics();
      
      res.json({
        success: true,
        data: {
          metrics,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      log.error('Failed to get performance metrics', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        userId: req.user?._id,
        tenantId: req.tenantId
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to get performance metrics'
      });
    }
  }

  /**
   * Clear performance metrics
   * DELETE /api/request-logging/metrics
   */
  static async clearMetrics(req: TenantRequest, res: Response): Promise<void> {
    try {
      if (!req.isSuperAdmin) {
        res.status(403).json({
          success: false,
          error: 'Super admin access required'
        });
        return;
      }

      RequestResponseLoggingService.clearMetrics();
      
      log.info('Performance metrics cleared', {
        userId: req.user?._id,
        tenantId: req.tenantId
      });

      res.json({
        success: true,
        message: 'Performance metrics cleared successfully'
      });
    } catch (error) {
      log.error('Failed to clear performance metrics', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        userId: req.user?._id,
        tenantId: req.tenantId
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to clear performance metrics'
      });
    }
  }

  /**
   * Get logging configuration
   * GET /api/request-logging/config
   */
  static async getConfig(req: TenantRequest, res: Response): Promise<void> {
    try {
      if (!req.isSuperAdmin) {
        res.status(403).json({
          success: false,
          error: 'Super admin access required'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          message: 'Logging configuration is managed through environment variables and code',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      log.error('Failed to get logging config', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        userId: req.user?._id,
        tenantId: req.tenantId
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to get logging configuration'
      });
    }
  }

  /**
   * Get request statistics
   * GET /api/request-logging/stats
   */
  static async getStats(req: TenantRequest, res: Response): Promise<void> {
    try {
      const metrics = RequestResponseLoggingService.getPerformanceMetrics();
      const { recent, averageResponseTime, slowestRequests, memoryUsage } = metrics;

      // Calculate additional statistics
      const statusCodes = recent.reduce((acc: any, m: any) => {
        acc[m.statusCode] = (acc[m.statusCode] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      const methods = recent.reduce((acc: any, m: any) => {
        acc[m.method] = (acc[m.method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const tenantRequests = recent.reduce((acc: any, m: any) => {
        const tenantId = m.tenantId || 'no-tenant';
        acc[tenantId] = (acc[tenantId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const stats = {
        totalRequests: recent.length,
        averageResponseTime: Math.round(averageResponseTime * 100) / 100,
        statusCodes,
        methods,
        tenantRequests,
        slowestRequests: slowestRequests.map((req: any) => ({
          method: req.method,
          path: req.path,
          responseTime: Math.round(req.responseTime * 100) / 100,
          statusCode: req.statusCode,
          tenantId: req.tenantId,
          timestamp: req.timestamp
        })),
        memoryUsage: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100,
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
          external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100
        },
        timestamp: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      log.error('Failed to get request statistics', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        userId: req.user?._id,
        tenantId: req.tenantId
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to get request statistics'
      });
    }
  }

  /**
   * Get health status of logging system
   * GET /api/request-logging/health
   */
  static async getHealth(req: TenantRequest, res: Response): Promise<void> {
    try {
      const metrics = RequestResponseLoggingService.getPerformanceMetrics();
      const memoryUsage = process.memoryUsage();
      
      // Check if system is healthy
      const isHealthy = memoryUsage.heapUsed < 1000 * 1024 * 1024; // Less than 1GB
      const averageResponseTime = metrics.averageResponseTime;
      const isPerformant = averageResponseTime < 2000; // Less than 2 seconds average

      const health = {
        status: isHealthy && isPerformant ? 'healthy' : 'warning',
        checks: {
          memory: {
            status: memoryUsage.heapUsed < 1000 * 1024 * 1024 ? 'ok' : 'warning',
            value: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
            threshold: '1000MB'
          },
          performance: {
            status: averageResponseTime < 2000 ? 'ok' : 'warning',
            value: `${Math.round(averageResponseTime)}ms`,
            threshold: '2000ms'
          }
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      log.error('Failed to get logging health status', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to get health status'
      });
    }
  }
}
