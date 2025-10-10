// backend/src/services/dataIsolationService.ts
import { Request, Response } from 'express';
import mongoose, { Model, Document, Query } from 'mongoose';
import { TenantRequest } from '../middleware/tenantResolution';
import { AppError } from '../utils/errors';
import { log } from '../utils/logger';

export interface IsolationConfig {
  enabled: boolean;
  strictMode: boolean;
  superAdminBypass: boolean;
  logViolations: boolean;
  enforceTenantId: boolean;
  validateTenantAccess: boolean;
  auditIsolation: boolean;
}

export interface IsolationViolation {
  id: string;
  timestamp: Date;
  type: 'missing_tenant_id' | 'invalid_tenant_access' | 'cross_tenant_access' | 'bypass_attempt' | 'query_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  tenantId?: string;
  requestedTenantId?: string;
  endpoint: string;
  method: string;
  query: any;
  details: any;
  blocked: boolean;
  metadata?: any;
}

export interface IsolationStats {
  totalViolations: number;
  violationsByType: Array<{ type: string; count: number }>;
  violationsBySeverity: Array<{ severity: string; count: number }>;
  topViolatedEndpoints: Array<{ endpoint: string; count: number }>;
  tenantAccessPatterns: Array<{ tenantId: string; accessCount: number; lastAccess: Date }>;
  isolationHealth: {
    score: number;
    status: 'healthy' | 'warning' | 'critical';
    recommendations: string[];
  };
  recentViolations: IsolationViolation[];
}

export interface TenantContext {
  tenantId: string;
  isSuperAdmin: boolean;
  userId?: string;
  permissions?: string[];
  sessionId?: string;
}

export class DataIsolationService {
  private static violations: IsolationViolation[] = [];
  private static readonly MAX_VIOLATIONS = 50; // CRITICAL: Reduce from 1000
  private static config: IsolationConfig;
  private static tenantModels: Map<string, Model<any>> = new Map();
  private static isolationRules: Map<string, any> = new Map();

