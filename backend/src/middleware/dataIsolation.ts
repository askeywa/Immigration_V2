// backend/src/middleware/dataIsolation.ts
import { Request, Response, NextFunction } from 'express';
import mongoose, { Model, Document, Query } from 'mongoose';
import { TenantRequest } from './tenantResolution';
import { DataIsolationService } from '../services/dataIsolationService';
import { AppError } from '../utils/errors';
import { log } from '../utils/logger';

/**
 * Enhanced Row-Level Security middleware with bulletproof tenant isolation
 */
export const bulletproofTenantIsolation = () => {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      // Create tenant context
      const context = DataIsolationService.createTenantContext(req);
      
      // Validate tenant context
      if (!DataIsolationService.validateTenantContext(context, 'find')) {
        const violation = DataIsolationService.logViolation(
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

      // Attach isolation helpers to request
      (req as any).tenantContext = context;
      (req as any).createTenantQuery = (baseQuery: any = {}) => 
        DataIsolationService.createTenantQuery(context, baseQuery);
      (req as any).validateTenantAccess = (resourceId: string, modelName: string) => 
        DataIsolationService.validateTenantAccess(resourceId, context, modelName);
      (req as any).enforceTenantIsolation = (query: any, operation: string) => 
        DataIsolationService.enforceTenantIsolation(query, context, operation);
      
      next();
    } catch (error) {
      log.error('Bulletproof tenant isolation middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      next(error);
    }
  };
};

/**
 * Database query isolation middleware (simplified approach)
 */
export const databaseQueryIsolation = () => {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const context = (req as any).tenantContext;
      
      if (!context) {
        return next();
      }

      // Attach tenant query helpers to request
      (req as any).createTenantQuery = (baseQuery: any = {}) => {
        if (!context.isSuperAdmin && context.tenantId) {
          return { ...baseQuery, tenantId: new mongoose.Types.ObjectId(context.tenantId) };
        }
        return baseQuery;
      };

      (req as any).addTenantFilter = (query: any) => {
        if (!context.isSuperAdmin && context.tenantId) {
          if ((query as any).where) {
            (query as any).where('tenantId').equals(new mongoose.Types.ObjectId(context.tenantId));
          } else {
            (query as any).tenantId = new mongoose.Types.ObjectId(context.tenantId);
          }
        }
        return query;
      };

      next();
    } catch (error) {
      log.error('Database query isolation middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      next(error);
    }
  };
};

/**
 * Resource access validation middleware
 */
export const resourceAccessValidation = (modelName: string) => {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const context = (req as any).tenantContext;
      const resourceId = (req as any).params.id || (req as any).params.userId || (req as any).params.profileId;
      
      if (!context || !resourceId) {
        return next();
      }

      // Validate tenant access to resource
      const hasAccess = await DataIsolationService.validateTenantAccess(resourceId, context, modelName);
      
      if (!hasAccess) {
        const violation = DataIsolationService.logViolation(
          'cross_tenant_access',
          'critical',
          req,
          { resourceId, modelName, context },
          true
        );
        
        return (res as any).status(403).json({
          success: false,
          message: 'Access denied to resource',
          code: 'RESOURCE_ACCESS_DENIED'
        });
      }

      next();
    } catch (error) {
      log.error('Resource access validation middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      next(error);
    }
  };
};

/**
 * Tenant ID enforcement middleware
 */
