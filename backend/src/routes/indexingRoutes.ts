// backend/src/routes/indexingRoutes.ts
import { Router } from 'express';
import {
  createIndexes,
  getDatabasePerformance,
  getIndexPerformance,
  analyzeQuery,
  optimizeIndexes,
  monitorIndexUsage,
  dropIndexes,
  getIndexDefinitions,
  createTenantIndexes
} from '../controllers/indexingController';
import { authenticate, authorize } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolution';
import { rowLevelSecurity } from '../middleware/rowLevelSecurity';

const router = Router();

// All routes require super admin access
router.use(resolveTenant, rowLevelSecurity, authenticate, authorize('super_admin'));

// Database Index Management Routes
router.post('/create', createIndexes);
router.get('/performance', getDatabasePerformance);
router.get('/index-performance', getIndexPerformance);
router.get('/definitions', getIndexDefinitions);

// Query Analysis Routes
router.post('/analyze-query', analyzeQuery);

// Index Optimization Routes
router.post('/optimize', optimizeIndexes);
router.get('/monitor', monitorIndexUsage);

// Tenant-specific Routes
router.post('/tenant/:tenantId', createTenantIndexes);

// Dangerous Operations (require extra confirmation)
router.delete('/drop', dropIndexes);

export default router;
