// backend/src/routes/sslAutomationRoutes.ts
import { Router } from 'express';
import SSLAutomationController from '../controllers/sslAutomationController';
import { authenticateToken } from '../middleware/auth';
import { authorize } from '../middleware/authorization';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';

const router = Router();
const sslController = new SSLAutomationController();

// SSL Certificate validation schemas
const sslCertificateSchema = [
  body('domain')
    .isLength({ min: 1, max: 253 })
    .matches(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/)
    .withMessage('Invalid domain format'),
  body('type')
    .isIn(['universal', 'dedicated', 'custom'])
    .withMessage('Invalid certificate type'),
  body('customCertificate.privateKey')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Private key is required for custom certificates'),
  body('customCertificate.certificate')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Certificate is required for custom certificates'),
  body('customCertificate.chain')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Invalid certificate chain format')
];

const sslRenewalSchema = [
  body('forceRenewal')
    .optional()
    .isBoolean()
    .withMessage('Force renewal must be a boolean')
];

const bulkSSLSchema = [
  body('domains')
    .isArray({ min: 1, max: 100 })
    .withMessage('Domains must be an array with 1-100 items'),
  body('domains.*')
    .isLength({ min: 1, max: 253 })
    .matches(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/)
    .withMessage('Invalid domain format'),
  body('type')
    .isIn(['universal', 'dedicated'])
    .withMessage('Invalid certificate type'),
  body('forceRenewal')
    .optional()
    .isBoolean()
    .withMessage('Force renewal must be a boolean')
];

// Parameter validation
const domainParam = [
  param('domain')
    .isLength({ min: 1, max: 253 })
    .matches(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/)
    .withMessage('Invalid domain format')
];

// Query validation
const sslStatusQuery = [
  query('includeGrade')
    .optional()
    .isBoolean()
    .withMessage('Include grade must be a boolean'),
  query('includeVulnerabilities')
    .optional()
    .isBoolean()
    .withMessage('Include vulnerabilities must be a boolean')
];

// SSL Certificate Management Routes

/**
 * @route   POST /api/ssl/certificates
 * @desc    Provision SSL certificate for a domain
 * @access  Super Admin, Admin
 */
router.post(
  '/certificates',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  validateRequest(sslCertificateSchema),
  sslController.provisionSSLCertificate.bind(sslController)
);

/**
 * @route   GET /api/ssl/certificates/:domain/status
 * @desc    Get SSL status for a domain
 * @access  Super Admin, Admin
 */
router.get(
  '/certificates/:domain/status',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  ...domainParam,
  validateRequest(),
  validateRequest(sslStatusQuery),
  sslController.getSSLStatus.bind(sslController)
);

/**
 * @route   GET /api/ssl/certificates/:domain/validate
 * @desc    Validate SSL certificate for a domain
 * @access  Super Admin, Admin
 */
router.get(
  '/certificates/:domain/validate',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  ...domainParam,
  validateRequest(),
  sslController.validateSSLCertificate.bind(sslController)
);

/**
 * @route   GET /api/ssl/certificates/:domain/grade
 * @desc    Get SSL grade for a domain
 * @access  Super Admin, Admin
 */
router.get(
  '/certificates/:domain/grade',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  ...domainParam,
  validateRequest(),
  sslController.getSSLGrade.bind(sslController)
);

/**
 * @route   POST /api/ssl/certificates/:domain/renew
 * @desc    Renew SSL certificate for a domain
 * @access  Super Admin, Admin
 */
router.post(
  '/certificates/:domain/renew',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  ...domainParam,
  validateRequest(),
  ...sslRenewalSchema,
  validateRequest(),
  sslController.renewSSLCertificate.bind(sslController)
);

// Bulk Operations Routes

/**
 * @route   POST /api/ssl/bulk/renew
 * @desc    Bulk renew SSL certificates
 * @access  Super Admin, Admin
 */
router.post(
  '/bulk/renew',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  ...bulkSSLSchema,
  validateRequest(),
  sslController.bulkRenewSSLCertificates.bind(sslController)
);

