// backend/src/routes/tenantResolutionRoutes.ts
import { Router } from 'express';
import {
  getTenantResolutionStats,
  getTenantResolutionConfig,
  clearTenantResolutionCache,
  cleanupTenantResolutionCache,
  validateDomainFormat,
  checkDomainAvailability,
  generateTenantSubdomain,
  testTenantResolution,
  getCurrentTenantContext,
  tenantResolutionHealthCheck,
  getTenantResolutionRecommendations
} from '../controllers/tenantResolutionController';
import { authenticate, authorize } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolution';
import { rowLevelSecurity } from '../middleware/rowLevelSecurity';
import { auditLogging } from '../middleware/auditLogging';

const router = Router();

// All routes require authentication and tenant context
router.use(resolveTenant, rowLevelSecurity, authenticate);

// Public tenant resolution endpoints
router.get('/context', getCurrentTenantContext);
router.get('/health', tenantResolutionHealthCheck);
router.post('/validate-domain', validateDomainFormat);
router.post('/check-availability', checkDomainAvailability);
router.post('/generate-subdomain', generateTenantSubdomain);

// Tenant Resolution Management Routes (Super Admin Only)
router.get('/stats', authorize('super_admin'), getTenantResolutionStats);
router.get('/config', authorize('super_admin'), getTenantResolutionConfig);
router.post('/clear-cache', authorize('super_admin'), clearTenantResolutionCache);
router.post('/cleanup-cache', authorize('super_admin'), cleanupTenantResolutionCache);
router.post('/test-resolution', authorize('super_admin'), testTenantResolution);
router.get('/recommendations', authorize('super_admin'), getTenantResolutionRecommendations);

// Apply audit logging middleware to all routes
router.use(auditLogging({
  resource: 'tenant_resolution',
  category: 'system',
  severity: 'medium'
}));

export default router;
