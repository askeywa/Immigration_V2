// backend/src/controllers/securityController.ts
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { TenantRequest } from '../middleware/tenantResolution';
import { SecurityService } from '../services/securityService';
import { AppError } from '../utils/errors';

// Get security statistics (Super Admin only)
export const getSecurityStats = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view security statistics
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view security statistics'
      });
    }

    const stats = SecurityService.getSecurityStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get security statistics'
    });
  }
});

// Get security violations (Super Admin only)
export const getSecurityViolations = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view security violations
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view security violations'
      });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const type = req.query.type as string;
    const severity = req.query.severity as string;
    
    let violations = SecurityService.getViolations(limit);
    
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
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get security violations'
    });
  }
});

// Get security configuration (Super Admin only)
export const getSecurityConfig = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view security configuration
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view security configuration'
      });
    }

    const config = SecurityService.getConfig();
    
    // Remove sensitive information
    const sanitizedConfig = {
      ...config,
      csrf: {
        ...config.csrf,
        secret: '***REDACTED***'
      }
    };
    
    res.json({
      success: true,
      data: sanitizedConfig
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get security configuration'
    });
  }
});

// Clear blocked IPs (Super Admin only)
export const clearBlockedIPs = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can clear blocked IPs
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can clear blocked IPs'
      });
    }

    const clearedCount = SecurityService.clearBlockedIPs();
    
    res.json({
      success: true,
      message: `Cleared ${clearedCount} blocked IPs`,
      data: {
        clearedCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to clear blocked IPs'
    });
  }
});

// Generate CSRF token
export const generateCSRFToken = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const token = SecurityService.generateCSRFToken();
    
    // Set CSRF token in response header
    res.set('X-CSRF-Token', token);
    
    res.json({
      success: true,
      data: {
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to generate CSRF token'
    });
  }
});

// Security health check
export const securityHealthCheck = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const stats = SecurityService.getSecurityStats();
    const config = SecurityService.getConfig();
    
    const health = {
      status: stats.securityScore > 70 ? 'healthy' : 'warning',
      securityScore: stats.securityScore,
      totalViolations: stats.totalViolations,
      criticalViolations: stats.violationsBySeverity.find((v: any) => v.severity === 'critical')?.count || 0,
      highViolations: stats.violationsBySeverity.find((v: any) => v.severity === 'high')?.count || 0,
      recommendations: stats.recommendations,
      services: {
        csrf: config.csrf.enabled,
        validation: config.validation.enabled,
        bruteForce: config.bruteForce.enabled,
        sqlInjection: config.sqlInjection.enabled,
        headers: config.headers
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
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to perform security health check'
    });
  }
});

// Report security incident (Super Admin only)
export const reportSecurityIncident = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const { type, severity, description, ipAddress, userAgent, endpoint } = req.body;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can report security incidents
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can report security incidents'
      });
    }

    if (!type || !severity || !description) {
      return res.status(400).json({
        success: false,
        message: 'Type, severity, and description are required'
      });
    }

    // Create a mock request for logging
    const mockReq = {
      ip: ipAddress || req.ip,
      get: (header: string) => {
        if (header === 'User-Agent') return userAgent || req.get('User-Agent');
        return req.get(header);
      },
      path: endpoint || req.path,
      method: req.method
    } as Request;

    const violation = SecurityService.logViolation(
      type as any,
      severity as any,
      mockReq,
      { description, reportedBy: user.email },
      true
    );
    
    res.status(201).json({
      success: true,
      message: 'Security incident reported successfully',
      data: {
        violationId: violation.id,
        timestamp: violation.timestamp
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to report security incident'
    });
  }
});

// Get security recommendations (Super Admin only)
export const getSecurityRecommendations = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view security recommendations
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view security recommendations'
      });
    }

    const stats = SecurityService.getSecurityStats();
    const config = SecurityService.getConfig();
    
    const recommendations = [
      ...stats.recommendations,
      // Additional recommendations based on configuration
      ...(config.csrf.enabled ? [] : ['Enable CSRF protection for better security']),
      ...(config.validation.strictMode ? [] : ['Enable strict validation mode in production']),
      ...(config.bruteForce.enabled ? [] : ['Enable brute force protection']),
      ...(config.sqlInjection.enabled ? [] : ['Enable SQL injection protection']),
      // Performance recommendations
      'Regularly review security logs and violations',
      'Implement security monitoring and alerting',
      'Conduct regular security audits',
      'Keep security dependencies updated',
      'Implement automated security testing'
    ];
    
    res.json({
      success: true,
      data: {
        recommendations: [...new Set(recommendations)], // Remove duplicates
        priority: stats.securityScore < 70 ? 'high' : stats.securityScore < 90 ? 'medium' : 'low'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get security recommendations'
    });
  }
});

// Security audit endpoint (Super Admin only)
export const performSecurityAudit = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can perform security audits
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can perform security audits'
      });
    }

    const stats = SecurityService.getSecurityStats();
    const config = SecurityService.getConfig();
    
    const audit = {
      timestamp: new Date(),
      performedBy: user.email,
      overallScore: stats.securityScore,
      categories: {
        csrf: {
          enabled: config.csrf.enabled,
          score: config.csrf.enabled ? 100 : 0,
          recommendation: config.csrf.enabled ? 'CSRF protection is enabled' : 'Enable CSRF protection'
        },
        validation: {
          enabled: config.validation.enabled,
          strictMode: config.validation.strictMode,
          score: config.validation.enabled ? (config.validation.strictMode ? 100 : 80) : 0,
          recommendation: config.validation.enabled 
            ? (config.validation.strictMode ? 'Validation is properly configured' : 'Enable strict validation mode')
            : 'Enable input validation'
        },
        bruteForce: {
          enabled: config.bruteForce.enabled,
          score: config.bruteForce.enabled ? 100 : 0,
          recommendation: config.bruteForce.enabled ? 'Brute force protection is enabled' : 'Enable brute force protection'
        },
        sqlInjection: {
          enabled: config.sqlInjection.enabled,
          strictMode: config.sqlInjection.strictMode,
          score: config.sqlInjection.enabled ? (config.sqlInjection.strictMode ? 100 : 80) : 0,
          recommendation: config.sqlInjection.enabled 
            ? (config.sqlInjection.strictMode ? 'SQL injection protection is properly configured' : 'Enable strict SQL injection protection')
            : 'Enable SQL injection protection'
        },
        headers: {
          hsts: config.headers.hsts,
          xssProtection: config.headers.xssProtection,
          contentSecurityPolicy: config.headers.contentSecurityPolicy,
          frameOptions: config.headers.frameOptions,
          contentTypeOptions: config.headers.contentTypeOptions,
          score: Object.values(config.headers).filter(Boolean).length * 20,
          recommendation: 'All security headers should be enabled'
        }
      },
      violations: {
        total: stats.totalViolations,
        critical: stats.violationsBySeverity.find((v: any) => v.severity === 'critical')?.count || 0,
        high: stats.violationsBySeverity.find((v: any) => v.severity === 'high')?.count || 0,
        medium: stats.violationsBySeverity.find((v: any) => v.severity === 'medium')?.count || 0,
        low: stats.violationsBySeverity.find((v: any) => v.severity === 'low')?.count || 0
      },
      recommendations: stats.recommendations,
      nextAuditDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    };
    
    res.json({
      success: true,
      data: audit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to perform security audit'
    });
  }
});
