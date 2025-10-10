// backend/src/controllers/performanceMonitoringController.ts
import { Request, Response } from 'express';
import { TenantRequest } from '../middleware/tenantResolution';
import { PerformanceMonitoringService } from '../services/performanceMonitoringService';
import { log } from '../utils/logger';

export class PerformanceMonitoringController {
  /**
   * Get performance metrics
   * GET /api/performance-monitoring/metrics
   */
  static async getMetrics(req: TenantRequest, res: Response): Promise<void> {
    try {
      const limit = parseInt((req as any).query.limit as string) || 100;
      const metrics = PerformanceMonitoringService.getMetrics(limit);
      
      (res as any).json({
        success: true,
        data: {
          metrics: metrics.map((m: any) => ({
            requestId: (m as any).requestId,
            timestamp: (m as any).timestamp,
            method: (m as any).method,
            path: (m as any).path,
            statusCode: (m as any).statusCode,
            responseTime: Math.round((typeof (m as any).responseTime === 'string' ? parseFloat((m as any).responseTime) : (m as any).responseTime) * 100) / 100,
            memoryUsage: {
              heapUsed: Math.round((m as any).memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
              heapTotal: Math.round((m as any).memoryUsage.heapTotal / 1024 / 1024 * 100) / 100
            },
            tenantId: (m as any).tenantId,
            userId: (m as any).userId,
            userRole: (m as any).userRole,
            databaseQueries: (m as any).databaseQueries || 0,
            databaseQueryTime: (m as any).databaseQueryTime ? Math.round((m as any).databaseQueryTime * 100) / 100 : 0,
            cacheHits: (m as any).cacheHits || 0,
            cacheMisses: (m as any).cacheMisses || 0,
            errors: (m as any).errors || [],
            warnings: (m as any).warnings || []
          })),
          count: metrics.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      log.error('Failed to get performance metrics', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        userId: (req as any).user?._id,
        tenantId: (req as any).tenantId
      });
      
      (res as any).status(500).json({
        success: false,
        error: 'Failed to get performance metrics'
      });
    }
  }

  /**
   * Get system health metrics
   * GET /api/performance-monitoring/health
   */
  static async getHealthMetrics(req: TenantRequest, res: Response): Promise<void> {
    try {
      const limit = parseInt((req as any).query.limit as string) || 100;
      const healthMetrics = PerformanceMonitoringService.getHealthMetrics(limit);
      
      (res as any).json({
        success: true,
        data: {
          healthMetrics: healthMetrics.map((h: any) => ({
            timestamp: h.timestamp,
            uptime: Math.round(h.uptime * 100) / 100,
            memoryUsage: {
              rss: Math.round(h.memoryUsage.rss / 1024 / 1024 * 100) / 100,
              heapUsed: Math.round(h.memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
              heapTotal: Math.round(h.memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
              external: Math.round(h.memoryUsage.external / 1024 / 1024 * 100) / 100
            },
            databaseConnections: h.databaseConnections,
            tenantCount: h.tenantCount,
            averageResponseTime: Math.round(h.averageResponseTime * 100) / 100,
            errorRate: Math.round(h.errorRate * 10000) / 100,
            requestsPerMinute: h.requestsPerMinute
          })),
          count: healthMetrics.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      log.error('Failed to get health metrics', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        userId: (req as any).user?._id,
        tenantId: (req as any).tenantId
      });
      
      (res as any).status(500).json({
        success: false,
        error: 'Failed to get health metrics'
      });
    }
  }

  /**
   * Get tenant-specific performance metrics
   * GET /api/performance-monitoring/tenant/:tenantId?
   */
  static async getTenantMetrics(req: TenantRequest, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).params.tenantId || (req as any).tenantId;
      
      if (!tenantId) {
        (res as any).status(400).json({
          success: false,
          error: 'Tenant ID is required'
        });
        return;
      }

      // Check if user has access to this tenant's metrics
      if (!(req as any).isSuperAdmin && (req as any).tenantId !== tenantId) {
        (res as any).status(403).json({
          success: false,
          error: 'Access denied to view this tenant\'s metrics'
        });
        return;
      }

      const tenantMetrics = PerformanceMonitoringService.getTenantMetrics(tenantId);
      
      (res as any).json({
        success: true,
        data: {
          tenantMetrics: {
            ...tenantMetrics,
            topEndpoints: (tenantMetrics as any).topEndpoints?.map((ep: any) => ({
              path: (ep as any).path,
              count: (ep as any).count,
              averageTime: Math.round((ep as any).averageTime * 100) / 100
            })) || [],
            userActivity: (tenantMetrics as any).userActivity?.map((ua: any) => ({
              userId: (ua as any).userId,
              requestCount: (ua as any).requestCount,
              lastActivity: (ua as any).lastActivity
            })) || []
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      log.error('Failed to get tenant metrics', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        userId: (req as any).user?._id,
        tenantId: (req as any).tenantId
      });
      
      (res as any).status(500).json({
        success: false,
        error: 'Failed to get tenant metrics'
      });
    }
  }

  /**
   * Get all tenant metrics (super admin only)
   * GET /api/performance-monitoring/tenants
   */
  static async getAllTenantMetrics(req: TenantRequest, res: Response): Promise<void> {
    try {
      if (!(req as any).isSuperAdmin) {
        (res as any).status(403).json({
          success: false,
          error: 'Super admin access required'
        });
        return;
      }

      const allTenantMetrics = PerformanceMonitoringService.getTenantMetrics();
      const tenantMetricsArray = allTenantMetrics instanceof Map 
        ? Array.from(allTenantMetrics.values()).map((tm: any) => ({
            tenantId: (tm as any).tenantId,
            timestamp: (tm as any).timestamp,
            requestCount: (tm as any).requestCount,
            averageResponseTime: Math.round((tm as any).averageResponseTime * 100) / 100,
            errorCount: (tm as any).errorCount,
            errorRate: Math.round((tm as any).errorRate * 10000) / 100,
            memoryUsage: Math.round((tm as any).memoryUsage / 1024 / 1024 * 100) / 100,
            databaseQueries: (tm as any).databaseQueries,
            cacheHitRate: Math.round((tm as any).cacheHitRate * 10000) / 100,
            topEndpoints: (tm as any).topEndpoints?.slice(0, 5) || [], // Top 5 endpoints
            userActivity: (tm as any).userActivity?.slice(0, 5) || [] // Top 5 users
          }))
        : [allTenantMetrics];
      
      (res as any).json({
        success: true,
        data: {
          tenantMetrics: tenantMetricsArray,
          totalTenants: allTenantMetrics instanceof Map ? allTenantMetrics.size : 1,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      log.error('Failed to get all tenant metrics', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        userId: (req as any).user?._id,
        tenantId: (req as any).tenantId
      });
      
      (res as any).status(500).json({
        success: false,
        error: 'Failed to get tenant metrics'
      });
    }
  }

  /**
   * Get performance alerts
   * GET /api/performance-monitoring/alerts
   */
  static async getAlerts(req: TenantRequest, res: Response): Promise<void> {
    try {
      const severity = (req as any).query.severity as string;
      const resolved = (req as any).query.resolved === 'true' ? true : (req as any).query.resolved === 'false' ? false : undefined;
      
      const alerts = PerformanceMonitoringService.getAlerts(
        severity as any,
        resolved
      );
      
      (res as any).json({
        success: true,
        data: {
          alerts: alerts.map((a: any) => ({
            id: (a as any).id,
            timestamp: (a as any).timestamp,
            type: (a as any).type,
            severity: (a as any).severity,
            message: (a as any).message,
            tenantId: (a as any).tenantId,
            userId: (a as any).userId,
            metrics: (a as any).metrics,
            resolved: (a as any).resolved,
            resolvedAt: (a as any).resolvedAt
          })),
          count: alerts.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      log.error('Failed to get performance alerts', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        userId: (req as any).user?._id,
        tenantId: (req as any).tenantId
      });
      
      (res as any).status(500).json({
        success: false,
        error: 'Failed to get performance alerts'
      });
    }
  }

  /**
   * Resolve performance alert
   * PUT /api/performance-monitoring/alerts/:alertId/resolve
   */
  static async resolveAlert(req: TenantRequest, res: Response): Promise<void> {
    try {
      if (!(req as any).isSuperAdmin) {
        (res as any).status(403).json({
          success: false,
          error: 'Super admin access required'
        });
        return;
      }

      const { alertId } = (req as any).params;
      const resolved = PerformanceMonitoringService.resolveAlert(alertId);
      
      if (resolved) {
        log.info('Performance alert resolved', {
          alertId,
          userId: (req as any).user?._id,
          tenantId: (req as any).tenantId
        });

        (res as any).json({
          success: true,
          message: 'Alert resolved successfully'
        });
      } else {
        (res as any).status(404).json({
          success: false,
          error: 'Alert not found or already resolved'
        });
      }
    } catch (error) {
      log.error('Failed to resolve alert', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        userId: (req as any).user?._id,
        tenantId: (req as any).tenantId,
        alertId: (req as any).params.alertId
      });
      
      (res as any).status(500).json({
        success: false,
        error: 'Failed to resolve alert'
      });
    }
  }

  /**
   * Get performance summary
   * GET /api/performance-monitoring/summary
   */
  static async getPerformanceSummary(req: TenantRequest, res: Response): Promise<void> {
    try {
      const summary = PerformanceMonitoringService.getPerformanceSummary();
      
      (res as any).json({
        success: true,
        data: {
          summary: {
            totalRequests: (summary as any).totalRequests,
            averageResponseTime: (summary as any).averageResponseTime,
            errorRate: (summary as any).errorRate,
            activeTenants: (summary as any).activeTenants,
            activeAlerts: (summary as any).activeAlerts,
            systemHealth: (summary as any).systemHealth,
            recommendations: PerformanceMonitoringController.generateRecommendations(summary)
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      log.error('Failed to get performance summary', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        userId: (req as any).user?._id,
        tenantId: (req as any).tenantId
      });
      
      (res as any).status(500).json({
        success: false,
        error: 'Failed to get performance summary'
      });
    }
  }

  /**
   * Clear performance metrics
   * DELETE /api/performance-monitoring/metrics
   */
  static async clearMetrics(req: TenantRequest, res: Response): Promise<void> {
    try {
      if (!(req as any).isSuperAdmin) {
        (res as any).status(403).json({
          success: false,
          error: 'Super admin access required'
        });
        return;
      }

      PerformanceMonitoringService.clearMetrics();
      
      log.info('Performance metrics cleared', {
        userId: (req as any).user?._id,
        tenantId: (req as any).tenantId
      });

      (res as any).json({
        success: true,
        message: 'Performance metrics cleared successfully'
      });
    } catch (error) {
      log.error('Failed to clear performance metrics', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        userId: (req as any).user?._id,
        tenantId: (req as any).tenantId
      });
      
      (res as any).status(500).json({
        success: false,
        error: 'Failed to clear performance metrics'
      });
    }
  }

  /**
   * Generate performance recommendations
   */
  private static generateRecommendations(summary: any): string[] {
    const recommendations: string[] = [];

    if ((summary as any).averageResponseTime > 1000) {
      recommendations.push('Consider optimizing database queries or implementing caching to improve response times');
    }

    if ((summary as any).errorRate > 0.02) {
      recommendations.push('High error rate detected. Review error logs and consider implementing better error handling');
    }

    if ((summary as any).activeAlerts > 5) {
      recommendations.push('Multiple performance alerts active. Consider scaling resources or optimizing application performance');
    }

    if ((summary as any).systemHealth === 'critical') {
      recommendations.push('System health is critical. Immediate attention required for performance issues');
    }

    if ((summary as any).activeTenants > 50 && (summary as any).averageResponseTime > 500) {
      recommendations.push('High tenant load detected. Consider implementing load balancing or horizontal scaling');
    }

    if (recommendations.length === 0) {
      recommendations.push('System performance is optimal. Continue monitoring for any changes.');
    }

    return recommendations;
  }

  /**
   * Get performance summary
   * GET /api/performance-monitoring/summary
   */
  static async getSummary(req: TenantRequest, res: Response): Promise<void> {
    try {
      const summary = PerformanceMonitoringService.getPerformanceSummary();
      
      (res as any).json({
        success: true,
        data: summary
      });
    } catch (error) {
      log.error('Failed to get performance summary', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        userId: (req as any).user?._id,
        tenantId: (req as any).tenantId
      });
      
      (res as any).status(500).json({
        success: false,
        message: 'Failed to get performance summary'
      });
    }
  }
}
