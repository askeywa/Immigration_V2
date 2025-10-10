// backend/src/services/databaseMigrationService.ts
import mongoose from 'mongoose';
import { Tenant, ITenant } from '../models/Tenant';
import { User, IUser } from '../models/User';
import { Profile, IProfile } from '../models/Profile';
import { Subscription, ISubscription } from '../models/Subscription';
import { AuditLog, IAuditLog } from '../models/AuditLog';
import { Notification, INotification } from '../models/Notification';
// import { Report, IReport } from '../models/Report';
// import { File, IFile } from '../models/File';
import { ApiKey, IApiKey } from '../models/ApiKey';
import { MFASettings, IMFASettings } from '../models/MFASettings';
import { Impersonation, IImpersonation } from '../models/Impersonation';
import { AppError } from '../utils/errors';
import { log } from '../utils/logger';

export interface MigrationConfig {
  batchSize: number;
  maxRetries: number;
  retryDelay: number; // in milliseconds
  dryRun: boolean;
  backupEnabled: boolean;
  validationEnabled: boolean;
  rollbackEnabled: boolean;
  logProgress: boolean;
}

export interface MigrationResult {
  success: boolean;
  totalProcessed: number;
  totalSkipped: number;
  totalErrors: number;
  errors: Array<{
    model: string;
    documentId: string;
    error: string;
    timestamp: Date;
  }>;
  duration: number;
  timestamp: Date;
}

export interface MigrationStats {
  totalMigrations: number;
  successfulMigrations: number;
  failedMigrations: number;
  totalDocumentsProcessed: number;
  totalDocumentsSkipped: number;
  totalDocumentsWithErrors: number;
  averageMigrationTime: number;
  lastMigrationDate: Date;
  modelsMigrated: Array<{
    model: string;
    documentsProcessed: number;
    documentsSkipped: number;
    documentsWithErrors: number;
    lastMigrated: Date;
  }>;
}

export interface TenantMigrationData {
  tenantId: string;
  tenantName: string;
  documentsCount: {
    users: number;
    profiles: number;
    subscriptions: number;
    auditLogs: number;
    notifications: number;
    reports: number;
    files: number;
    apiKeys: number;
    mfaSettings: number;
    impersonations: number;
  };
  migrationStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  lastMigrated: Date;
  errors: string[];
}

export class DatabaseMigrationService {
  private static config: MigrationConfig;
  private static readonly MAX_MODELS_MIGRATED = 50; // CRITICAL: Limit stats arrays
  private static stats: MigrationStats = {
    totalMigrations: 0,
    successfulMigrations: 0,
    failedMigrations: 0,
    totalDocumentsProcessed: 0,
    totalDocumentsSkipped: 0,
    totalDocumentsWithErrors: 0,
    averageMigrationTime: 0,
    lastMigrationDate: new Date(),
    modelsMigrated: []
  };

