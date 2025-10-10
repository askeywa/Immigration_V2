// backend/src/middleware/tenantValidation.ts
import { Request, Response, NextFunction } from 'express';
import { TenantRequest } from './tenantResolution';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { AppError, ValidationError } from '../utils/errors';
import { log } from '../utils/logger';
import mongoose from 'mongoose';

export interface TenantValidationConfig {
  strictMode: boolean;
  requireActiveTenant: boolean;
  validateUserTenantAccess: boolean;
  allowSuperAdmin: boolean;
  logValidationFailures: boolean;
  cacheValidationResults: boolean;
}

export interface TenantValidationResult {
  isValid: boolean;
  tenant?: any;
  user?: any;
  error?: string;
  warnings: string[];
  metadata: {
    validationTime: number;
    cacheHit: boolean;
    tenantStatus: string;
    userRole: string;
  };
}

export class TenantValidationService {
  private static validationCache = new Map<string, TenantValidationResult>();
  private static config: TenantValidationConfig = {
    strictMode: true,
    requireActiveTenant: true,
    validateUserTenantAccess: true,
    allowSuperAdmin: true,
    logValidationFailures: true,
    cacheValidationResults: true
  };

  /**
   * Configure tenant validation settings
   */
  static configure(config: Partial<TenantValidationConfig>): void {
    this.config = { ...this.config, ...config };
    log.info('Tenant validation configuration updated', { config: this.config });
  }

  /**
   * Comprehensive tenant validation middleware
   */
  static validateTenant() {
    return async (req: TenantRequest, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const cacheKey = this.generateCacheKey(req);
      
      try {
        // Check cache first
        if (this.config.cacheValidationResults && this.validationCache.has(cacheKey)) {
          const cached = this.validationCache.get(cacheKey)!;
          cached.metadata.cacheHit = true;
          
          if (cached.isValid) {
            return next();
          } else {
            return this.handleValidationFailure(req, res, cached.error || 'Tenant validation failed');
          }
        }

        // Perform validation
        const result = await this.performTenantValidation(req, startTime);
        
        // Cache result
        if (this.config.cacheValidationResults) {
          this.validationCache.set(cacheKey, result);
        }

        if (result.isValid) {
          // Attach validation result to request
          (req as any).tenantValidation = result;
          next();
        } else {
          this.handleValidationFailure(req, res, result.error || 'Tenant validation failed', result);
        }

      } catch (error) {
        log.error('Tenant validation error', {
          error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
          tenantId: (req as any).tenantId,
          userId: (req as any).user?._id,
          url: (req as any).url
        });
        
        return this.handleValidationFailure(req, res, 'Tenant validation system error');
      }
    };
  }

