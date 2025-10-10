// backend/src/services/apmService.ts
import { log } from '../utils/logger';
import SentryService from '../config/sentry';
import NewRelicService from '../config/newrelic';

export interface APMMetrics {
  timestamp: Date;
  service: string;
  environment: string;
  metrics: {
    requests: {
      total: number;
      successful: number;
      failed: number;
      averageResponseTime: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
    };
    errors: {
      total: number;
      byType: Record<string, number>;
      byEndpoint: Record<string, number>;
    };
    database: {
      totalQueries: number;
      averageQueryTime: number;
      slowQueries: number;
      errors: number;
    };
    memory: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
    };
    cpu: {
      usage: number;
      loadAverage: number[];
    };
    tenants: {
      active: number;
      total: number;
      byStatus: Record<string, number>;
    };
  };
}

export interface APMAlert {
  id: string;
  type: 'error_rate' | 'response_time' | 'memory_usage' | 'cpu_usage' | 'database_performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  tenantId?: string;
  endpoint?: string;
}

export interface APMConfiguration {
  sentry: {
    enabled: boolean;
    dsn: string;
    environment: string;
    sampleRate: number;
  };
  newRelic: {
    enabled: boolean;
    appName: string;
    licenseKey: string;
    distributedTracing: boolean;
  };
  alerts: {
    errorRateThreshold: number;
    responseTimeThreshold: number;
    memoryUsageThreshold: number;
    cpuUsageThreshold: number;
    databaseQueryThreshold: number;
  };
  retention: {
    metricsDays: number;
    logsDays: number;
    tracesDays: number;
  };
}

export class APMService {
  private static instance: APMService;
  private sentryService: SentryService;
  private newRelicService: NewRelicService;
  private metrics: APMMetrics[] = [];
  private alerts: APMAlert[] = [];
  private configuration: APMConfiguration;

  private constructor() {
    this.sentryService = SentryService.getInstance();
    this.newRelicService = NewRelicService.getInstance();
    
    this.configuration = {
      sentry: {
        enabled: process.env.SENTRY_DSN ? true : false,
        dsn: process.env.SENTRY_DSN || '',
        environment: process.env.NODE_ENV || 'development',
        sampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1')
      },
      newRelic: {
        enabled: process.env.NEW_RELIC_LICENSE_KEY ? true : false,
        appName: process.env.NEW_RELIC_APP_NAME || 'Immigration Portal',
        licenseKey: process.env.NEW_RELIC_LICENSE_KEY || '',
        distributedTracing: process.env.NEW_RELIC_DISTRIBUTED_TRACING_ENABLED !== 'false'
      },
      alerts: {
        errorRateThreshold: parseFloat(process.env.APM_ERROR_RATE_THRESHOLD || '5.0'),
        responseTimeThreshold: parseFloat(process.env.APM_RESPONSE_TIME_THRESHOLD || '2000'),
        memoryUsageThreshold: parseFloat(process.env.APM_MEMORY_USAGE_THRESHOLD || '80.0'),
        cpuUsageThreshold: parseFloat(process.env.APM_CPU_USAGE_THRESHOLD || '80.0'),
        databaseQueryThreshold: parseFloat(process.env.APM_DB_QUERY_THRESHOLD || '1000')
      },
      retention: {
        metricsDays: parseInt(process.env.APM_METRICS_RETENTION_DAYS || '30'),
        logsDays: parseInt(process.env.APM_LOGS_RETENTION_DAYS || '7'),
        tracesDays: parseInt(process.env.APM_TRACES_RETENTION_DAYS || '3')
      }
    };
  }

  static getInstance(): APMService {
    if (!APMService.instance) {
      APMService.instance = new APMService();
    }
    return APMService.instance;
  }

