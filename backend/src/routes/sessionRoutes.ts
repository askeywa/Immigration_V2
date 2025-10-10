// backend/src/routes/sessionRoutes.ts
import { Router } from 'express';
import {
  getCurrentSession,
  getSessionStats,
  getSessionViolations,
  destroyCurrentSession,
  destroySession,
  refreshSession,
  validateSession,
  cleanupExpiredSessions,
  getUserSessions,
  updateSessionMetadata,
  checkSessionHealth
} from '../controllers/sessionController';
import { authenticate, authorize } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolution';
import { rowLevelSecurity } from '../middleware/rowLevelSecurity';
import { auditLogging } from '../middleware/auditLogging';

const router = Router();

// All routes require authentication and tenant context
router.use(resolveTenant, rowLevelSecurity, authenticate);

// Session Management Routes
router.get('/current', getCurrentSession);
router.get('/validate', validateSession);
router.get('/health', checkSessionHealth);
router.get('/user-sessions', getUserSessions);
router.post('/refresh', refreshSession);
router.post('/destroy', destroyCurrentSession);
router.put('/metadata', updateSessionMetadata);

// Session Administration Routes (Super Admin Only)
router.get('/stats', authorize('super_admin'), getSessionStats);
router.get('/violations', authorize('super_admin'), getSessionViolations);
router.delete('/cleanup', authorize('super_admin'), cleanupExpiredSessions);
router.delete('/:sessionId', authorize('super_admin'), destroySession);

// Apply audit logging middleware to all routes
router.use(auditLogging({
  resource: 'session',
  category: 'security',
  severity: 'medium'
}));

export default router;
