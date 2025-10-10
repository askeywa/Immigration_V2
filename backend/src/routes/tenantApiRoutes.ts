import { Router } from 'express';
import { TenantApiController } from '../controllers/tenantApiController';
import { resolveTenant } from '../middleware/tenantResolution';
import { authRateLimit } from '../middleware/rateLimiting';
import { validateLoginMiddleware, validateRegister, validateLoginDebug } from '../middleware/validation';

const router = Router();

/**
 * Tenant-specific API routes
 * These routes are designed to be used by tenant websites
 * and can be shared with tenant development teams
 */

// Tenant authentication routes
router.post('/tenant/auth/login', 
  authRateLimit,
  resolveTenant,
  ...validateLoginMiddleware,  // Use the new combined middleware
  TenantApiController.tenantLogin
);

router.post('/tenant/auth/register',
  authRateLimit,
  resolveTenant,
  ...validateRegister,
  TenantApiController.tenantRegister
);

// Tenant information routes
router.get('/tenant/info',
  resolveTenant,
  TenantApiController.getTenantInfo
);

// Tenant settings routes
router.get('/tenant/settings',
  resolveTenant,
  TenantApiController.getTenantSettings
);

router.put('/tenant/settings',
  resolveTenant,
  TenantApiController.updateTenantSettings
);

// Tenant branding routes
router.get('/tenant/branding',
  resolveTenant,
  TenantApiController.getTenantBranding
);

router.post('/tenant/branding',
  resolveTenant,
  TenantApiController.updateTenantBranding
);

// Widget configuration for tenant integration
router.get('/tenant/widget/config',
  resolveTenant,
  TenantApiController.getWidgetConfig
);

// Tenant dashboard routes
router.get('/tenant/dashboard/stats',
  resolveTenant,
  TenantApiController.getTenantStats
);

router.get('/tenant/dashboard/activity',
  resolveTenant,
  TenantApiController.getTenantActivity
);

// Tenant analytics routes
router.get('/tenant/analytics',
  resolveTenant,
  TenantApiController.getTenantAnalytics
);

// Tenant reports routes
router.get('/tenant/reports',
  resolveTenant,
  TenantApiController.getTenantReports
);

// Tenant user management routes
router.get('/tenant/users',
  resolveTenant,
  TenantApiController.getTenantUsers
);

router.get('/tenant/users/stats',
  resolveTenant,
  TenantApiController.getUserStats
);

router.get('/tenant/users/:userId/activity',
  resolveTenant,
  TenantApiController.getUserActivity
);

router.post('/tenant/users',
  resolveTenant,
  TenantApiController.createTenantUser
);

router.put('/tenant/users/bulk',
  resolveTenant,
  TenantApiController.bulkUpdateUsers
);

// Tenant document management routes
router.get('/tenant/documents',
  resolveTenant,
  TenantApiController.getTenantDocuments
);

router.get('/tenant/documents/stats',
  resolveTenant,
  TenantApiController.getDocumentStats
);

router.get('/tenant/documents/analytics',
  resolveTenant,
  TenantApiController.getDocumentAnalytics
);

router.put('/tenant/documents/:documentId/status',
  resolveTenant,
  TenantApiController.updateDocumentStatus
);

router.put('/tenant/documents/bulk',
  resolveTenant,
  TenantApiController.bulkUpdateDocuments
);

// Tenant system monitoring routes
router.get('/tenant/system/health',
  resolveTenant,
  TenantApiController.getSystemHealth
);

router.get('/tenant/system/performance',
  resolveTenant,
  TenantApiController.getSystemPerformance
);

router.get('/tenant/system/alerts',
  resolveTenant,
  TenantApiController.getSystemAlerts
);

router.get('/tenant/system/usage',
  resolveTenant,
  TenantApiController.getSystemUsage
);

export default router;
