// backend/src/services/loggingService.ts
import { log } from '../utils/logger';
import { LoggingService, LogContext } from '../config/logging';
import LogEntry, { ILogEntry } from '../models/LogEntry';
import { ITenant } from '../models/Tenant';
import { IUser } from '../models/User';

export interface LogQuery {
  tenantId?: string;
  userId?: string;
  level?: string;
  category?: string;
  severity?: string;
  source?: string;
  startTime?: Date;
  endTime?: Date;
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LogStatistics {
  total: number;
  errors: number;
  warnings: number;
  info: number;
  debug: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
}

export interface LogAggregation {
  category: string;
  count: number;
  errors: number;
  warnings: number;
  avgResponseTime: number;
}

export interface LogTimeSeries {
  timestamp: Date;
  count: number;
  errors: number;
  warnings: number;
  avgResponseTime: number;
}

export interface LogAlert {
  id: string;
  type: 'error_rate' | 'response_time' | 'memory_usage' | 'critical_errors';
  threshold: number;
  currentValue: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  tenantId?: string;
  endpoint?: string;
}

export class LoggingManagementService {
  private static instance: LoggingManagementService;
  private loggingService: LoggingService;

  private constructor() {
    this.loggingService = LoggingService.getInstance();
  }

  static getInstance(): LoggingManagementService {
    if (!LoggingManagementService.instance) {
      LoggingManagementService.instance = new LoggingManagementService();
    }
    return LoggingManagementService.instance;
  }

