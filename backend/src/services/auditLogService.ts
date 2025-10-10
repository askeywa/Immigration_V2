// backend/src/services/auditLogService.ts
import { AuditLog, IAuditLog } from '../models/AuditLog';
import { Request } from 'express';

export class AuditLogService {
  static async logAction(
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
    return AuditLog.logAction(userId, userEmail, action, resource, options);
  }

  static async logFromRequest(
    req: Request,
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
    const user = (req as any).user;
    if (!user) {
      throw new Error('User not found in request');
    }

    const ipAddress = (req as any).ip || (req as any).connection.remoteAddress || (req as any).socket.remoteAddress;
    const userAgent = (req as any).get('User-Agent');

    return this.logAction(
      user._id,
      user.email,
      action,
      resource,
      {
        ...options,
        ipAddress,
        userAgent,
        tenantId: user.tenantId,
        metadata: {
          ...options.metadata,
          requestId: (req as any).headers['x-request-id'],
          sessionId: (req as any).headers['x-session-id']
        }
      }
    );
  }

  static async getLogs(
    filters: {
      userId?: string;
      tenantId?: string;
      action?: string;
      resource?: string;
      severity?: string;
      category?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
    options: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ) {
    return AuditLog.getLogs(filters, options);
  }

  static async getStats(
    filters: {
      tenantId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    return AuditLog.getStats(filters);
  }

  static async getRecentActivity(limit: number = 20) {
    return AuditLog.find()
      .populate('userId', 'firstName lastName email')
      .populate('tenantId', 'name domain')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  static async getSecurityEvents(limit: number = 50) {
    return AuditLog.find({
      $or: [
        { category: 'security' },
        { severity: { $in: ['high', 'critical'] } },
        { action: { $in: ['login', 'logout', 'password_change', 'password_reset'] } }
      ]
    })
      .populate('userId', 'firstName lastName email')
      .populate('tenantId', 'name domain')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  static async getUserActivity(userId: string, limit: number = 50) {
    return AuditLog.find({ userId })
      .populate('tenantId', 'name domain')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  static async getTenantActivity(tenantId: string, limit: number = 50) {
    return AuditLog.find({ tenantId })
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  static async cleanupOldLogs(daysToKeep: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await AuditLog.deleteMany({
      createdAt: { $lt: cutoffDate },
      severity: { $in: ['low', 'medium'] } // Keep high and critical severity logs longer
    });

    return result.deletedCount;
  }

  // Helper methods for common audit actions
  static async logUserLogin(req: Request, userId: string, userEmail: string) {
    return this.logFromRequest(req, 'login', 'user', {
      resourceId: userId,
      severity: 'medium',
      category: 'security',
      details: { loginTime: new Date() }
    });
  }

  static async logUserLogout(req: Request, userId: string, userEmail: string) {
    return this.logFromRequest(req, 'logout', 'user', {
      resourceId: userId,
      severity: 'low',
      category: 'security',
      details: { logoutTime: new Date() }
    });
  }

  static async logUserCreation(req: Request, userId: string, userEmail: string, newUserId: string, userDetails: any) {
    return this.logFromRequest(req, 'create', 'user', {
      resourceId: newUserId,
      severity: 'medium',
      category: 'user',
      details: { createdUser: userDetails }
    });
  }

  static async logUserUpdate(req: Request, userId: string, userEmail: string, targetUserId: string, changes: any) {
    return this.logFromRequest(req, 'update', 'user', {
      resourceId: targetUserId,
      severity: 'medium',
      category: 'user',
      details: { changes }
    });
  }

  static async logUserDeletion(req: Request, userId: string, userEmail: string, deletedUserId: string, userDetails: any) {
    return this.logFromRequest(req, 'delete', 'user', {
      resourceId: deletedUserId,
      severity: 'high',
      category: 'user',
      details: { deletedUser: userDetails }
    });
  }

  static async logTenantSuspension(req: Request, userId: string, userEmail: string, tenantId: string, tenantDetails: any) {
    return this.logFromRequest(req, 'suspend', 'tenant', {
      resourceId: tenantId,
      severity: 'high',
      category: 'tenant',
      details: { suspendedTenant: tenantDetails }
    });
  }

  static async logTenantActivation(req: Request, userId: string, userEmail: string, tenantId: string, tenantDetails: any) {
    return this.logFromRequest(req, 'activate', 'tenant', {
      resourceId: tenantId,
      severity: 'medium',
      category: 'tenant',
      details: { activatedTenant: tenantDetails }
    });
  }

  static async logSubscriptionChange(req: Request, userId: string, userEmail: string, subscriptionId: string, changes: any) {
    return this.logFromRequest(req, 'update', 'subscription', {
      resourceId: subscriptionId,
      severity: 'medium',
      category: 'subscription',
      details: { changes }
    });
  }

  static async logSystemAction(req: Request, action: string, details: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    const user = (req as any).user;
    if (!user) {
      throw new Error('User not found in request');
    }

    return this.logFromRequest(req, action, 'system', {
      severity,
      category: 'system',
      details
    });
  }
}
