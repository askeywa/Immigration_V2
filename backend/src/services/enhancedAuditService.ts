// backend/src/services/enhancedAuditService.ts
import { AuditLog, IAuditLog } from '../models/AuditLog';
import { Request } from 'express';
import { TenantRequest } from '../middleware/tenantResolution';
import { AppError } from '../utils/errors';
import { log } from '../utils/logger';
import mongoose from 'mongoose';

export interface AuditLogFilters {
  userId?: string;
  tenantId?: string;
  action?: string;
  resource?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'user' | 'tenant' | 'subscription' | 'system' | 'security' | 'billing';
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  userAgent?: string;
  searchTerm?: string;
}

export interface AuditLogOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeDeleted?: boolean;
}

export interface AuditLogAnalytics {
  totalLogs: number;
  logsByAction: Array<{ action: string; count: number; percentage: number }>;
  logsBySeverity: Array<{ severity: string; count: number; percentage: number }>;
  logsByCategory: Array<{ category: string; count: number; percentage: number }>;
  logsByTenant: Array<{ tenantId: string; tenantName: string; count: number; percentage: number }>;
  logsByUser: Array<{ userId: string; userEmail: string; count: number; percentage: number }>;
  logsByHour: Array<{ hour: number; count: number }>;
  logsByDay: Array<{ day: string; count: number }>;
  recentActivity: IAuditLog[];
  securityEvents: IAuditLog[];
  topResources: Array<{ resource: string; count: number }>;
  averageResponseTime: number;
  errorRate: number;
}

export interface AuditLogExport {
  logs: IAuditLog[];
  filters: AuditLogFilters;
  exportDate: Date;
  totalCount: number;
  format: 'json' | 'csv' | 'pdf';
}

