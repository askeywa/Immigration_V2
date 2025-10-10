// backend/src/routes/subdomainProvisioningRoutes.ts
import { Router } from 'express';
import SubdomainProvisioningController from '../controllers/subdomainProvisioningController';
import { authenticateToken } from '../middleware/auth';
import { authorize } from '../middleware/authorization';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';

const router = Router();
const subdomainController = new SubdomainProvisioningController();

// Subdomain validation schemas
const subdomainCreateSchema = [
  body('subdomain')
    .isLength({ min: 3, max: 63 })
    .matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)
    .withMessage('Invalid subdomain format. Must contain only lowercase letters, numbers, and hyphens'),
  body('type')
    .isIn(['tenant', 'admin', 'api', 'custom'])
    .withMessage('Invalid subdomain type'),
  body('isPrimary')
    .optional()
    .isBoolean()
    .withMessage('isPrimary must be a boolean'),
  body('isCustomDomain')
    .optional()
    .isBoolean()
    .withMessage('isCustomDomain must be a boolean'),
  body('customDomain')
    .optional()
    .isLength({ min: 1, max: 253 })
    .matches(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/)
    .withMessage('Invalid custom domain format'),
  body('configuration.rateLimits.requestsPerMinute')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Rate limit requests per minute must be between 1 and 10000'),
  body('configuration.rateLimits.burstSize')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Rate limit burst size must be between 1 and 1000'),
  body('configuration.caching.enabled')
    .optional()
    .isBoolean()
    .withMessage('Caching enabled must be a boolean'),
  body('configuration.caching.ttl')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Cache TTL must be a non-negative integer'),
  body('configuration.security.corsOrigins')
    .optional()
    .isArray()
    .withMessage('CORS origins must be an array'),
  body('configuration.security.allowedMethods')
    .optional()
    .isArray()
    .withMessage('Allowed methods must be an array'),
  body('metadata.description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('metadata.tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('metadata.notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

const subdomainUpdateSchema = [
  body('configuration.rateLimits.requestsPerMinute')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Rate limit requests per minute must be between 1 and 10000'),
  body('configuration.rateLimits.burstSize')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Rate limit burst size must be between 1 and 1000'),
  body('configuration.caching.enabled')
    .optional()
    .isBoolean()
    .withMessage('Caching enabled must be a boolean'),
  body('configuration.caching.ttl')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Cache TTL must be a non-negative integer'),
  body('configuration.security.corsOrigins')
    .optional()
    .isArray()
    .withMessage('CORS origins must be an array'),
  body('configuration.security.allowedMethods')
    .optional()
    .isArray()
    .withMessage('Allowed methods must be an array'),
  body('metadata.description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('metadata.tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('metadata.notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

const bulkSubdomainSchema = [
  body('subdomains')
    .isArray({ min: 1, max: 50 })
    .withMessage('Subdomains must be an array with 1-50 items'),
  body('subdomains.*.subdomain')
    .isLength({ min: 3, max: 63 })
    .matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)
    .withMessage('Invalid subdomain format'),
  body('subdomains.*.type')
    .isIn(['tenant', 'admin', 'api'])
    .withMessage('Invalid subdomain type'),
  body('options.autoSSL')
    .optional()
    .isBoolean()
    .withMessage('Auto SSL must be a boolean'),
  body('options.autoDNS')
    .optional()
    .isBoolean()
    .withMessage('Auto DNS must be a boolean'),
  body('options.parallelProcessing')
    .optional()
    .isBoolean()
    .withMessage('Parallel processing must be a boolean')
];

// Parameter validation
const subdomainIdParam = [
  param('subdomainId')
    .isMongoId()
    .withMessage('Invalid subdomain ID format')
];

// Query validation
const subdomainListQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('type')
    .optional()
    .isIn(['tenant', 'admin', 'api', 'custom'])
    .withMessage('Invalid subdomain type filter'),
  query('status')
    .optional()
    .isIn(['active', 'pending', 'suspended', 'deleted'])
    .withMessage('Invalid status filter'),
  query('healthStatus')
    .optional()
    .isIn(['healthy', 'warning', 'critical', 'unknown'])
    .withMessage('Invalid health status filter'),
  query('sslStatus')
    .optional()
    .isIn(['none', 'pending', 'active', 'expired', 'failed'])
    .withMessage('Invalid SSL status filter'),
  query('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search query cannot exceed 100 characters'),
  query('tenantId')
    .optional()
    .isMongoId()
    .withMessage('Invalid tenant ID format')
];

// Subdomain Management Routes

/**
 * @route   POST /api/subdomains
 * @desc    Create a new subdomain
 * @access  Super Admin, Admin
 */
router.post(
  '/',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  ...subdomainCreateSchema,
  validateRequest(),
  subdomainController.createSubdomain.bind(subdomainController)
);

/**
 * @route   POST /api/subdomains/validate
 * @desc    Validate subdomain request
 * @access  Super Admin, Admin
 */
router.post(
  '/validate',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  ...subdomainCreateSchema,
  validateRequest(),
  subdomainController.validateSubdomain.bind(subdomainController)
);

/**
 * @route   GET /api/subdomains/:subdomainId
 * @desc    Get subdomain by ID
 * @access  Super Admin, Admin
 */
router.get(
  '/:subdomainId',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  ...subdomainIdParam,
  validateRequest(),
  subdomainController.getSubdomain.bind(subdomainController)
);

/**
 * @route   GET /api/subdomains
 * @desc    List subdomains with filtering and pagination
 * @access  Super Admin, Admin
 */
router.get(
  '/',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  ...subdomainListQuery,
  validateRequest(),
  subdomainController.listSubdomains.bind(subdomainController)
);

/**
 * @route   PUT /api/subdomains/:subdomainId
 * @desc    Update subdomain
 * @access  Super Admin, Admin
 */
router.put(
  '/:subdomainId',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  ...subdomainIdParam,
  ...subdomainUpdateSchema,
  validateRequest(),
  subdomainController.updateSubdomain.bind(subdomainController)
);

/**
 * @route   DELETE /api/subdomains/:subdomainId
 * @desc    Delete subdomain (soft delete)
 * @access  Super Admin, Admin
 */
router.delete(
  '/:subdomainId',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  ...subdomainIdParam,
  validateRequest(),
  subdomainController.deleteSubdomain.bind(subdomainController)
);

// Bulk Operations Routes

/**
 * @route   POST /api/subdomains/bulk
 * @desc    Bulk create subdomains
 * @access  Super Admin, Admin
 */
router.post(
  '/bulk',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  ...bulkSubdomainSchema,
  validateRequest(),
  subdomainController.bulkCreateSubdomains.bind(subdomainController)
);

// Health Check Routes

/**
 * @route   GET /api/subdomains/:subdomainId/health
 * @desc    Perform health check on subdomain
 * @access  Super Admin, Admin
 */
router.get(
  '/:subdomainId/health',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  ...subdomainIdParam,
  validateRequest(),
  subdomainController.healthCheckSubdomain.bind(subdomainController)
);

/**
 * @route   GET /api/subdomains/service/health
 * @desc    Check subdomain provisioning service health
 * @access  Super Admin, Admin
 */
router.get(
  '/service/health',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  subdomainController.getServiceHealth.bind(subdomainController)
);

/**
 * @route   GET /api/subdomains/public-health
 * @desc    Public subdomain provisioning service health check
 * @access  Public
 */
router.get('/public-health', async (req: any, res: any) => {
  try {
    const subdomainService = require('../services/subdomainProvisioningService').default.getInstance();
    const health = await subdomainService.healthCheck();
    
    res.json({
      success: true,
      data: {
        service: 'subdomain-provisioning',
        healthy: health.healthy,
        status: health.healthy ? 'operational' : 'degraded',
        timestamp: new Date().toISOString(),
        details: {
          cloudflare: health.details.cloudflare,
          ssl: health.details.ssl,
          dns: health.details.dns,
          nginxConfigPath: health.details.nginxConfigPath,
          managedSubdomains: health.details.managedSubdomains
        }
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'Subdomain provisioning service unavailable',
      data: {
        service: 'subdomain-provisioning',
        healthy: false,
        status: 'down',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Statistics Routes

/**
 * @route   GET /api/subdomains/stats
 * @desc    Get subdomain statistics
 * @access  Super Admin, Admin
 */
router.get(
  '/stats',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  query('tenantId')
    .optional()
    .isMongoId()
    .withMessage('Invalid tenant ID format'),
  validateRequest(),
  subdomainController.getSubdomainStatistics.bind(subdomainController)
);

// Tenant-specific Routes

/**
 * @route   GET /api/subdomains/tenant/:tenantId
 * @desc    Get subdomains for a specific tenant
 * @access  Super Admin, Admin
 */
router.get(
  '/tenant/:tenantId',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  param('tenantId')
    .isMongoId()
    .withMessage('Invalid tenant ID format'),
  ...subdomainListQuery.slice(0, -1), // Remove tenantId from query validation
  validateRequest(),
  subdomainController.listSubdomains.bind(subdomainController)
);

/**
 * @route   GET /api/subdomains/tenant/:tenantId/primary
 * @desc    Get primary subdomain for a specific tenant
 * @access  Super Admin, Admin
 */
router.get(
  '/tenant/:tenantId/primary',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  param('tenantId')
    .isMongoId()
    .withMessage('Invalid tenant ID format'),
  validateRequest(),
  async (req: any, res: any) => {
    try {
      const Subdomain = require('../models/Subdomain').default;
      const { tenantId } = req.params;
      
      const primarySubdomain = await Subdomain.findOne({
        tenantId,
        isPrimary: true
      }).populate('tenant');
      
      if (!primarySubdomain) {
        return res.status(404).json({
          success: false,
          error: 'Primary subdomain not found for this tenant'
        });
      }
      
      res.json({
        success: true,
        data: {
          id: primarySubdomain._id,
          tenantId: primarySubdomain.tenantId,
          subdomain: primarySubdomain.subdomain,
          fullDomain: primarySubdomain.fullDomain,
          type: primarySubdomain.type,
          status: primarySubdomain.status,
          sslStatus: primarySubdomain.sslStatus,
          healthStatus: primarySubdomain.healthStatus,
          createdAt: primarySubdomain.createdAt,
          tenant: primarySubdomain.tenant
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get primary subdomain'
      });
    }
  }
);

// Domain Resolution Routes

/**
 * @route   GET /api/subdomains/resolve/:domain
 * @desc    Resolve domain to subdomain information
 * @access  Super Admin, Admin
 */
router.get(
  '/resolve/:domain',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  param('domain')
    .isLength({ min: 1, max: 253 })
    .matches(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/)
    .withMessage('Invalid domain format'),
  validateRequest(),
  async (req: any, res: any) => {
    try {
      const Subdomain = require('../models/Subdomain').default;
      const { domain } = req.params;
      
      const subdomain = await Subdomain.findOne({
        fullDomain: domain.toLowerCase()
      }).populate('tenant');
      
      if (!subdomain) {
        return res.status(404).json({
          success: false,
          error: 'Domain not found'
        });
      }
      
      res.json({
        success: true,
        data: {
          id: subdomain._id,
          tenantId: subdomain.tenantId,
          subdomain: subdomain.subdomain,
          fullDomain: subdomain.fullDomain,
          type: subdomain.type,
          status: subdomain.status,
          isPrimary: subdomain.isPrimary,
          isCustomDomain: subdomain.isCustomDomain,
          sslStatus: subdomain.sslStatus,
          healthStatus: subdomain.healthStatus,
          tenant: subdomain.tenant
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to resolve domain'
      });
    }
  }
);

export default router;