  /**
   * Initialize APM service
   */
  async initialize(): Promise<void> {
    try {
      log.info('Initializing APM service...');

      // Initialize Sentry
      if (this.configuration.sentry.enabled) {
        await this.sentryService.initialize();
        log.info('Sentry initialized');
      }

      // Initialize New Relic
      if (this.configuration.newRelic.enabled) {
        await this.newRelicService.initialize();
        log.info('New Relic initialized');
      }

      // Start metrics collection
      this.startMetricsCollection();

      // Start alert monitoring
      this.startAlertMonitoring();

      log.info('APM service initialized successfully', {
        sentryEnabled: this.configuration.sentry.enabled,
        newRelicEnabled: this.configuration.newRelic.enabled
      });
    } catch (error) {
      log.error('Failed to initialize APM service', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Record custom metric
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    try {
      // Send to New Relic
      if (this.configuration.newRelic.enabled && this.newRelicService.isReady()) {
        this.newRelicService.recordMetric(name, value);
        
        if (tags) {
          Object.keys(tags).forEach((key: any) => {
            this.newRelicService.setAttribute(`metric.${key}`, (tags as any)[key]);
          });
        }
      }

      // Send to Sentry
      if (this.configuration.sentry.enabled && this.sentryService.isReady()) {
        this.sentryService.setExtra(`metric.${name}`, value);
        
        if (tags) {
          Object.keys(tags).forEach((key: any) => {
            this.sentryService.setTag(`metric.${key}`, (tags as any)[key]);
          });
        }
      }

    } catch (error) {
      log.error('Failed to record metric', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        metric: name,
        value
      });
    }
  }

  /**
   * Record custom event
   */
  recordEvent(eventType: string, data: Record<string, any>): void {
    try {
      // Send to New Relic
      if (this.configuration.newRelic.enabled && this.newRelicService.isReady()) {
        this.newRelicService.recordCustomEvent(eventType, data);
      }

      // Send to Sentry
      if (this.configuration.sentry.enabled && this.sentryService.isReady()) {
        this.sentryService.addBreadcrumb({
          message: eventType,
          category: 'custom',
          level: 'info',
          data
        });
      }

    } catch (error) {
      log.error('Failed to record event', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        eventType,
        data
      });
    }
  }