  /**
   * Initialize the data isolation service
   */
  static async initialize(): Promise<void> {
    try {
      this.config = {
        enabled: true,
        strictMode: process.env.NODE_ENV === 'production',
        superAdminBypass: true,
        logViolations: true,
        enforceTenantId: true,
        validateTenantAccess: true,
        auditIsolation: true
      };

      // Register tenant-aware models
      this.registerTenantModels();

      // Set up isolation rules
      this.setupIsolationRules();

      log.info('Data isolation service initialized with bulletproof tenant isolation');
    } catch (error) {
      log.error('Failed to initialize data isolation service:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      throw new AppError('Failed to initialize data isolation service', 500);
    }
  }

  /**
   * Get isolation configuration
   */
  static getConfig(): IsolationConfig {
    if (!this.config) {
      throw new AppError('Data isolation service not initialized', 500);
    }
    return this.config;
  }

  /**
   * Register tenant-aware models
   */
  private static registerTenantModels(): void {
    const tenantModels = [
      'User', 'Profile', 'AuditLog', 'Notification', 
      'ApiKey', 'MFASettings'
    ];

    tenantModels.forEach((modelName: any) => {
      const model = mongoose.model(modelName);
      if (model) {
        this.tenantModels.set(modelName, model);
      }
    });
  }

  /**
   * Set up isolation rules for different operations
   */
  private static setupIsolationRules(): void {
    this.isolationRules.set('find', {
      requiresTenantId: true,
      allowedOperations: ['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete'],
      strictTenantCheck: true
    });

    this.isolationRules.set('create', {
      requiresTenantId: true,
      allowedOperations: ['create', 'insertMany', 'save'],
      strictTenantCheck: true
    });

    this.isolationRules.set('update', {
      requiresTenantId: true,
      allowedOperations: ['updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndReplace'],
      strictTenantCheck: true
    });

    this.isolationRules.set('delete', {
      requiresTenantId: true,
      allowedOperations: ['deleteOne', 'deleteMany', 'findOneAndDelete'],
      strictTenantCheck: true
    });

    this.isolationRules.set('aggregate', {
      requiresTenantId: true,
      allowedOperations: ['aggregate'],
      strictTenantCheck: true
    });

    this.isolationRules.set('count', {
      requiresTenantId: true,
      allowedOperations: ['count', 'countDocuments', 'estimatedDocumentCount'],
      strictTenantCheck: true
    });
  }

  /**
   * Validate tenant context
   */
  static validateTenantContext(context: TenantContext, operation: string): boolean {
    if (!this.config.enabled) {
      return true;
    }

    // Super admin bypass
    if (this.config.superAdminBypass && context.isSuperAdmin) {
      return true;
    }

    // Check if tenant ID is required
    const rule = this.isolationRules.get(operation);
    if (!rule || !rule.requiresTenantId) {
      return true;
    }

    // Validate tenant ID presence
    if (!context.tenantId) {
      return false;
    }

    // Validate tenant ID format
    if (!mongoose.Types.ObjectId.isValid(context.tenantId)) {
      return false;
    }

    return true;
  }

  /**
   * Enforce tenant isolation on query
   */
  static enforceTenantIsolation<T extends Document>(
    query: Query<T[], T>,
    context: TenantContext,
    operation: string
  ): Query<T[], T> {
    if (!this.config.enabled) {
      return query;
    }

    // Super admin bypass
    if (this.config.superAdminBypass && context.isSuperAdmin) {
      return query;
    }

    // Get isolation rule
    const rule = this.isolationRules.get(operation);
    if (!rule || !rule.requiresTenantId) {
      return query;
    }

    // Add tenant ID filter
    const filter = (query as any).getFilter();
    if (!filter.tenantId && context.tenantId) {
      (query as any).setQuery({ ...(filter as any), tenantId: new mongoose.Types.ObjectId(context.tenantId) });
    }

    return query;
  }

  /**
   * Validate tenant access for specific resource
   */
  static async validateTenantAccess(
    resourceId: string,
    context: TenantContext,
    modelName: string
  ): Promise<boolean> {
    if (!this.config.enabled || !this.config.validateTenantAccess) {
      return true;
    }

    // Super admin bypass
    if (this.config.superAdminBypass && context.isSuperAdmin) {
      return true;
    }

    try {
      const model = this.tenantModels.get(modelName);
      if (!model) {
        return true; // Model not tenant-aware
      }

      const resource = await model.findById(resourceId).lean();
      if (!resource) {
        return false; // Resource not found
      }

      // Check tenant ID match
      if (resource && typeof resource === 'object' && 'tenantId' in resource && 
          resource.tenantId && resource.tenantId.toString() !== context.tenantId) {
        return false; // Cross-tenant access attempt
      }

      return true;
    } catch (error) {
      log.error('Error validating tenant access:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      return false;
    }
  }

  /**
   * Create tenant-aware query
   */
  static createTenantQuery(
    context: TenantContext,
    baseQuery: any = {}
  ): any {
    if (!this.config.enabled) {
      return baseQuery;
    }

    // Super admin bypass
    if (this.config.superAdminBypass && context.isSuperAdmin) {
      return baseQuery;
    }

    // Add tenant ID filter
    if (context.tenantId) {
      return {
        ...(baseQuery as any),
        tenantId: new mongoose.Types.ObjectId(context.tenantId)
      };
    }

    return baseQuery;
  }

  /**
   * Validate tenant ID in document
   */
  static validateTenantIdInDocument(
    doc: any,
    context: TenantContext,
    operation: string
  ): boolean {
    if (!this.config.enabled) {
      return true;
    }

    // Super admin bypass
    if (this.config.superAdminBypass && context.isSuperAdmin) {
      return true;
    }

    // Check if tenant ID is required
    const rule = this.isolationRules.get(operation);
    if (!rule || !rule.requiresTenantId) {
      return true;
    }

    // Validate tenant ID presence
    if (!(doc as any).tenantId) {
      return false;
    }

    // Validate tenant ID match
    if ((doc as any).tenantId.toString() !== context.tenantId) {
      return false;
    }

    return true;
  }

  /**
   * Log isolation violation
   */
  static logViolation(
    type: IsolationViolation['type'],
    severity: IsolationViolation['severity'],
    req: Request,
    details: any,
    blocked: boolean = false
  ): IsolationViolation {
    const tenantRequest = req as TenantRequest;
    
    const violation: IsolationViolation = {
      id: `isolation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      severity,
      userId: (req as any).user?._id,
      tenantId: tenantRequest.tenantId,
      requestedTenantId: (details as any).tenantId,
      endpoint: (req as any).path,
      method: (req as any).method,
      query: (details as any).query,
      details,
      blocked,
      metadata: {
        ipAddress: (req as any).ip,
        userAgent: (req as any).get('User-Agent'),
        referer: (req as any).get('Referer'),
        origin: (req as any).get('Origin')
      }
    };

    this.violations.push(violation);

    // ✅ AGGRESSIVE MEMORY CLEANUP  
    if (this.violations.length > this.MAX_VIOLATIONS) {
      this.violations = this.violations.slice(-this.MAX_VIOLATIONS);
    }

    if (this.config.logViolations) {
      log.warn('Data isolation violation detected:', { violation });
    }

    return violation;
  }

  /**
   * Get isolation statistics
   */
  static getIsolationStats(): IsolationStats {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentViolations = this.violations.filter((v: any) => v.timestamp >= last24Hours);
    
    // Calculate violations by type
    const violationsByType = new Map<string, number>();
    recentViolations.forEach((v: any) => {
      violationsByType.set(v.type, (violationsByType.get(v.type) || 0) + 1);
    });

    // Calculate violations by severity
    const violationsBySeverity = new Map<string, number>();
    recentViolations.forEach((v: any) => {
      violationsBySeverity.set(v.severity, (violationsBySeverity.get(v.severity) || 0) + 1);
    });

    // Calculate top violated endpoints
    const endpointCounts = new Map<string, number>();
    recentViolations.forEach((v: any) => {
      endpointCounts.set(v.endpoint, (endpointCounts.get(v.endpoint) || 0) + 1);
    });

    // Calculate tenant access patterns
    const tenantAccessPatterns = new Map<string, { accessCount: number; lastAccess: Date }>();
    recentViolations.forEach((v: any) => {
      if (v.tenantId) {
        const existing = tenantAccessPatterns.get(v.tenantId);
        if (existing) {
          existing.accessCount++;
          if (v.timestamp > existing.lastAccess) {
            existing.lastAccess = v.timestamp;
          }
        } else {
          tenantAccessPatterns.set(v.tenantId, {
            accessCount: 1,
            lastAccess: v.timestamp
          });
        }
      }
    });

    // Calculate isolation health score
    const criticalViolations = recentViolations.filter((v: any) => v.severity === 'critical').length;
    const highViolations = recentViolations.filter((v: any) => v.severity === 'high').length;
    const mediumViolations = recentViolations.filter((v: any) => v.severity === 'medium').length;
    
    const isolationScore = Math.max(0, 100 - (criticalViolations * 25) - (highViolations * 15) - (mediumViolations * 10));
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (isolationScore < 70) {
      status = 'critical';
    } else if (isolationScore < 90) {
      status = 'warning';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (criticalViolations > 0) {
      recommendations.push('Critical isolation violations detected. Immediate attention required.');
    }
    if (highViolations > 5) {
      recommendations.push('High number of isolation violations. Review tenant access patterns.');
    }
    if (isolationScore < 70) {
      recommendations.push('Isolation health score is low. Consider implementing additional isolation measu(res as any).');
    }

    return {
      totalViolations: recentViolations.length,
      violationsByType: Array.from(violationsByType.entries()).map(([type, count]) => ({ type, count })),
      violationsBySeverity: Array.from(violationsBySeverity.entries()).map(([severity, count]) => ({ severity, count })),
      topViolatedEndpoints: Array.from(endpointCounts.entries())
        .map(([endpoint, count]) => ({ endpoint, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      tenantAccessPatterns: Array.from(tenantAccessPatterns.entries())
        .map(([tenantId, data]) => ({ tenantId, ...data }))
        .sort((a, b) => b.accessCount - a.accessCount)
        .slice(0, 20),
      isolationHealth: {
        score: isolationScore,
        status,
        recommendations
      },
      recentViolations: recentViolations.slice(0, 20)
    };
  }

  /**
   * Get recent violations
   */
  static getViolations(limit: number = 50): IsolationViolation[] {
    return this.violations
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clear violations (for testing)
   */
  static clearViolations(): number {
    const count = this.violations.length;
    this.violations = [];
    return count;
  }

  /**
   * Create tenant context from request
   */
  static createTenantContext(req: TenantRequest): TenantContext {
    return {
      tenantId: (req as any).tenantId || '',
      isSuperAdmin: (req as any).isSuperAdmin || false,
      userId: (req as any).user?._id,
      permissions: (req as any).user?.permissions,
      sessionId: (req as any).headers['x-session-id'] as string
    };
  }

  /**
   * Validate tenant context middleware
   */
  static validateTenantContextMiddleware() {
    return (req: TenantRequest, res: Response, next: Function) => {
      try {
        const context = this.createTenantContext(req);
        
        // Validate tenant context
        if (!this.validateTenantContext(context, 'find')) {
          const violation = this.logViolation(
            'missing_tenant_id',
            'high',
            req,
            { context, reason: 'Missing or invalid tenant context' },
            true
          );
          
          return (res as any).status(400).json({
            success: false,
            message: 'Invalid tenant context',
            code: 'INVALID_TENANT_CONTEXT'
          });
        }

        // Attach context to request
        (req as any).tenantContext = context;
        
        next();
      } catch (error) {
        log.error('Tenant context validation middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
        next(error);
      }
    };
  }

  /**
   * Tenant isolation middleware
   */
  static tenantIsolationMiddleware() {
    return (req: TenantRequest, res: Response, next: Function) => {
      try {
        const context = this.createTenantContext(req);
        
        // Attach isolation helpers to request
        (req as any).createTenantQuery = (baseQuery: any = {}) => this.createTenantQuery(context, baseQuery);
        (req as any).validateTenantAccess = (resourceId: string, modelName: string) => 
          this.validateTenantAccess(resourceId, context, modelName);
        (req as any).enforceTenantIsolation = (query: any, operation: string) => 
          this.enforceTenantIsolation(query, context, operation);
        
        next();
      } catch (error) {
        log.error('Tenant isolation middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
        next(error);
      }
    };
  }
}
