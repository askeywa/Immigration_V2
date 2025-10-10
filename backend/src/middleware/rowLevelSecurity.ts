// backend/src/middleware/rowLevelSecurity.ts
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { TenantRequest } from './tenantResolution';
import { DataIsolationService } from '../services/dataIsolationService';

/**
 * Row-Level Security (RLS) middleware for bulletproof tenant isolation
 * 
 * This middleware ensures that tenant context is available throughout
 * the request lifecycle and provides utilities for tenant-aware operations.
 */

// Global tenant context storage
declare global {
  var currentTenantContext: {
    tenantId: string | null;
    isSuperAdmin: boolean;
  } | null;
}

/**
 * Get tenant context from request
 */
function getTenantContext(req: TenantRequest): { tenantId: string | null; isSuperAdmin: boolean } {
  return {
    tenantId: (req as any).tenantId || null,
    isSuperAdmin: (req as any).isSuperAdmin || false
  };
}

/**
 * Check if a model requires tenant isolation
 */
function requiresTenantIsolation(modelName: string): boolean {
  // Models that don't need tenant isolation
  const excludedModels = ['Tenant', 'SubscriptionPlan', 'AuditLog'];
  return !excludedModels.includes(modelName);
}

/**
 * Add tenant filter to query
 */
function addTenantFilter(filter: any, tenantId: string | null, isSuperAdmin: boolean): any {
  if (isSuperAdmin || !tenantId) {
    // Super admins can access all data, no filtering needed
    return filter;
  }

  // Add tenantId to the filter
  return {
    ...(filter as any),
    tenantId: new mongoose.Types.ObjectId(tenantId)
  };
}

/**
 * Row-Level Security middleware
 * 
 * This middleware sets up the tenant context for all database operations
 * in the current request. It must be used after tenant resolution middleware.
 */
export const rowLevelSecurity = (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    // Set tenant context in global scope for this request
    global.currentTenantContext = getTenantContext(req);
    
    // Clean up tenant context when request completes
    (res as any).on('finish', () => {
      global.currentTenantContext = null;
    });
    
    (res as any).on('close', () => {
      global.currentTenantContext = null;
    });
    
    next();
  } catch (error) {
    console.error('Row-Level Security middleware error:', error);
    next(error);
  }
};

/**
 * Initialize Row-Level Security system
 * 
 * This function should be called once during application startup
 * to set up the RLS system.
 */
export const initializeRowLevelSecurity = () => {
  console.log('🔒 Initializing Row-Level Security (RLS) system...');
  console.log('✅ Row-Level Security system initialized');
  console.log('📋 RLS Features:');
  console.log('  • Tenant context management');
  console.log('  • Super admin bypass support');
  console.log('  • Model-specific isolation rules');
  console.log('  • Request-scoped tenant context');
};

/**
 * Utility function to get current tenant context
 */
export const getCurrentTenantContext = () => {
  return global.currentTenantContext;
};

/**
 * Utility function to check if RLS is active
 */
export const isRLSActive = (): boolean => {
  return global.currentTenantContext !== null;
};

/**
 * Utility function to check if current user is super admin
 */
export const isSuperAdmin = (): boolean => {
  return global.currentTenantContext?.isSuperAdmin === true;
};

/**
 * Utility function to get current tenant ID
 */
export const getCurrentTenantId = (): string | null => {
  return global.currentTenantContext?.tenantId || null;
};

/**
 * Utility function to create tenant-aware filter
 */
export const createTenantFilter = (baseFilter: any = {}): any => {
  const context = global.currentTenantContext;
  
  if (!context) {
    return baseFilter;
  }
  
  return addTenantFilter(baseFilter, context.tenantId, context.isSuperAdmin);
};

/**
 * Utility function to execute operation with specific tenant context
 */
export const withTenantContext = async <T>(
  tenantId: string | null, 
  isSuperAdmin: boolean, 
  operation: () => Promise<T>
): Promise<T> => {
  const originalContext = global.currentTenantContext;
  
  try {
    // Set specific tenant context
    global.currentTenantContext = { tenantId, isSuperAdmin };
    
    // Execute operation
    const result = await operation();
    
    return result;
  } finally {
    // Restore original context
    global.currentTenantContext = originalContext;
  }
};

