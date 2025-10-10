// backend/src/controllers/enhancedAuditController.ts
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { TenantRequest } from '../middleware/tenantResolution';
import { EnhancedAuditService, AuditLogFilters, AuditLogOptions } from '../services/enhancedAuditService';
import { AuthorizationError } from '../utils/errors';

// Get audit logs with advanced filtering
export const getAuditLogs = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    const isSuperAdmin = req.isSuperAdmin;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Check permissions
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to view audit logs'
      });
    }

    // Build filters from query parameters
    const filters: AuditLogFilters = {};
    const options: AuditLogOptions = {};

    // Tenant filtering (non-super admins can only see their tenant's logs)
    if (!isSuperAdmin && tenantId) {
      filters.tenantId = tenantId;
    } else if (req.query.tenantId && isSuperAdmin) {
      filters.tenantId = req.query.tenantId as string;
    }

    // Other filters
    if (req.query.userId) filters.userId = req.query.userId as string;
    if (req.query.action) filters.action = req.query.action as string;
    if (req.query.resource) filters.resource = req.query.resource as string;
    if (req.query.severity) filters.severity = req.query.severity as any;
    if (req.query.category) filters.category = req.query.category as any;
    if (req.query.ipAddress) filters.ipAddress = req.query.ipAddress as string;
    if (req.query.userAgent) filters.userAgent = req.query.userAgent as string;
    if (req.query.searchTerm) filters.searchTerm = req.query.searchTerm as string;

    // Date filters
    if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
    if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);

    // Pagination options
    if (req.query.page) options.page = parseInt(req.query.page as string);
    if (req.query.limit) options.limit = parseInt(req.query.limit as string);
    if (req.query.sortBy) options.sortBy = req.query.sortBy as string;
    if (req.query.sortOrder) options.sortOrder = req.query.sortOrder as 'asc' | 'desc';

    const result = await EnhancedAuditService.getAuditLogs(filters, options);
    
    // Set tenant context headers
    if (tenantId) res.set('X-Tenant-ID', tenantId);
    
    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get audit logs'
    });
  }
});

// Get comprehensive audit analytics
export const getAuditAnalytics = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    const isSuperAdmin = req.isSuperAdmin;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Check permissions
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to view audit analytics'
      });
    }

    // Build filters
    const filters: AuditLogFilters = {};
    
    // Tenant filtering
    if (!isSuperAdmin && tenantId) {
      filters.tenantId = tenantId;
    } else if (req.query.tenantId && isSuperAdmin) {
      filters.tenantId = req.query.tenantId as string;
    }

    // Date filters
    if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
    if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);

    const analytics = await EnhancedAuditService.getAuditAnalytics(filters, tenantId, isSuperAdmin);
    
    // Set tenant context headers
    if (tenantId) res.set('X-Tenant-ID', tenantId);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get audit analytics'
    });
  }
});

// Get dashboard statistics
export const getDashboardStats = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    const isSuperAdmin = req.isSuperAdmin;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Check permissions
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to view dashboard statistics'
      });
    }

    const stats = await EnhancedAuditService.getDashboardStats(tenantId, isSuperAdmin);
    
    // Set tenant context headers
    if (tenantId) res.set('X-Tenant-ID', tenantId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get dashboard statistics'
    });
  }
});

