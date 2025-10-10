// backend/src/monitoring/enhancedMonitoring.ts
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import redis from 'redis';
import { log } from '../utils/logger';
import * as Sentry from '@sentry/node';

interface MonitoringMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
    slowRequests: number;
  };
  system: {
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    uptime: number;
  };
  database: {
    connections: number;
    queryTime: number;
    slowQueries: number;
    errors: number;
  };
  business: {
    activeUsers: number;
    totalUsers: number;
    activeTenants: number;
    totalTenants: number;
    documentsProcessed: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
    byEndpoint: Record<string, number>;
    recent: any[];
  };
}

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldown: number; // minutes
  lastTriggered?: Date;
}

interface PerformanceThreshold {
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  errorRate: number;
  databaseQueryTime: number;
}

class EnhancedMonitoring {
  private metrics: MonitoringMetrics;
  private alertRules: AlertRule[];
  private thresholds: PerformanceThreshold;
  private redisClient: redis.RedisClientType;
  private isMonitoring = false;
  private requestQueue: any[] = [];
  private static readonly MAX_REQUEST_QUEUE = 20; // ⚠️ CRITICAL LIMIT
  private metricsHistory: MonitoringMetrics[] = [];
  private static readonly MAX_METRICS_HISTORY = 10; // ⚠️ CRITICAL LIMIT

