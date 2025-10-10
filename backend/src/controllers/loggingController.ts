// backend/src/controllers/loggingController.ts
import { Request, Response, NextFunction } from 'express';
import { TenantRequest } from '../middleware/tenantResolution';
import LoggingManagementService from '../services/loggingService';
import { log } from '../utils/logger';
import { AppError } from '../utils/errors';

export class LoggingController {
  private loggingService: LoggingManagementService;

  constructor() {
    this.loggingService = LoggingManagementService.getInstance();
  }

  /**
   * Get logs with filters
   */
  getLogs = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        level,
        category,
        severity,
        source,
        startTime,
        endTime,
        search,
        tags,
        limit = 100,
        offset = 0,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = (req as any).query;

      // Build query
      const query: any = {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      // Add tenant filter for non-super-admin users
      if (!(req as any).isSuperAdmin && (req as any).tenantId) {
        (query as any).tenantId = (req as any).tenantId;
      } else if ((req as any).query.tenantId && (req as any).isSuperAdmin) {
        (query as any).tenantId = (req as any).query.tenantId as string;
      }

      // Add other filters
      if (level) (query as any).level = level as string;
      if (category) (query as any).category = category as string;
      if (severity) (query as any).severity = severity as string;
      if (source) (query as any).source = source as string;
      if (startTime) (query as any).startTime = new Date(startTime as string);
      if (endTime) (query as any).endTime = new Date(endTime as string);
      if (search) (query as any).search = search as string;
      if (tags) (query as any).tags = Array.isArray(tags) ? tags : [tags as string];

      const result = await this.loggingService.queryLogs(query);

      (res as any).json({
        success: true,
        data: {
          logs: result.logs,
          pagination: {
            total: result.total,
            limit: (query as any).limit,
            offset: (query as any).offset,
            hasMore: result.hasMore
          }
        }
      });
    } catch (error) {
      log.error('Failed to get logs', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });
      next(error);
    }
  };

  /**
   * Get log statistics
   */
  getLogStatistics = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { startTime, endTime } = (req as any).query;

      const query: any = {};
      
      // Add tenant filter for non-super-admin users
      if (!(req as any).isSuperAdmin && (req as any).tenantId) {
        (query as any).tenantId = (req as any).tenantId;
      } else if ((req as any).query.tenantId && (req as any).isSuperAdmin) {
        (query as any).tenantId = (req as any).query.tenantId as string;
      }

      if (startTime) (query as any).startTime = new Date(startTime as string);
      if (endTime) (query as any).endTime = new Date(endTime as string);

      const statistics = await this.loggingService.getLogStatistics(query);

      (res as any).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      log.error('Failed to get log statistics', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });
      next(error);
    }
  };

  /**
   * Get logs by category
   */
  getLogsByCategory = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { startTime, endTime } = (req as any).query;

      const query: any = {};
      
      // Add tenant filter for non-super-admin users
      if (!(req as any).isSuperAdmin && (req as any).tenantId) {
        (query as any).tenantId = (req as any).tenantId;
      } else if ((req as any).query.tenantId && (req as any).isSuperAdmin) {
        (query as any).tenantId = (req as any).query.tenantId as string;
      }

      if (startTime) (query as any).startTime = new Date(startTime as string);
      if (endTime) (query as any).endTime = new Date(endTime as string);

      const categories = await this.loggingService.getLogsByCategory(query);

      (res as any).json({
        success: true,
        data: categories
      });
    } catch (error) {
      log.error('Failed to get logs by category', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });
      next(error);
    }
  };

  /**
   * Get logs by hour
   */
  getLogsByHour = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { days = 7 } = (req as any).query;

      const query: any = {
        days: parseInt(days as string)
      };
      
      // Add tenant filter for non-super-admin users
      if (!(req as any).isSuperAdmin && (req as any).tenantId) {
        (query as any).tenantId = (req as any).tenantId;
      } else if ((req as any).query.tenantId && (req as any).isSuperAdmin) {
        (query as any).tenantId = (req as any).query.tenantId as string;
      }

      const timeSeries = await this.loggingService.getLogsByHour(query);

      (res as any).json({
        success: true,
        data: timeSeries
      });
    } catch (error) {
      log.error('Failed to get logs by hour', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });
      next(error);
    }
  };

  /**
   * Search logs
   */
  searchLogs = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { q: searchQuery, limit = 100, offset = 0 } = (req as any).query;

      if (!searchQuery) {
        throw new AppError('Search query is required', 400);
      }

      const options: any = {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      // Add tenant filter for non-super-admin users
      if (!(req as any).isSuperAdmin && (req as any).tenantId) {
        (options as any).tenantId = (req as any).tenantId;
      } else if ((req as any).query.tenantId && (req as any).isSuperAdmin) {
        (options as any).tenantId = (req as any).query.tenantId as string;
      }

      const result = await this.loggingService.searchLogs(searchQuery as string, options);

      (res as any).json({
        success: true,
        data: {
          logs: result.logs,
          pagination: {
            total: result.total,
            limit: (options as any).limit,
            offset: (options as any).offset,
            hasMore: result.hasMore
          }
        }
      });
    } catch (error) {
      log.error('Failed to search logs', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id,
        searchQuery: (req as any).query.q
      });
      next(error);
    }
  };

  /**
   * Get recent errors
   */
  getRecentErrors = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { limit = 50 } = (req as any).query;

      let tenantId: string | undefined;
      
      // Add tenant filter for non-super-admin users
      if (!(req as any).isSuperAdmin && (req as any).tenantId) {
        tenantId = (req as any).tenantId;
      } else if ((req as any).query.tenantId && (req as any).isSuperAdmin) {
        tenantId = (req as any).query.tenantId as string;
      }

      const errors = await this.loggingService.getRecentErrors(
        tenantId,
        parseInt(limit as string)
      );

      (res as any).json({
        success: true,
        data: errors
      });
    } catch (error) {
      log.error('Failed to get recent errors', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });
      next(error);
    }
  };

  /**
   * Get critical logs
   */
  getCriticalLogs = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { limit = 50 } = (req as any).query;

      let tenantId: string | undefined;
      
      // Add tenant filter for non-super-admin users
      if (!(req as any).isSuperAdmin && (req as any).tenantId) {
        tenantId = (req as any).tenantId;
      } else if ((req as any).query.tenantId && (req as any).isSuperAdmin) {
        tenantId = (req as any).query.tenantId as string;
      }

      const criticalLogs = await this.loggingService.getCriticalLogs(
        tenantId,
        parseInt(limit as string)
      );

      (res as any).json({
        success: true,
        data: criticalLogs
      });
    } catch (error) {
      log.error('Failed to get critical logs', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });
      next(error);
    }
  };

  /**
   * Export logs
   */
  exportLogs = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        level,
        category,
        severity,
        source,
        startTime,
        endTime,
        search,
        tags,
        format = 'json'
      } = (req as any).query;

      // Build query
      const query: any = {};

      // Add tenant filter for non-super-admin users
      if (!(req as any).isSuperAdmin && (req as any).tenantId) {
        (query as any).tenantId = (req as any).tenantId;
      } else if ((req as any).query.tenantId && (req as any).isSuperAdmin) {
        (query as any).tenantId = (req as any).query.tenantId as string;
      }

      // Add other filters
      if (level) (query as any).level = level as string;
      if (category) (query as any).category = category as string;
      if (severity) (query as any).severity = severity as string;
      if (source) (query as any).source = source as string;
      if (startTime) (query as any).startTime = new Date(startTime as string);
      if (endTime) (query as any).endTime = new Date(endTime as string);
      if (search) (query as any).search = search as string;
      if (tags) (query as any).tags = Array.isArray(tags) ? tags : [tags as string];

      const exportData = await this.loggingService.exportLogs(query, format as 'json' | 'csv');

      // Set appropriate headers
      const filename = `logs-export-${new Date().toISOString().split('T')[0]}.${format}`;
      const contentType = format === 'csv' ? 'text/csv' : 'application/json';

      (res as any).setHeader('Content-Type', contentType);
      (res as any).setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      (res as any).send(exportData);
    } catch (error) {
      log.error('Failed to export logs', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });
      next(error);
    }
  };

  /**
   * Cleanup old logs (super admin only)
   */
  cleanupOldLogs = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!(req as any).isSuperAdmin) {
        throw new AppError('Access denied. Super admin privileges required.', 403);
      }

      const { daysToKeep = 30 } = (req as any).body;

      if (daysToKeep < 7) {
        throw new AppError('Minimum retention period is 7 days', 400);
      }

      const result = await this.loggingService.cleanupOldLogs(parseInt(daysToKeep));

      (res as any).json({
        success: true,
        data: result
      });
    } catch (error) {
      log.error('Failed to cleanup old logs', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });
      next(error);
    }
  };

  /**
   * Get logging health status
   */
  getLoggingHealth = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const health = await this.loggingService.healthCheck();

      (res as any).json({
        success: true,
        data: health
      });
    } catch (error) {
      log.error('Failed to get logging health', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });
      next(error);
    }
  };

  /**
   * Create a log entry (for testing or manual logging)
   */
  createLogEntry = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const logData = (req as any).body;

      // Validate required fields
      if (!logData.level || !logData.message || !logData.category || !logData.source) {
        throw new AppError('Missing required fields: level, message, category, source', 400);
      }

      // Add tenant context if not provided
      if (!logData.tenantId && (req as any).tenantId) {
        logData.tenantId = (req as any).tenantId;
      }

      // Add user context if not provided
      if (!logData.userId && (req as any).user?.id) {
        logData.userId = (req as any).user.id;
      }

      const logEntry = await this.loggingService.createLogEntry(logData);

      (res as any).status(201).json({
        success: true,
        data: logEntry
      });
    } catch (error) {
      log.error('Failed to create log entry', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });
      next(error);
    }
  };

  /**
   * Get log entry by ID
   */
  getLogEntry = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = (req as any).params;

      // This would require implementing a getLogEntryById method in the service
      // For now, we'll return a not implemented response
      (res as any).status(501).json({
        success: false,
        message: 'Get log entry by ID not yet implemented'
      });
    } catch (error) {
      log.error('Failed to get log entry', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id,
        logId: (req as any).params.id
      });
      next(error);
    }
  };
}

export default LoggingController;
