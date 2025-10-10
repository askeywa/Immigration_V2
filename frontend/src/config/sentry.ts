// frontend/src/config/sentry.ts
import React from 'react';
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import { useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from 'react-router-dom';

export interface SentryConfig {
  dsn: string;
  environment: string;
  release: string;
  tracesSampleRate: number;
  beforeSend?: (event: Sentry.Event) => Sentry.Event | null;
  beforeSendTransaction?: (event: any) => any | null;
  integrations: Sentry.BrowserOptions['integrations'];
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
      dsn: import.meta.env.VITE_SENTRY_DSN || '',
      environment: import.meta.env.VITE_NODE_ENV || import.meta.env.MODE || 'development',
      release: import.meta.env.VITE_SENTRY_RELEASE || import.meta.env.VITE_APP_VERSION || '1.0.0',
      tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      integrations: [
        // Simplified integrations to prevent frontend crashes
        new BrowserTracing() as any,
        // Removed Sentry.Replay as it's not available in current version
      ],
      tags: {
        service: 'immigration-portal-frontend',
        version: import.meta.env.VITE_APP_VERSION || '1.0.0',
        build: import.meta.env.VITE_BUILD_NUMBER || 'unknown',
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
        console.log('Sentry already initialized');
        return;
      }

      if (!this.config.dsn) {
        console.warn('Sentry DSN not provided - monitoring disabled');
        this.isInitialized = true; // Mark as initialized to prevent retries
        return;
      }

      // Only initialize Sentry if DSN is provided
      if (this.config.dsn && this.config.dsn.trim() !== '') {
        Sentry.init({
        dsn: this.config.dsn,
        environment: this.config.environment,
        release: this.config.release,
        tracesSampleRate: this.config.tracesSampleRate,
        integrations: this.config.integrations,
        beforeSend: this.config.beforeSend as any,
        beforeSendTransaction: this.config.beforeSendTransaction,
        debug: import.meta.env.MODE === 'development',
        attachStacktrace: true,
        maxBreadcrumbs: 100,
        maxValueLength: 1000,
        // maxStringLength: 1000, // Removed - not supported in current Sentry version
        normalizeDepth: 10,
        // normalizeMaxBreadcrumbs: 50, // Removed - not supported in current Sentry version
        });

        // Set global tags
        Sentry.setTags(this.config.tags as any);
      }

      this.isInitialized = true;
      console.log('Sentry initialized successfully', {
        environment: this.config.environment,
        release: this.config.release,
        tracesSampleRate: this.config.tracesSampleRate,
      });
    } catch (error) {
      console.error('Failed to initialize Sentry', error);
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
  setRequestContext(url: string, method: string = 'GET', headers?: Record<string, string>): void {
    if (!this.isInitialized) return;

    Sentry.setContext('request', {
      method,
      url,
      headers,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
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
          scope.setContext(key, context[key]);
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
          scope.setContext(key, context[key]);
        });
      }
      Sentry.captureMessage(message);
    });
  }

  /**
   * Start transaction (uses startSpan in Sentry v7+)
   */
  startTransaction(name: string, operation: string, data?: Record<string, any>): any | undefined {
    if (!this.isInitialized) return;

    // Use startSpan for newer Sentry versions, fallback to startTransaction if available
    try {
      if (typeof (Sentry as any).startSpan === 'function') {
        return (Sentry as any).startSpan({ name, op: operation, data }, () => {});
      } else if (typeof (Sentry as any).startTransaction === 'function') {
        return (Sentry as any).startTransaction({
          name,
          op: operation,
          data,
        });
      }
    } catch (error) {
      console.warn('Sentry transaction/span not available:', error);
    }
    return undefined;
  }

  /**
   * Start span
   */
  startSpan<T>(name: string, operation: string, callback: (span: Sentry.Span) => T): T | undefined {
    if (!this.isInitialized) return callback({} as Sentry.Span);

    return Sentry.startSpan({
      name,
      op: operation,
    }, callback);
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
    console.log('Sentry closed');
  }

  /**
   * Before send filter
   */
  private beforeSend(event: Sentry.Event): Sentry.Event | null {
    // Filter out sensitive data
    if (event.request) {
      // Remove sensitive headers
      const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
      sensitiveHeaders.forEach((header: any) => {
        if (event.request?.headers?.[header]) {
          event.request.headers[header] = '[Filtered]';
        }
      });
    }

    // Add tenant context if available
    if (event.contexts?.tenant?.id) {
      event.tags = {
        ...event.tags,
        tenant_id: (event.contexts.tenant.id as any),
      };
    }

    // Filter out development errors in production
    if (this.config.environment === 'production' && event.level === 'debug') {
      return null;
    }

    return event;
  }

  /**
   * Before send transaction filter
   */
  private beforeSendTransaction(event: any): any | null {
    // Add tenant context to transactions
    if (event.contexts?.tenant?.id) {
      event.tags = {
        ...event.tags,
        tenant_id: (event.contexts.tenant.id as any),
      };
    }

    // Filter out health check transactions
    if (event.transaction?.includes('/health') || event.transaction?.includes('/ping')) {
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
