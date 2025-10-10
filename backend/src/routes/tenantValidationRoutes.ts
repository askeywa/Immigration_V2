// backend/src/routes/tenantValidationRoutes.ts
import { Router } from 'express';
import { TenantValidationController } from '../controllers/tenantValidationController';
import { resolveTenant } from '../middleware/tenantResolution';
import { rowLevelSecurity } from '../middleware/rowLevelSecurity';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorization';

const router = Router();

// Apply middleware to all routes
router.use(resolveTenant, rowLevelSecurity, authenticate);

// Public routes (require authentication but not specific authorization)
router.get('/health', TenantValidationController.getHealthStatus);

// Tenant-specific routes
router.post('/validate', TenantValidationController.validateTenant);
router.post('/limits', TenantValidationController.validateResourceLimits);

// Super admin only routes
router.get('/config', 
  authorize(['super_admin']), 
  TenantValidationController.getConfig
);

router.put('/config', 
  authorize(['super_admin']), 
  TenantValidationController.updateConfig
);

router.delete('/cache', 
  authorize(['super_admin']), 
  TenantValidationController.clearCache
);

export default router;
