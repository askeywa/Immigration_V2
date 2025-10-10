// backend/src/config/sentry.ts
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { 
  expressIntegration,
  mongoIntegration,
  mysqlIntegration,
  postgresIntegration,
  prismaIntegration
} from '@sentry/integrations';
import { config } from './config';
import { log } from '../utils/logger';

export interface SentryConfig {
  dsn: string;
  environment: string;
  release: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
  beforeSend?: (event: Sentry.Event) => Sentry.Event | null;
  beforeSendTransaction?: (event: any) => any | null;
  integrations: Sentry.NodeOptions['integrations'];
  tags?: Record<string, string>;
  user?: {
    id?: string;
    username?: string;
    email?: string;
    tenantId?: string;
  };
}

export class SentryService {
  private static instance: SentryService;
  private isInitialized: boolean = false;
  private config: SentryConfig;

  private constructor() {
    this.config = {
      dsn: process.env.SENTRY_DSN || '',
      environment: process.env.NODE_ENV || 'development',
      release: process.env.SENTRY_RELEASE || process.env.npm_package_version || '1.0.0',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
      integrations: [
        Sentry.httpIntegration(),
        expressIntegration(),
        mongoIntegration(),
        mysqlIntegration(),
        postgresIntegration(),
        prismaIntegration(),
        nodeProfilingIntegration(),
      ],
      tags: {
        service: 'immigration-portal-backend',
        version: process.env.npm_package_version || '1.0.0',
        region: process.env.AWS_REGION || 'us-east-1',
      },
      beforeSend: this.beforeSend.bind(this),
      beforeSendTransaction: this.beforeSendTransaction.bind(this),
    };
  }

  static getInstance(): SentryService {
    if (!SentryService.instance) {
      SentryService.instance = new SentryService();
    }
    return SentryService.instance;
  }

  /**
   * Initialize Sentry
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        log.info('Sentry already initialized');
        return;
      }

      if (!this.config.dsn) {
        log.warning('Sentry DSN not provided - monitoring disabled');
        return;
      }

      Sentry.init({
        dsn: this.config.dsn,
        environment: this.config.environment,
        release: this.config.release,
        tracesSampleRate: this.config.tracesSampleRate,
        profilesSampleRate: this.config.profilesSampleRate,
        integrations: this.config.integrations,
        beforeSend: this.config.beforeSend as any,
        beforeSendTransaction: this.config.beforeSendTransaction,
        debug: process.env.NODE_ENV === 'development',
        attachStacktrace: true,
        maxBreadcrumbs: 100,
        maxValueLength: 1000,
        // maxStringLength: 1000, // Removed - not supported in current Sentry version
        normalizeDepth: 10,
        // normalizeMaxBreadcrumbs: 50, // Removed - not supported in current Sentry version
      });

      // Set global tags
      if (this.config.tags) {
        Sentry.setTags(this.config.tags);
      }

      this.isInitialized = true;
      log.info('Sentry initialized successfully', {
        environment: this.config.environment,
        release: this.config.release,
        tracesSampleRate: this.config.tracesSampleRate,
        profilesSampleRate: this.config.profilesSampleRate
      });
    } catch (error) {
      log.error('Failed to initialize Sentry', {
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

    Sentry.setUser({
      id: user.id,
      username: user.username,
      email: user.email,
      tenant_id: user.tenantId,
    });
  }

  /**
   * Set tenant context
   */
  setTenantContext(tenantId: string, tenantName?: string): void {
    if (!this.isInitialized) return;

    Sentry.setContext('tenant', {
      id: tenantId,
      name: tenantName,
    });

    Sentry.setTag('tenant_id', tenantId);
  }

  /**
   * Set request context
   */
  setRequestContext(req: any): void {
    if (!this.isInitialized) return;

    Sentry.setContext('request', {
      method: (req as any).method,
      url: (req as any).url,
      headers: (req as any).headers,
      userAgent: (req as any).get('User-Agent'),
      ip: (req as any).ip,
      tenantId: (req as any).tenantId,
      tenantDomain: (req as any).tenantDomain,
    });
  }

