// backend/src/services/performanceMonitoringService.ts
import { Request, Response, NextFunction } from 'express';
import { TenantRequest } from '../middleware/tenantResolution';
import { log } from '../utils/logger';
import { AuditLogService } from './auditLogService';
import mongoose from 'mongoose';

export interface PerformanceMetrics {
  requestId: string;
  timestamp: Date;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number | string;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  tenantId?: string;
  userId?: string;
  userRole?: string;
  isSuperAdmin?: boolean;
  tenantDomain?: string | null;
  databaseQueries?: number;
  databaseQueryTime?: number;
  cacheHits?: number;
  cacheMisses?: number;
  errors?: string[];
  warnings?: string[];
}

export interface SystemHealthMetrics {
  timestamp: Date;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  activeConnections: number;
  databaseConnections: {
    ready: number;
    total: number;
  };
  tenantCount: number;
  activeUsers: number;
  averageResponseTime: number;
  errorRate: number;
  requestsPerMinute: number;
}

export interface TenantPerformanceMetrics {
  tenantId: string;
  timestamp: Date;
  requestCount: number;
  averageResponseTime: number;
  errorCount: number;
  errorRate: number;
  memoryUsage: number;
  databaseQueries: number;
  cacheHitRate: number;
  topEndpoints: Array<{
    path: string;
    count: number;
    averageTime: number;
  }>;
  userActivity: Array<{
    userId: string;
    requestCount: number;
    lastActivity: Date;
  }>;
}

export interface PerformanceAlert {
  id: string;
  timestamp: Date;
  type: 'response_time' | 'memory_usage' | 'error_rate' | 'database_slow' | 'cache_miss_rate';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  tenantId?: string;
  userId?: string;
  metrics: any;
  resolved: boolean;
  resolvedAt?: Date;
}

export class PerformanceMonitoringService {
  private static metrics: PerformanceMetrics[] = [];
  private static alerts: PerformanceAlert[] = [];
  private static healthMetrics: SystemHealthMetrics[] = [];
  private static tenantMetrics: Map<string, TenantPerformanceMetrics> = new Map();
  private static readonly MAX_TENANT_METRICS = 50; // Limit tenant metrics stored in memory
  
  private static readonly MAX_METRICS_HISTORY = 20; // Optimized for production memory usage
  private static readonly MAX_ALERTS_HISTORY = 10; // Optimized for production memory usage
  private static readonly MAX_HEALTH_HISTORY = 10; // Optimized for production memory usage
  
  private static readonly ALERT_THRESHOLDS = {
    responseTime: 2000, // 2 seconds
    memoryUsage: 1000 * 1024 * 1024, // 1GB
    errorRate: 0.05, // 5%
    databaseSlowQuery: 1000, // 1 second
    cacheMissRate: 0.3 // 30%
  };

  private static isInitialized = false;

  /**
   * Initialize performance monitoring
   */
  static initialize(): void {
    if (this.isInitialized) return;

    // Start system health monitoring
    this.startSystemHealthMonitoring();
    
    // Start cleanup tasks
    this.startCleanupTasks();
    
    // Start periodic memory cleanup every 10 minutes (reduced frequency to prevent blocking)
    setInterval(() => {
      setImmediate(() => {
        this.performMemoryCleanup();
      });
    }, 10 * 60 * 1000);
    
    this.isInitialized = true;
    log.info('Performance monitoring service initialized with memory optimization');
  }

