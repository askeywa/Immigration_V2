// backend/src/routes/impersonationRoutes.ts
import { Router } from 'express';
import {
  startImpersonation,
  endImpersonation,
  getActiveImpersonations,
  getImpersonationHistory,
  getImpersonationStats,
  getImpersonationConfig,
  endAllActiveImpersonations,
  validateImpersonationToken,
  getCurrentImpersonationContext,
  cleanupExpiredSessions
} from '../controllers/impersonationController';
import { authenticate, authorize } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolution';
import { rowLevelSecurity } from '../middleware/rowLevelSecurity';
import { auditLogging } from '../middleware/auditLogging';

const router = Router();

// All routes require authentication and tenant context
router.use(resolveTenant, rowLevelSecurity, authenticate);

// Public impersonation endpoints
router.get('/context', getCurrentImpersonationContext);
router.post('/validate-token', validateImpersonationToken);

// Impersonation Management Routes (Super Admin Only)
router.post('/start', authorize('super_admin'), startImpersonation);
router.post('/end', authorize('super_admin'), endImpersonation);
router.get('/active', authorize('super_admin'), getActiveImpersonations);
router.get('/history', authorize('super_admin'), getImpersonationHistory);
router.get('/stats', authorize('super_admin'), getImpersonationStats);
router.get('/config', authorize('super_admin'), getImpersonationConfig);
router.post('/end-all', authorize('super_admin'), endAllActiveImpersonations);
router.post('/cleanup', authorize('super_admin'), cleanupExpiredSessions);

// Apply audit logging middleware to all routes
router.use(auditLogging({
  resource: 'impersonation',
  category: 'security',
  severity: 'high'
}));

export default router;
