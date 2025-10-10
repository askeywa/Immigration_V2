// backend/src/controllers/tenantValidationController.ts
import { Request, Response } from 'express';
import { TenantRequest } from '../middleware/tenantResolution';
import { TenantValidationService } from '../middleware/tenantValidation';
import { AppError } from '../utils/errors';
import { log } from '../utils/logger';

export class TenantValidationController {
  /**
   * Get tenant validation configuration
   * GET /api/tenant-validation/config
   */
  static async getConfig(req: TenantRequest, res: Response): Promise<void> {
    try {
      const stats = TenantValidationService.getCacheStats();
      
      (res as any).json({
        success: true,
        data: {
          cacheStats: stats,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      log.error('Failed to get tenant validation config', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        userId: (req as any).user?._id,
        tenantId: (req as any).tenantId
      });
      
      (res as any).status(500).json({
        success: false,
        error: 'Failed to get validation configuration'
      });
    }
  }

  /**
   * Clear tenant validation cache
   * DELETE /api/tenant-validation/cache
   */
  static async clearCache(req: TenantRequest, res: Response): Promise<void> {
    try {
      if (!(req as any).isSuperAdmin) {
        (res as any).status(403).json({
          success: false,
          error: 'Super admin access required'
        });
        return;
      }

      TenantValidationService.clearCache();
      
      log.info('Tenant validation cache cleared', {
        userId: (req as any).user?._id,
        tenantId: (req as any).tenantId
      });

      (res as any).json({
        success: true,
        message: 'Validation cache cleared successfully'
      });
    } catch (error) {
      log.error('Failed to clear tenant validation cache', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        userId: (req as any).user?._id,
        tenantId: (req as any).tenantId
      });
      
      (res as any).status(500).json({
        success: false,
        error: 'Failed to clear validation cache'
      });
    }
  }

  /**
   * Validate specific tenant
   * POST /api/tenant-validation/validate
   */
  static async validateTenant(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = (req as any).body;
      
      if (!tenantId) {
        (res as any).status(400).json({
          success: false,
          error: 'Tenant ID is required'
        });
        return;
      }

      // Check if user has access to validate this tenant
      if (!(req as any).isSuperAdmin && (req as any).tenantId !== tenantId) {
        (res as any).status(403).json({
          success: false,
          error: 'Access denied to validate this tenant'
        });
        return;
      }

      const subscriptionResult = await TenantValidationService.validateTenantSubscription(tenantId);
      
      (res as any).json({
        success: true,
        data: {
          tenantId,
          subscription: subscriptionResult,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      log.error('Failed to validate tenant', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        userId: (req as any).user?._id,
        tenantId: (req as any).tenantId
      });
      
      (res as any).status(500).json({
        success: false,
        error: 'Failed to validate tenant'
      });
    }
  }

  /**
   * Validate tenant resource limits
   * POST /api/tenant-validation/limits
   */
  static async validateResourceLimits(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { resourceType } = (req as any).body;
      
      if (!resourceType) {
        (res as any).status(400).json({
          success: false,
          error: 'Resource type is required'
        });
        return;
      }

      const tenantId = (req as any).tenantId;
      if (!tenantId) {
        (res as any).status(400).json({
          success: false,
          error: 'Tenant ID is required'
        });
        return;
      }

      const limitsResult = await TenantValidationService.validateResourceLimits(tenantId, resourceType);
      
      (res as any).json({
        success: true,
        data: {
          tenantId,
          resourceType,
          limits: limitsResult,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      log.error('Failed to validate resource limits', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        userId: (req as any).user?._id,
        tenantId: (req as any).tenantId
      });
      
      (res as any).status(500).json({
        success: false,
        error: 'Failed to validate resource limits'
      });
    }
  }

  /**
   * Get tenant validation health status
   * GET /api/tenant-validation/health
   */
  static async getHealthStatus(req: TenantRequest, res: Response): Promise<void> {
    try {
      const stats = TenantValidationService.getCacheStats();
      
      (res as any).json({
        success: true,
        data: {
          status: 'healthy',
          cacheSize: stats.size,
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        }
      });
    } catch (error) {
      log.error('Failed to get tenant validation health status', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      
      (res as any).status(500).json({
        success: false,
        error: 'Failed to get health status'
      });
    }
  }

  /**
   * Configure tenant validation settings
   * PUT /api/tenant-validation/config
   */
  static async updateConfig(req: TenantRequest, res: Response): Promise<void> {
    try {
      if (!(req as any).isSuperAdmin) {
        (res as any).status(403).json({
          success: false,
          error: 'Super admin access required'
        });
        return;
      }

      const {
        strictMode,
        requireActiveTenant,
        validateUserTenantAccess,
        allowSuperAdmin,
        logValidationFailures,
        cacheValidationResults
      } = (req as any).body;

      const config: any = {};
      if (typeof strictMode === 'boolean') (config as any).strictMode = strictMode;
      if (typeof requireActiveTenant === 'boolean') (config as any).requireActiveTenant = requireActiveTenant;
      if (typeof validateUserTenantAccess === 'boolean') (config as any).validateUserTenantAccess = validateUserTenantAccess;
      if (typeof allowSuperAdmin === 'boolean') (config as any).allowSuperAdmin = allowSuperAdmin;
      if (typeof logValidationFailures === 'boolean') (config as any).logValidationFailures = logValidationFailures;
      if (typeof cacheValidationResults === 'boolean') (config as any).cacheValidationResults = cacheValidationResults;

      TenantValidationService.configure(config);
      
      log.info('Tenant validation configuration updated', {
        config,
        userId: (req as any).user?._id,
        tenantId: (req as any).tenantId
      });

      (res as any).json({
        success: true,
        message: 'Configuration updated successfully',
        data: { config }
      });
    } catch (error) {
      log.error('Failed to update tenant validation config', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        userId: (req as any).user?._id,
        tenantId: (req as any).tenantId
      });
      
      (res as any).status(500).json({
        success: false,
        error: 'Failed to update configuration'
      });
    }
  }
}