  /**
   * Initialize logging service
   */
  async initialize(): Promise<void> {
    try {
      log.info('Initializing logging management service...');
      
      // The logging service is already initialized as a singleton
      // This method can be used for additional setup if needed
      
      log.info('Logging management service initialized successfully');
    } catch (error) {
      log.error('Failed to initialize logging management service', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Create a log entry
   */
  async createLogEntry(logData: {
    tenantId?: string;
    userId?: string;
    sessionId?: string;
    level: 'error' | 'warn' | 'info' | 'debug';
    message: string;
    category: 'auth' | 'api' | 'database' | 'security' | 'performance' | 'audit' | 'system' | 'business' | 'integration' | 'custom';
    subcategory?: string;
    source: 'backend' | 'frontend' | 'database' | 'external' | 'system';
    service?: string;
    component?: string;
    action?: string;
    resource?: string;
    endpoint?: string;
    method?: string;
    statusCode?: number;
    responseTime?: number;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    correlationId?: string;
    traceId?: string;
    spanId?: string;
    error?: {
      name: string;
      message: string;
      stack?: string;
      code?: string;
      details?: any;
    };
    metadata?: Record<string, any>;
    tags?: string[];
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<ILogEntry> {
    try {
      const logEntry = new LogEntry({
        ...logData,
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        hostname: require('os').hostname(),
        processId: process.pid,
        timestamp: new Date()
      });

      await logEntry.save();
      return logEntry;
    } catch (error) {
      log.error('Failed to create log entry', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        logData
      });
      throw error;
    }
  }

  /**
   * Query logs with filters
   */
  async queryLogs(query: LogQuery): Promise<{
    logs: ILogEntry[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const filter: any = {};

      // Apply filters
      if (query.tenantId) {
        (filter as any).tenantId = query.tenantId;
      }

      if (query.userId) {
        (filter as any).userId = query.userId;
      }

      if (query.level) {
        (filter as any).level = query.level;
      }

      if (query.category) {
        (filter as any).category = query.category;
      }

      if (query.severity) {
        (filter as any).severity = query.severity;
      }

      if (query.source) {
        (filter as any).source = query.source;
      }

      if (query.startTime || query.endTime) {
        (filter as any).timestamp = {};
        if (query.startTime) {
          (filter as any).timestamp.$gte = query.startTime;
        }
        if (query.endTime) {
          (filter as any).timestamp.$lte = query.endTime;
        }
      }

      if (query.tags && query.tags.length > 0) {
        (filter as any).tags = { $in: query.tags };
      }

      if (query.search) {
        filter.$text = { $search: query.search };
      }

      // Build sort
      const sort: any = {};
      if (query.sortBy) {
        sort[query.sortBy] = query.sortOrder === 'asc' ? 1 : -1;
      } else {
        (sort as any).timestamp = -1; // Default sort by timestamp descending
      }

      // Execute query
      const logs = await LogEntry.find(filter)
        .populate('tenant', 'name domain')
        .populate('user', 'username email')
        .sort(sort)
        .skip(query.offset || 0)
        .limit(query.limit || 100);

      const total = await LogEntry.countDocuments(filter);
      const hasMore = (query.offset || 0) + (query.limit || 100) < total;

      return {
        logs,
        total,
        hasMore
      };
    } catch (error) {
      log.error('Failed to query logs', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        query
      });
      throw error;
    }
  }

  /**
   * Get log statistics
   */
  async getLogStatistics(query: {
    tenantId?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<LogStatistics> {
    try {
      const match: any = {};
      
      if (query.tenantId) {
        (match as any).tenantId = query.tenantId;
      }
      
      if (query.startTime || query.endTime) {
        (match as any).timestamp = {};
        if (query.startTime) {
          (match as any).timestamp.$gte = query.startTime;
        }
        if (query.endTime) {
          (match as any).timestamp.$lte = query.endTime;
        }
      }

      const result = await LogEntry.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            errors: { $sum: { $cond: [{ $eq: ['$level', 'error'] }, 1, 0] } },
            warnings: { $sum: { $cond: [{ $eq: ['$level', 'warn'] }, 1, 0] } },
            info: { $sum: { $cond: [{ $eq: ['$level', 'info'] }, 1, 0] } },
            debug: { $sum: { $cond: [{ $eq: ['$level', 'debug'] }, 1, 0] } },
            critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
            high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
            medium: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
            low: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } },
            avgResponseTime: { $avg: '$responseTime' },
            maxResponseTime: { $max: '$responseTime' },
            minResponseTime: { $min: '$responseTime' }
          }
        }
      ]);

      return result[0] || {
        total: 0,
        errors: 0,
        warnings: 0,
        info: 0,
        debug: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0
      };
    } catch (error) {
      log.error('Failed to get log statistics', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        query
      });
      throw error;
    }
  }

  /**
   * Get logs aggregated by category
   */
  async getLogsByCategory(query: {
    tenantId?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<LogAggregation[]> {
    try {
      const match: any = {};
      
      if (query.tenantId) {
        (match as any).tenantId = query.tenantId;
      }
      
      if (query.startTime || query.endTime) {
        (match as any).timestamp = {};
        if (query.startTime) {
          (match as any).timestamp.$gte = query.startTime;
        }
        if (query.endTime) {
          (match as any).timestamp.$lte = query.endTime;
        }
      }

      const result = await LogEntry.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            errors: { $sum: { $cond: [{ $eq: ['$level', 'error'] }, 1, 0] } },
            warnings: { $sum: { $cond: [{ $eq: ['$level', 'warn'] }, 1, 0] } },
            avgResponseTime: { $avg: '$responseTime' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      return result.map((item: any) => ({
        category: item._id,
        count: item.count,
        errors: item.errors,
        warnings: item.warnings,
        avgResponseTime: item.avgResponseTime || 0
      }));
    } catch (error) {
      log.error('Failed to get logs by category', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        query
      });
      throw error;
    }
  }

  /**
   * Get logs aggregated by time (hourly)
   */
  async getLogsByHour(query: {
    tenantId?: string;
    days?: number;
  }): Promise<LogTimeSeries[]> {
    try {
      const match: any = {};
      
      if (query.tenantId) {
        (match as any).tenantId = query.tenantId;
      }
      
      const days = query.days || 7;
      const startTime = new Date();
      startTime.setDate(startTime.getDate() - days);
      (match as any).timestamp = { $gte: startTime };

      const result = await LogEntry.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              year: { $year: '$timestamp' },
              month: { $month: '$timestamp' },
              day: { $dayOfMonth: '$timestamp' },
              hour: { $hour: '$timestamp' }
            },
            count: { $sum: 1 },
            errors: { $sum: { $cond: [{ $eq: ['$level', 'error'] }, 1, 0] } },
            warnings: { $sum: { $cond: [{ $eq: ['$level', 'warn'] }, 1, 0] } },
            avgResponseTime: { $avg: '$responseTime' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
      ]);

      return result.map((item: any) => ({
        timestamp: new Date(item._id.year, item._id.month - 1, item._id.day, item._id.hour),
        count: item.count,
        errors: item.errors,
        warnings: item.warnings,
        avgResponseTime: item.avgResponseTime || 0
      }));
    } catch (error) {
      log.error('Failed to get logs by hour', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        query
      });
      throw error;
    }
  }

  /**
   * Search logs by text
   */
  async searchLogs(searchQuery: string, options: {
    tenantId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    logs: ILogEntry[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const filter: any = {
        $text: { $search: searchQuery }
      };

      if (options.tenantId) {
        (filter as any).tenantId = options.tenantId;
      }

      const logs = await LogEntry.find(
        filter,
        { score: { $meta: 'textScore' } }
      )
        .populate('tenant', 'name domain')
        .populate('user', 'username email')
        .sort({ score: { $meta: 'textScore' } })
        .skip(options.offset || 0)
        .limit(options.limit || 100);

      const total = await LogEntry.countDocuments(filter);
      const hasMore = (options.offset || 0) + (options.limit || 100) < total;

      return {
        logs,
        total,
        hasMore
      };
    } catch (error) {
      log.error('Failed to search logs', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        searchQuery,
        options
      });
      throw error;
    }
  }

  /**
   * Get recent errors
   */
  async getRecentErrors(tenantId?: string, limit: number = 50): Promise<ILogEntry[]> {
    try {
      const filter: any = { level: 'error' };
      
      if (tenantId) {
        (filter as any).tenantId = tenantId;
      }

      return await LogEntry.find(filter)
        .populate('tenant', 'name domain')
        .populate('user', 'username email')
        .sort({ timestamp: -1 })
        .limit(limit);
    } catch (error) {
      log.error('Failed to get recent errors', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId,
        limit
      });
      throw error;
    }
  }

  /**
   * Get critical logs
   */
  async getCriticalLogs(tenantId?: string, limit: number = 50): Promise<ILogEntry[]> {
    try {
      const filter: any = { severity: 'critical' };
      
      if (tenantId) {
        (filter as any).tenantId = tenantId;
      }

      return await LogEntry.find(filter)
        .populate('tenant', 'name domain')
        .populate('user', 'username email')
        .sort({ timestamp: -1 })
        .limit(limit);
    } catch (error) {
      log.error('Failed to get critical logs', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId,
        limit
      });
      throw error;
    }
  }

  /**
   * Clean up old logs
   */
  async cleanupOldLogs(daysToKeep: number = 30): Promise<{
    deletedCount: number;
    message: string;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await LogEntry.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      const message = `Cleaned up ${result.deletedCount} log entries older than ${daysToKeep} days`;

      log.info(message, {
        category: 'system',
        action: 'cleanup',
        resource: 'logs',
        metadata: {
          deletedCount: result.deletedCount,
          daysToKeep,
          cutoffDate
        }
      });

      return {
        deletedCount: result.deletedCount,
        message
      };
    } catch (error) {
      log.error('Failed to cleanup old logs', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        daysToKeep
      });
      throw error;
    }
  }

  /**
   * Export logs to file
   */
  async exportLogs(query: LogQuery, format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const { logs } = await this.queryLogs({
        ...query,
        limit: 10000 // Max 10k logs for export
      });

      if (format === 'csv') {
        const csvHeaders = [
          'timestamp', 'level', 'message', 'category', 'source', 'tenantId', 'userId',
          'endpoint', 'method', 'statusCode', 'responseTime', 'ipAddress', 'severity'
        ].join(',');

        const csvRows = logs.map((log: any) => [
          log.timestamp.toISOString(),
          log.level,
          `"${log.message.replace(/"/g, '""')}"`,
          log.category,
          log.source,
          log.tenantId?.toString() || '',
          log.userId?.toString() || '',
          log.endpoint || '',
          log.method || '',
          log.statusCode || '',
          log.responseTime || '',
          log.ipAddress || '',
          log.severity
        ].join(','));

        return [csvHeaders, ...csvRows].join('\n');
      } else {
        return JSON.stringify(logs, null, 2);
      }
    } catch (error) {
      log.error('Failed to export logs', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        query,
        format
      });
      throw error;
    }
  }

  /**
   * Get logging service health
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    details: {
      service: boolean;
      database: boolean;
      recentLogs: number;
      errorRate: number;
    };
  }> {
    try {
      const serviceHealth = this.loggingService.healthCheck();
      
      // Check database connectivity
      let databaseHealthy = false;
      let recentLogs = 0;
      let errorRate = 0;

      try {
        const recentLogCount = await LogEntry.countDocuments({
          timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        });

        const errorCount = await LogEntry.countDocuments({
          level: 'error',
          timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });

        recentLogs = recentLogCount;
        errorRate = recentLogCount > 0 ? (errorCount / recentLogCount) * 100 : 0;
        databaseHealthy = true;
      } catch (dbError) {
        log.error('Database health check failed', {
          error: dbError instanceof Error ? dbError.message : String(dbError)
        });
      }

      return {
        healthy: serviceHealth.healthy && databaseHealthy,
        details: {
          service: serviceHealth.healthy,
          database: databaseHealthy,
          recentLogs,
          errorRate
        }
      };
    } catch (error) {
      log.error('Logging service health check failed', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });

      return {
        healthy: false,
        details: {
          service: false,
          database: false,
          recentLogs: 0,
          errorRate: 0
        }
      };
    }
  }
}

export default LoggingManagementService;
