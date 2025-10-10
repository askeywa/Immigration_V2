// backend/src/routes/dnsAutomationRoutes.ts
import { Router } from 'express';
import DNSAutomationController from '../controllers/dnsAutomationController';
import { authenticateToken } from '../middleware/auth';
import { authorize } from '../middleware/authorization';
import { validateRequest } from '../middleware/validation';
import { body, param } from 'express-validator';

const router = Router();
const dnsController = new DNSAutomationController();

// DNS Record validation schemas
const dnsRecordSchema = [
  body('type')
    .isIn(['A', 'CNAME', 'MX', 'TXT', 'AAAA'])
    .withMessage('Invalid record type'),
  body('name')
    .isLength({ min: 1, max: 255 })
    .matches(/^[a-zA-Z0-9.-]+$/)
    .withMessage('Invalid name format'),
  body('content')
    .isLength({ min: 1, max: 255 })
    .withMessage('Content is required'),
  body('ttl')
    .optional()
    .isInt({ min: 1, max: 86400 })
    .withMessage('TTL must be between 1 and 86400 seconds'),
  body('proxied')
    .optional()
    .isBoolean()
    .withMessage('Proxied must be a boolean'),
  body('priority')
    .optional()
    .isInt({ min: 0, max: 65535 })
    .withMessage('Priority must be between 0 and 65535')
];

const subdomainSchema = [
  body('subdomain')
    .isLength({ min: 2, max: 63 })
    .matches(/^[a-zA-Z0-9-]+$/)
    .withMessage('Invalid subdomain format'),
  body('targetIP')
    .optional()
    .isIP()
    .withMessage('Invalid IP address format'),
  body('proxied')
    .optional()
    .isBoolean()
    .withMessage('Proxied must be a boolean'),
  body('ttl')
    .optional()
    .isInt({ min: 1, max: 86400 })
    .withMessage('TTL must be between 1 and 86400 seconds')
];

const bulkDNSSchema = [
  body('records')
    .isArray({ min: 1, max: 100 })
    .withMessage('Records must be an array with 1-100 items'),
  body('records.*.type')
    .isIn(['A', 'CNAME', 'MX', 'TXT', 'AAAA'])
    .withMessage('Invalid record type'),
  body('records.*.name')
    .isLength({ min: 1, max: 255 })
    .matches(/^[a-zA-Z0-9.-]+$/)
    .withMessage('Invalid name format'),
  body('records.*.content')
    .isLength({ min: 1, max: 255 })
    .withMessage('Content is required'),
  body('dryRun')
    .optional()
    .isBoolean()
    .withMessage('Dry run must be a boolean')
];

// Parameter validation
const recordIdParam = [
  param('recordId')
    .isLength({ min: 1 })
    .withMessage('Record ID is required')
];

const subdomainParam = [
  param('subdomain')
    .isLength({ min: 2, max: 63 })
    .matches(/^[a-zA-Z0-9-]+$/)
    .withMessage('Invalid subdomain format')
];

// DNS Records Routes

/**
 * @route   POST /api/dns/records
 * @desc    Create a new DNS record
 * @access  Super Admin, Admin
 */
router.post(
  '/records',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  validateRequest(dnsRecordSchema),
  dnsController.createDNSRecord.bind(dnsController)
);

/**
 * @route   GET /api/dns/records
 * @desc    List DNS records
 * @access  Super Admin, Admin
 */
router.get(
  '/records',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  dnsController.listDNSRecords.bind(dnsController)
);

/**
 * @route   PUT /api/dns/records/:recordId
 * @desc    Update DNS record
 * @access  Super Admin, Admin
 */
router.put(
  '/records/:recordId',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  validateRequest(recordIdParam),
  validateRequest(dnsRecordSchema),
  dnsController.updateDNSRecord.bind(dnsController)
);

/**
 * @route   DELETE /api/dns/records/:recordId
 * @desc    Delete DNS record
 * @access  Super Admin, Admin
 */
router.delete(
  '/records/:recordId',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  validateRequest(recordIdParam),
  dnsController.deleteDNSRecord.bind(dnsController)
);

// Subdomain Management Routes

/**
 * @route   POST /api/dns/subdomains
 * @desc    Create tenant subdomain
 * @access  Super Admin, Admin
 */
router.post(
  '/subdomains',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  validateRequest(subdomainSchema),
  dnsController.createTenantSubdomain.bind(dnsController)
);

/**
 * @route   GET /api/dns/subdomains/:subdomain/availability
 * @desc    Check subdomain availability
 * @access  Super Admin, Admin
 */
router.get(
  '/subdomains/:subdomain/availability',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  validateRequest(subdomainParam),
  dnsController.checkSubdomainAvailabilityEndpoint.bind(dnsController)
);

/**
 * @route   DELETE /api/dns/subdomains/:subdomain
 * @desc    Remove tenant subdomain
 * @access  Super Admin, Admin
 */
router.delete(
  '/subdomains/:subdomain',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  validateRequest(subdomainParam),
  dnsController.removeTenantSubdomain.bind(dnsController)
);

// Bulk Operations Routes

/**
 * @route   POST /api/dns/bulk
 * @desc    Bulk create DNS records
 * @access  Super Admin, Admin
 */
router.post(
  '/bulk',
  authenticateToken,
  authorize(['super_admin', 'admin']),
  validateRequest(bulkDNSSchema),
  dnsController.bulkCreateDNSRecords.bind(dnsController)
);

// Health Check Route

/**
 * @route   GET /api/dns/health
 * @desc    Check DNS automation service health
 * @access  Public
 */
router.get('/health', async (req: any, res: any) => {
  try {
    const cloudflareService = require('../services/cloudflareService').default.getInstance();
    const isHealthy = await cloudflareService.testConnection();
    
    res.json({
      success: true,
      data: {
        service: 'dns-automation',
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        cloudflare: {
          connected: isHealthy
        }
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'DNS automation service unavailable',
      data: {
        service: 'dns-automation',
        status: 'unhealthy',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;
