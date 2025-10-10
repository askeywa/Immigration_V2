// backend/src/controllers/databaseMigrationController.ts
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { TenantRequest } from '../middleware/tenantResolution';
import { DatabaseMigrationService } from '../services/databaseMigrationService';
import { AppError } from '../utils/errors';

// Start multi-tenancy migration (Super Admin only)
export const startMigration = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can start migration
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can start database migration'
      });
    }

    const { dryRun = false, backup = true, validate = true } = req.body;

    // Initialize migration service
    await DatabaseMigrationService.initialize();

    // Create backup if requested
    let backupResult = { success: true };
    if (backup) {
      backupResult = await DatabaseMigrationService.createBackup();
      if (!backupResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to create backup',
          error: (backupResult as any).error
        });
      }
    }

    // Perform migration
    const migrationResult = await DatabaseMigrationService.migrateAllModels(dryRun);

    res.status(201).json({
      success: true,
      message: 'Database migration completed',
      data: {
        migration: migrationResult,
        backup: backupResult,
        dryRun
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to start database migration'
    });
  }
});

// Migrate specific tenant data (Super Admin only)
export const migrateTenantData = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const { tenantId } = req.params;
    const { dryRun = false } = req.body;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can migrate tenant data
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can migrate tenant data'
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    // Initialize migration service
    await DatabaseMigrationService.initialize();

    // Perform tenant migration
    const migrationResult = await DatabaseMigrationService.migrateTenantData(tenantId, dryRun);

    res.json({
      success: true,
      message: `Tenant migration completed for tenant ${tenantId}`,
      data: migrationResult
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to migrate tenant data'
    });
  }
});

// Validate multi-tenancy data integrity (Super Admin only)
export const validateDataIntegrity = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can validate data integrity
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can validate data integrity'
      });
    }

    // Initialize migration service
    await DatabaseMigrationService.initialize();

    // Perform validation
    const validationResult = await DatabaseMigrationService.validateMultiTenancyIntegrity();

    res.json({
      success: true,
      data: validationResult
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to validate data integrity'
    });
  }
});

// Get tenant migration data (Super Admin only)
export const getTenantMigrationData = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view tenant migration data
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view tenant migration data'
      });
    }

    // Initialize migration service
    await DatabaseMigrationService.initialize();

    // Get tenant migration data
    const tenantData = await DatabaseMigrationService.getTenantMigrationData();

    res.json({
      success: true,
      data: tenantData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get tenant migration data'
    });
  }
});

// Get migration statistics (Super Admin only)
export const getMigrationStats = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view migration statistics
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view migration statistics'
      });
    }

    // Initialize migration service
    await DatabaseMigrationService.initialize();

    // Get migration statistics
    const stats = DatabaseMigrationService.getMigrationStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get migration statistics'
    });
  }
});

// Get migration configuration (Super Admin only)
export const getMigrationConfig = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view migration configuration
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view migration configuration'
      });
    }

    // Initialize migration service
    await DatabaseMigrationService.initialize();

    // Get migration configuration
    const config = DatabaseMigrationService.getConfig();

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get migration configuration'
    });
  }
});

// Create database backup (Super Admin only)
export const createBackup = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can create database backup
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can create database backup'
      });
    }

    // Initialize migration service
    await DatabaseMigrationService.initialize();

    // Create backup
    const backupResult = await DatabaseMigrationService.createBackup();

    if (!backupResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create database backup',
        error: backupResult.error
      });
    }

    res.json({
      success: true,
      message: 'Database backup created successfully',
      data: {
        backupPath: backupResult.backupPath
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to create database backup'
    });
  }
});

// Rollback migration (Super Admin only)
export const rollbackMigration = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const { backupPath } = req.body;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can rollback migration
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can rollback migration'
      });
    }

    if (!backupPath) {
      return res.status(400).json({
        success: false,
        message: 'Backup path is required for rollback'
      });
    }

    // Initialize migration service
    await DatabaseMigrationService.initialize();

    // Perform rollback
    const rollbackResult = await DatabaseMigrationService.rollbackMigration(backupPath);

    if (!rollbackResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to rollback migration',
        error: rollbackResult.error
      });
    }

    res.json({
      success: true,
      message: 'Migration rollback completed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to rollback migration'
    });
  }
});

// Get migration health status (Super Admin only)
export const getMigrationHealth = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view migration health
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view migration health'
      });
    }

    // Initialize migration service
    await DatabaseMigrationService.initialize();

    // Get validation result for health check
    const validationResult = await DatabaseMigrationService.validateMultiTenancyIntegrity();
    const stats = DatabaseMigrationService.getMigrationStats();
    const config = DatabaseMigrationService.getConfig();

    const health = {
      status: validationResult.isValid ? 'healthy' : 'unhealthy',
      dataIntegrity: {
        isValid: validationResult.isValid,
        issues: validationResult.summary
      },
      migration: {
        totalMigrations: stats.totalMigrations,
        successRate: stats.totalMigrations > 0 ? (stats.successfulMigrations / stats.totalMigrations) * 100 : 100,
        lastMigration: stats.lastMigrationDate,
        averageTime: stats.averageMigrationTime
      },
      configuration: {
        backupEnabled: config.backupEnabled,
        validationEnabled: config.validationEnabled,
        rollbackEnabled: config.rollbackEnabled,
        batchSize: config.batchSize
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
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get migration health'
    });
  }
});