  /**
   * Perform memory cleanup to prevent memory leaks
   */
  private static performMemoryCleanup(): void {
    const before = {
      metrics: this.metrics.length,
      alerts: this.alerts.length,
      health: this.healthMetrics.length,
      tenants: this.tenantMetrics.size
    };

    // Force cleanup of old data
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_HISTORY);
    }
    
    if (this.alerts.length > this.MAX_ALERTS_HISTORY) {
      this.alerts = this.alerts.slice(-this.MAX_ALERTS_HISTORY);
    }
    
    if (this.healthMetrics.length > this.MAX_HEALTH_HISTORY) {
      this.healthMetrics = this.healthMetrics.slice(-this.MAX_HEALTH_HISTORY);
    }

    // Clean up old tenant metrics (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [tenantId, metrics] of this.tenantMetrics.entries()) {
      if (new Date(metrics.timestamp) < oneHourAgo) {
        this.tenantMetrics.delete(tenantId);
      }
    }

    const after = {
      metrics: this.metrics.length,
      alerts: this.alerts.length,
      health: this.healthMetrics.length,
      tenants: this.tenantMetrics.size
    };

    // Log cleanup if significant reduction occurred
    const totalBefore = before.metrics + before.alerts + before.health + before.tenants;
    const totalAfter = after.metrics + after.alerts + after.health + after.tenants;
    
    if (totalBefore - totalAfter > 10) {
      log.info('Performance monitoring memory cleanup completed', {
        before,
        after,
        freed: totalBefore - totalAfter
      });
    }
  }

  /**
   * Create performance monitoring middleware
   */
  static createMonitoringMiddleware() {
    return async (req: TenantRequest, res: Response, next: NextFunction) => {
      const startTime = process.hrtime();
      const startCpuUsage = process.cpuUsage();
      const startMemory = process.memoryUsage();
      
      const requestId = (req as any).requestId || this.generateRequestId();
      (req as any).requestId = requestId;
      
      let databaseQueries = 0;
      let databaseQueryTime = 0;
      let cacheHits = 0;
      let cacheMisses = 0;
      const errors: string[] = [];
      const warnings: string[] = [];

      // Monitor database queries
      const originalQuery = mongoose.Query.prototype.exec;
      const originalAggregate = mongoose.Aggregate.prototype.exec;
      
      mongoose.Query.prototype.exec = function(...args) {
        const queryStart = process.hrtime();
        databaseQueries++;
        
        const result = originalQuery.apply(this, args);
        
        if (result && typeof result.then === 'function') {
          return result.then((res: any) => {
            const queryEnd = process.hrtime(queryStart);
            databaseQueryTime += queryEnd[0] * 1000 + queryEnd[1] / 1000000;
            
            // Check for slow queries
            const queryTime = queryEnd[0] * 1000 + queryEnd[1] / 1000000;
            if (queryTime > PerformanceMonitoringService.ALERT_THRESHOLDS.databaseSlowQuery) {
              warnings.push(`Slow database query: ${queryTime.toFixed(2)}ms`);
            }
            
            return res;
          });
        }
        
        return result;
      };

      mongoose.Aggregate.prototype.exec = function(...args) {
        const aggStart = process.hrtime();
        databaseQueries++;
        
        const result = originalAggregate.apply(this, args);
        
        if (result && typeof result.then === 'function') {
          return result.then((res: any) => {
            const aggEnd = process.hrtime(aggStart);
            databaseQueryTime += aggEnd[0] * 1000 + aggEnd[1] / 1000000;
            
            const queryTime = aggEnd[0] * 1000 + aggEnd[1] / 1000000;
            if (queryTime > PerformanceMonitoringService.ALERT_THRESHOLDS.databaseSlowQuery) {
              warnings.push(`Slow aggregation query: ${queryTime.toFixed(2)}ms`);
            }
            
            return res;
          });
        }
        
        return result;
      };

      // Override response methods to capture completion
      const originalSend = (res as any).send;
      const originalJson = (res as any).json;
      const originalEnd = (res as any).end;

      (res as any).send = function(data: any) {
        return originalSend.call(this, data);
      };

      (res as any).json = function(data: any) {
        return originalJson.call(this, data);
      };

      (res as any).end = function(data?: any) {
        return originalEnd.call(this, data, 'utf8');
      };

      // Capture response completion
      (res as any).on('finish', () => {
        const endTime = process.hrtime(startTime);
        const endCpuUsage = process.cpuUsage(startCpuUsage);
        const endMemory = process.memoryUsage();
        const responseTime = endTime[0] * 1000 + endTime[1] / 1000000;

        // Restore original methods
        mongoose.Query.prototype.exec = originalQuery;
        mongoose.Aggregate.prototype.exec = originalAggregate;

        // Create performance metrics
        const metrics: PerformanceMetrics = {
          requestId,
          timestamp: new Date(),
          method: (req as any).method,
          path: (req as any).path,
          statusCode: (res as any).statusCode,
          responseTime,
          memoryUsage: endMemory,
          cpuUsage: endCpuUsage,
          tenantId: (req as any).tenantId,
          userId: (req as any).user?._id,
          userRole: (req as any).user?.role,
          isSuperAdmin: (req as any).isSuperAdmin,
          tenantDomain: (req as any).tenantDomain,
          databaseQueries,
          databaseQueryTime,
          cacheHits,
          cacheMisses,
          errors,
          warnings
        };

        // Store metrics
        PerformanceMonitoringService.storeMetrics(metrics);

        // Update tenant metrics
        if ((req as any).tenantId) {
          PerformanceMonitoringService.updateTenantMetrics(metrics);
        }

        // Check for performance alerts
        PerformanceMonitoringService.checkPerformanceAlerts(metrics);

        // Log performance issues
        if (responseTime > PerformanceMonitoringService.ALERT_THRESHOLDS.responseTime) {
          log.warn('Slow request detected', {
            requestId,
            method: (req as any).method,
            path: (req as any).path,
            responseTime: responseTime,
            tenantId: (req as any).tenantId,
            userId: (req as any).user?._id,
            databaseQueries,
            databaseQueryTime: `${databaseQueryTime.toFixed(2)}ms`
          });
        }

        if (endMemory.heapUsed > PerformanceMonitoringService.ALERT_THRESHOLDS.memoryUsage) {
          log.warn('High memory usage detected', {
            requestId,
            method: (req as any).method,
            path: (req as any).path,
            memoryUsage: {
              heapUsed: `${(endMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
              heapTotal: `${(endMemory.heapTotal / 1024 / 1024).toFixed(2)}MB`
            },
            tenantId: (req as any).tenantId,
            userId: (req as any).user?._id
          });
        }
      });

      // Handle errors
      (res as any).on('error', (error: Error) => {
        const endTime = process.hrtime(startTime);
        const responseTime = endTime[0] * 1000 + endTime[1] / 1000000;

        // Restore original methods
        mongoose.Query.prototype.exec = originalQuery;
        mongoose.Aggregate.prototype.exec = originalAggregate;

        errors.push(error instanceof Error ? error.message : String(error));

        const metrics: PerformanceMetrics = {
          requestId,
          timestamp: new Date(),
          method: (req as any).method,
          path: (req as any).path,
          statusCode: 500,
          responseTime,
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage(startCpuUsage),
          tenantId: (req as any).tenantId,
          userId: (req as any).user?._id,
          userRole: (req as any).user?.role,
          isSuperAdmin: (req as any).isSuperAdmin,
          tenantDomain: (req as any).tenantDomain,
          databaseQueries,
          databaseQueryTime,
          cacheHits,
          cacheMisses,
          errors,
          warnings
        };

        PerformanceMonitoringService.storeMetrics(metrics);
        PerformanceMonitoringService.checkPerformanceAlerts(metrics);
      });

      next();
    };
  }

  /**
   * Store performance metrics
   */
  private static storeMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_HISTORY);
    }
  }

  /**
   * Update tenant-specific metrics
   */
  private static updateTenantMetrics(metrics: PerformanceMetrics): void {
    if (!(metrics as any).tenantId) return;

    const tenantId = (metrics as any).tenantId;
    const existing = this.tenantMetrics.get(tenantId);
    
    if (existing) {
      existing.requestCount++;
      existing.averageResponseTime = 
        (existing.averageResponseTime * (existing.requestCount - 1) + (typeof (metrics as any).responseTime === 'string' ? parseFloat((metrics as any).responseTime) : (metrics as any).responseTime)) / existing.requestCount;
      
      if ((metrics as any).statusCode >= 400) {
        existing.errorCount++;
        existing.errorRate = existing.errorCount / existing.requestCount;
      }

      existing.memoryUsage = (metrics as any).memoryUsage.heapUsed;
      existing.databaseQueries += (metrics as any).databaseQueries || 0;
      
      if ((metrics as any).cacheHits && (metrics as any).cacheMisses) {
        const totalCacheRequests = (metrics as any).cacheHits + (metrics as any).cacheMisses;
        existing.cacheHitRate = (metrics as any).cacheHits / totalCacheRequests;
      }

      // Update top endpoints
      const endpointIndex = existing.topEndpoints.findIndex(ep => ep.path === (metrics as any).path);
      if (endpointIndex >= 0) {
        existing.topEndpoints[endpointIndex].count++;
        existing.topEndpoints[endpointIndex].averageTime = 
          (existing.topEndpoints[endpointIndex].averageTime * (existing.topEndpoints[endpointIndex].count - 1) + (typeof (metrics as any).responseTime === 'string' ? parseFloat((metrics as any).responseTime) : (metrics as any).responseTime)) / 
          existing.topEndpoints[endpointIndex].count;
      } else {
        existing.topEndpoints.push({
          path: (metrics as any).path,
          count: 1,
          averageTime: typeof (metrics as any).responseTime === 'string' ? parseFloat((metrics as any).responseTime) : (metrics as any).responseTime
        });
      }

      // Sort and keep top 10 endpoints
      existing.topEndpoints.sort((a, b) => b.count - (a as any).count);
      existing.topEndpoints = existing.topEndpoints.slice(0, 10);

      // Update user activity
      if ((metrics as any).userId) {
        const userIndex = existing.userActivity.findIndex(ua => ua.userId === (metrics as any).userId);
        if (userIndex >= 0) {
          existing.userActivity[userIndex].requestCount++;
          existing.userActivity[userIndex].lastActivity = (metrics as any).timestamp;
        } else {
          existing.userActivity.push({
            userId: (metrics as any).userId,
            requestCount: 1,
            lastActivity: (metrics as any).timestamp
          });
        }

        // Sort and keep top 10 users
        existing.userActivity.sort((a, b) => b.requestCount - (a as any).requestCount);
        existing.userActivity = existing.userActivity.slice(0, 10);
      }

    } else {
      // Create new tenant metrics
      const tenantMetrics: TenantPerformanceMetrics = {
        tenantId,
        timestamp: (metrics as any).timestamp,
        requestCount: 1,
        averageResponseTime: typeof (metrics as any).responseTime === 'string' ? parseFloat((metrics as any).responseTime) : (metrics as any).responseTime,
        errorCount: (metrics as any).statusCode >= 400 ? 1 : 0,
        errorRate: (metrics as any).statusCode >= 400 ? 1 : 0,
        memoryUsage: (metrics as any).memoryUsage.heapUsed,
        databaseQueries: (metrics as any).databaseQueries || 0,
        cacheHitRate: (metrics as any).cacheHits && (metrics as any).cacheMisses ? 
          (metrics as any).cacheHits / ((metrics as any).cacheHits + (metrics as any).cacheMisses) : 0,
        topEndpoints: [{
          path: (metrics as any).path,
          count: 1,
          averageTime: typeof (metrics as any).responseTime === 'string' ? parseFloat((metrics as any).responseTime) : (metrics as any).responseTime
        }],
        userActivity: (metrics as any).userId ? [{
          userId: (metrics as any).userId,
          requestCount: 1,
          lastActivity: (metrics as any).timestamp
        }] : []
      };

      this.tenantMetrics.set(tenantId, tenantMetrics);
      
      // Clean up old tenant metrics if we exceed the limit
      if (this.tenantMetrics.size > this.MAX_TENANT_METRICS) {
        const oldestTenantId = this.tenantMetrics.keys().next().value;
        if (oldestTenantId) {
          this.tenantMetrics.delete(oldestTenantId);
        }
      }
    }
  }

  /**
   * Check for performance alerts
   */
  private static checkPerformanceAlerts(metrics: PerformanceMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // Response time alert
    const responseTimeNum = typeof (metrics as any).responseTime === 'string' ? parseFloat((metrics as any).responseTime) : (metrics as any).responseTime;
    if (responseTimeNum > this.ALERT_THRESHOLDS.responseTime) {
      alerts.push({
        id: this.generateAlertId(),
        timestamp: new Date(),
        type: 'response_time',
        severity: responseTimeNum > 5000 ? 'critical' : responseTimeNum > 3000 ? 'high' : 'medium',
        message: `Slow response time: ${responseTimeNum.toFixed(2)}ms for ${(metrics as any).method} ${(metrics as any).path}`,
        tenantId: (metrics as any).tenantId,
        userId: (metrics as any).userId,
        metrics: {
          responseTime: (metrics as any).responseTime,
          method: (metrics as any).method,
          path: (metrics as any).path
        },
        resolved: false
      });
    }

    // Memory usage alert
    if ((metrics as any).memoryUsage.heapUsed > this.ALERT_THRESHOLDS.memoryUsage) {
      alerts.push({
        id: this.generateAlertId(),
        timestamp: new Date(),
        type: 'memory_usage',
        severity: (metrics as any).memoryUsage.heapUsed > 2000 * 1024 * 1024 ? 'critical' : 'high',
        message: `High memory usage: ${((metrics as any).memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        tenantId: (metrics as any).tenantId,
        userId: (metrics as any).userId,
        metrics: {
          memoryUsage: (metrics as any).memoryUsage.heapUsed,
          heapTotal: (metrics as any).memoryUsage.heapTotal
        },
        resolved: false
      });
    }

    // Database slow query alert
    if ((metrics as any).databaseQueryTime && (metrics as any).databaseQueryTime > this.ALERT_THRESHOLDS.databaseSlowQuery) {
      alerts.push({
        id: this.generateAlertId(),
        timestamp: new Date(),
        type: 'database_slow',
        severity: 'medium',
        message: `Slow database query: ${(metrics as any).databaseQueryTime.toFixed(2)}ms with ${(metrics as any).databaseQueries} queries`,
        tenantId: (metrics as any).tenantId,
        userId: (metrics as any).userId,
        metrics: {
          databaseQueryTime: (metrics as any).databaseQueryTime,
          databaseQueries: (metrics as any).databaseQueries
        },
        resolved: false
      });
    }

    // Store alerts with cleanup
    alerts.forEach((alert: any) => {
      this.alerts.push(alert);
      
      // Clean up old alerts
      if (this.alerts.length > this.MAX_ALERTS_HISTORY) {
        this.alerts = this.alerts.slice(-this.MAX_ALERTS_HISTORY);
      }
      
      // Log critical alerts
      if (alert.severity === 'critical') {
        log.error(`Critical performance alert: ${alert.message}`, {
          alertId: alert.id,
          type: alert.type,
          tenantId: alert.tenantId,
          userId: alert.userId,
          metrics: alert.metrics
        });

        // Log to audit service
        AuditLogService.logAction(
          alert.userId || 'system',
          alert.tenantId || 'system',
          'performance_alert',
          'performance' // Use valid enum value instead of long message
        );
      }
    });

    // Keep only recent alerts
    if (this.alerts.length > this.MAX_ALERTS_HISTORY) {
      this.alerts = this.alerts.slice(-this.MAX_ALERTS_HISTORY);
    }
  }

  /**
   * Start system health monitoring
   */
  private static startSystemHealthMonitoring(): void {
    setInterval(async () => {
      try {
        const healthMetrics: SystemHealthMetrics = {
          timestamp: new Date(),
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
          activeConnections: 0, // Would need to track active connections
          databaseConnections: {
            ready: mongoose.connection.readyState === 1 ? 1 : 0,
            total: 1
          },
          tenantCount: this.tenantMetrics.size,
          activeUsers: 0, // Would need to track active users
          averageResponseTime: this.calculateAverageResponseTime(),
          errorRate: this.calculateErrorRate(),
          requestsPerMinute: this.calculateRequestsPerMinute()
        };

        this.healthMetrics.push(healthMetrics);

        // Keep only recent health metrics
        if (this.healthMetrics.length > this.MAX_HEALTH_HISTORY) {
          this.healthMetrics = this.healthMetrics.slice(-this.MAX_HEALTH_HISTORY);
        }

        // Check system health alerts
        this.checkSystemHealthAlerts(healthMetrics);

      } catch (error) {
        log.error('Failed to collect system health metrics', {
          error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
        });
      }
    }, 60000); // Every minute
  }

  /**
   * Start cleanup tasks
   */
  private static startCleanupTasks(): void {
    // Clean up old metrics every hour
    setInterval(() => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      // Clean up old metrics
      this.metrics = this.metrics.filter((m: any) => m.timestamp > oneHourAgo);
      
      // Clean up old alerts (keep for 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      this.alerts = this.alerts.filter((a: any) => (a as any).timestamp > oneDayAgo);
      
      // Clean up old health metrics
      this.healthMetrics = this.healthMetrics.filter((h: any) => h.timestamp > oneHourAgo);
      
      log.info('Performance monitoring cleanup completed', {
        metricsCount: this.metrics.length,
        alertsCount: this.alerts.length,
        healthMetricsCount: this.healthMetrics.length,
        tenantMetricsCount: this.tenantMetrics.size
      });
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Check system health alerts
   */
  private static checkSystemHealthAlerts(health: SystemHealthMetrics): void {
    // High memory usage
    if (health.memoryUsage.heapUsed > this.ALERT_THRESHOLDS.memoryUsage) {
      this.createSystemAlert('memory_usage', 'high', 
        `High system memory usage: ${(health.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    }

    // High error rate
    if (health.errorRate > this.ALERT_THRESHOLDS.errorRate) {
      this.createSystemAlert('error_rate', 'high', 
        `High error rate: ${(health.errorRate * 100).toFixed(2)}%`);
    }

    // Slow average response time
    if (health.averageResponseTime > this.ALERT_THRESHOLDS.responseTime) {
      this.createSystemAlert('response_time', 'medium', 
        `Slow average response time: ${health.averageResponseTime.toFixed(2)}ms`);
    }
  }

  /**
   * Create system alert
   */
  private static createSystemAlert(type: PerformanceAlert['type'], severity: PerformanceAlert['severity'], message: string): void {
    const alert: PerformanceAlert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      type,
      severity,
      message,
      metrics: {},
      resolved: false
    };

    this.alerts.push(alert);

    if (severity === 'critical' || severity === 'high') {
      log.error('System performance alert', {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        message: alert.message
      });
    }
  }

  /**
   * Calculate average response time
   */
  private static calculateAverageResponseTime(): number {
    if (this.metrics.length === 0) return 0;
    
    const recent = this.metrics.slice(-100); // Last 100 requests
    return recent.reduce((sum: any, m: any) => sum + (typeof m.responseTime === 'string' ? parseFloat(m.responseTime) : m.responseTime), 0) / recent.length;
  }

  /**
   * Calculate error rate
   */
  private static calculateErrorRate(): number {
    if (this.metrics.length === 0) return 0;
    
    const recent = this.metrics.slice(-100); // Last 100 requests
    const errorCount = recent.filter((m: any) => m.statusCode >= 400).length;
    return errorCount / recent.length;
  }

  /**
   * Calculate requests per minute
   */
  private static calculateRequestsPerMinute(): number {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    return this.metrics.filter((m: any) => m.timestamp > oneMinuteAgo).length;
  }

  /**
   * Generate request ID
   */
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate alert ID
   */
  private static generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get performance metrics
   */
  static getMetrics(limit: number = 100): PerformanceMetrics[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Get system health metrics
   */
  static getHealthMetrics(limit: number = 100): SystemHealthMetrics[] {
    return this.healthMetrics.slice(-limit);
  }

  /**
   * Get tenant metrics
   */
  static getTenantMetrics(tenantId?: string): TenantPerformanceMetrics | Map<string, TenantPerformanceMetrics> {
    if (tenantId) {
      return this.tenantMetrics.get(tenantId) || {} as TenantPerformanceMetrics;
    }
    return new Map(this.tenantMetrics);
  }

  /**
   * Get alerts
   */
  static getAlerts(severity?: PerformanceAlert['severity'], resolved?: boolean): PerformanceAlert[] {
    let alerts = this.alerts;

    if (severity) {
      alerts = alerts.filter((a: any) => (a as any).severity === severity);
    }

    if (typeof resolved === 'boolean') {
      alerts = alerts.filter((a: any) => (a as any).resolved === resolved);
    }

    return alerts.slice(-100); // Return last 100 alerts
  }

  /**
   * Resolve alert
   */
  static resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find((a: any) => (a as any).id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Clear metrics
   */
  static clearMetrics(): void {
    this.metrics = [];
    this.tenantMetrics.clear();
    this.alerts = [];
    this.healthMetrics = [];
    log.info('Performance monitoring metrics cleared');
  }

  /**
   * Get performance summary
   */
  static getPerformanceSummary(): {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    activeTenants: number;
    activeAlerts: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
  } {
    // Ensure metrics array is initialized
    if (!this.metrics || !Array.isArray(this.metrics)) {
      this.metrics = [];
    }
    const recent = this.metrics.slice(-1000); // Last 1000 requests
    const errorCount = recent.filter((m: any) => m.statusCode >= 400).length;
    const averageResponseTime = recent.length > 0 ? 
      recent.reduce((sum: any, m: any) => sum + (typeof m.responseTime === 'string' ? parseFloat(m.responseTime) : m.responseTime), 0) / recent.length : 0;
    
    // Ensure alerts array is initialized
    if (!this.alerts || !Array.isArray(this.alerts)) {
      this.alerts = [];
    }
    const activeAlerts = this.alerts.filter((a: any) => !(a as any).resolved).length;
    const criticalAlerts = this.alerts.filter((a: any) => !(a as any).resolved && (a as any).severity === 'critical').length;
    
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalAlerts > 0) systemHealth = 'critical';
    else if (activeAlerts > 5 || averageResponseTime > 1000) systemHealth = 'warning';

    return {
      totalRequests: recent.length,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      errorRate: recent.length > 0 ? Math.round((errorCount / recent.length) * 10000) / 100 : 0,
      activeTenants: this.tenantMetrics.size,
      activeAlerts,
      systemHealth
    };
  }
}

export default PerformanceMonitoringService;
