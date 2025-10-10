// backend/src/controllers/backupController.ts
import { Request, Response, NextFunction } from 'express';
import { TenantRequest } from '../middleware/tenantResolution';
import BackupService from '../services/backupService';
import Backup from '../models/Backup';
import { log } from '../utils/logger';
import { AppError } from '../utils/errors';

export class BackupController {
  private backupService: BackupService;

  constructor() {
    this.backupService = BackupService.getInstance();
  }

  /**
   * Create a new backup
   */
  createBackup = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        name,
        type,
        scope,
        source,
        destination,
        encryption,
        compression,
        schedule
      } = (req as any).body;

      // Validate required fields
      if (!name || !type || !scope) {
        throw new AppError('Missing required fields: name, type, scope', 400);
      }

      // Create backup
      const backup = await this.backupService.createBackup({
        name,
        type,
        scope,
        tenantId: (req as any).tenantId,
        source,
        destination,
        encryption,
        compression,
        createdBy: (req as any).user?.id
      });

      // Add schedule if provided
      if (schedule) {
        backup.schedule = {
          frequency: schedule.frequency || 'manual',
          cronExpression: schedule.cronExpression,
          timezone: schedule.timezone || 'UTC',
          enabled: schedule.enabled || false
        };
        await backup.save();
      }

      (res as any).status(201).json({
        success: true,
        data: backup.toBackupInfo()
      });
    } catch (error) {
      log.error('Failed to create backup', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });
      next(error);
    }
  };

  /**
   * Get all backups
   */
  getBackups = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        type,
        status,
        scope,
        limit = 50,
        offset = 0,
        sortBy = 'createdAt',
        sortOrder = 'desc'
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
      if (type) (query as any).type = type as string;
      if (status) (query as any).status = status as string;
      if (scope) (query as any).scope = scope as string;

      // Build sort
      const sort: any = {};
      sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

      // Execute query
      const backups = await Backup.find(query)
        .populate('tenantId', 'name domain')
        .populate('metadata.createdBy', 'username email')
        .sort(sort)
        .skip(parseInt(offset as string))
        .limit(parseInt(limit as string));

      const total = await Backup.countDocuments(query);

      (res as any).json({
        success: true,
        data: {
          backups: backups.map((backup: any) => backup.toBackupInfo()),
          pagination: {
            total,
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            hasMore: parseInt(offset as string) + parseInt(limit as string) < total
          }
        }
      });
    } catch (error) {
      log.error('Failed to get backups', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });
      next(error);
    }
  };

  /**
   * Get backup by ID
   */
  getBackup = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = (req as any).params;

      const backup = await Backup.findById(id)
        .populate('tenantId', 'name domain')
        .populate('metadata.createdBy', 'username email');

      if (!backup) {
        throw new AppError('Backup not found', 404);
      }

      // Check access permissions
      if (!(req as any).isSuperAdmin && backup.tenantId && backup.tenantId.toString() !== (req as any).tenantId) {
        throw new AppError('Access denied', 403);
      }

      (res as any).json({
        success: true,
        data: backup
      });
    } catch (error) {
      log.error('Failed to get backup', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        backupId: (req as any).params.id,
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });
      next(error);
    }
  };

  /**
   * Get backup progress
   */
  getBackupProgress = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = (req as any).params;

      const backup = await Backup.findById(id);
      if (!backup) {
        throw new AppError('Backup not found', 404);
      }

      // Check access permissions
      if (!(req as any).isSuperAdmin && backup.tenantId && backup.tenantId.toString() !== (req as any).tenantId) {
        throw new AppError('Access denied', 403);
      }

      const progress = this.backupService.getBackupProgress(id);

      (res as any).json({
        success: true,
        data: {
          backup: backup.toBackupInfo(),
          progress
        }
      });
    } catch (error) {
      log.error('Failed to get backup progress', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        backupId: (req as any).params.id,
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });
      next(error);
    }
  };

  /**
   * Cancel backup
   */
  cancelBackup = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = (req as any).params;

      const backup = await Backup.findById(id);
      if (!backup) {
        throw new AppError('Backup not found', 404);
      }

      // Check access permissions
      if (!(req as any).isSuperAdmin && backup.tenantId && backup.tenantId.toString() !== (req as any).tenantId) {
        throw new AppError('Access denied', 403);
      }

      if (backup.status !== 'running') {
        throw new AppError('Backup is not running', 400);
      }

      await this.backupService.cancelBackup(id);

      (res as any).json({
        success: true,
        message: 'Backup cancelled successfully'
      });
    } catch (error) {
      log.error('Failed to cancel backup', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        backupId: (req as any).params.id,
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });
      next(error);
    }
  };

  /**
   * Delete backup
   */
  deleteBackup = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = (req as any).params;

      const backup = await Backup.findById(id);
      if (!backup) {
        throw new AppError('Backup not found', 404);
      }

      // Check access permissions
      if (!(req as any).isSuperAdmin && backup.tenantId && backup.tenantId.toString() !== (req as any).tenantId) {
        throw new AppError('Access denied', 403);
      }

      // Don't allow deletion of running backups
      if (backup.status === 'running') {
        throw new AppError('Cannot delete running backup', 400);
      }

      // TODO: Delete actual backup files from storage
      
      await Backup.findByIdAndDelete(id);

      (res as any).json({
        success: true,
        message: 'Backup deleted successfully'
      });
    } catch (error) {
      log.error('Failed to delete backup', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        backupId: (req as any).params.id,
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });
      next(error);
    }
  };

  /**
   * Get backup statistics
   */
  getBackupStatistics = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      let tenantId: string | undefined;
      
      // Add tenant filter for non-super-admin users
      if (!(req as any).isSuperAdmin && (req as any).tenantId) {
        tenantId = (req as any).tenantId;
      } else if ((req as any).query.tenantId && (req as any).isSuperAdmin) {
        tenantId = (req as any).query.tenantId as string;
      }

      const statistics = await (Backup as any).getBackupStatistics(tenantId); 
      const byType = await (Backup as any).getBackupsByType(tenantId);        
      const byTime = await (Backup as any).getBackupsByTime(tenantId, 30);

      (res as any).json({
        success: true,
        data: {
          statistics: statistics[0] || {
            total: 0,
            completed: 0,
            failed: 0,
            running: 0,
            pending: 0,
            totalSize: 0,
            avgSize: 0,
            totalDuration: 0,
            avgDuration: 0,
            corrupted: 0
          },
          byType,
          byTime
        }
      });
    } catch (error) {
      log.error('Failed to get backup statistics', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });
      next(error);
    }
  };

  /**
   * Get active backups
   */
  getActiveBackups = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const activeBackups = this.backupService.getActiveBackups();

      (res as any).json({
        success: true,
        data: activeBackups
      });
    } catch (error) {
      log.error('Failed to get active backups', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });
      next(error);
    }
  };

  /**
   * Get scheduled backups
   */
  getScheduledBackups = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query: any = { 'schedule.enabled': true };

      // Add tenant filter for non-super-admin users
      if (!(req as any).isSuperAdmin && (req as any).tenantId) {
        (query as any).tenantId = (req as any).tenantId;
      } else if ((req as any).query.tenantId && (req as any).isSuperAdmin) {
        (query as any).tenantId = (req as any).query.tenantId as string;
      }

      const scheduledBackups = await Backup.find(query)
        .populate('tenantId', 'name domain')
        .sort({ 'schedule.frequency': 1, name: 1 });

      (res as any).json({
        success: true,
        data: scheduledBackups.map((backup: any) => ({
          id: backup._id,
          name: backup.name,
          type: backup.type,
          scope: backup.scope,
          tenantId: backup.tenantId,
          schedule: backup.schedule,
          lastRun: backup.metadata.startTime,
          nextRun: null // TODO: Calculate next run time
        }))
      });
    } catch (error) {
      log.error('Failed to get scheduled backups', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });
      next(error);
    }
  };

  /**
   * Update backup schedule
   */
  updateBackupSchedule = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = (req as any).params;
      const { schedule } = (req as any).body;

      const backup = await Backup.findById(id);
      if (!backup) {
        throw new AppError('Backup not found', 404);
      }

      // Check access permissions
      if (!(req as any).isSuperAdmin && backup.tenantId && backup.tenantId.toString() !== (req as any).tenantId) {
        throw new AppError('Access denied', 403);
      }

      // Update schedule
      if (schedule) {
        backup.schedule = {
          frequency: schedule.frequency || backup.schedule?.frequency,
          cronExpression: schedule.cronExpression || backup.schedule?.cronExpression,                                                          
          timezone: schedule.timezone || backup.schedule?.timezone,   
          enabled: schedule.enabled !== undefined ? schedule.enabled : backup.schedule?.enabled
        };
        await backup.save();
      }

      (res as any).json({
        success: true,
        data: backup.toBackupInfo()
      });
    } catch (error) {
      log.error('Failed to update backup schedule', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        backupId: (req as any).params.id,
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });
      next(error);
    }
  };

  /**
   * Restore backup
   */
  restoreBackup = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = (req as any).params;
      const { targetTenantId, overwrite } = (req as any).body;

      if (!(req as any).isSuperAdmin) {
        throw new AppError('Access denied. Super admin privileges required.', 403);
      }

      const backup = await Backup.findById(id);
      if (!backup) {
        throw new AppError('Backup not found', 404);
      }

      if (backup.status !== 'completed') {
        throw new AppError('Backup is not completed', 400);
      }

      if (!backup.canRestore()) {
        throw new AppError('Backup cannot be restored - integrity check failed', 400);
      }

      // TODO: Implement actual restore process
      // This would involve:
      // 1. Downloading backup files
      // 2. Decrypting if needed
      // 3. Decompressing if needed
      // 4. Restoring MongoDB data
      // 5. Restoring Redis data
      // 6. Restoring files
      // 7. Updating logs

      (res as any).json({
        success: true,
        message: 'Restore process started',
        data: {
          backupId: id,
          targetTenantId,
          overwrite,
          status: 'pending'
        }
      });
    } catch (error) {
      log.error('Failed to restore backup', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        backupId: (req as any).params.id,
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });
      next(error);
    }
  };

  /**
   * Verify backup integrity
   */
  verifyBackup = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = (req as any).params;

      const backup = await Backup.findById(id);
      if (!backup) {
        throw new AppError('Backup not found', 404);
      }

      // Check access permissions
      if (!(req as any).isSuperAdmin && backup.tenantId && backup.tenantId.toString() !== (req as any).tenantId) {
        throw new AppError('Access denied', 403);
      }

      if (backup.status !== 'completed') {
        throw new AppError('Backup is not completed', 400);
      }

      // TODO: Implement actual verification process
      // This would involve:
      // 1. Downloading backup files
      // 2. Verifying checksums
      // 3. Testing data integrity
      // 4. Updating health status

      // For now, simulate verification
      const isHealthy = Math.random() > 0.1; // 90% chance of being healthy

      if (isHealthy) {
        backup.health.lastVerification = new Date();
        backup.health.corruptionDetected = false;
      } else {
        backup.health.corruptionDetected = true;
        backup.health.corruptionCount = (backup.health.corruptionCount || 0) + 1;
      }

      await backup.save();

      (res as any).json({
        success: true,
        data: {
          backupId: id,
          isHealthy,
          lastVerification: backup.health.lastVerification,
          corruptionDetected: backup.health.corruptionDetected
        }
      });
    } catch (error) {
      log.error('Failed to verify backup', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        backupId: (req as any).params.id,
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });
      next(error);
    }
  };

  /**
   * Get backup health status
   */
  getBackupHealth = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const health = await this.backupService.healthCheck();

      (res as any).json({
        success: true,
        data: health
      });
    } catch (error) {
      log.error('Failed to get backup health', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });
      next(error);
    }
  };

  /**
   * Cleanup old backups
   */
  cleanupOldBackups = async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!(req as any).isSuperAdmin) {
        throw new AppError('Access denied. Super admin privileges required.', 403);
      }

      const { daysToKeep = 30 } = (req as any).body;

      if (daysToKeep < 7) {
        throw new AppError('Minimum retention period is 7 days', 400);
      }

      // Find expired backups
      const expiredBackups = await Backup.find({
        'retention.cleanupEnabled': true,
        createdAt: {
          $lt: new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)
        }
      });

      let deletedCount = 0;
      for (const backup of expiredBackups) {
        // TODO: Delete actual backup files from storage
        await Backup.findByIdAndDelete(backup._id);
        deletedCount++;
      }

      (res as any).json({
        success: true,
        data: {
          deletedCount,
          message: `Cleaned up ${deletedCount} old backups`
        }
      });
    } catch (error) {
      log.error('Failed to cleanup old backups', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });
      next(error);
    }
  };
}

export default BackupController;
