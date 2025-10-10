// backend/src/controllers/dataIsolationController.ts
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { TenantRequest } from '../middleware/tenantResolution';
import { DataIsolationService } from '../services/dataIsolationService';
import { AppError } from '../utils/errors';

// Get data isolation statistics (Super Admin only)
export const getIsolationStats = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view isolation statistics
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view isolation statistics'
      });
    }

    const stats = DataIsolationService.getIsolationStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get isolation statistics'
    });
  }
});

// Get isolation violations (Super Admin only)
export const getIsolationViolations = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view isolation violations
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view isolation violations'
      });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const type = req.query.type as string;
    const severity = req.query.severity as string;
    
    let violations = DataIsolationService.getViolations(limit);
    
    // Filter by type if specified
    if (type) {
      violations = violations.filter((v: any) => v.type === type);
    }
    
    // Filter by severity if specified
    if (severity) {
      violations = violations.filter((v: any) => v.severity === severity);
    }
    
    res.json({
      success: true,
      data: violations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get isolation violations'
    });
  }
});

// Get isolation configuration (Super Admin only)
export const getIsolationConfig = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view isolation configuration
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view isolation configuration'
      });
    }

    const config = DataIsolationService.getConfig();
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get isolation configuration'
    });
  }
});

// Clear isolation violations (Super Admin only)
export const clearIsolationViolations = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can clear isolation violations
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can clear isolation violations'
      });
    }

    const clearedCount = DataIsolationService.clearViolations();
    
    res.json({
      success: true,
      message: `Cleared ${clearedCount} isolation violations`,
      data: {
        clearedCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to clear isolation violations'
    });
  }
});

// Isolation health check
export const isolationHealthCheck = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const stats = DataIsolationService.getIsolationStats();
    const config = DataIsolationService.getConfig();
    
    const health = {
      status: stats.isolationHealth.status,
      score: stats.isolationHealth.score,
      totalViolations: stats.totalViolations,
      criticalViolations: stats.violationsBySeverity.find((v: any) => v.severity === 'critical')?.count || 0,
      highViolations: stats.violationsBySeverity.find((v: any) => v.severity === 'high')?.count || 0,
      recommendations: stats.isolationHealth.recommendations,
      services: {
        isolation: config.enabled,
        strictMode: config.strictMode,
        superAdminBypass: config.superAdminBypass,
        logViolations: config.logViolations,
        enforceTenantId: config.enforceTenantId,
        validateTenantAccess: config.validateTenantAccess,
        auditIsolation: config.auditIsolation
      },
      timestamp: new Date()
    };
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to perform isolation health check'
    });
  }
});

// Test tenant isolation (Super Admin only)
export const testTenantIsolation = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const { tenantId, operation, modelName } = req.body;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can test tenant isolation
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can test tenant isolation'
      });
    }

    if (!tenantId || !operation || !modelName) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID, operation, and model name are required'
      });
    }

    // Create test context
    const testContext = {
      tenantId,
      isSuperAdmin: false,
      userId: user._id,
      permissions: user.permissions || [],
      sessionId: req.headers['x-session-id'] as string
    };

    // Test isolation validation
    const isValid = DataIsolationService.validateTenantContext(testContext, operation);
    
    // Test tenant query creation
    const tenantQuery = DataIsolationService.createTenantQuery(testContext, { test: true });
    
    res.json({
      success: true,
      data: {
        tenantId,
        operation,
        modelName,
        contextValid: isValid,
        tenantQuery,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to test tenant isolation'
    });
  }
});

// Validate tenant access (Super Admin only)
export const validateTenantAccess = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const { resourceId, tenantId, modelName } = req.body;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can validate tenant access
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can validate tenant access'
      });
    }

    if (!resourceId || !tenantId || !modelName) {
      return res.status(400).json({
        success: false,
        message: 'Resource ID, tenant ID, and model name are required'
      });
    }

    // Create test context
    const testContext = {
      tenantId,
      isSuperAdmin: false,
      userId: user._id,
      permissions: user.permissions || [],
      sessionId: req.headers['x-session-id'] as string
    };

    // Validate tenant access
    const hasAccess = await DataIsolationService.validateTenantAccess(resourceId, testContext, modelName);
    
    res.json({
      success: true,
      data: {
        resourceId,
        tenantId,
        modelName,
        hasAccess,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to validate tenant access'
    });
  }
});