  /**
   * Perform comprehensive tenant validation
   */
  private static async performTenantValidation(
    req: TenantRequest, 
    startTime: number
  ): Promise<TenantValidationResult> {
    const warnings: string[] = [];
    let tenant: any = null;
    let user: any = null;

    // 1. Validate tenant existence and status
    if ((req as any).isSuperAdmin && this.config.allowSuperAdmin) {
      // Super admin bypass
      return {
        isValid: true,
        tenant: null,
        user: (req as any).user,
        warnings: ['Super admin access - tenant validation bypassed'],
        metadata: {
          validationTime: Date.now() - startTime,
          cacheHit: false,
          tenantStatus: 'super_admin',
          userRole: (req as any).user?.role || 'super_admin'
        }
      };
    }

    // 2. Validate tenantId presence
    if (!(req as any).tenantId) {
      return {
        isValid: false,
        error: 'Tenant ID is required',
        warnings,
        metadata: {
          validationTime: Date.now() - startTime,
          cacheHit: false,
          tenantStatus: 'missing',
          userRole: (req as any).user?.role || 'unknown'
        }
      };
    }

    // 3. Validate tenant exists and is active
    try {
      tenant = await Tenant.findById((req as any).tenantId).lean();
      if (!tenant) {
        return {
          isValid: false,
          error: 'Tenant not found',
          warnings,
          metadata: {
            validationTime: Date.now() - startTime,
            cacheHit: false,
            tenantStatus: 'not_found',
            userRole: (req as any).user?.role || 'unknown'
          }
        };
      }

      // Check if tenant is active
      if (this.config.requireActiveTenant && !(tenant as any).isActive) {
        return {
          isValid: false,
          error: 'Tenant is inactive',
          warnings,
          metadata: {
            validationTime: Date.now() - startTime,
            cacheHit: false,
            tenantStatus: 'inactive',
            userRole: (req as any).user?.role || 'unknown'
          }
        };
      }

      // Check if tenant trial has expired
      if ((tenant as any).isTrialExpired && (tenant as any).subscription?.status !== 'active') {
        warnings.push('Tenant trial has expired');
        if (this.config.strictMode) {
          return {
            isValid: false,
            error: 'Tenant trial has expired',
            warnings,
            metadata: {
              validationTime: Date.now() - startTime,
              cacheHit: false,
              tenantStatus: 'trial_expired',
              userRole: (req as any).user?.role || 'unknown'
            }
          };
        }
      }

    } catch (error) {
      return {
        isValid: false,
        error: 'Failed to validate tenant',
        warnings,
        metadata: {
          validationTime: Date.now() - startTime,
          cacheHit: false,
          tenantStatus: 'validation_error',
          userRole: (req as any).user?.role || 'unknown'
        }
      };
    }

    // 4. Validate user tenant access (if user is present)
    if ((req as any).user && this.config.validateUserTenantAccess) {
      try {
        user = await User.findById((req as any).user._id).lean();
        if (!user) {
          return {
            isValid: false,
            error: 'User not found',
            warnings,
            metadata: {
              validationTime: Date.now() - startTime,
              cacheHit: false,
              tenantStatus: (tenant as any).isActive ? 'active' : 'inactive',
              userRole: 'not_found'
            }
          };
        }

        // Check if user belongs to this tenant
        if ((user as any).tenantId && (user as any).tenantId.toString() !== (req as any).tenantId) {
          return {
            isValid: false,
            error: 'User does not belong to this tenant',
            warnings,
            metadata: {
              validationTime: Date.now() - startTime,
              cacheHit: false,
              tenantStatus: (tenant as any).isActive ? 'active' : 'inactive',
              userRole: (user as any).role || 'unknown'
            }
          };
        }

        // Check if user is active
        if ((user as any).status !== 'active') {
          warnings.push('User account is not active');
          if (this.config.strictMode) {
            return {
              isValid: false,
              error: 'User account is not active',
              warnings,
              metadata: {
                validationTime: Date.now() - startTime,
                cacheHit: false,
                tenantStatus: (tenant as any).isActive ? 'active' : 'inactive',
                userRole: (user as any).role || 'unknown'
              }
            };
          }
        }

      } catch (error) {
        warnings.push('Failed to validate user tenant access');
        if (this.config.strictMode) {
          return {
            isValid: false,
            error: 'Failed to validate user tenant access',
            warnings,
            metadata: {
              validationTime: Date.now() - startTime,
              cacheHit: false,
              tenantStatus: (tenant as any).isActive ? 'active' : 'inactive',
              userRole: 'validation_error'
            }
          };
        }
      }
    }

    // 5. Validate domain consistency (if tenant domain is provided)
    if ((req as any).tenantDomain && (tenant as any).domain && (req as any).tenantDomain !== (tenant as any).domain) {
      warnings.push('Domain mismatch detected');
      if (this.config.strictMode) {
        return {
          isValid: false,
          error: 'Domain mismatch detected',
          warnings,
          metadata: {
            validationTime: Date.now() - startTime,
            cacheHit: false,
            tenantStatus: (tenant as any).isActive ? 'active' : 'inactive',
            userRole: user?.role || (req as any).user?.role || 'unknown'
          }
        };
      }
    }

    // 6. Check tenant resource limits
    if ((tenant as any).subscription) {
      const limits = ((tenant as any).subscription as any).limits;
      if (limits) {
        // Check user limit
        if (limits.users && user) {
          const userCount = await User.countDocuments({ tenantId: (req as any).tenantId });
          if (userCount >= limits.users) {
            warnings.push('Tenant user limit reached');
          }
        }
      }
    }

    return {
      isValid: true,
      tenant,
      user,
      warnings,
      metadata: {
        validationTime: Date.now() - startTime,
        cacheHit: false,
        tenantStatus: (tenant as any).isActive ? 'active' : 'inactive',
        userRole: user?.role || (req as any).user?.role || 'unknown'
      }
    };
  }

  /**
   * Handle validation failure
   */
  private static handleValidationFailure(
    req: TenantRequest, 
    res: Response, 
    error: string,
    result?: TenantValidationResult
  ): void {
    const logData = {
      error,
      tenantId: (req as any).tenantId,
      userId: (req as any).user?._id,
      url: (req as any).url,
      method: (req as any).method,
      userAgent: (req as any).get('User-Agent'),
      ip: (req as any).ip,
      validationResult: result?.metadata
    };

    if (this.config.logValidationFailures) {
      log.warn('Tenant validation failed', logData);
    }

    // Log security event
    if (result?.metadata.tenantStatus === 'not_found' || 
        result?.metadata.tenantStatus === 'inactive') {
      log.error('Security: Invalid tenant access attempt', logData);
    }

    (res as any).status(403).json({
      success: false,
      error: 'Tenant validation failed',
      message: error,
      code: 'TENANT_VALIDATION_FAILED',
      timestamp: new Date().toISOString(),
      requestId: (req as any).headers['x-request-id'] || 'unknown'
    });
  }

