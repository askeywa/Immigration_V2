// backend/src/routes/auditLogRoutes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getAuditLogs,
  getAuditLogStats,
  getRecentActivity,
  getSecurityEvents,
  getUserActivity,
  getTenantActivity,
  cleanupOldLogs
} from '../controllers/auditLogController';

const router = Router();

// All routes require authentication and super admin authorization
router.use(authenticate);
router.use(authorize('super_admin'));

// Audit log management routes
router.get('/', getAuditLogs);
router.get('/stats', getAuditLogStats);
router.get('/recent', getRecentActivity);
router.get('/security', getSecurityEvents);
router.get('/user/:userId', getUserActivity);
router.get('/tenant/:tenantId', getTenantActivity);
router.post('/cleanup', cleanupOldLogs);

export default router;
