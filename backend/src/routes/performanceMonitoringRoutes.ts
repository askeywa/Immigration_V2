// backend/src/routes/performanceMonitoringRoutes.ts
import { Router } from 'express';
import { PerformanceMonitoringController } from '../controllers/performanceMonitoringController';
import { resolveTenant } from '../middleware/tenantResolution';
import { rowLevelSecurity } from '../middleware/rowLevelSecurity';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorization';

const router = Router();

// Apply middleware to all routes
router.use(resolveTenant, rowLevelSecurity, authenticate);

// Public routes (require authentication)
router.get('/metrics', PerformanceMonitoringController.getMetrics);
router.get('/health', PerformanceMonitoringController.getHealthMetrics);
router.get('/summary', PerformanceMonitoringController.getSummary);
router.get('/alerts', PerformanceMonitoringController.getAlerts);
router.get('/tenant/:tenantId?', PerformanceMonitoringController.getTenantMetrics);

// Super admin only routes
router.get('/tenants', 
  authorize('super_admin'), 
  PerformanceMonitoringController.getAllTenantMetrics
);

router.put('/alerts/:alertId/resolve', 
  authorize('super_admin'), 
  PerformanceMonitoringController.resolveAlert
);

router.delete('/metrics', 
  authorize('super_admin'), 
  PerformanceMonitoringController.clearMetrics
);

export default router;
