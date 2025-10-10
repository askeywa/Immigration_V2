// backend/src/routes/backupRoutes.ts
import { Router } from 'express';
import BackupController from '../controllers/backupController';
import { authenticateToken } from '../middleware/auth';
import { authorize } from '../middleware/authorization';
import { rateLimitMiddleware } from '../middleware/rateLimiting';

const router = Router();
const backupController = new BackupController();

// Apply authentication and rate limiting to all routes
router.use(authenticateToken);
router.use(rateLimitMiddleware);

/**
 * @route POST /api/backups
 * @desc Create a new backup
 * @access Private (Tenant Admin, Super Admin)
 */
router.post('/',
  authorize(['tenant_admin', 'super_admin']),
  backupController.createBackup
);

/**
 * @route GET /api/backups
 * @desc Get all backups with filters
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/',
  authorize(['tenant_admin', 'super_admin']),
  backupController.getBackups
);

/**
 * @route GET /api/backups/statistics
 * @desc Get backup statistics
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/statistics',
  authorize(['tenant_admin', 'super_admin']),
  backupController.getBackupStatistics
);

/**
 * @route GET /api/backups/active
 * @desc Get active backups
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/active',
  authorize(['tenant_admin', 'super_admin']),
  backupController.getActiveBackups
);

/**
 * @route GET /api/backups/scheduled
 * @desc Get scheduled backups
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/scheduled',
  authorize(['tenant_admin', 'super_admin']),
  backupController.getScheduledBackups
);

/**
 * @route GET /api/backups/health
 * @desc Get backup service health status
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/health',
  authorize(['tenant_admin', 'super_admin']),
  backupController.getBackupHealth
);

/**
 * @route POST /api/backups/cleanup
 * @desc Cleanup old backups (super admin only)
 * @access Private (Super Admin)
 */
router.post('/cleanup',
  authorize(['super_admin']),
  backupController.cleanupOldBackups
);

/**
 * @route GET /api/backups/:id
 * @desc Get backup by ID
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/:id',
  authorize(['tenant_admin', 'super_admin']),
  backupController.getBackup
);

/**
 * @route GET /api/backups/:id/progress
 * @desc Get backup progress
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/:id/progress',
  authorize(['tenant_admin', 'super_admin']),
  backupController.getBackupProgress
);

/**
 * @route PUT /api/backups/:id/schedule
 * @desc Update backup schedule
 * @access Private (Tenant Admin, Super Admin)
 */
router.put('/:id/schedule',
  authorize(['tenant_admin', 'super_admin']),
  backupController.updateBackupSchedule
);

/**
 * @route POST /api/backups/:id/verify
 * @desc Verify backup integrity
 * @access Private (Tenant Admin, Super Admin)
 */
router.post('/:id/verify',
  authorize(['tenant_admin', 'super_admin']),
  backupController.verifyBackup
);

/**
 * @route DELETE /api/backups/:id
 * @desc Delete backup
 * @access Private (Tenant Admin, Super Admin)
 */
router.delete('/:id',
  authorize(['tenant_admin', 'super_admin']),
  backupController.deleteBackup
);

/**
 * @route POST /api/backups/:id/cancel
 * @desc Cancel running backup
 * @access Private (Tenant Admin, Super Admin)
 */
router.post('/:id/cancel',
  authorize(['tenant_admin', 'super_admin']),
  backupController.cancelBackup
);

/**
 * @route POST /api/backups/:id/restore
 * @desc Restore backup (super admin only)
 * @access Private (Super Admin)
 */
router.post('/:id/restore',
  authorize(['super_admin']),
  backupController.restoreBackup
);

export default router;