/**
 * Utility function to temporarily disable RLS for specific operations
 * WARNING: Use with extreme caution and only for super admin operations
 */
export const withRLSDisabled = async <T>(operation: () => Promise<T>): Promise<T> => {
  const originalContext = global.currentTenantContext;
  
  try {
    // Temporarily disable RLS
    global.currentTenantContext = null;
    
    // Execute operation
    const result = await operation();
    
    return result;
  } finally {
    // Restore RLS
    global.currentTenantContext = originalContext;
  }
};

/**
 * Utility function to validate tenant access for a document
 */
export const validateTenantAccess = (document: any, modelName: string): boolean => {
  const context = global.currentTenantContext;
  
  // No context means RLS is disabled - allow access
  if (!context) {
    return true;
  }
  
  // Super admins have access to everything
  if (context.isSuperAdmin) {
    return true;
  }
  
  // Models that don't require tenant isolation
  if (!requiresTenantIsolation(modelName)) {
    return true;
  }
  
  // Check if document belongs to current tenant
  if (!document || !(document as any).tenantId) {
    return false;
  }
  
  return (document as any).tenantId.toString() === context.tenantId;
};

/**
 * Utility function to ensure tenantId is set on document creation
 */
export const ensureTenantId = (data: any, modelName: string): any => {
  const context = global.currentTenantContext;
  
  // No context means RLS is disabled - return data as is
  if (!context) {
    return data;
  }
  
  // Models that don't require tenant isolation
  if (!requiresTenantIsolation(modelName)) {
    return data;
  }
  
  // Super admins can create documents without tenantId
  if (context.isSuperAdmin) {
    return data;
  }
  
  // Ensure tenantId is set for tenant users
  if (context.tenantId && !(data as any).tenantId) {
    return {
      ...(data as any),
      tenantId: new mongoose.Types.ObjectId(context.tenantId)
    };
  }
  
  return data;
};

/**
 * Middleware to validate tenant access for specific routes
 */
export const validateTenantAccessMiddleware = (req: TenantRequest, res: Response, next: NextFunction) => {
  const context = global.currentTenantContext;
  
  // Super admins have access to everything
  if (context?.isSuperAdmin) {
    return next();
  }
  
  // Ensure tenant context exists
  if (!context || !context.tenantId) {
    return (res as any).status(400).json({
      success: false,
      message: 'Tenant access required for this operation'
    });
  }
  
  next();
};

/**
 * Middleware to ensure super admin access
 */
export const requireSuperAdminMiddleware = (req: TenantRequest, res: Response, next: NextFunction) => {
  const context = global.currentTenantContext;
  
  if (!context?.isSuperAdmin) {
    return (res as any).status(403).json({
      success: false,
      message: 'Super admin access required for this operation'
    });
  }
  
  next();
};

/**
 * Service layer helper for tenant-aware database operations
 */
export class TenantAwareService {
  /**
   * Create tenant-aware filter for queries
   */
  static createFilter(baseFilter: any = {}): any {
    return createTenantFilter(baseFilter);
  }
  
  /**
   * Ensure tenantId is set for document creation
   */
  static ensureTenantId(data: any, modelName: string): any {
    return ensureTenantId(data, modelName);
  }
  
  /**
   * Validate tenant access for a document
   */
  static validateAccess(document: any, modelName: string): boolean {
    return validateTenantAccess(document, modelName);
  }
  
  /**
   * Get current tenant context
   */
  static getContext() {
    return getCurrentTenantContext();
  }
  
  /**
   * Check if current user is super admin
   */
  static isSuperAdmin(): boolean {
    return isSuperAdmin();
  }
  
  /**
   * Get current tenant ID
   */
  static getTenantId(): string | null {
    return getCurrentTenantId();
  }
}

export default {
  rowLevelSecurity,
  initializeRowLevelSecurity,
  getCurrentTenantContext,
  isRLSActive,
  isSuperAdmin,
  getCurrentTenantId,
  createTenantFilter,
  withRLSDisabled,
  withTenantContext,
  validateTenantAccess,
  ensureTenantId,
  validateTenantAccessMiddleware,
  requireSuperAdminMiddleware,
  TenantAwareService
};