// Get isolation recommendations (Super Admin only)
export const getIsolationRecommendations = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view isolation recommendations
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view isolation recommendations'
      });
    }

    const stats = DataIsolationService.getIsolationStats();
    const config = DataIsolationService.getConfig();
    
    const recommendations = [
      ...stats.isolationHealth.recommendations,
      // Additional recommendations based on configuration
      ...(config.enabled ? [] : ['Enable data isolation for better security']),
      ...(config.strictMode ? [] : ['Enable strict mode in production']),
      ...(config.superAdminBypass ? [] : ['Consider enabling super admin bypass for management operations']),
      ...(config.logViolations ? [] : ['Enable violation logging for monitoring']),
      ...(config.enforceTenantId ? [] : ['Enable tenant ID enforcement']),
      ...(config.validateTenantAccess ? [] : ['Enable tenant access validation']),
      ...(config.auditIsolation ? [] : ['Enable isolation auditing']),
      // Performance recommendations
      'Regularly review isolation violations and patterns',
      'Monitor tenant access patterns for anomalies',
      'Implement automated isolation testing',
      'Conduct regular isolation audits',
      'Keep isolation rules updated'
    ];
    
    res.json({
      success: true,
      data: {
        recommendations: [...new Set(recommendations)], // Remove duplicates
        priority: stats.isolationHealth.score < 70 ? 'high' : stats.isolationHealth.score < 90 ? 'medium' : 'low'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get isolation recommendations'
    });
  }
});

// Perform isolation audit (Super Admin only)
export const performIsolationAudit = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can perform isolation audits
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can perform isolation audits'
      });
    }

    const stats = DataIsolationService.getIsolationStats();
    const config = DataIsolationService.getConfig();
    
    const audit = {
      timestamp: new Date(),
      performedBy: user.email,
      overallScore: stats.isolationHealth.score,
      categories: {
        isolation: {
          enabled: config.enabled,
          score: config.enabled ? 100 : 0,
          recommendation: config.enabled ? 'Data isolation is enabled' : 'Enable data isolation'
        },
        strictMode: {
          enabled: config.strictMode,
          score: config.strictMode ? 100 : 80,
          recommendation: config.strictMode ? 'Strict mode is enabled' : 'Enable strict mode in production'
        },
        superAdminBypass: {
          enabled: config.superAdminBypass,
          score: config.superAdminBypass ? 100 : 80,
          recommendation: config.superAdminBypass ? 'Super admin bypass is enabled' : 'Consider enabling super admin bypass'
        },
        logging: {
          enabled: config.logViolations,
          score: config.logViolations ? 100 : 0,
          recommendation: config.logViolations ? 'Violation logging is enabled' : 'Enable violation logging'
        },
        enforcement: {
          enabled: config.enforceTenantId,
          score: config.enforceTenantId ? 100 : 0,
          recommendation: config.enforceTenantId ? 'Tenant ID enforcement is enabled' : 'Enable tenant ID enforcement'
        },
        validation: {
          enabled: config.validateTenantAccess,
          score: config.validateTenantAccess ? 100 : 0,
          recommendation: config.validateTenantAccess ? 'Tenant access validation is enabled' : 'Enable tenant access validation'
        },
        auditing: {
          enabled: config.auditIsolation,
          score: config.auditIsolation ? 100 : 0,
          recommendation: config.auditIsolation ? 'Isolation auditing is enabled' : 'Enable isolation auditing'
        }
      },
      violations: {
        total: stats.totalViolations,
        critical: stats.violationsBySeverity.find((v: any) => v.severity === 'critical')?.count || 0,
        high: stats.violationsBySeverity.find((v: any) => v.severity === 'high')?.count || 0,
        medium: stats.violationsBySeverity.find((v: any) => v.severity === 'medium')?.count || 0,
        low: stats.violationsBySeverity.find((v: any) => v.severity === 'low')?.count || 0
      },
      recommendations: stats.isolationHealth.recommendations,
      nextAuditDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    };
    
    res.json({
      success: true,
      data: audit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to perform isolation audit'
    });
  }
});
