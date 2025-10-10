// backend/src/routes/requestLoggingRoutes.ts
import { Router } from 'express';
import { RequestLoggingController } from '../controllers/requestLoggingController';
import { resolveTenant } from '../middleware/tenantResolution';
import { rowLevelSecurity } from '../middleware/rowLevelSecurity';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorization';

const router = Router();

// Apply middleware to all routes
router.use(resolveTenant, rowLevelSecurity, authenticate);

// Public routes (require authentication)
router.get('/metrics', RequestLoggingController.getMetrics);
router.get('/stats', RequestLoggingController.getStats);
router.get('/health', RequestLoggingController.getHealth);

// Super admin only routes
router.get('/config', 
  authorize('super_admin'), 
  RequestLoggingController.getConfig
);

router.delete('/metrics', 
  authorize('super_admin'), 
  RequestLoggingController.clearMetrics
);

export default router;
