// backend/src/routes/dataIsolationRoutes.ts
import { Router } from 'express';
import {
  getIsolationStats,
  getIsolationViolations,
  getIsolationConfig,
  clearIsolationViolations,
  isolationHealthCheck,
  testTenantIsolation,
  validateTenantAccess,
  getIsolationRecommendations,
  performIsolationAudit
} from '../controllers/dataIsolationController';
import { authenticate, authorize } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolution';
import { rowLevelSecurity } from '../middleware/rowLevelSecurity';
import { auditLogging } from '../middleware/auditLogging';

const router = Router();

// All routes require authentication and tenant context
router.use(resolveTenant, rowLevelSecurity, authenticate);

// Public isolation endpoints
router.get('/health', isolationHealthCheck);

// Data Isolation Management Routes (Super Admin Only)
router.get('/stats', authorize('super_admin'), getIsolationStats);
router.get('/violations', authorize('super_admin'), getIsolationViolations);
router.get('/config', authorize('super_admin'), getIsolationConfig);
router.post('/clear-violations', authorize('super_admin'), clearIsolationViolations);
router.post('/test-isolation', authorize('super_admin'), testTenantIsolation);
router.post('/validate-access', authorize('super_admin'), validateTenantAccess);
router.get('/recommendations', authorize('super_admin'), getIsolationRecommendations);
router.post('/audit', authorize('super_admin'), performIsolationAudit);

// Apply audit logging middleware to all routes
router.use(auditLogging({
  resource: 'data_isolation',
  category: 'security',
  severity: 'high'
}));

export default router;
