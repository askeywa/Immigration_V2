// backend/src/config/newrelic.ts
// @ts-ignore - New Relic doesn't have TypeScript definitions
import * as newrelic from 'newrelic';
import { log } from '../utils/logger';

export interface NewRelicConfig {
  appName: string;
  licenseKey: string;
  environment: string;
  distributedTracingEnabled: boolean;
  errorCollectorEnabled: boolean;
  transactionTracerEnabled: boolean;
  slowSqlEnabled: boolean;
  customAttributesEnabled: boolean;
}

export class NewRelicService {
  private static instance: NewRelicService;
  private isInitialized: boolean = false;
  private config: NewRelicConfig;

  private constructor() {
    this.config = {
      appName: process.env.NEW_RELIC_APP_NAME || 'Immigration Portal',
      licenseKey: process.env.NEW_RELIC_LICENSE_KEY || '',
      environment: process.env.NODE_ENV || 'development',
      distributedTracingEnabled: process.env.NEW_RELIC_DISTRIBUTED_TRACING_ENABLED !== 'false',
      errorCollectorEnabled: process.env.NEW_RELIC_ERROR_COLLECTOR_ENABLED !== 'false',
      transactionTracerEnabled: process.env.NEW_RELIC_TRANSACTION_TRACER_ENABLED !== 'false',
      slowSqlEnabled: process.env.NEW_RELIC_SLOW_SQL_ENABLED !== 'false',
      customAttributesEnabled: process.env.NEW_RELIC_CUSTOM_ATTRIBUTES_ENABLED !== 'false',
    };
  }

  static getInstance(): NewRelicService {
    if (!NewRelicService.instance) {
      NewRelicService.instance = new NewRelicService();
    }
    return NewRelicService.instance;
  }

  /**
   * Initialize New Relic
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        log.info('New Relic already initialized');
        return;
      }

      if (!this.config.licenseKey) {
        log.warning('New Relic license key not provided - monitoring disabled');
        return;
      }

      // New Relic is initialized via environment variables and newrelic.js config file
      // This service provides helper methods for interacting with the New Relic agent
      
      this.isInitialized = true;
      log.info('New Relic initialized successfully', {
        appName: this.config.appName,
        environment: this.config.environment,
        distributedTracingEnabled: this.config.distributedTracingEnabled,
        errorCollectorEnabled: this.config.errorCollectorEnabled,
        transactionTracerEnabled: this.config.transactionTracerEnabled
      });
    } catch (error) {
      log.error('Failed to initialize New Relic', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Set user context
   */
  setUser(user: {
    id?: string;
    username?: string;
    email?: string;
    tenantId?: string;
  }): void {
    if (!this.isInitialized) return;

    newrelic.setUserID(user.id);
    newrelic.setAttribute('user.username', user.username);
    newrelic.setAttribute('user.email', user.email);
    newrelic.setAttribute('user.tenantId', user.tenantId);
  }

  /**
   * Set tenant context
   */
  setTenantContext(tenantId: string, tenantName?: string): void {
    if (!this.isInitialized) return;

    newrelic.setAttribute('tenant.id', tenantId);
    newrelic.setAttribute('tenant.name', tenantName);
  }

  /**
   * Set request context
   */
  setRequestContext(req: any): void {
    if (!this.isInitialized) return;

    newrelic.setAttribute('request.method', (req as any).method);
    newrelic.setAttribute('request.url', (req as any).url);
    newrelic.setAttribute('request.userAgent', (req as any).get('User-Agent'));
    newrelic.setAttribute('request.ip', (req as any).ip);
    newrelic.setAttribute('request.tenantId', (req as any).tenantId);
    newrelic.setAttribute('request.tenantDomain', (req as any).tenantDomain);
  }

  /**
   * Record custom event
   */
  recordCustomEvent(eventType: string, attributes: Record<string, any>): void {
    if (!this.isInitialized) return;

    newrelic.recordCustomEvent(eventType, {
      timestamp: Date.now(),
      environment: this.config.environment,
      ...attributes
    });
  }

  /**
   * Record metric
   */
  recordMetric(metricName: string, value: number): void {
    if (!this.isInitialized) return;

    newrelic.recordMetric(metricName, value);
  }

