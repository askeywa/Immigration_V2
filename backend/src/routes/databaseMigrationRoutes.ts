// backend/src/routes/databaseMigrationRoutes.ts
import { Router } from 'express';
import {
  startMigration,
  migrateTenantData,
  validateDataIntegrity,
  getTenantMigrationData,
  getMigrationStats,
  getMigrationConfig,
  createBackup,
  rollbackMigration,
  getMigrationHealth
} from '../controllers/databaseMigrationController';
import { authenticate, authorize } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolution';
import { rowLevelSecurity } from '../middleware/rowLevelSecurity';
import { auditLogging } from '../middleware/auditLogging';

const router = Router();

// All routes require authentication and tenant context
router.use(resolveTenant, rowLevelSecurity, authenticate);

// Database Migration Management Routes (Super Admin Only)
router.post('/start', authorize('super_admin'), startMigration);
router.post('/tenant/:tenantId', authorize('super_admin'), migrateTenantData);
router.get('/validate', authorize('super_admin'), validateDataIntegrity);
router.get('/tenant-data', authorize('super_admin'), getTenantMigrationData);
router.get('/stats', authorize('super_admin'), getMigrationStats);
router.get('/config', authorize('super_admin'), getMigrationConfig);
router.post('/backup', authorize('super_admin'), createBackup);
router.post('/rollback', authorize('super_admin'), rollbackMigration);
router.get('/health', authorize('super_admin'), getMigrationHealth);

// Apply audit logging middleware to all routes
router.use(auditLogging({
  resource: 'database_migration',
  category: 'system',
  severity: 'high'
}));

export default router;