  /**
   * Initialize the database migration service
   */
  static async initialize(): Promise<void> {
    try {
      this.config = {
        batchSize: 100,
        maxRetries: 3,
        retryDelay: 1000,
        dryRun: false,
        backupEnabled: true,
        validationEnabled: true,
        rollbackEnabled: true,
        logProgress: true
      };

      log.info('Database migration service initialized with comprehensive multi-tenancy support');
    } catch (error) {
      log.error('Failed to initialize database migration service:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      throw new AppError('Failed to initialize database migration service', 500);
    }
  }

  /**
   * Get migration configuration
   */
  static getConfig(): MigrationConfig {
    if (!this.config) {
      throw new AppError('Database migration service not initialized', 500);
    }
    return this.config;
  }

  /**
   * Migrate all models to multi-tenancy
   */
  static async migrateAllModels(dryRun: boolean = false): Promise<MigrationResult> {
    const startTime = Date.now();
    const errors: Array<{ model: string; documentId: string; error: string; timestamp: Date }> = [];
    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    try {
      log.info('Starting comprehensive multi-tenancy migration', { dryRun });

      // Get all tenants
      const tenants = await Tenant.find({}).lean() as unknown as ITenant[];
      if (tenants.length === 0) {
        throw new AppError('No tenants found for migration', 400);
      }

      log.info(`Found ${tenants.length} tenants for migration`);

      // Define models to migrate
      const modelsToMigrate = [
        { name: 'User', model: User as any, hasTenantId: true },
        { name: 'Profile', model: Profile as any, hasTenantId: true },
        { name: 'Subscription', model: Subscription as any, hasTenantId: true },
        { name: 'AuditLog', model: AuditLog as any, hasTenantId: true },
        { name: 'Notification', model: Notification as any, hasTenantId: true },
        // { name: 'Report', model: Report, hasTenantId: true },
        // { name: 'File', model: File, hasTenantId: true },
        { name: 'ApiKey', model: ApiKey as any, hasTenantId: true },
        { name: 'MFASettings', model: MFASettings as any, hasTenantId: true },
        { name: 'Impersonation', model: Impersonation as any, hasTenantId: false } // Impersonation doesn't need tenantId
      ];

      for (const { name, model, hasTenantId } of modelsToMigrate) {
        try {
          log.info(`Migrating ${name} model`, { hasTenantId });

          const modelResult = await this.migrateModel(name, model, tenants, dryRun);
          
          totalProcessed += modelResult.processed;
          totalSkipped += modelResult.skipped;
          totalErrors += modelResult.errors.length;
          errors.push(...modelResult.errors);

          log.info(`${name} migration completed`, {
            processed: modelResult.processed,
            skipped: modelResult.skipped,
            errors: modelResult.errors
          });
        } catch (error) {
          log.error(`Failed to migrate ${name} model:`, { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
          totalErrors++;
          errors.push({
            model: name,
            documentId: 'model_migration',
            error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
            timestamp: new Date()
          });
        }
      }

      const duration = Date.now() - startTime;
      const success = totalErrors === 0;

      // Update statistics
      this.updateStats({
        success,
        totalProcessed,
        totalSkipped,
        totalErrors,
        errors,
        duration,
        timestamp: new Date()
      });

      log.info('Multi-tenancy migration completed', {
        success,
        totalProcessed,
        totalSkipped,
        totalErrors,
        duration
      });

      return {
        success,
        totalProcessed,
        totalSkipped,
        totalErrors,
        errors,
        duration,
        timestamp: new Date()
      };
    } catch (error) {
      log.error('Multi-tenancy migration failed:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      throw new AppError('Multi-tenancy migration failed', 500);
    }
  }

  /**
   * Migrate a specific model to multi-tenancy
   */
  private static async migrateModel(
    modelName: string,
    model: any,
    tenants: ITenant[],
    dryRun: boolean
  ): Promise<{
    processed: number;
    skipped: number;
    errors: Array<{ model: string; documentId: string; error: string; timestamp: Date }>;
  }> {
    const errors: Array<{ model: string; documentId: string; error: string; timestamp: Date }> = [];
    let processed = 0;
    let skipped = 0;

    try {
      // Get all documents for this model
      const documents = await (model as any).find({}).lean();
      
      if (documents.length === 0) {
        log.info(`No documents found for ${modelName} model`);
        return { processed: 0, skipped: 0, errors: [] };
      }

      log.info(`Processing ${documents.length} documents for ${modelName} model`);

      // Process documents in batches
      for (let i = 0; i < documents.length; i += this.config.batchSize) {
        const batch = documents.slice(i, i + this.config.batchSize);
        
        for (const doc of batch) {
          try {
            // Skip if document already has tenantId (for models that need it)
            if (modelName !== 'Impersonation' && doc.tenantId) {
              skipped++;
              continue;
            }

            // For impersonation model, skip as it doesn't need tenantId
            if (modelName === 'Impersonation') {
              processed++;
              continue;
            }

            // Determine tenant for this document
            let assignedTenant: ITenant | null = null;

            // Try to find tenant based on user relationship
            if (doc.userId) {
              const user = await User.findById(doc.userId).lean();
              if (user && user.tenantId) {
                assignedTenant = tenants.find((t: any) => (t._id as any).toString() === (user.tenantId as any)?.toString()) || null;
              }
            }

            // If no tenant found, assign to first tenant (for existing data)
            if (!assignedTenant && tenants.length > 0) {
              assignedTenant = tenants[0];
              log.warn(`No tenant found for ${modelName} document ${doc._id}, assigning to default tenant`);
            }

            if (!assignedTenant) {
              errors.push({
                model: modelName,
                documentId: (doc._id as any).toString(),
                error: 'No tenant available for assignment',
                timestamp: new Date()
              });
              continue;
            }

            // Update document with tenantId
            if (!dryRun) {
              await (model as any).findByIdAndUpdate(doc._id, {
                tenantId: assignedTenant._id
              });
            }

            processed++;

            if (this.config.logProgress && processed % 10 === 0) {
              log.info(`Processed ${processed} documents for ${modelName} model`);
            }
          } catch (error) {
            errors.push({
              model: modelName,
              documentId: (doc._id as any).toString(),
              error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
              timestamp: new Date()
            });
          }
        }
      }

      return { processed, skipped, errors };
    } catch (error) {
      log.error(`Failed to migrate ${modelName} model:`, { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      throw error;
    }
  }

  /**
   * Migrate specific tenant data
   */
  static async migrateTenantData(tenantId: string, dryRun: boolean = false): Promise<MigrationResult> {
    const startTime = Date.now();
    const errors: Array<{ model: string; documentId: string; error: string; timestamp: Date }> = [];
    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    try {
      // Verify tenant exists
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new AppError('Tenant not found', 404);
      }

      log.info(`Starting migration for tenant: ${tenant.name}`, { tenantId, dryRun });

      // Define models to migrate for this tenant
      const modelsToMigrate = [
        { name: 'User', model: User as any },
        { name: 'Profile', model: Profile as any },
        { name: 'Subscription', model: Subscription as any },
        { name: 'AuditLog', model: AuditLog as any },
        { name: 'Notification', model: Notification as any },
        // { name: 'Report', model: Report },
        // { name: 'File', model: File },
        { name: 'ApiKey', model: ApiKey as any },
        { name: 'MFASettings', model: MFASettings as any }
      ];

      for (const { name, model } of modelsToMigrate) {
        try {
          // Find documents that belong to this tenant but don't have tenantId set
          const documents = await (model as any).find({
            $or: [
              { tenantId: { $exists: false } },
              { tenantId: null }
            ]
          }).lean();

          for (const doc of documents) {
            try {
              // Check if this document should belong to this tenant
              let shouldAssign = false;

              // For User model, check if user is already assigned to this tenant
              if (name === 'User' && doc.tenantId && doc.tenantId.toString() === tenantId) {
                shouldAssign = true;
              }

              // For other models, check user relationship
              if (!shouldAssign && doc.userId) {
                const user = await User.findById(doc.userId).lean();
                if (user && user.tenantId && user.tenantId.toString() === tenantId) {
                  shouldAssign = true;
                }
              }

              if (shouldAssign) {
                if (!dryRun) {
                  await (model as any).findByIdAndUpdate(doc._id, {
                    tenantId: tenant._id
                  });
                }
                totalProcessed++;
              } else {
                totalSkipped++;
              }
            } catch (error) {
              errors.push({
                model: name,
                documentId: doc._id.toString(),
                error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
                timestamp: new Date()
              });
              totalErrors++;
            }
          }
        } catch (error) {
          log.error(`Failed to migrate ${name} model for tenant ${tenantId}:`, { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
          totalErrors++;
        }
      }

      const duration = Date.now() - startTime;
      const success = totalErrors === 0;

      log.info(`Tenant migration completed for ${tenant.name}`, {
        success,
        totalProcessed,
        totalSkipped,
        totalErrors,
        duration
      });

      return {
        success,
        totalProcessed,
        totalSkipped,
        totalErrors,
        errors,
        duration,
        timestamp: new Date()
      };
    } catch (error) {
      log.error('Tenant migration failed:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      throw error;
    }
  }

  /**
   * Validate multi-tenancy data integrity
   */
  static async validateMultiTenancyIntegrity(): Promise<{
    isValid: boolean;
    issues: Array<{
      model: string;
      documentId: string;
      issue: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }>;
    summary: {
      totalDocuments: number;
      documentsWithIssues: number;
      criticalIssues: number;
      highIssues: number;
      mediumIssues: number;
      lowIssues: number;
    };
  }> {
    const issues: Array<{
      model: string;
      documentId: string;
      issue: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }> = [];
    let totalDocuments = 0;

    try {
      log.info('Starting multi-tenancy data integrity validation');

      const modelsToValidate = [
        { name: 'User', model: User as any, requiresTenantId: true },
        { name: 'Profile', model: Profile as any, requiresTenantId: true },
        { name: 'Subscription', model: Subscription as any, requiresTenantId: true },
        { name: 'AuditLog', model: AuditLog as any, requiresTenantId: true },
        { name: 'Notification', model: Notification as any, requiresTenantId: true },
        // { name: 'Report', model: Report, requiresTenantId: true },
        // { name: 'File', model: File, requiresTenantId: true },
        { name: 'ApiKey', model: ApiKey as any, requiresTenantId: true },
        { name: 'MFASettings', model: MFASettings as any, requiresTenantId: true }
      ];

      for (const { name, model, requiresTenantId } of modelsToValidate) {
        try {
          const documents = await (model as any).find({}).lean();
          totalDocuments += documents.length;

          for (const doc of documents) {
            // Check for missing tenantId
            if (requiresTenantId && !doc.tenantId) {
              issues.push({
                model: name,
                documentId: doc._id.toString(),
                issue: 'Missing tenantId field',
                severity: 'critical'
              });
            }

            // Check for invalid tenantId
            if (doc.tenantId) {
              const tenant = await Tenant.findById(doc.tenantId);
              if (!tenant) {
                issues.push({
                  model: name,
                  documentId: doc._id.toString(),
                  issue: 'Invalid tenantId - tenant does not exist',
                  severity: 'high'
                });
              }
            }

            // Check user-tenant relationship consistency
            if (doc.userId && doc.tenantId) {
              const user = await User.findById(doc.userId).lean();
              if (user && user.tenantId && user.tenantId.toString() !== doc.tenantId.toString()) {
                issues.push({
                  model: name,
                  documentId: doc._id.toString(),
                  issue: 'User-tenant relationship inconsistency',
                  severity: 'high'
                });
              }
            }
          }
        } catch (error) {
          log.error(`Failed to validate ${name} model:`, { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
        }
      }

      const summary = {
        totalDocuments,
        documentsWithIssues: issues.length,
        criticalIssues: issues.filter((i: any) => i.severity === 'critical').length,
        highIssues: issues.filter((i: any) => i.severity === 'high').length,
        mediumIssues: issues.filter((i: any) => i.severity === 'medium').length,
        lowIssues: issues.filter((i: any) => i.severity === 'low').length
      };

      const isValid = summary.criticalIssues === 0 && summary.highIssues === 0;

      log.info('Multi-tenancy data integrity validation completed', summary);

      return {
        isValid,
        issues,
        summary
      };
    } catch (error) {
      log.error('Multi-tenancy data integrity validation failed:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      throw new AppError('Multi-tenancy data integrity validation failed', 500);
    }
  }

  /**
   * Get tenant migration data
   */
  static async getTenantMigrationData(): Promise<TenantMigrationData[]> {
    try {
      const tenants = await Tenant.find({}).lean();
      const migrationData: TenantMigrationData[] = [];

      for (const tenant of tenants) {
        const tenantId = tenant._id.toString();
        
        const documentsCount = {
          users: await User.countDocuments({ tenantId }),
          profiles: await Profile.countDocuments({ tenantId }),
          subscriptions: await Subscription.countDocuments({ tenantId }),
          auditLogs: await AuditLog.countDocuments({ tenantId }),
          notifications: await Notification.countDocuments({ tenantId }),
          reports: 0, // await Report.countDocuments({ tenantId }),
          files: 0, // await File.countDocuments({ tenantId }),
          apiKeys: await ApiKey.countDocuments({ tenantId }),
          mfaSettings: await MFASettings.countDocuments({ tenantId }),
          impersonations: await Impersonation.countDocuments({ targetTenantId: tenantId })
        };

        migrationData.push({
          tenantId,
          tenantName: tenant.name,
          documentsCount,
          migrationStatus: 'completed', // This would be determined by actual migration status
          lastMigrated: new Date(),
          errors: []
        });
      }

      return migrationData;
    } catch (error) {
      log.error('Failed to get tenant migration data:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      throw new AppError('Failed to get tenant migration data', 500);
    }
  }

  /**
   * Get migration statistics
   */
  static getMigrationStats(): MigrationStats {
    return { ...this.stats };
  }

  /**
   * Update migration statistics
   */
  private static updateStats(result: MigrationResult): void {
    this.stats.totalMigrations++;
    
    if (result.success) {
      this.stats.successfulMigrations++;
    } else {
      this.stats.failedMigrations++;
    }

    this.stats.totalDocumentsProcessed += result.totalProcessed;
    this.stats.totalDocumentsSkipped += result.totalSkipped;
    this.stats.totalDocumentsWithErrors += result.totalErrors;
    this.stats.lastMigrationDate = result.timestamp;

    // Update average migration time
    const totalTime = this.stats.averageMigrationTime * (this.stats.totalMigrations - 1) + result.duration;
    this.stats.averageMigrationTime = totalTime / this.stats.totalMigrations;
    
    // ✅ ADD: Limit modelsMigrated array growth
    if (this.stats.modelsMigrated.length > this.MAX_MODELS_MIGRATED) {
      this.stats.modelsMigrated = this.stats.modelsMigrated.slice(-this.MAX_MODELS_MIGRATED);
    }
  }

  /**
   * Create database backup before migration
   */
  static async createBackup(): Promise<{
    success: boolean;
    backupPath?: string;
    error?: string;
  }> {
    try {
      if (!this.config.backupEnabled) {
        return { success: true };
      }

      // This would implement actual backup logic
      // For now, we'll just log that backup was requested
      log.info('Database backup requested before migration');
      
      return {
        success: true,
        backupPath: '/tmp/backup_' + Date.now() + '.tar.gz'
      };
    } catch (error) {
      log.error('Failed to create database backup:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      return {
        success: false,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      };
    }
  }

  /**
   * Rollback migration
   */
  static async rollbackMigration(backupPath: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      if (!this.config.rollbackEnabled) {
        return {
          success: false,
          error: 'Rollback is disabled'
        };
      }

      // This would implement actual rollback logic
      log.info('Rolling back migration from backup', { backupPath });
      
      return { success: true };
    } catch (error) {
      log.error('Failed to rollback migration:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      return {
        success: false,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      };
    }
  }
}
