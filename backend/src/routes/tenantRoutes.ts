// backend/src/routes/tenantRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorization';
import { resolveTenant } from '../middleware/tenantResolution';
import { rowLevelSecurity } from '../middleware/rowLevelSecurity';
import { asyncHandler } from '../middleware/errorHandler';
import { TenantController } from '../controllers/tenantController';
import { tenantCacheMiddleware, userCacheMiddleware } from '../middleware/cacheMiddleware';

const router = Router();

// Tenant resolution endpoints (public for domain resolution) - must be before authentication
router.get('/resolve/subdomain/:subdomain', asyncHandler(TenantController.resolveBySubdomain));
router.get('/resolve/domain/:domain', asyncHandler(TenantController.resolveByDomain));

// Apply tenant resolution and authentication to remaining routes
router.use(resolveTenant, rowLevelSecurity, authenticate);

// Get user's accessible tenants
router.get('/user-tenants', asyncHandler(TenantController.getUserTenants));

// Get current tenant info
router.get('/current', asyncHandler(TenantController.getCurrentTenant));

// Super admin routes
router.get('/', authorize(['super_admin']), asyncHandler(TenantController.getAllTenants));
router.get('/:id', authorize(['super_admin', 'admin']), asyncHandler(TenantController.getTenantById));
router.post('/', authorize(['super_admin']), asyncHandler(TenantController.createTenant));
router.put('/:id', authorize(['super_admin', 'admin']), asyncHandler(TenantController.updateTenant));
router.delete('/:id', authorize(['super_admin']), asyncHandler(TenantController.deleteTenant));

// Tenant admin routes
router.get('/:id/settings', authorize(['super_admin', 'admin']), asyncHandler(TenantController.getTenantSettings));
router.put('/:id/settings', authorize(['super_admin', 'admin']), asyncHandler(TenantController.updateTenantSettings));
router.get('/:id/users', authorize(['super_admin', 'admin']), asyncHandler(TenantController.getTenantUsers));
router.get('/:id/analytics', authorize(['super_admin', 'admin']), asyncHandler(TenantController.getTenantAnalytics));

// Simplified tenant routes for frontend with caching
router.get('/settings', authorize(['admin']), tenantCacheMiddleware(5 * 60 * 1000), asyncHandler(TenantController.getTenantSettings));
router.put('/settings', authorize(['admin']), asyncHandler(TenantController.updateTenantSettings));
router.get('/users', authorize(['admin']), tenantCacheMiddleware(3 * 60 * 1000), asyncHandler(TenantController.getTenantUsers));
router.get('/analytics', authorize(['admin']), tenantCacheMiddleware(2 * 60 * 1000), asyncHandler(TenantController.getTenantAnalytics));
router.get('/branding', authorize(['admin']), tenantCacheMiddleware(10 * 60 * 1000), asyncHandler(TenantController.getTenantBranding));
router.put('/branding', authorize(['admin']), asyncHandler(TenantController.updateTenantBranding));

export default router;