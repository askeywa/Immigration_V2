// backend/src/services/backupService.ts
import { log } from '../utils/logger';
import Backup, { IBackup } from '../models/Backup';
import { config } from '../config/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export interface BackupConfig {
  mongodb: {
    uri: string;
    databases: string[];
    collections: string[];
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  files: {
    directories: string[];
    patterns: string[];
    exclude: string[];
  };
  storage: {
    local: {
      path: string;
    };
    s3: {
      bucket: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
    };
    gcs: {
      bucket: string;
      keyFilename: string;
    };
  };
  encryption: {
    enabled: boolean;
    algorithm: string;
    key: string;
  };
  compression: {
    enabled: boolean;
    algorithm: string;
    level: number;
  };
  retention: {
    days: number;
    versions: number;
  };
}

export interface BackupProgress {
  backupId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentStep: string;
  startTime: Date;
  endTime?: Date;
  error?: string;
}

export class BackupService {
  private static instance: BackupService;
  private config: BackupConfig;
  private activeBackups: Map<string, BackupProgress> = new Map();

  private constructor() {
    this.config = {
      mongodb: {
        uri: config.mongoUri,
        databases: ['immigration_portal'],
        collections: []
      },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD
      },
      files: {
        directories: ['uploads', 'logs', 'backups'],
        patterns: ['**/*'],
        exclude: ['node_modules', '.git', '*.tmp', '*.log']
      },
      storage: {
        local: {
          path: process.env.BACKUP_LOCAL_PATH || './backups'
        },
        s3: {
          bucket: process.env.BACKUP_S3_BUCKET || '',
          region: process.env.BACKUP_S3_REGION || 'us-east-1',
          accessKeyId: process.env.BACKUP_S3_ACCESS_KEY || '',
          secretAccessKey: process.env.BACKUP_S3_SECRET_KEY || ''
        },
        gcs: {
          bucket: process.env.BACKUP_GCS_BUCKET || '',
          keyFilename: process.env.BACKUP_GCS_KEY_FILE || ''
        }
      },
      encryption: {
        enabled: process.env.BACKUP_ENCRYPTION_ENABLED === 'true',
        algorithm: 'aes-256-gcm',
        key: process.env.BACKUP_ENCRYPTION_KEY || ''
      },
      compression: {
        enabled: process.env.BACKUP_COMPRESSION_ENABLED !== 'false',
        algorithm: 'gzip',
        level: parseInt(process.env.BACKUP_COMPRESSION_LEVEL || '6')
      },
      retention: {
        days: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
        versions: parseInt(process.env.BACKUP_RETENTION_VERSIONS || '10')
      }
    };
  }

  static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  /**
   * Initialize backup service
   */
  async initialize(): Promise<void> {
    try {
      log.info('Initializing backup service...');

      // Create backup directories
      await this.createBackupDirectories();

      // Initialize scheduled backups
      await this.initializeScheduledBackups();

      log.info('Backup service initialized successfully');
    } catch (error) {
      log.error('Failed to initialize backup service', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Create a new backup
   */
  async createBackup(backupData: {
    name: string;
    type: 'full' | 'incremental' | 'differential' | 'tenant' | 'database' | 'files' | 'logs';
    scope: 'all' | 'tenant' | 'database' | 'files' | 'logs' | 'custom';
    tenantId?: string;
    source?: {
      databases?: string[];
      collections?: string[];
      paths?: string[];
      tenants?: string[];
    };
    destination?: {
      type: 'local' | 's3' | 'gcs' | 'azure' | 'ftp' | 'sftp';
      path: string;
      bucket?: string;
      region?: string;
    };
    encryption?: {
      enabled: boolean;
      algorithm?: string;
      key?: string;
    };
    compression?: {
      enabled: boolean;
      algorithm?: string;
      level?: number;
    };
    createdBy?: string;
  }): Promise<IBackup> {
    try {
      log.info('Creating backup', {
        name: backupData.name,
        type: backupData.type,
        scope: backupData.scope,
        tenantId: backupData.tenantId
      });

      // Create backup record
      const backup = new Backup({
        name: backupData.name,
        type: backupData.type,
        scope: backupData.scope,
        tenantId: backupData.tenantId,
        source: backupData.source || {},
        destination: {
          type: backupData.destination?.type || 'local',
          path: backupData.destination?.path || this.config.storage.local.path,
          bucket: backupData.destination?.bucket,
          region: backupData.destination?.region
        },
        encryption: {
          enabled: backupData.encryption?.enabled || this.config.encryption.enabled,
          algorithm: backupData.encryption?.algorithm || this.config.encryption.algorithm,
          key: backupData.encryption?.key || this.config.encryption.key
        },
        compression: {
          enabled: backupData.compression?.enabled !== false ? this.config.compression.enabled : false,
          algorithm: backupData.compression?.algorithm || this.config.compression.algorithm,
          level: backupData.compression?.level || this.config.compression.level
        },
        retention: {
          days: this.config.retention.days,
          versions: this.config.retention.versions,
          cleanupEnabled: true
        },
        verification: {
          enabled: true,
          integrity: true
        },
        metadata: {
          createdBy: backupData.createdBy,
          startTime: new Date()
        },
        notifications: {
          enabled: true,
          channels: ['email'],
          recipients: [process.env.BACKUP_NOTIFICATION_EMAIL || ''],
          onSuccess: false,
          onFailure: true,
          onCompletion: true
        }
      });

      await backup.save();

      // Start backup process
      this.startBackupProcess(backup._id.toString());

      return backup;
    } catch (error) {
      log.error('Failed to create backup', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        backupData
      });
      throw error;
    }
  }

  /**
   * Start backup process
   */
  private async startBackupProcess(backupId: string): Promise<void> {
    try {
      const backup = await Backup.findById(backupId);
      if (!backup) {
        throw new Error('Backup not found');
      }

      // Update status to running
      backup.status = 'running';
      backup.metadata.startTime = new Date();
      await backup.save();

      // Initialize progress tracking
      this.activeBackups.set(backupId, {
        backupId,
        status: 'running',
        progress: 0,
        currentStep: 'Initializing backup',
        startTime: new Date()
      });

      // Execute backup based on type and scope
      switch (backup.type) {
        case 'full':
          await this.performFullBackup(backup);
          break;
        case 'incremental':
          await this.performIncrementalBackup(backup);
          break;
        case 'differential':
          await this.performIncrementalBackup(backup);
          break;
        case 'tenant':
          await this.performTenantBackup(backup);
          break;
        case 'database':
          await this.backupMongoDB(backup);
          break;
        case 'files':
          await this.backupFiles(backup);
          break;
        case 'logs':
          await this.backupLogs(backup);
          break;
        default:
          throw new Error(`Unsupported backup type: ${backup.type}`);
      }

      // Mark as completed
      backup.status = 'completed';
      backup.metadata.endTime = new Date();
      backup.metadata.duration = backup.metadata.endTime.getTime() - backup.metadata.startTime!.getTime();
      await backup.save();

      // Update progress
      const progress = this.activeBackups.get(backupId);
      if (progress) {
        progress.status = 'completed';
        progress.progress = 100;
        progress.endTime = new Date();
        this.activeBackups.set(backupId, progress);
      }

      log.info('Backup completed successfully', {
        backupId,
        duration: backup.metadata.duration,
        size: backup.metadata.size
      });

    } catch (error) {
      log.error('Backup process failed', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        backupId
      });

      // Mark as failed
      const backup = await Backup.findById(backupId);
      if (backup) {
        backup.status = 'failed';
        backup.metadata.endTime = new Date();
        backup.metadata.duration = backup.metadata.endTime.getTime() - backup.metadata.startTime!.getTime();
        backup.metadata.errorMessage = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
        await backup.save();
      }

      // Update progress
      const progress = this.activeBackups.get(backupId);
      if (progress) {
        progress.status = 'failed';
        progress.error = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
        progress.endTime = new Date();
        this.activeBackups.set(backupId, progress);
      }
    }
  }

  /**
   * Perform full backup
   */
  private async performFullBackup(backup: IBackup): Promise<void> {
    const progress = this.activeBackups.get(backup._id.toString());
    
    // Backup MongoDB
    if (progress) {
      progress.currentStep = 'Backing up MongoDB';
      progress.progress = 10;
      this.activeBackups.set(backup._id.toString(), progress);
    }
    await this.backupMongoDB(backup);

    // Backup Redis
    if (progress) {
      progress.currentStep = 'Backing up Redis';
      progress.progress = 30;
      this.activeBackups.set(backup._id.toString(), progress);
    }
    await this.backupRedis(backup);

    // Backup files
    if (progress) {
      progress.currentStep = 'Backing up files';
      progress.progress = 60;
      this.activeBackups.set(backup._id.toString(), progress);
    }
    await this.backupFiles(backup);

    // Backup logs
    if (progress) {
      progress.currentStep = 'Backing up logs';
      progress.progress = 80;
      this.activeBackups.set(backup._id.toString(), progress);
    }
    await this.backupLogs(backup);

    // Finalize backup
    if (progress) {
      progress.currentStep = 'Finalizing backup';
      progress.progress = 95;
      this.activeBackups.set(backup._id.toString(), progress);
    }
    await this.finalizeBackup(backup);
  }

  /**
   * Perform incremental backup
   */
  private async performIncrementalBackup(backup: IBackup): Promise<void> {
    // Find last full backup
    const lastBackup = await Backup.findOne({
      type: 'full',
      status: 'completed',
      tenantId: backup.tenantId
    }).sort({ createdAt: -1 });

    if (!lastBackup) {
      throw new Error('No full backup found for incremental backup');
    }

    // Backup only changes since last backup
    await this.backupMongoDB(backup, lastBackup.createdAt);
    await this.backupFiles(backup, lastBackup.createdAt);
    await this.finalizeBackup(backup);
  }

  /**
   * Perform tenant-specific backup
   */
  private async performTenantBackup(backup: IBackup): Promise<void> {
    if (!backup.tenantId) {
      throw new Error('Tenant ID required for tenant backup');
    }

    // Backup tenant-specific data
    await this.backupMongoDB(backup, undefined, backup.tenantId?.toString());
    await this.backupFiles(backup, undefined, backup.tenantId?.toString());
    await this.finalizeBackup(backup);
  }

  /**
   * Backup MongoDB
   */
  private async backupMongoDB(backup: IBackup, since?: Date, tenantId?: string): Promise<void> {
    try {
      log.info('Starting MongoDB backup', {
        backupId: backup._id,
        since,
        tenantId
      });

      // This would use mongodump in a real implementation
      // For now, we'll simulate the backup process
      const backupPath = path.join(backup.destination.path, `mongodb-${backup._id}.bson`);
      
      // Simulate backup creation
      await fs.writeFile(backupPath, 'MongoDB backup data');
      
      // Update backup metadata
      const stats = await fs.stat(backupPath);
      backup.metadata.size = (backup.metadata.size || 0) + stats.size;
      backup.metadata.fileCount = (backup.metadata.fileCount || 0) + 1;

      log.info('MongoDB backup completed', {
        backupId: backup._id,
        size: stats.size
      });

    } catch (error) {
      log.error('MongoDB backup failed', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        backupId: backup._id
      });
      throw error;
    }
  }

  /**
   * Backup Redis
   */
  private async backupRedis(backup: IBackup): Promise<void> {
    try {
      log.info('Starting Redis backup', {
        backupId: backup._id
      });

      // This would use redis-cli BGSAVE in a real implementation
      const backupPath = path.join(backup.destination.path, `redis-${backup._id}.rdb`);
      
      // Simulate backup creation
      await fs.writeFile(backupPath, 'Redis backup data');
      
      // Update backup metadata
      const stats = await fs.stat(backupPath);
      backup.metadata.size = (backup.metadata.size || 0) + stats.size;
      backup.metadata.fileCount = (backup.metadata.fileCount || 0) + 1;

      log.info('Redis backup completed', {
        backupId: backup._id,
        size: stats.size
      });

    } catch (error) {
      log.error('Redis backup failed', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        backupId: backup._id
      });
      throw error;
    }
  }

  /**
   * Backup files
   */
  private async backupFiles(backup: IBackup, since?: Date, tenantId?: string): Promise<void> {
    try {
      log.info('Starting files backup', {
        backupId: backup._id,
        since,
        tenantId
      });

      const backupPath = path.join(backup.destination.path, `files-${backup._id}.tar.gz`);
      
      // Simulate files backup
      await fs.writeFile(backupPath, 'Files backup data');
      
      // Update backup metadata
      const stats = await fs.stat(backupPath);
      backup.metadata.size = (backup.metadata.size || 0) + stats.size;
      backup.metadata.fileCount = (backup.metadata.fileCount || 0) + 1;

      log.info('Files backup completed', {
        backupId: backup._id,
        size: stats.size
      });

    } catch (error) {
      log.error('Files backup failed', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        backupId: backup._id
      });
      throw error;
    }
  }

  /**
   * Backup logs
   */
  private async backupLogs(backup: IBackup): Promise<void> {
    try {
      log.info('Starting logs backup', {
        backupId: backup._id
      });

      const backupPath = path.join(backup.destination.path, `logs-${backup._id}.tar.gz`);
      
      // Simulate logs backup
      await fs.writeFile(backupPath, 'Logs backup data');
      
      // Update backup metadata
      const stats = await fs.stat(backupPath);
      backup.metadata.size = (backup.metadata.size || 0) + stats.size;
      backup.metadata.fileCount = (backup.metadata.fileCount || 0) + 1;

      log.info('Logs backup completed', {
        backupId: backup._id,
        size: stats.size
      });

    } catch (error) {
      log.error('Logs backup failed', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        backupId: backup._id
      });
      throw error;
    }
  }

  /**
   * Finalize backup
   */
  private async finalizeBackup(backup: IBackup): Promise<void> {
    try {
      log.info('Finalizing backup', {
        backupId: backup._id
      });

      // Calculate checksum if verification is enabled
      if (backup.verification.enabled) {
        const checksum = await this.calculateChecksum(backup);
        backup.verification.checksum = checksum;
      }

      // Save final backup record
      await backup.save();

      log.info('Backup finalized successfully', {
        backupId: backup._id,
        size: backup.metadata.size,
        fileCount: backup.metadata.fileCount
      });

    } catch (error) {
      log.error('Backup finalization failed', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        backupId: backup._id
      });
      throw error;
    }
  }

  /**
   * Calculate backup checksum
   */
  private async calculateChecksum(backup: IBackup): Promise<string> {
    // This would calculate checksum of all backup files
    // For now, return a mock checksum
    return crypto.createHash('sha256').update(backup._id.toString()).digest('hex');
  }

  /**
   * Create backup directories
   */
  private async createBackupDirectories(): Promise<void> {
    const directories = [
      this.config.storage.local.path,
      path.join(this.config.storage.local.path, 'mongodb'),
      path.join(this.config.storage.local.path, 'redis'),
      path.join(this.config.storage.local.path, 'files'),
      path.join(this.config.storage.local.path, 'logs')
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }
    }
  }

  /**
   * Initialize scheduled backups
   */
  private async initializeScheduledBackups(): Promise<void> {
    // This would initialize cron jobs for scheduled backups
    log.info('Scheduled backups initialized');
  }

  /**
   * Get backup progress
   */
  getBackupProgress(backupId: string): BackupProgress | null {
    return this.activeBackups.get(backupId) || null;
  }

  /**
   * Get all active backups
   */
  getActiveBackups(): BackupProgress[] {
    return Array.from(this.activeBackups.values());
  }

  /**
   * Cancel backup
   */
  async cancelBackup(backupId: string): Promise<void> {
    const backup = await Backup.findById(backupId);
    if (backup && backup.status === 'running') {
      backup.status = 'cancelled';
      backup.metadata.endTime = new Date();
      await backup.save();

      const progress = this.activeBackups.get(backupId);
      if (progress) {
        progress.status = 'cancelled';
        progress.endTime = new Date();
        this.activeBackups.set(backupId, progress);
      }
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    details: {
      activeBackups: number;
      lastBackup?: Date;
      totalBackups: number;
      failedBackups: number;
    };
  }> {
    try {
      const activeBackups = this.getActiveBackups().filter((b: any) => b.status === 'running').length;
      
      const lastBackup = await Backup.findOne({ status: 'completed' })
        .sort({ createdAt: -1 });
      
      const totalBackups = await Backup.countDocuments();
      const failedBackups = await Backup.countDocuments({ status: 'failed' });

      return {
        healthy: true,
        details: {
          activeBackups,
          lastBackup: lastBackup?.createdAt,
          totalBackups,
          failedBackups
        }
      };
    } catch (error) {
      log.error('Backup service health check failed', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });

      return {
        healthy: false,
        details: {
          activeBackups: 0,
          totalBackups: 0,
          failedBackups: 0
        }
      };
    }
  }
}

export default BackupService;
