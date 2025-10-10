// backend/src/routes/securityRoutes.ts
import { Router } from 'express';
import {
  getSecurityStats,
  getSecurityViolations,
  getSecurityConfig,
  clearBlockedIPs,
  generateCSRFToken,
  securityHealthCheck,
  reportSecurityIncident,
  getSecurityRecommendations,
  performSecurityAudit
} from '../controllers/securityController';
import { authenticate, authorize } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolution';
import { rowLevelSecurity } from '../middleware/rowLevelSecurity';
import { auditLogging } from '../middleware/auditLogging';

const router = Router();

// All routes require authentication and tenant context
router.use(resolveTenant, rowLevelSecurity, authenticate);

// Public security endpoints
router.get('/health', securityHealthCheck);
router.get('/csrf-token', generateCSRFToken);

// Security Management Routes (Super Admin Only)
router.get('/stats', authorize('super_admin'), getSecurityStats);
router.get('/violations', authorize('super_admin'), getSecurityViolations);
router.get('/config', authorize('super_admin'), getSecurityConfig);
router.post('/clear-blocked-ips', authorize('super_admin'), clearBlockedIPs);
router.post('/report-incident', authorize('super_admin'), reportSecurityIncident);
router.get('/recommendations', authorize('super_admin'), getSecurityRecommendations);
router.post('/audit', authorize('super_admin'), performSecurityAudit);

// Apply audit logging middleware to all routes
router.use(auditLogging({
  resource: 'security',
  category: 'security',
  severity: 'high'
}));

export default router;