  constructor() {
    // Initialize Redis client only if REDIS_URL is provided
    if (process.env.REDIS_URL) {
      this.redisClient = redis.createClient({ 
        url: process.env.REDIS_URL,
        password: process.env.REDIS_PASSWORD
      });
      this.redisClient.connect().catch(console.error);
    } else {
      // Create a mock Redis client for development when REDIS_URL is not available
      this.redisClient = null as any;
      console.warn('⚠️  Redis URL not provided - monitoring will work without Redis caching');
    }
    
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
        slowRequests: 0
      },
      system: {
        memoryUsage: 0,
        cpuUsage: 0,
        diskUsage: 0,
        uptime: 0
      },
      database: {
        connections: 0,
        queryTime: 0,
        slowQueries: 0,
        errors: 0
      },
      business: {
        activeUsers: 0,
        totalUsers: 0,
        activeTenants: 0,
        totalTenants: 0,
        documentsProcessed: 0
      },
      errors: {
        total: 0,
        byType: {},
        byEndpoint: {},
        recent: []
      }
    };

    this.thresholds = {
      responseTime: 1000, // 1 second
      memoryUsage: 85, // 85%
      cpuUsage: 80, // 80%
      errorRate: 5, // 5%
      databaseQueryTime: 500 // 500ms
    };

    this.alertRules = [
      {
        id: 'high_response_time',
        name: 'High Response Time',
        condition: 'averageResponseTime > threshold',
        threshold: this.thresholds.responseTime,
        severity: 'medium',
        enabled: true,
        cooldown: 15
      },
      {
        id: 'high_memory_usage',
        name: 'High Memory Usage',
        condition: 'memoryUsage > threshold',
        threshold: this.thresholds.memoryUsage,
        severity: 'high',
        enabled: true,
        cooldown: 10
      },
      {
        id: 'high_cpu_usage',
        name: 'High CPU Usage',
        condition: 'cpuUsage > threshold',
        threshold: this.thresholds.cpuUsage,
        severity: 'high',
        enabled: true,
        cooldown: 10
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        condition: 'errorRate > threshold',
        threshold: this.thresholds.errorRate,
        severity: 'critical',
        enabled: true,
        cooldown: 5
      },
      {
        id: 'database_slow_queries',
        name: 'Slow Database Queries',
        condition: 'slowQueries > 10',
        threshold: 10,
        severity: 'medium',
        enabled: true,
        cooldown: 30
      }
    ];

    this.setupSentry();
  }

  /**
   * Start comprehensive monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      log.warn('Enhanced monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    log.info('Starting enhanced monitoring system');

    // Start various monitoring loops
    this.startSystemMonitoring();
    this.startDatabaseMonitoring();
    this.startBusinessMetricsMonitoring();
    this.startAlertMonitoring();
    this.startMetricsCollection();
    this.startPerformanceAnalysis();
  }

  /**
   * Request monitoring middleware
   */
  requestMonitoringMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const requestId = this.generateRequestId();

      // Add request context
      (req as any).requestContext = {
        id: requestId,
        startTime,
        ip: (req as any).ip,
        userAgent: (req as any).get('User-Agent'),
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      };

      // Track request start
      this.trackRequestStart(req);

      // Override (res as any).end to capture response metrics
      const originalEnd = (res as any).end;
      (res as any).end = function(this: any, chunk?: any, encoding?: any) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Track response metrics
        this.trackRequestEnd(req, res, responseTime);

        // Call original end
        originalEnd.call(this, chunk, encoding);
      }.bind(this);

      next();
    };
  }

  /**
   * Start system monitoring
   */
  private startSystemMonitoring(): void {
    setInterval(async () => {
      try {
        await this.collectSystemMetrics();
      } catch (error) {
        log.error('Error collecting system metrics', { error: error instanceof Error ? error.message : String(error) });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Start database monitoring
   */
  private startDatabaseMonitoring(): void {
    setInterval(async () => {
      try {
        await this.collectDatabaseMetrics();
      } catch (error) {
        log.error('Error collecting database metrics', { error: error instanceof Error ? error.message : String(error) });
      }
    }, 60000); // Every minute
  }

  /**
   * Start business metrics monitoring
   */
  private startBusinessMetricsMonitoring(): void {
    setInterval(async () => {
      try {
        await this.collectBusinessMetrics();
      } catch (error) {
        log.error('Error collecting business metrics', { error: error instanceof Error ? error.message : String(error) });
      }
    }, 300000); // Every 5 minutes
  }

  /**
   * Start alert monitoring
   */
  private startAlertMonitoring(): void {
    setInterval(async () => {
      try {
        await this.checkAlerts();
      } catch (error) {
        log.error('Error checking alerts', { error: error instanceof Error ? error.message : String(error) });
      }
    }, 60000); // Every minute
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        log.error('Error collecting metrics', { error: error instanceof Error ? error.message : String(error) });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Start performance analysis
   */
  private startPerformanceAnalysis(): void {
    setInterval(async () => {
      try {
        await this.analyzePerformance();
      } catch (error) {
        log.error('Error analyzing performance', { error: error instanceof Error ? error.message : String(error) });
      }
    }, 300000); // Every 5 minutes
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.metrics.system = {
      memoryUsage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000,
      diskUsage: await this.getDiskUsage(),
      uptime: process.uptime()
    };

    log.debug('System metrics collected', this.metrics.system);
  }

  /**
   * Collect database metrics
   */
  private async collectDatabaseMetrics(): Promise<void> {
    try {
      const admin = mongoose.connection.db?.admin();
      const serverStatus = await admin?.command({ serverStatus: 1 });

      this.metrics.database = {
        connections: serverStatus?.connections?.current || 0,
        queryTime: await this.getAverageQueryTime(),
        slowQueries: await this.getSlowQueryCount(),
        errors: await this.getDatabaseErrorCount()
      };

      log.debug('Database metrics collected', this.metrics.database);
    } catch (error) {
      log.error('Error collecting database metrics', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Collect business metrics
   */
  private async collectBusinessMetrics(): Promise<void> {
    try {
      const User = mongoose.model('User');
      const Tenant = mongoose.model('Tenant');
      const Document = mongoose.model('Document');

      const [totalUsers, activeUsers, totalTenants, activeTenants, documentsProcessed] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        Tenant.countDocuments(),
        Tenant.countDocuments({ status: 'active' }),
        Document.countDocuments()
      ]);

      this.metrics.business = {
        activeUsers,
        totalUsers,
        activeTenants,
        totalTenants,
        documentsProcessed
      };

      log.debug('Business metrics collected', this.metrics.business);
    } catch (error) {
      log.error('Error collecting business metrics', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Collect all metrics
   */
  private async collectMetrics(): Promise<void> {
    // Store current metrics in history
    this.metricsHistory.push({ ...this.metrics });
    
    // ✅ AGGRESSIVE CLEANUP - Keep only last 10
    if (this.metricsHistory.length > EnhancedMonitoring.MAX_METRICS_HISTORY) {
      this.metricsHistory = this.metricsHistory.slice(-EnhancedMonitoring.MAX_METRICS_HISTORY);
    }

    // ❌ DISABLE Redis storage (memory leak source)
    // if (this.redisClient) {
    //   await this.redisClient.setEx('monitoring:current_metrics', 300, JSON.stringify(this.metrics));
    // }

    // ❌ DISABLE database storage (memory leak source)
    // await this.storeMetricsInDatabase();
  }

  /**
   * Track request start
   */
  private trackRequestStart(req: Request): void {
    this.requestQueue.push({
      id: (req as any).requestContext?.id,
      method: (req as any).method,
      url: (req as any).url,
      startTime: (req as any).requestContext?.startTime,
      ip: (req as any).ip,
      userAgent: (req as any).get('User-Agent'),
      tenantId: (req as any).tenantId,
      userId: (req as any).user?.id
    });

    // ✅ AGGRESSIVE CLEANUP - Keep only last 20 requests
    if (this.requestQueue.length > EnhancedMonitoring.MAX_REQUEST_QUEUE) {
      this.requestQueue = this.requestQueue.slice(-EnhancedMonitoring.MAX_REQUEST_QUEUE);
    }

    this.metrics.requests.total++;
  }

  /**
   * Track request end
   */
  private trackRequestEnd(req: Request, res: Response, responseTime: number): void {
    const requestId = (req as any).requestContext?.id;
    const requestIndex = this.requestQueue.findIndex(r => r.id === requestId);

    if (requestIndex !== -1) {
      const request = this.requestQueue[requestIndex];
      (request as any).responseTime = responseTime;
      (request as any).statusCode = (res as any).statusCode;
      (request as any).endTime = Date.now();

      // Update metrics
      if ((res as any).statusCode >= 200 && (res as any).statusCode < 400) {
        this.metrics.requests.successful++;
      } else {
        this.metrics.requests.failed++;
        this.trackError(req, res, responseTime);
      }

      // Update average response time
      const totalRequests = this.metrics.requests.successful + this.metrics.requests.failed;
      this.metrics.requests.averageResponseTime = 
        (this.metrics.requests.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;

      // Track slow requests
      if (responseTime > this.thresholds.responseTime) {
        this.metrics.requests.slowRequests++;
        this.trackSlowRequest(request);
      }
    }
  }

  /**
   * Track errors
   */
  private trackError(req: Request, res: Response, responseTime: number): void {
    const error = {
      id: (req as any).requestContext?.id,
      method: (req as any).method,
      url: (req as any).url,
      statusCode: (res as any).statusCode,
      responseTime,
      ip: (req as any).ip,
      userAgent: (req as any).get('User-Agent'),
      tenantId: (req as any).tenantId,
      userId: (req as any).user?.id,
      timestamp: new Date(),
      stack: (res as any).locals.error?.stack
    };

    this.metrics.errors.total++;
    this.metrics.errors.recent.unshift(error);

    // Keep only last 100 errors
    if (this.metrics.errors.recent.length > 100) {
      this.metrics.errors.recent.pop();
    }

    // Update error counts by type and endpoint
    const errorType = this.getErrorType((res as any).statusCode);
    this.metrics.errors.byType[errorType] = (this.metrics.errors.byType[errorType] || 0) + 1;
    this.metrics.errors.byEndpoint[(req as any).url] = (this.metrics.errors.byEndpoint[(req as any).url] || 0) + 1;

    // Send to Sentry
    Sentry.captureException(new Error(`HTTP ${(res as any).statusCode}: ${(req as any).method} ${(req as any).url}`), {
      tags: {
        statusCode: (res as any).statusCode.toString(),
        method: (req as any).method,
        endpoint: (req as any).url
      },
      extra: error
    });

    log.error('Request error tracked', error);
  }

  /**
   * Track slow requests
   */
  private trackSlowRequest(request: any): void {
    log.warn('Slow request detected', {
      method: (request as any).method,
      url: (request as any).url,
      responseTime: (request as any).responseTime,
      ip: (request as any).ip,
      tenantId: (request as any).tenantId
    });

    // Send to Sentry as performance issue
    Sentry.addBreadcrumb({
      category: 'performance',
      message: 'Slow request detected',
      level: 'warning',
      data: {
        method: (request as any).method,
        url: (request as any).url,
        responseTime: (request as any).responseTime
      }
    });
  }

  /**
   * Check alerts
   */
  private async checkAlerts(): Promise<void> {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (rule.lastTriggered) {
        const cooldownExpiry = new Date(rule.lastTriggered.getTime() + rule.cooldown * 60 * 1000);
        if (new Date() < cooldownExpiry) {
          continue;
        }
      }

      const shouldTrigger = this.evaluateAlertCondition(rule);
      if (shouldTrigger) {
        await this.triggerAlert(rule);
        rule.lastTriggered = new Date();
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private evaluateAlertCondition(rule: AlertRule): boolean {
    const errorRate = (this.metrics.requests.failed / this.metrics.requests.total) * 100;

    switch (rule.id) {
      case 'high_response_time':
        return this.metrics.requests.averageResponseTime > rule.threshold;
      case 'high_memory_usage':
        return this.metrics.system.memoryUsage > rule.threshold;
      case 'high_cpu_usage':
        return this.metrics.system.cpuUsage > rule.threshold;
      case 'high_error_rate':
        return errorRate > rule.threshold;
      case 'database_slow_queries':
        return this.metrics.database.slowQueries > rule.threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger alert
   */
  private async triggerAlert(rule: AlertRule): Promise<void> {
    const alert = {
      id: rule.id,
      name: rule.name,
      severity: rule.severity,
      threshold: rule.threshold,
      currentValue: this.getCurrentValue(rule),
      timestamp: new Date(),
      metrics: { ...this.metrics }
    };

    log.error(`ALERT TRIGGERED: ${rule.name}`, alert);

    // Send to Sentry
    Sentry.captureMessage(`Alert: ${rule.name}`, {
      level: rule.severity === 'critical' ? 'error' : 'warning',
      tags: {
        alertId: rule.id,
        severity: rule.severity
      },
      extra: alert
    });

    // Store alert in database
    await this.storeAlert(alert);

    // Send notifications (email, Slack, etc.)
    await this.sendAlertNotifications(alert);
  }

  /**
   * Get current value for alert
   */
  private getCurrentValue(rule: AlertRule): number {
    switch (rule.id) {
      case 'high_response_time':
        return this.metrics.requests.averageResponseTime;
      case 'high_memory_usage':
        return this.metrics.system.memoryUsage;
      case 'high_cpu_usage':
        return this.metrics.system.cpuUsage;
      case 'high_error_rate':
        return (this.metrics.requests.failed / this.metrics.requests.total) * 100;
      case 'database_slow_queries':
        return this.metrics.database.slowQueries;
      default:
        return 0;
    }
  }

  /**
   * Analyze performance trends
   */
  private async analyzePerformance(): Promise<void> {
    if (this.metricsHistory.length < 10) return;

    const recentMetrics = this.metricsHistory.slice(-10);
    const performanceAnalysis = {
      responseTimeTrend: this.calculateTrend(recentMetrics.map((m: any) => m.requests.averageResponseTime)),
      memoryUsageTrend: this.calculateTrend(recentMetrics.map((m: any) => m.system.memoryUsage)),
      errorRateTrend: this.calculateTrend(recentMetrics.map((m: any) => (m.requests.failed / m.requests.total) * 100)),
      recommendations: []
    };

    // Generate recommendations
    if (performanceAnalysis.responseTimeTrend > 0.1) {
      (performanceAnalysis.recommendations as string[]).push('Response times are increasing, consider optimizing queries or scaling horizontally');
    }

    if (performanceAnalysis.memoryUsageTrend > 0.05) {
      (performanceAnalysis.recommendations as string[]).push('Memory usage is increasing, consider investigating memory leaks');
    }

    if (performanceAnalysis.errorRateTrend > 0.02) {
      (performanceAnalysis.recommendations as string[]).push('Error rate is increasing, investigate recent deployments or changes');
    }

    // Store analysis
    await this.storePerformanceAnalysis(performanceAnalysis);

    log.info('Performance analysis completed', performanceAnalysis);
  }

  /**
   * Calculate trend (slope of linear regression)
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a: any, b: any) => a + b, 0);
    const sumY = values.reduce((a: any, b: any) => a + b, 0);
    const sumXY = x.reduce((sum: any, xi: any, i: any) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum: any, xi: any) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  /**
   * Setup Sentry integration
   */
  private setupSentry(): void {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 1.0,
      profilesSampleRate: 1.0,
      integrations: [
        // new Sentry.Integrations.Http({ tracing: true }), // Commented out - API changed
        // new Sentry.Integrations.Express({ app: undefined }), // Commented out - API changed  
        // new Sentry.Integrations.Mongo({ useMongoose: true }) // Commented out - API changed
      ],
      beforeSend(event) {
        // Filter out sensitive data
        if (event.request?.data) {
          delete (event.request.data as any).password;
          delete (event.request.data as any).token;
        }
        return event;
      }
    });
  }

  /**
   * Utility methods
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getErrorType(statusCode: number): string {
    if (statusCode >= 400 && statusCode < 500) return 'client_error';
    if (statusCode >= 500) return 'server_error';
    return 'unknown';
  }

  private async getDiskUsage(): Promise<number> {
    // This would typically use a system library
    // For now, return a mock value
    return 45; // 45% disk usage
  }

  private async getAverageQueryTime(): Promise<number> {
    // This would analyze MongoDB profiler data
    return 25; // 25ms average
  }

  private async getSlowQueryCount(): Promise<number> {
    // This would count queries over threshold
    return 2; // 2 slow queries
  }

  private async getDatabaseErrorCount(): Promise<number> {
    // This would count database errors
    return 0; // No database errors
  }

  private async storeMetricsInDatabase(): Promise<void> {
    try {
      const MonitoringMetric = mongoose.model('MonitoringMetric') || 
        mongoose.model('MonitoringMetric', new mongoose.Schema({
          timestamp: Date,
          metrics: Object
        }));

      await MonitoringMetric.create({
        timestamp: new Date(),
        metrics: this.metrics
      });
    } catch (error) {
      log.error('Error storing metrics in database', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async storeAlert(alert: any): Promise<void> {
    try {
      const Alert = mongoose.model('Alert') || 
        mongoose.model('Alert', new mongoose.Schema({
          alertId: String,
          name: String,
          severity: String,
          threshold: Number,
          currentValue: Number,
          timestamp: Date,
          metrics: Object
        }));

      await Alert.create(alert);
    } catch (error) {
      log.error('Error storing alert in database', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async storePerformanceAnalysis(analysis: any): Promise<void> {
    try {
      const PerformanceAnalysis = mongoose.model('PerformanceAnalysis') || 
        mongoose.model('PerformanceAnalysis', new mongoose.Schema({
          timestamp: Date,
          analysis: Object
        }));

      await PerformanceAnalysis.create({
        timestamp: new Date(),
        analysis
      });
    } catch (error) {
      log.error('Error storing performance analysis', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async sendAlertNotifications(alert: any): Promise<void> {
    // This would send notifications via email, Slack, etc.
    log.info('Alert notification sent', { alertId: (alert as any).id, severity: (alert as any).severity });
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): MonitoringMetrics {
    return { ...this.metrics };
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(): MonitoringMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Get alert rules
   */
  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  /**
   * Update alert rule
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const ruleIndex = this.alertRules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return false;

    this.alertRules[ruleIndex] = { ...this.alertRules[ruleIndex], ...updates };
    return true;
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    log.info('Enhanced monitoring stopped');
  }
}

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      requestContext?: {
        id: string;
        startTime: number;
        ip: string;
        userAgent: string;
        tenantId?: string;
        userId?: string;
      };
    }
  }
}

export default EnhancedMonitoring;