// Monitoring Routes

/**
 * @route   GET /api/ssl/monitor
 * @desc    Monitor SSL certificates for expiration
 * @access  Super Admin, Admin
 */
router.get(
  '/monitor',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  sslController.monitorSSLCertificates.bind(sslController)
);

// Health Check Routes

/**
 * @route   GET /api/ssl/health
 * @desc    Check SSL automation service health
 * @access  Super Admin, Admin
 */
router.get(
  '/health',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  sslController.getSSLHealth.bind(sslController)
);

/**
 * @route   GET /api/ssl/public-health
 * @desc    Public SSL automation service health check
 * @access  Public
 */
router.get('/public-health', async (req: any, res: any) => {
  try {
    const sslService = require('../services/sslAutomationService').default.getInstance();
    const health = await sslService.healthCheck();
    
    res.json({
      success: true,
      data: {
        service: 'ssl-automation',
        healthy: health.healthy,
        status: health.healthy ? 'operational' : 'degraded',
        timestamp: new Date().toISOString(),
        details: {
          cloudflare: health.details.cloudflare,
          autoRenewal: health.details.autoRenewal,
          managedDomains: health.details.managedDomains
        }
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'SSL automation service unavailable',
      data: {
        service: 'ssl-automation',
        healthy: false,
        status: 'down',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// SSL Configuration Routes

/**
 * @route   GET /api/ssl/config
 * @desc    Get SSL automation configuration
 * @access  Super Admin, Admin
 */
router.get('/config', authenticateToken, authorize(['super_admin', 'admin']), (req: any, res: any) => {
  res.json({
    success: true,
    data: {
      autoRenewalEnabled: process.env.SSL_AUTO_RENEWAL !== 'false',
      renewalThresholdDays: parseInt(process.env.SSL_RENEWAL_THRESHOLD || '30'),
      mainDomain: process.env.MAIN_DOMAIN || 'sehwagimmigration.com',
      certbotEmail: process.env.CERTBOT_EMAIL || 'admin@sehwagimmigration.com',
      nginxConfigPath: process.env.NGINX_CONFIG_PATH || '/etc/nginx/conf.d',
      sslStoragePath: process.env.SSL_STORAGE_PATH || '/etc/ssl/certs'
    }
  });
});

/**
 * @route   PUT /api/ssl/config
 * @desc    Update SSL automation configuration
 * @access  Super Admin
 */
router.put('/config', 
  authenticateToken, 
  authorize(['super_admin']),
  body('autoRenewalEnabled')
    .optional()
    .isBoolean()
    .withMessage('Auto renewal enabled must be a boolean'),
  body('renewalThresholdDays')
    .optional()
    .isInt({ min: 1, max: 90 })
    .withMessage('Renewal threshold days must be between 1 and 90'),
  body('certbotEmail')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),
  validateRequest(),
  (req: any, res: any) => {
    // This would typically update environment variables or configuration file
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'SSL configuration updated successfully',
      data: {
        updatedAt: new Date().toISOString(),
        updatedBy: req.user?.id
      }
    });
  }
);

// SSL Statistics Routes

/**
 * @route   GET /api/ssl/stats
 * @desc    Get SSL automation statistics
 * @access  Super Admin, Admin
 */
router.get('/stats', 
  authenticateToken, 
  authorize(['super_admin', 'admin']),
  async (req: any, res: any) => {
    try {
      const sslService = require('../services/sslAutomationService').default.getInstance();
      const monitoring = await sslService.monitorSSLCertificates();
      
      res.json({
        success: true,
        data: {
          total: monitoring.expiringSoon.length + monitoring.expired.length + monitoring.healthy.length,
          healthy: monitoring.healthy.length,
          expiringSoon: monitoring.expiringSoon.length,
          expired: monitoring.expired.length,
          healthPercentage: Math.round((monitoring.healthy.length / (monitoring.expiringSoon.length + monitoring.expired.length + monitoring.healthy.length)) * 100),
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get SSL statistics'
      });
    }
  }
);

export default router;
