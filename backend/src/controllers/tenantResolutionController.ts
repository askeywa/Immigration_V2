// backend/src/controllers/tenantResolutionController.ts
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { TenantRequest } from '../middleware/tenantResolution';
import { TenantResolutionService } from '../services/tenantResolutionService';
import { TenantResolutionUtils } from '../middleware/enhancedTenantResolution';
import { AppError } from '../utils/errors';

// Get tenant resolution statistics (Super Admin only)
export const getTenantResolutionStats = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view tenant resolution statistics
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view tenant resolution statistics'
      });
    }

    const stats = TenantResolutionService.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get tenant resolution statistics'
    });
  }
});

// Get tenant resolution configuration (Super Admin only)
export const getTenantResolutionConfig = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view tenant resolution configuration
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view tenant resolution configuration'
      });
    }

    const config = TenantResolutionService.getConfig();
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get tenant resolution configuration'
    });
  }
});

// Clear tenant resolution cache (Super Admin only)
export const clearTenantResolutionCache = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can clear tenant resolution cache
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can clear tenant resolution cache'
      });
    }

    const clearedCount = TenantResolutionService.clearCache();
    
    res.json({
      success: true,
      message: `Cleared ${clearedCount} cached tenant resolutions`,
      data: {
        clearedCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to clear tenant resolution cache'
    });
  }
});

// Cleanup expired cache entries (Super Admin only)
export const cleanupTenantResolutionCache = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can cleanup tenant resolution cache
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can cleanup tenant resolution cache'
      });
    }

    const cleanedCount = TenantResolutionService.cleanupCache();
    
    res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} expired cache entries`,
      data: {
        cleanedCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to cleanup tenant resolution cache'
    });
  }
});

// Validate domain format
export const validateDomainFormat = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const { domain } = req.body;
    
    if (!domain) {
      return res.status(400).json({
        success: false,
        message: 'Domain is required'
      });
    }

    const validation = TenantResolutionService.validateDomainFormat(domain);
    
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to validate domain format'
    });
  }
});

// Check domain availability
export const checkDomainAvailability = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const { domain } = req.body;
    
    if (!domain) {
      return res.status(400).json({
        success: false,
        message: 'Domain is required'
      });
    }

    const availability = await TenantResolutionService.checkDomainAvailability(domain);
    
    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to check domain availability'
    });
  }
});

// Generate tenant subdomain
export const generateTenantSubdomain = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const { tenantName } = req.body;
    
    if (!tenantName) {
      return res.status(400).json({
        success: false,
        message: 'Tenant name is required'
      });
    }

    const subdomain = TenantResolutionService.generateTenantSubdomain(tenantName);
    
    res.json({
      success: true,
      data: {
        tenantName,
        subdomain,
        fullDomain: subdomain
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to generate tenant subdomain'
    });
  }
});

// Test tenant resolution
export const testTenantResolution = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const { host, protocol } = req.body;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can test tenant resolution
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can test tenant resolution'
      });
    }

    if (!host) {
      return res.status(400).json({
        success: false,
        message: 'Host is required'
      });
    }

    // Create a mock request object for testing
    const mockReq = {
      get: (header: string) => {
        if (header === 'host') return host;
        if (header === 'x-forwarded-proto') return protocol || 'http';
        return undefined;
      },
      protocol: protocol || 'http'
    } as Request;

    const resolution = await TenantResolutionService.resolveTenant(mockReq);
    
    res.json({
      success: true,
      data: {
        host,
        protocol: protocol || 'http',
        resolution
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to test tenant resolution'
    });
  }
});

// Get current tenant context
export const getCurrentTenantContext = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const context = TenantResolutionUtils.getTenantContext(req);
    const domainInfo = TenantResolutionUtils.getDomainInfo(req);
    
    res.json({
      success: true,
      data: {
        context,
        domainInfo,
        isSuperAdmin: TenantResolutionUtils.isSuperAdmin(req),
        isApiRequest: TenantResolutionUtils.isApiRequest(req),
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get current tenant context'
    });
  }
});

// Tenant resolution health check
export const tenantResolutionHealthCheck = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const config = TenantResolutionService.getConfig();
    const stats = TenantResolutionService.getStats();
    
    const health = {
      status: 'healthy',
      config: {
        enabled: config.enabled,
        cacheEnabled: config.cacheEnabled,
        strictMode: config.strictMode,
        allowCustomDomains: config.allowCustomDomains
      },
      statistics: {
        totalResolutions: stats.totalResolutions,
        successRate: stats.totalResolutions > 0 ? (stats.successfulResolutions / stats.totalResolutions) * 100 : 100,
        averageResolutionTime: stats.averageResolutionTime,
        cacheHitRate: stats.totalResolutions > 0 ? (stats.cacheHits / stats.totalResolutions) * 100 : 0,
        errorRate: stats.errorRate
      },
      timestamp: new Date()
    };
    
    // Determine health status
    if (health.statistics.errorRate > 0.1 || health.statistics.averageResolutionTime > 2000) {
      health.status = 'warning';
    }
    
    if (health.statistics.errorRate > 0.2 || health.statistics.averageResolutionTime > 5000) {
      health.status = 'critical';
    }
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to perform tenant resolution health check'
    });
  }
});

// Get tenant resolution recommendations
export const getTenantResolutionRecommendations = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view recommendations
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view tenant resolution recommendations'
      });
    }

    const stats = TenantResolutionService.getStats();
    const config = TenantResolutionService.getConfig();
    
    const recommendations = [];
    
    // Performance recommendations
    if (stats.averageResolutionTime > 1000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'Average resolution time is high',
        suggestion: 'Consider enabling caching or optimizing database queries'
      });
    }
    
    const cacheHitRate = stats.totalResolutions > 0 ? (stats.cacheHits / stats.totalResolutions) * 100 : 0;
    if (cacheHitRate < 50) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'Low cache hit rate',
        suggestion: 'Review cache configuration and TTL settings'
      });
    }
    
    // Error rate recommendations
    if (stats.errorRate > 0.05) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: 'High error rate detected',
        suggestion: 'Investigate failed resolution attempts and improve error handling'
      });
    }
    
    // Configuration recommendations
    if (!config.cacheEnabled) {
      recommendations.push({
        type: 'configuration',
        priority: 'medium',
        message: 'Caching is disabled',
        suggestion: 'Enable caching to improve performance'
      });
    }
    
    if (!config.strictMode && process.env.NODE_ENV === 'production') {
      recommendations.push({
        type: 'security',
        priority: 'high',
        message: 'Strict mode is disabled in production',
        suggestion: 'Enable strict mode for better security'
      });
    }
    
    res.json({
      success: true,
      data: {
        recommendations,
        priority: stats.errorRate > 0.1 ? 'high' : stats.averageResolutionTime > 2000 ? 'medium' : 'low'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get tenant resolution recommendations'
    });
  }
});