export const tenantIdEnforcement = () => {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const context = (req as any).tenantContext;
      
      if (!context) {
        return next();
      }

      // Check for tenant ID in request body for create/update operations
      if (['POST', 'PUT', 'PATCH'].includes((req as any).method) && (req as any).body) {
        // If tenantId is provided, validate it matches context
        if ((req as any).body.tenantId && (req as any).body.tenantId !== context.tenantId) {
          const violation = DataIsolationService.logViolation(
            'cross_tenant_access',
            'critical',
            req,
            { providedTenantId: (req as any).body.tenantId, contextTenantId: context.tenantId },
            true
          );
          
          return (res as any).status(400).json({
            success: false,
            message: 'Tenant ID mismatch',
            code: 'TENANT_ID_MISMATCH'
          });
        }

        // Ensure tenantId is set for create operations
        if ((req as any).method === 'POST' && !(req as any).body.tenantId && context.tenantId) {
          (req as any).body.tenantId = context.tenantId;
        }
      }

      next();
    } catch (error) {
      log.error('Tenant ID enforcement middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      next(error);
    }
  };
};

/**
 * Query validation middleware
 */
export const queryValidation = () => {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const context = (req as any).tenantContext;
      
      if (!context) {
        return next();
      }

      // Check for suspicious query parameters
      const suspiciousParams = ['$where', '$regex', '$ne', '$gt', '$lt', '$in', '$nin', '$exists'];
      const queryParams = { ...(req as any).query, ...(req as any).body };
      
      for (const [key, value] of Object.entries(queryParams)) {
        if (typeof value === 'string' && suspiciousParams.some((param: any) => value.includes(param))) {
          const violation = DataIsolationService.logViolation(
            'query_violation',
            'high',
            req,
            { key, value, suspiciousParams },
            true
          );
          
          return (res as any).status(400).json({
            success: false,
            message: 'Invalid query parameter',
            code: 'INVALID_QUERY_PARAMETER'
          });
        }
      }

      next();
    } catch (error) {
      log.error('Query validation middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      next(error);
    }
  };
};

/**
 * Cross-tenant access prevention middleware
 */
export const crossTenantAccessPrevention = () => {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const context = (req as any).tenantContext;
      
      if (!context) {
        return next();
      }

      // Check for tenant ID in URL parameters
      const tenantIdParam = (req as any).params.tenantId;
      if (tenantIdParam && tenantIdParam !== context.tenantId && !context.isSuperAdmin) {
        const violation = DataIsolationService.logViolation(
          'cross_tenant_access',
          'critical',
          req,
          { urlTenantId: tenantIdParam, contextTenantId: context.tenantId },
          true
        );
        
        return (res as any).status(403).json({
          success: false,
          message: 'Cross-tenant access denied',
          code: 'CROSS_TENANT_ACCESS_DENIED'
        });
      }

      // Check for tenant ID in query parameters
      const queryTenantId = (req as any).query.tenantId;
      if (queryTenantId && queryTenantId !== context.tenantId && !context.isSuperAdmin) {
        const violation = DataIsolationService.logViolation(
          'cross_tenant_access',
          'high',
          req,
          { queryTenantId, contextTenantId: context.tenantId },
          true
        );
        
        return (res as any).status(403).json({
          success: false,
          message: 'Cross-tenant access denied',
          code: 'CROSS_TENANT_ACCESS_DENIED'
        });
      }

      next();
    } catch (error) {
      log.error('Cross-tenant access prevention middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      next(error);
    }
  };
};

/**
 * Data isolation monitoring middleware
 */
export const dataIsolationMonitoring = () => {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Monitor response for isolation violations
    (res as any).on('finish', () => {
      const duration = Date.now() - startTime;
      const context = (req as any).tenantContext;
      
      // Log isolation metrics
      if (context) {
        log.info('Data isolation metrics:', {
          tenantId: context.tenantId,
          isSuperAdmin: context.isSuperAdmin,
          endpoint: (req as any).path,
          method: (req as any).method,
          statusCode: (res as any).statusCode,
          duration,
          timestamp: new Date()
        });
      }
    });

    next();
  };
};

/**
 * Comprehensive data isolation middleware stack
 */
export const comprehensiveDataIsolation = () => {
  return [
    bulletproofTenantIsolation(),
    databaseQueryIsolation(),
    tenantIdEnforcement(),
    queryValidation(),
    crossTenantAccessPrevention(),
    dataIsolationMonitoring()
  ];
};