  /**
   * Record database query
   */
  recordDatabaseQuery(operation: string, table: string, duration: number, error?: Error): void {
    if (!this.isInitialized) return;

    newrelic.recordMetric('Database/Query/Duration', duration);
    newrelic.recordMetric(`Database/Query/${operation}/${table}`, duration);

    if (error) {
      newrelic.recordMetric('Database/Query/Error', 1);
      newrelic.recordMetric(`Database/Query/Error/${operation}/${table}`, 1);
    } else {
      newrelic.recordMetric('Database/Query/Success', 1);
      newrelic.recordMetric(`Database/Query/Success/${operation}/${table}`, 1);
    }
  }

  /**
   * Record API call
   */
  recordApiCall(method: string, endpoint: string, statusCode: number, duration: number): void {
    if (!this.isInitialized) return;

    newrelic.recordMetric('API/Call/Duration', duration);
    newrelic.recordMetric(`API/Call/${method}/${endpoint}`, duration);
    newrelic.recordMetric(`API/Call/Status/${statusCode}`, 1);
    newrelic.recordMetric(`API/Call/${method}/${endpoint}/Status/${statusCode}`, 1);
  }

  /**
   * Record business transaction
   */
  recordBusinessTransaction(transactionName: string, duration: number, success: boolean): void {
    if (!this.isInitialized) return;

    newrelic.recordMetric('Business/Transaction/Duration', duration);
    newrelic.recordMetric(`Business/Transaction/${transactionName}`, duration);
    newrelic.recordMetric(`Business/Transaction/${transactionName}/Success`, success ? 1 : 0);
    newrelic.recordMetric(`Business/Transaction/${transactionName}/Failure`, success ? 0 : 1);
  }

  /**
   * Record error
   */
  recordError(error: Error, context?: Record<string, any>): void {
    if (!this.isInitialized) return;

    if (context) {
      Object.keys(context).forEach((key: any) => {
        newrelic.setAttribute(`error.${key}`, (context as any)[key]);
      });
    }

    newrelic.noticeError(error);
  }

  /**
   * Start transaction
   */
  startTransaction(name: string, category: string = 'Custom'): any {
    if (!this.isInitialized) return null;

    return newrelic.startWebTransaction(name, () => {
      newrelic.setTransactionName(category, name);
      return newrelic.getTransaction();
    });
  }

  /**
   * Start background transaction
   */
  startBackgroundTransaction(name: string, group: string = 'Custom'): any {
    if (!this.isInitialized) return null;

    return newrelic.startBackgroundTransaction(name, group, () => {
      newrelic.setTransactionName(group, name);
      return newrelic.getTransaction();
    });
  }

  /**
   * End transaction
   */
  endTransaction(): void {
    if (!this.isInitialized) return;

    newrelic.endTransaction();
  }

  /**
   * Add custom attribute
   */
  setAttribute(key: string, value: any): void {
    if (!this.isInitialized) return;

    newrelic.setAttribute(key, value);
  }

  /**
   * Add custom attributes
   */
  setAttributes(attributes: Record<string, any>): void {
    if (!this.isInitialized) return;

    Object.keys(attributes).forEach((key: any) => {
      newrelic.setAttribute(key, (attributes as any)[key]);
    });
  }

  /**
   * Create distributed trace
   */
  createDistributedTracePayload(): string {
    if (!this.isInitialized) return '';

    return newrelic.createDistributedTracePayload();
  }

  /**
   * Accept distributed trace payload
   */
  acceptDistributedTracePayload(payload: string): void {
    if (!this.isInitialized) return;

    newrelic.acceptDistributedTracePayload(payload);
  }

  /**
   * Get browser timing header
   */
  getBrowserTimingHeader(): string {
    if (!this.isInitialized) return '';

    return newrelic.getBrowserTimingHeader();
  }

  /**
   * Get transaction
   */
  getTransaction(): any {
    if (!this.isInitialized) return null;

    return newrelic.getTransaction();
  }

  /**
   * Shutdown New Relic
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) return;

    newrelic.shutdown();
    this.isInitialized = false;
    log.info('New Relic shutdown');
  }

  /**
   * Check if New Relic is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get configuration
   */
  getConfig(): NewRelicConfig {
    return { ...this.config };
  }

  /**
   * Get New Relic agent
   */
  getAgent(): typeof newrelic {
    return newrelic;
  }
}

export default NewRelicService;