  /**
   * Generate cache key for validation result
   */
  private static generateCacheKey(req: TenantRequest): string {
    return `${(req as any).tenantId || 'no-tenant'}-${(req as any).user?._id || 'no-user'}-${(req as any).method}-${(req as any).url}`;
  }

  /**
   * Clear validation cache
   */
  static clearCache(): void {
    this.validationCache.clear();
    log.info('Tenant validation cache cleared');
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.validationCache.size,
      keys: Array.from(this.validationCache.keys())
    };
  }

  /**
   * Validate tenant subscription status
   */
  static async validateTenantSubscription(tenantId: string): Promise<{
    isValid: boolean;
    status: string;
    expiresAt?: Date;
    limits?: any;
  }> {
    try {
      const tenant = await Tenant.findById(tenantId).lean();
      if (!tenant || !(tenant as any).subscription) {
        return { isValid: false, status: 'no_subscription' };
      }

      const subscription = (tenant as any).subscription;
      const now = new Date();

      // Check if subscription is active
      if (subscription.status === 'active') {
        return {
          isValid: true,
          status: 'active',
          expiresAt: (subscription as any).expiresAt,
          limits: (subscription as any).limits
        };
      }

      // Check if subscription is in grace period
      if ((subscription as any).status === 'past_due' && (subscription as any).expiresAt) {
        const gracePeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
        const isInGracePeriod = new Date((subscription as any).expiresAt.getTime() + gracePeriod) > now;
        
        return {
          isValid: isInGracePeriod,
          status: isInGracePeriod ? 'grace_period' : 'expired',
          expiresAt: (subscription as any).expiresAt,
          limits: (subscription as any).limits
        };
      }

      return {
        isValid: false,
        status: subscription.status || 'unknown',
        expiresAt: (subscription as any).expiresAt,
        limits: (subscription as any).limits
      };

    } catch (error) {
      log.error('Failed to validate tenant subscription', {
        tenantId,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      return { isValid: false, status: 'validation_error' };
    }
  }

  /**
   * Validate tenant resource limits
   */
  static async validateResourceLimits(tenantId: string, resourceType: string): Promise<{
    isValid: boolean;
    current: number;
    limit: number;
    percentage: number;
  }> {
    try {
      const tenant = await Tenant.findById(tenantId).lean();
      if (!tenant?.subscription || !((tenant as any).subscription as any).limits) {
        return { isValid: true, current: 0, limit: Infinity, percentage: 0 };
      }

      const limits = ((tenant as any).subscription as any).limits;
      const limit = limits[resourceType] || Infinity;

      if (limit === Infinity) {
        return { isValid: true, current: 0, limit: Infinity, percentage: 0 };
      }

      let current = 0;
      
      // Get current usage based on resource type
      switch (resourceType) {
        case 'users':
          current = await User.countDocuments({ tenantId });
          break;
        case 'profiles':
          const Profile = mongoose.model('Profile');
          current = await Profile.countDocuments({ tenantId });
          break;
        case 'apiKeys':
          const ApiKey = mongoose.model('ApiKey');
          current = await ApiKey.countDocuments({ tenantId });
          break;
        default:
          log.warn('Unknown resource type for limit validation', { resourceType, tenantId });
          return { isValid: true, current: 0, limit: Infinity, percentage: 0 };
      }

      const percentage = Math.round((current / limit) * 100);
      const isValid = current < limit;

      return { isValid, current, limit, percentage };

    } catch (error) {
      log.error('Failed to validate resource limits', {
        tenantId,
        resourceType,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      return { isValid: true, current: 0, limit: Infinity, percentage: 0 };
    }
  }
}

// Middleware for strict tenant validation
export const strictTenantValidation = TenantValidationService.validateTenant();

// Middleware for lenient tenant validation
export const lenientTenantValidation = (() => {
  TenantValidationService.configure({
    strictMode: false,
    requireActiveTenant: false,
    validateUserTenantAccess: false
  });
  return TenantValidationService.validateTenant();
})();

// Middleware for super admin only routes
export const superAdminOnlyValidation = (() => {
  TenantValidationService.configure({
    strictMode: true,
    requireActiveTenant: false,
    validateUserTenantAccess: false,
    allowSuperAdmin: true
  });
  return TenantValidationService.validateTenant();
})();

export default TenantValidationService;
