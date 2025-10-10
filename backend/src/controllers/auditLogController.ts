// backend/src/controllers/auditLogController.ts
import { Request, Response } from 'express';
import { AuditLogService } from '../services/auditLogService';
import { successResponse, errorResponse } from '../utils/response';

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      tenantId,
      action,
      resource,
      severity,
      category,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = (req as any).query;

    const filters: any = {};
    if (userId) (filters as any).userId = userId as string;
    if (tenantId) (filters as any).tenantId = tenantId as string;
    if (action) (filters as any).action = action as string;
    if (resource) (filters as any).resource = resource as string;
    if (severity) (filters as any).severity = severity as string;
    if (category) (filters as any).category = category as string;
    if (startDate) (filters as any).startDate = new Date(startDate as string);
    if (endDate) (filters as any).endDate = new Date(endDate as string);

    const options = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    };

    const result = await AuditLogService.getLogs(filters, options);
    (res as any).json(successResponse('Audit logs retrieved successfully', result));
  } catch (error) {
    (res as any).status(500).json(errorResponse('Failed to retrieve audit logs', error));
  }
};

export const getAuditLogStats = async (req: Request, res: Response) => {
  try {
    const { tenantId, startDate, endDate } = (req as any).query;

    const filters: any = {};
    if (tenantId) (filters as any).tenantId = tenantId as string;
    if (startDate) (filters as any).startDate = new Date(startDate as string);
    if (endDate) (filters as any).endDate = new Date(endDate as string);

    const stats = await AuditLogService.getStats(filters);
    (res as any).json(successResponse('Audit log stats retrieved successfully', stats));
  } catch (error) {
    (res as any).status(500).json(errorResponse('Failed to retrieve audit log stats', error));
  }
};

export const getRecentActivity = async (req: Request, res: Response) => {
  try {
    const limit = parseInt((req as any).query.limit as string) || 20;
    const activity = await AuditLogService.getRecentActivity(limit);
    (res as any).json(successResponse('Recent activity retrieved successfully', activity));
  } catch (error) {
    (res as any).status(500).json(errorResponse('Failed to retrieve recent activity', error));
  }
};

export const getSecurityEvents = async (req: Request, res: Response) => {
  try {
    const limit = parseInt((req as any).query.limit as string) || 50;
    const events = await AuditLogService.getSecurityEvents(limit);
    (res as any).json(successResponse('Security events retrieved successfully', events));
  } catch (error) {
    (res as any).status(500).json(errorResponse('Failed to retrieve security events', error));
  }
};

export const getUserActivity = async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).params;
    const limit = parseInt((req as any).query.limit as string) || 50;
    const activity = await AuditLogService.getUserActivity(userId, limit);
    (res as any).json(successResponse('User activity retrieved successfully', activity));
  } catch (error) {
    (res as any).status(500).json(errorResponse('Failed to retrieve user activity', error));
  }
};

export const getTenantActivity = async (req: Request, res: Response) => {
  try {
    const { tenantId } = (req as any).params;
    const limit = parseInt((req as any).query.limit as string) || 50;
    const activity = await AuditLogService.getTenantActivity(tenantId, limit);
    (res as any).json(successResponse('Tenant activity retrieved successfully', activity));
  } catch (error) {
    (res as any).status(500).json(errorResponse('Failed to retrieve tenant activity', error));
  }
};

export const cleanupOldLogs = async (req: Request, res: Response) => {
  try {
    const daysToKeep = parseInt((req as any).body.daysToKeep as string) || 90;
    const deletedCount = await AuditLogService.cleanupOldLogs(daysToKeep);
    (res as any).json(successResponse('Old logs cleaned up successfully', { deletedCount }));
  } catch (error) {
    (res as any).status(500).json(errorResponse('Failed to cleanup old logs', error));
  }
};
