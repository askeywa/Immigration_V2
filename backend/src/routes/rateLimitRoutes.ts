// backend/src/routes/rateLimitRoutes.ts
import { Router } from 'express';
import {
  getRateLimitStats,
  getRateLimitRules,
  getRateLimitRule,
  createRateLimitRule,
  updateRateLimitRule,
  deleteRateLimitRule,
  getRateLimitViolations,
  clearRateLimit,
  getRateLimitStatus
} from '../controllers/rateLimitController';
import { authenticate, authorize } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolution';
import { rowLevelSecurity } from '../middleware/rowLevelSecurity';
import { auditLogging } from '../middleware/auditLogging';

const router = Router();

// All routes require authentication and tenant context
router.use(resolveTenant, rowLevelSecurity, authenticate);

// Rate Limiting Management Routes (Super Admin Only)
router.get('/stats', authorize('super_admin'), getRateLimitStats);
router.get('/rules', authorize('super_admin'), getRateLimitRules);
router.get('/rules/:ruleId', authorize('super_admin'), getRateLimitRule);
router.post('/rules', authorize('super_admin'), createRateLimitRule);
router.put('/rules/:ruleId', authorize('super_admin'), updateRateLimitRule);
router.delete('/rules/:ruleId', authorize('super_admin'), deleteRateLimitRule);

// Rate Limit Monitoring Routes (Super Admin Only)
router.get('/violations', authorize('super_admin'), getRateLimitViolations);
router.post('/clear', authorize('super_admin'), clearRateLimit);
router.get('/status/:key', authorize('super_admin'), getRateLimitStatus);

// Apply audit logging middleware to all routes
router.use(auditLogging({
  resource: 'rate_limit',
  category: 'system',
  severity: 'medium'
}));

export default router;