  /**
   * Record business transaction
   */
  recordBusinessTransaction(name: string, duration: number, success: boolean, context?: Record<string, any>): void {
    try {
      // Send to New Relic
      if (this.configuration.newRelic.enabled && this.newRelicService.isReady()) {
        this.newRelicService.recordBusinessTransaction(name, duration, success);
      }

      // Send to Sentry
      if (this.configuration.sentry.enabled && this.sentryService.isReady()) {
        this.sentryService.addBreadcrumb({
          message: 'BusinessTransaction',
          category: 'business',
          level: 'info',
          data: {
          name,
          duration,
          success,
          ...context
        }});
      }

      // Check for alerts
      if (!success) {
        this.checkBusinessTransactionAlert(name, duration, success);
      }

    } catch (error) {
      log.error('Failed to record business transaction', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        name,
        duration,
        success
      });
    }
  }

  /**
   * Record database query
   */
  recordDatabaseQuery(operation: string, collection: string, duration: number, error?: Error): void {
    try {
      // Send to New Relic
      if (this.configuration.newRelic.enabled && this.newRelicService.isReady()) {
        this.newRelicService.recordDatabaseQuery(operation, collection, duration, error);
      }

      // Check for slow query alert
      if (duration > this.configuration.alerts.databaseQueryThreshold) {
        this.checkDatabasePerformanceAlert(operation, collection, duration);
      }

    } catch (error) {
      log.error('Failed to record database query', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        operation,
        collection,
        duration
      });
    }
  }

  /**
   * Record API call
   */
  recordApiCall(method: string, endpoint: string, statusCode: number, duration: number, tenantId?: string): void {
    try {
      // Send to New Relic
      if (this.configuration.newRelic.enabled && this.newRelicService.isReady()) {
        this.newRelicService.recordApiCall(method, endpoint, statusCode, duration);
      }

      // Send to Sentry
      if (this.configuration.sentry.enabled && this.sentryService.isReady()) {
        this.sentryService.addBreadcrumb({
          message: 'APICall',
          category: 'api',
          level: 'info',
          data: {
          method,
          endpoint,
          statusCode,
          duration,
          tenantId,
          success: statusCode < 400
        }});
      }

      // Check for response time alert
      if (duration > this.configuration.alerts.responseTimeThreshold) {
        this.checkResponseTimeAlert(endpoint, duration);
      }

      // Check for error rate alert
      if (statusCode >= 400) {
        this.checkErrorRateAlert(endpoint, statusCode, tenantId);
      }

    } catch (error) {
      log.error('Failed to record API call', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        method,
        endpoint,
        statusCode,
        duration
      });
    }
  }

  /**
   * Record error
   */
  recordError(error: Error, context?: Record<string, any>): void {
    try {
      // Send to Sentry
      if (this.configuration.sentry.enabled && this.sentryService.isReady()) {
        this.sentryService.captureException(error, context);
      }

      // Send to New Relic
      if (this.configuration.newRelic.enabled && this.newRelicService.isReady()) {
        this.newRelicService.recordError(error, context);
      }

    } catch (trackingError) {
      log.error('Failed to record error', {
        originalError: error instanceof Error ? error.message : String(error),
        trackingError: trackingError instanceof Error ? trackingError.message : String(trackingError)
      });
    }
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): APMMetrics | null {
    if (this.metrics.length === 0) {
      return null;
    }

    return this.metrics[this.metrics.length - 1];
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(hours: number = 24): APMMetrics[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metrics.filter((metric: any) => metric.timestamp >= cutoffTime);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): APMAlert[] {
    return this.alerts.filter((alert: any) => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): APMAlert[] {
    return [...this.alerts];
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find((a: any) => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      
      log.info('Alert resolved', {
        alertId,
        type: alert.type,
        severity: alert.severity
      });
      
      return true;
    }
    return false;
  }

  /**
   * Get APM configuration
   */
  getConfiguration(): APMConfiguration {
    return { ...this.configuration };
  }

  /**
   * Update APM configuration
   */
  updateConfiguration(config: Partial<APMConfiguration>): void {
    this.configuration = {
      ...this.configuration,
      ...config
    };

    log.info('APM configuration updated', { config });
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectMetrics();
    }, 60000); // Collect metrics every minute
  }

  /**
   * Collect system metrics
   */
  private collectMetrics(): void {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const loadAverage = require('os').loadavg();

      const metrics: APMMetrics = {
        timestamp: new Date(),
        service: 'immigration-portal',
        environment: process.env.NODE_ENV || 'development',
        metrics: {
          requests: {
            total: 0, // This would be populated from actual request counters
            successful: 0,
            failed: 0,
            averageResponseTime: 0,
            p95ResponseTime: 0,
            p99ResponseTime: 0
          },
          errors: {
            total: 0,
            byType: {},
            byEndpoint: {}
          },
          database: {
            totalQueries: 0,
            averageQueryTime: 0,
            slowQueries: 0,
            errors: 0
          },
          memory: {
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
            external: memoryUsage.external,
            rss: memoryUsage.rss
          },
          cpu: {
            usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
            loadAverage
          },
          tenants: {
            active: 0, // This would be populated from actual tenant data
            total: 0,
            byStatus: {}
          }
        }
      };

      this.metrics.push(metrics);

      // Keep only recent metrics (based on retention policy)
      const cutoffTime = new Date(Date.now() - this.configuration.retention.metricsDays * 24 * 60 * 60 * 1000);
      this.metrics = this.metrics.filter((metric: any) => metric.timestamp >= cutoffTime);

      // Check for memory usage alert
      const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      if (memoryUsagePercent > this.configuration.alerts.memoryUsageThreshold) {
        this.checkMemoryUsageAlert(memoryUsagePercent);
      }

      // Check for CPU usage alert
      if ((loadAverage as any)[0] > this.configuration.alerts.cpuUsageThreshold) {
        this.checkCpuUsageAlert((loadAverage as any)[0]);
      }

    } catch (error) {
      log.error('Failed to collect metrics', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
    }
  }

  /**
   * Start alert monitoring
   */
  private startAlertMonitoring(): void {
    // Alert monitoring is handled in individual metric collection methods
    // This method can be extended for additional alert monitoring logic
  }

  /**
   * Check error rate alert
   */
  private checkErrorRateAlert(endpoint: string, statusCode: number, tenantId?: string): void {
    const alertId = `error_rate_${endpoint}_${Date.now()}`;
    const severity = statusCode >= 500 ? 'high' : 'medium';

    const alert: APMAlert = {
      id: alertId,
      type: 'error_rate',
      severity,
      message: `High error rate detected on ${endpoint} (Status: ${statusCode})`,
      threshold: this.configuration.alerts.errorRateThreshold,
      currentValue: statusCode,
      timestamp: new Date(),
      resolved: false,
      tenantId,
      endpoint
    };

    this.alerts.push(alert);
    this.sendAlertNotification(alert);
  }

  /**
   * Check response time alert
   */
  private checkResponseTimeAlert(endpoint: string, duration: number): void {
    const alertId = `response_time_${endpoint}_${Date.now()}`;
    const severity = duration > this.configuration.alerts.responseTimeThreshold * 2 ? 'high' : 'medium';

    const alert: APMAlert = {
      id: alertId,
      type: 'response_time',
      severity,
      message: `Slow response time detected on ${endpoint} (${duration}ms)`,
      threshold: this.configuration.alerts.responseTimeThreshold,
      currentValue: duration,
      timestamp: new Date(),
      resolved: false,
      endpoint
    };

    this.alerts.push(alert);
    this.sendAlertNotification(alert);
  }

  /**
   * Check memory usage alert
   */
  private checkMemoryUsageAlert(usage: number): void {
    const alertId = `memory_usage_${Date.now()}`;
    const severity = usage > 90 ? 'critical' : 'high';

    const alert: APMAlert = {
      id: alertId,
      type: 'memory_usage',
      severity,
      message: `High memory usage detected (${usage.toFixed(2)}%)`,
      threshold: this.configuration.alerts.memoryUsageThreshold,
      currentValue: usage,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.push(alert);
    this.sendAlertNotification(alert);
  }

  /**
   * Check CPU usage alert
   */
  private checkCpuUsageAlert(usage: number): void {
    const alertId = `cpu_usage_${Date.now()}`;
    const severity = usage > 90 ? 'critical' : 'high';

    const alert: APMAlert = {
      id: alertId,
      type: 'cpu_usage',
      severity,
      message: `High CPU usage detected (${usage.toFixed(2)}%)`,
      threshold: this.configuration.alerts.cpuUsageThreshold,
      currentValue: usage,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.push(alert);
    this.sendAlertNotification(alert);
  }

  /**
   * Check database performance alert
   */
  private checkDatabasePerformanceAlert(operation: string, collection: string, duration: number): void {
    const alertId = `database_performance_${operation}_${collection}_${Date.now()}`;
    const severity = duration > this.configuration.alerts.databaseQueryThreshold * 2 ? 'high' : 'medium';

    const alert: APMAlert = {
      id: alertId,
      type: 'database_performance',
      severity,
      message: `Slow database query detected: ${operation} on ${collection} (${duration}ms)`,
      threshold: this.configuration.alerts.databaseQueryThreshold,
      currentValue: duration,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.push(alert);
    this.sendAlertNotification(alert);
  }

  /**
   * Check business transaction alert
   */
  private checkBusinessTransactionAlert(name: string, duration: number, success: boolean): void {
    if (success) return;

    const alertId = `business_transaction_${name}_${Date.now()}`;
    const severity = 'medium';

    const alert: APMAlert = {
      id: alertId,
      type: 'error_rate',
      severity,
      message: `Business transaction failed: ${name}`,
      threshold: 0,
      currentValue: 1,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.push(alert);
    this.sendAlertNotification(alert);
  }

  /**
   * Send alert notification
   */
  private sendAlertNotification(alert: APMAlert): void {
    try {
      log.warning('APM Alert', {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        threshold: alert.threshold,
        currentValue: alert.currentValue,
        tenantId: alert.tenantId,
        endpoint: alert.endpoint
      });

      // Here you would integrate with notification services like:
      // - Email notifications
      // - Slack notifications
      // - PagerDuty
      // - Webhooks
      
    } catch (error) {
      log.error('Failed to send alert notification', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        alertId: alert.id
      });
    }
  }

  /**
   * Health check for APM service
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    details: {
      sentry: boolean;
      newRelic: boolean;
      metricsCollection: boolean;
      alertMonitoring: boolean;
      activeAlerts: number;
      totalMetrics: number;
    };
  }> {
    try {
      return {
        healthy: this.configuration.sentry.enabled || this.configuration.newRelic.enabled,
        details: {
          sentry: this.sentryService.isReady(),
          newRelic: this.newRelicService.isReady(),
          metricsCollection: true,
          alertMonitoring: true,
          activeAlerts: this.getActiveAlerts().length,
          totalMetrics: this.metrics.length
        }
      };
    } catch (error) {
      log.error('APM health check failed', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });

      return {
        healthy: false,
        details: {
          sentry: false,
          newRelic: false,
          metricsCollection: false,
          alertMonitoring: false,
          activeAlerts: 0,
          totalMetrics: 0
        }
      };
    }
  }
}

export default APMService;
