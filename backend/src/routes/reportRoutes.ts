// backend/src/routes/reportRoutes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  generateUserReport,
  generateTenantReport,
  generateSubscriptionReport,
  generateProfileReport,
  generateAuditLogReport,
  generateNotificationReport,
  generateAnalyticsReport,
  generateComprehensiveReport,
  exportReport
} from '../controllers/reportController';

const router = Router();

// All routes require authentication and super admin access
router.use(authenticate);
router.use(authorize('super_admin'));

// Individual report endpoints
router.get('/users', generateUserReport);
router.get('/tenants', generateTenantReport);
router.get('/subscriptions', generateSubscriptionReport);
router.get('/profiles', generateProfileReport);
router.get('/audit-logs', generateAuditLogReport);
router.get('/notifications', generateNotificationReport);
router.get('/analytics', generateAnalyticsReport);
router.get('/comprehensive', generateComprehensiveReport);

// Export endpoint
router.post('/export', exportReport);

export default router;
