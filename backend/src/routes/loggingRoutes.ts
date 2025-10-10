// backend/src/routes/loggingRoutes.ts
import { Router } from 'express';
import LoggingController from '../controllers/loggingController';
import { authenticateToken } from '../middleware/auth';
import { authorize } from '../middleware/authorization';
import { rateLimitMiddleware } from '../middleware/rateLimiting';

const router = Router();
const loggingController = new LoggingController();

// Apply authentication and rate limiting to all routes
router.use(authenticateToken);
router.use(rateLimitMiddleware);

/**
 * @route GET /api/logging/logs
 * @desc Get logs with filters
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/logs',
  authorize(['tenant_admin', 'super_admin']),
  loggingController.getLogs
);

/**
 * @route GET /api/logging/statistics
 * @desc Get log statistics
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/statistics',
  authorize(['tenant_admin', 'super_admin']),
  loggingController.getLogStatistics
);

/**
 * @route GET /api/logging/categories
 * @desc Get logs aggregated by category
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/categories',
  authorize(['tenant_admin', 'super_admin']),
  loggingController.getLogsByCategory
);

/**
 * @route GET /api/logging/timeseries
 * @desc Get logs aggregated by time (hourly)
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/timeseries',
  authorize(['tenant_admin', 'super_admin']),
  loggingController.getLogsByHour
);

/**
 * @route GET /api/logging/search
 * @desc Search logs by text
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/search',
  authorize(['tenant_admin', 'super_admin']),
  loggingController.searchLogs
);

/**
 * @route GET /api/logging/errors
 * @desc Get recent errors
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/errors',
  authorize(['tenant_admin', 'super_admin']),
  loggingController.getRecentErrors
);

/**
 * @route GET /api/logging/critical
 * @desc Get critical logs
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/critical',
  authorize(['tenant_admin', 'super_admin']),
  loggingController.getCriticalLogs
);

/**
 * @route GET /api/logging/export
 * @desc Export logs to file
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/export',
  authorize(['tenant_admin', 'super_admin']),
  loggingController.exportLogs
);

/**
 * @route POST /api/logging/cleanup
 * @desc Cleanup old logs (super admin only)
 * @access Private (Super Admin)
 */
router.post('/cleanup',
  authorize(['super_admin']),
  loggingController.cleanupOldLogs
);

/**
 * @route GET /api/logging/health
 * @desc Get logging service health status
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/health',
  authorize(['tenant_admin', 'super_admin']),
  loggingController.getLoggingHealth
);

/**
 * @route POST /api/logging/entries
 * @desc Create a log entry (for testing or manual logging)
 * @access Private (Tenant Admin, Super Admin)
 */
router.post('/entries',
  authorize(['tenant_admin', 'super_admin']),
  loggingController.createLogEntry
);

/**
 * @route GET /api/logging/entries/:id
 * @desc Get log entry by ID
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/entries/:id',
  authorize(['tenant_admin', 'super_admin']),
  loggingController.getLogEntry
);

export default router;