// Export audit logs
export const exportAuditLogs = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    const isSuperAdmin = req.isSuperAdmin;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Check permissions
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to export audit logs'
      });
    }

    // Get export parameters
    const format = (req.query.format as 'json' | 'csv' | 'pdf') || 'json';
    
    // Build filters
    const filters: AuditLogFilters = {};
    
    // Tenant filtering
    if (!isSuperAdmin && tenantId) {
      filters.tenantId = tenantId;
    } else if (req.query.tenantId && isSuperAdmin) {
      filters.tenantId = req.query.tenantId as string;
    }

    // Other filters
    if (req.query.userId) filters.userId = req.query.userId as string;
    if (req.query.action) filters.action = req.query.action as string;
    if (req.query.resource) filters.resource = req.query.resource as string;
    if (req.query.severity) filters.severity = req.query.severity as any;
    if (req.query.category) filters.category = req.query.category as any;
    if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
    if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);

    const exportData = await EnhancedAuditService.exportAuditLogs(filters, format, tenantId, isSuperAdmin);
    
    // Set appropriate headers based on format
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `audit-logs-${timestamp}.${format}`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.json({
        success: true,
        data: exportData
      });
    } else if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      // TODO: Implement CSV conversion
      res.json({
        success: true,
        message: 'CSV export not yet implemented',
        data: exportData
      });
    } else if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      // TODO: Implement PDF generation
      res.json({
        success: true,
        message: 'PDF export not yet implemented',
        data: exportData
      });
    }
    
    // Set tenant context headers
    if (tenantId) res.set('X-Tenant-ID', tenantId);
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to export audit logs'
    });
  }
});

// Get audit log health status
export const getAuditHealth = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view system health
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view audit log health status'
      });
    }

    const health = await EnhancedAuditService.getHealthStatus();
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get audit health status'
    });
  }
});

// Cleanup old audit logs
export const cleanupAuditLogs = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    const isSuperAdmin = req.isSuperAdmin;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Check permissions
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to cleanup audit logs'
      });
    }

    const retentionDays = parseInt(req.body.retentionDays) || 90;
    
    // Validate retention days
    if (retentionDays < 7 || retentionDays > 365) {
      return res.status(400).json({
        success: false,
        message: 'Retention days must be between 7 and 365'
      });
    }

    const result = await EnhancedAuditService.cleanupOldLogs(retentionDays, 
      isSuperAdmin ? undefined : tenantId);
    
    // Set tenant context headers
    if (tenantId) res.set('X-Tenant-ID', tenantId);
    
    res.json({
      success: true,
      message: `Cleaned up ${result.deletedCount} old audit logs`,
      data: {
        deletedCount: result.deletedCount,
        errors: result.errors
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to cleanup audit logs'
    });
  }
});

// Create manual audit log entry
export const createAuditLog = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Check permissions
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to create audit log entries'
      });
    }

    const {
      action,
      resource,
      resourceId,
      details,
      severity,
      category,
      metadata
    } = req.body;

    // Validate required fields
    if (!action || !resource) {
      return res.status(400).json({
        success: false,
        message: 'Action and resource are required'
      });
    }

    const auditLog = await EnhancedAuditService.createAuditLogFromRequest(
      req,
      action,
      resource,
      {
        resourceId,
        details,
        severity,
        category,
        metadata
      }
    );
    
    // Set tenant context headers
    if (tenantId) res.set('X-Tenant-ID', tenantId);
    
    res.status(201).json({
      success: true,
      message: 'Audit log entry created successfully',
      data: auditLog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to create audit log entry'
    });
  }
});

// Get audit log by ID
export const getAuditLogById = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    const isSuperAdmin = req.isSuperAdmin;
    const { logId } = req.params;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Check permissions
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to view audit log details'
      });
    }

    if (!logId) {
      return res.status(400).json({
        success: false,
        message: 'Log ID is required'
      });
    }

    // Get the specific audit log with tenant filtering
    const filters: AuditLogFilters = {};
    if (!isSuperAdmin && tenantId) {
      filters.tenantId = tenantId;
    }

    const { logs } = await EnhancedAuditService.getAuditLogs(
      { ...filters, userId: logId }, // Using userId filter as a workaround to find by ID
      { limit: 1 }
    );

    if (logs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found'
      });
    }
    
    // Set tenant context headers
    if (tenantId) res.set('X-Tenant-ID', tenantId);
    
    res.json({
      success: true,
      data: logs[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get audit log details'
    });
  }
});