export class EnhancedAuditService {
  /**
   * Create audit log entry with enhanced context
   */
  static async createAuditLog(
    userId: string,
    userEmail: string,
    action: string,
    resource: string,
    options: {
      resourceId?: string;
      details?: any;
      ipAddress?: string;
      userAgent?: string;
      tenantId?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      category?: 'user' | 'tenant' | 'subscription' | 'system' | 'security' | 'billing';
      metadata?: any;
    } = {}
  ): Promise<IAuditLog> {
    try {
      return await AuditLog.logAction(userId, userEmail, action, resource, options);
    } catch (error) {
      log.error('Failed to create audit log:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      throw new AppError('Failed to create audit log entry', 500);
    }
  }

  /**
   * Create audit log from request context
   */
  static async createAuditLogFromRequest(
    req: TenantRequest,
    action: string,
    resource: string,
    options: {
      resourceId?: string;
      details?: any;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      category?: 'user' | 'tenant' | 'subscription' | 'system' | 'security' | 'billing';
      metadata?: any;
    } = {}
  ): Promise<IAuditLog> {
    try {
      const user = (req as any).user;
      if (!user) {
        throw new AppError('User not found in request context', 400);
      }

      const ipAddress = (req as any).ip || (req as any).connection.remoteAddress || (req as any).socket.remoteAddress;
      const userAgent = (req as any).get('User-Agent');

      return await this.createAuditLog(
        user._id,
        user.email,
        action,
        resource,
        {
          ...options,
          ipAddress,
          userAgent,
          tenantId: (req as any).tenantId,
          metadata: {
            ...options.metadata,
            requestId: (req as any).headers['x-request-id'],
            sessionId: (req as any).headers['x-session-id'],
            tenantDomain: (req as any).tenantDomain
          }
        }
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create audit log from request', 500);
    }
  }

  /**
   * Get audit logs with advanced filtering and pagination
   */
  static async getAuditLogs(
    filters: AuditLogFilters = {},
    options: AuditLogOptions = {}
  ): Promise<{
    logs: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalLogs: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // Build query
      const query: any = {};

      if (filters.userId) (query as any).userId = new mongoose.Types.ObjectId(filters.userId);
      if (filters.tenantId) (query as any).tenantId = new mongoose.Types.ObjectId(filters.tenantId);
      if (filters.action) (query as any).action = filters.action;
      if (filters.resource) (query as any).resource = filters.resource;
      if (filters.severity) (query as any).severity = filters.severity;
      if (filters.category) (query as any).category = filters.category;
      if (filters.ipAddress) (query as any).ipAddress = filters.ipAddress;
      if (filters.userAgent) (query as any).userAgent = new RegExp(filters.userAgent, 'i');

      // Date range filter
      if (filters.startDate || filters.endDate) {
        (query as any).createdAt = {};
        if (filters.startDate) (query as any).createdAt.$gte = filters.startDate;
        if (filters.endDate) (query as any).createdAt.$lte = filters.endDate;
      }

      // Text search
      if (filters.searchTerm) {
        query.$or = [
          { userEmail: new RegExp(filters.searchTerm, 'i') },
          { action: new RegExp(filters.searchTerm, 'i') },
          { resource: new RegExp(filters.searchTerm, 'i') },
          { 'details.changes': new RegExp(filters.searchTerm, 'i') }
        ];
      }

      const skip = (page - 1) * limit;
      const sort: any = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query with population
      const logs = await AuditLog.find(query)
        .populate('userId', 'firstName lastName email role')
        .populate('tenantId', 'name domain status')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await AuditLog.countDocuments(query);

      return {
        logs,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalLogs: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      log.error('Failed to get audit logs:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      throw new AppError('Failed to retrieve audit logs', 500);
    }
  }

  /**
   * Get comprehensive audit log analytics
   */
  static async getAuditAnalytics(
    filters: AuditLogFilters = {},
    tenantId?: string,
    isSuperAdmin: boolean = false
  ): Promise<AuditLogAnalytics> {
    try {
      // Validate permissions
      if (!isSuperAdmin && tenantId && filters.tenantId !== tenantId) {
        throw new AppError('Access denied to tenant audit data', 403);
      }

      // Build base query
      const baseQuery: any = {};
      if (filters.tenantId) (baseQuery as any).tenantId = new mongoose.Types.ObjectId(filters.tenantId);
      if (filters.startDate || filters.endDate) {
        (baseQuery as any).createdAt = {};
        if (filters.startDate) (baseQuery as any).createdAt.$gte = filters.startDate;
        if (filters.endDate) (baseQuery as any).createdAt.$lte = filters.endDate;
      }

      const [
        totalLogs,
        logsByAction,
        logsBySeverity,
        logsByCategory,
        logsByTenant,
        logsByUser,
        logsByHour,
        logsByDay,
        recentActivity,
        securityEvents,
        topResources,
        responseTimeData,
        errorLogs
      ] = await Promise.all([
        // Total logs count
        AuditLog.countDocuments(baseQuery),

        // Logs by action
        AuditLog.aggregate([
          { $match: baseQuery },
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),

        // Logs by severity
        AuditLog.aggregate([
          { $match: baseQuery },
          { $group: { _id: '$severity', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),

        // Logs by category
        AuditLog.aggregate([
          { $match: baseQuery },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),

        // Logs by tenant
        AuditLog.aggregate([
          { $match: baseQuery },
          { $group: { _id: '$tenantId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: 'tenants',
              localField: '_id',
              foreignField: '_id',
              as: 'tenant'
            }
          },
          { $unwind: { path: '$tenant', preserveNullAndEmptyArrays: true } }
        ]),

        // Logs by user
        AuditLog.aggregate([
          { $match: baseQuery },
          { $group: { _id: '$userId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'user'
            }
          },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }
        ]),

        // Logs by hour
        AuditLog.aggregate([
          { $match: baseQuery },
          {
            $group: {
              _id: { $hour: '$createdAt' },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id': 1 } }
        ]),

        // Logs by day
        AuditLog.aggregate([
          { $match: baseQuery },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id': 1 } },
          { $limit: 30 }
        ]),

        // Recent activity
        AuditLog.find(baseQuery)
          .populate('userId', 'firstName lastName email')
          .populate('tenantId', 'name domain')
          .sort({ createdAt: -1 })
          .limit(20)
          .lean() as unknown as IAuditLog[],

        // Security events
        AuditLog.find({
          ...baseQuery,
          $or: [
            { category: 'security' },
            { severity: { $in: ['high', 'critical'] } },
            { action: { $in: ['login', 'logout', 'password_change', 'password_reset'] } }
          ]
        })
          .populate('userId', 'firstName lastName email')
          .populate('tenantId', 'name domain')
          .sort({ createdAt: -1 })
          .limit(20)
          .lean() as unknown as IAuditLog[],

        // Top resources
        AuditLog.aggregate([
          { $match: baseQuery },
          { $group: { _id: '$resource', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),

        // Response time data
        AuditLog.aggregate([
          { $match: { ...baseQuery, 'metadata.duration': { $exists: true } } },
          {
            $group: {
              _id: null,
              avgDuration: { $avg: '$metadata.duration' }
            }
          }
        ]),

        // Error logs count
        AuditLog.countDocuments({
          ...baseQuery,
          $or: [
            { 'metadata.statusCode': { $gte: 400 } },
            { severity: { $in: ['high', 'critical'] } }
          ]
        })
      ]);

      // Calculate percentages
      const calculatePercentages = (data: any[]) => {
        return (data as any).map((item: any) => ({
          ...item,
          percentage: totalLogs > 0 ? Math.round((item.count / totalLogs) * 100) : 0
        }));
      };

      const averageResponseTime = responseTimeData[0]?.avgDuration || 0;
      const errorRate = totalLogs > 0 ? Math.round((errorLogs / totalLogs) * 100) : 0;

      return {
        totalLogs,
        logsByAction: calculatePercentages(logsByAction),
        logsBySeverity: calculatePercentages(logsBySeverity),
        logsByCategory: calculatePercentages(logsByCategory),
        logsByTenant: logsByTenant.map((item: any) => ({
          tenantId: item._id?.toString(),
          tenantName: item.tenant?.name || 'Unknown',
          count: item.count,
          percentage: totalLogs > 0 ? Math.round((item.count / totalLogs) * 100) : 0
        })),
        logsByUser: logsByUser.map((item: any) => ({
          userId: item._id?.toString(),
          userEmail: item.user?.email || 'Unknown',
          count: item.count,
          percentage: totalLogs > 0 ? Math.round((item.count / totalLogs) * 100) : 0
        })),
        logsByHour: logsByHour.map((item: any) => ({
          hour: item._id,
          count: item.count
        })),
        logsByDay: logsByDay.map((item: any) => ({
          day: item._id,
          count: item.count
        })),
        recentActivity,
        securityEvents,
        topResources: logsByAction.map((item: any) => ({
          resource: item._id,
          count: item.count
        })),
        averageResponseTime,
        errorRate
      };
    } catch (error) {
      log.error('Failed to get audit analytics:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      throw new AppError('Failed to retrieve audit analytics', 500);
    }
  }

  /**
   * Export audit logs in various formats
   */
  static async exportAuditLogs(
    filters: AuditLogFilters = {},
    format: 'json' | 'csv' | 'pdf' = 'json',
    tenantId?: string,
    isSuperAdmin: boolean = false
  ): Promise<AuditLogExport> {
    try {
      // Validate permissions
      if (!isSuperAdmin && tenantId && filters.tenantId !== tenantId) {
        throw new AppError('Access denied to tenant audit data', 403);
      }

      // Get logs with no pagination limit
      const { logs, pagination } = await this.getAuditLogs(filters, {
        limit: 10000, // Large limit for export
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      return {
        logs,
        filters,
        exportDate: new Date(),
        totalCount: pagination.totalLogs,
        format
      };
    } catch (error) {
      log.error('Failed to export audit logs:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      throw new AppError('Failed to export audit logs', 500);
    }
  }

  /**
   * Get audit log statistics for dashboard
   */
  static async getDashboardStats(tenantId?: string, isSuperAdmin: boolean = false): Promise<{
    totalLogs: number;
    securityEvents: number;
    errorRate: number;
    recentActivity: number;
    topActions: Array<{ action: string; count: number }>;
    topUsers: Array<{ userEmail: string; count: number }>;
  }> {
    try {
      const baseQuery: any = {};
      if (tenantId && !isSuperAdmin) {
        (baseQuery as any).tenantId = new mongoose.Types.ObjectId(tenantId);
      }

      const [
        totalLogs,
        securityEvents,
        errorLogs,
        recentActivity,
        topActions,
        topUsers
      ] = await Promise.all([
        AuditLog.countDocuments(baseQuery),
        AuditLog.countDocuments({
          ...baseQuery,
          $or: [
            { category: 'security' },
            { severity: { $in: ['high', 'critical'] } }
          ]
        }),
        AuditLog.countDocuments({
          ...baseQuery,
          $or: [
            { 'metadata.statusCode': { $gte: 400 } },
            { severity: { $in: ['high', 'critical'] } }
          ]
        }),
        AuditLog.countDocuments({
          ...baseQuery,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        }),
        AuditLog.aggregate([
          { $match: baseQuery },
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ]),
        AuditLog.aggregate([
          { $match: baseQuery },
          { $group: { _id: '$userEmail', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ])
      ]);

      const errorRate = totalLogs > 0 ? Math.round((errorLogs / totalLogs) * 100) : 0;

      return {
        totalLogs,
        securityEvents,
        errorRate,
        recentActivity,
        topActions: topActions.map((item: any) => ({
          action: item._id,
          count: item.count
        })),
        topUsers: topUsers.map((item: any) => ({
          userEmail: item._id,
          count: item.count
        }))
      };
    } catch (error) {
      log.error('Failed to get dashboard stats:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      throw new AppError('Failed to retrieve dashboard statistics', 500);
    }
  }

  /**
   * Cleanup old audit logs based on retention policy
   */
  static async cleanupOldLogs(
    retentionDays: number = 90,
    tenantId?: string
  ): Promise<{ deletedCount: number; errors: string[] }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const query: any = {
        createdAt: { $lt: cutoffDate },
        severity: { $in: ['low', 'medium'] } // Keep high and critical severity logs longer
      };

      if (tenantId) {
        (query as any).tenantId = new mongoose.Types.ObjectId(tenantId);
      }

      const result = await AuditLog.deleteMany(query);
      
      log.info(`Cleaned up ${result.deletedCount} old audit logs older than ${retentionDays} days`);

      return {
        deletedCount: result.deletedCount,
        errors: []
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
      log.error('Failed to cleanup old audit logs:', { error: errorMessage });
      
      return {
        deletedCount: 0,
        errors: [errorMessage]
      };
    }
  }

  /**
   * Get audit log health status
   */
  static async getHealthStatus(): Promise<{
    isHealthy: boolean;
    totalLogs: number;
    recentLogs: number;
    errorRate: number;
    storageSize: number;
    issues: string[];
  }> {
    try {
      const [
        totalLogs,
        recentLogs,
        errorLogs,
        storageStats
      ] = await Promise.all([
        AuditLog.countDocuments(),
        AuditLog.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
        }),
        AuditLog.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
          severity: { $in: ['high', 'critical'] }
        }),
        AuditLog.collection.aggregate([{ $collStats: { storageStats: {} } }]).toArray().then(stats => stats[0]?.storageStats || { size: 0 }).catch(() => ({ size: 0 }))
      ]);

      const errorRate = recentLogs > 0 ? (errorLogs / recentLogs) * 100 : 0;
      const storageSize = storageStats.size || 0;
      
      const issues: string[] = [];
      
      if (errorRate > 10) {
        issues.push(`High error rate: ${errorRate.toFixed(1)}%`);
      }
      
      if (storageSize > 1024 * 1024 * 1024) { // 1GB
        issues.push('Large storage usage detected');
      }
      
      if (recentLogs === 0) {
        issues.push('No recent audit logs detected');
      }

      return {
        isHealthy: issues.length === 0,
        totalLogs,
        recentLogs,
        errorRate,
        storageSize,
        issues
      };
    } catch (error) {
      log.error('Failed to get audit log health status:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      
      return {
        isHealthy: false,
        totalLogs: 0,
        recentLogs: 0,
        errorRate: 100,
        storageSize: 0,
        issues: ['Failed to retrieve health status']
      };
    }
  }
}
