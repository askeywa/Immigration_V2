// backend/src/routes/enhancedAuditRoutes.ts
import { Router } from 'express';
import {
  getAuditLogs,
  getAuditAnalytics,
  getDashboardStats,
  exportAuditLogs,
  getAuditHealth,
  cleanupAuditLogs,
  createAuditLog,
  getAuditLogById
} from '../controllers/enhancedAuditController';
import { authenticate, authorize } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolution';
import { rowLevelSecurity } from '../middleware/rowLevelSecurity';
import { auditLogging, securityAudit, userAudit, tenantAudit, systemAudit } from '../middleware/auditLogging';

const router = Router();

// All routes require authentication and tenant context
router.use(resolveTenant, rowLevelSecurity, authenticate);

// Enhanced Audit Log Management Routes
router.get('/', authorize('admin', 'super_admin'), getAuditLogs);
router.get('/analytics', authorize('admin', 'super_admin'), getAuditAnalytics);
router.get('/dashboard-stats', authorize('admin', 'super_admin'), getDashboardStats);
router.get('/export', authorize('admin', 'super_admin'), exportAuditLogs);
router.get('/health', authorize('super_admin'), getAuditHealth);

// Audit Log Operations
router.get('/:logId', authorize('admin', 'super_admin'), getAuditLogById);
router.post('/', authorize('admin', 'super_admin'), createAuditLog);

// Maintenance Operations (Admin only)
router.delete('/cleanup', authorize('admin', 'super_admin'), cleanupAuditLogs);

// Apply audit logging middleware to all routes
router.use(auditLogging({
  resource: 'audit_log',
  category: 'system',
  severity: 'medium'
}));

export default router;