  /**
   * Capture exception
   */
  captureException(error: Error, context?: Record<string, any>): void {
    if (!this.isInitialized) return;

    Sentry.withScope((scope: any) => {
      if (context) {
        Object.keys(context).forEach((key: any) => {
          scope.setContext(key, (context as any)[key]);
        });
      }
      Sentry.captureException(error);
    });
  }

  /**
   * Capture message
   */
  captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>): void {
    if (!this.isInitialized) return;

    Sentry.withScope((scope: any) => {
      scope.setLevel(level);
      if (context) {
        Object.keys(context).forEach((key: any) => {
          scope.setContext(key, (context as any)[key]);
        });
      }
      Sentry.captureMessage(message);
    });
  }

  /**
   * Start transaction
   */
  startTransaction(name: string, operation: string, data?: Record<string, any>): any {
    if (!this.isInitialized) return;

    return (Sentry as any).startTransaction({
      name,
      op: operation,
      data,
    });
  }

  /**
   * Start span
   */
  startSpan<T>(name: string, operation: string, callback: (span: Sentry.Span) => T): T | undefined {
    if (!this.isInitialized) return callback({} as Sentry.Span);

    return Sentry.startSpan({
      name,
      op: operation,
    }, (span) => callback(span!));
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
    if (!this.isInitialized) return;

    Sentry.addBreadcrumb(breadcrumb);
  }

  /**
   * Set extra context
   */
  setExtra(key: string, value: any): void {
    if (!this.isInitialized) return;

    Sentry.setExtra(key, value);
  }

  /**
   * Set tag
   */
  setTag(key: string, value: string): void {
    if (!this.isInitialized) return;

    Sentry.setTag(key, value);
  }

  /**
   * Flush events
   */
  async flush(timeout: number = 2000): Promise<boolean> {
    if (!this.isInitialized) return true;

    return await Sentry.flush(timeout);
  }

  /**
   * Close Sentry
   */
  async close(): Promise<void> {
    if (!this.isInitialized) return;

    await Sentry.close();
    this.isInitialized = false;
    log.info('Sentry closed');
  }

  /**
   * Before send filter
   */
  private beforeSend(event: Sentry.Event): Sentry.Event | null {
    // Filter out sensitive data
    if ((event as any).request) {
      // Remove sensitive headers
      const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
      sensitiveHeaders.forEach((header: any) => {
        if ((event as any).request?.headers?.[header]) {
          (event as any).request.headers[header] = '[Filtered]';
        }
      });
    }

    // Add tenant context if available
    if ((event as any).contexts?.tenant?.id) {
      (event as any).tags = {
        ...(event as any).tags,
        tenant_id: ((event as any).contexts as any)?.tenant?.id || 'unknown',
      };
    }

    // Filter out development errors in production
    if (this.config.environment === 'production' && (event as any).level === 'debug') {
      return null;
    }

    return event;
  }

  /**
   * Before send transaction filter
   */
  private beforeSendTransaction(event: any): any | null {
    // Add tenant context to transactions
    if ((event as any).contexts?.tenant?.id) {
      (event as any).tags = {
        ...(event as any).tags,
        tenant_id: ((event as any).contexts as any)?.tenant?.id || 'unknown',
      };
    }

    // Filter out health check transactions
    if ((event as any).transaction?.includes('/health') || (event as any).transaction?.includes('/ping')) {
      return null;
    }

    return event;
  }

  /**
   * Get Sentry instance
   */
  getSentry(): typeof Sentry {
    return Sentry;
  }

  /**
   * Check if Sentry is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get configuration
   */
  getConfig(): SentryConfig {
    return { ...this.config };
  }
}

export default SentryService;
