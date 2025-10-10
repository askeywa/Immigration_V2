// backend/src/middleware/tenantResolution.ts
import { Request, Response, NextFunction } from 'express';
import { Tenant, ITenant } from '../models/Tenant';
import { ValidationError } from '../utils/errors';
import { config } from '../config/config';

export interface TenantRequest extends Request {
  tenant?: ITenant;
  tenantId?: string;
  isSuperAdmin?: boolean;
  tenantDomain?: string | null;
  sessionData?: any;
  user?: any; // Add user property for authentication
  tenantValidation?: any; // Add tenant validation result
  requestId?: string; // Add requestId for performance monitoring
  correlationId?: string; // Add correlationId for tracing
  traceId?: string; // Add traceId for distributed tracing
  rateLimit?: any; // Add rateLimit for rate limiting context
}

/**
 * Domain-based tenant resolution middleware
 * 
 * This middleware extracts tenant information from the request domain/subdomain
 * and adds it to the request object for use throughout the application.
 * 
 * Domain patterns supported:
 * - Super Admin: ibuyscrap.ca, www.ibuyscrap.ca, localhost
 * - Tenant: Any domain registered in the database
 * - API: api.sehwagimmigration.com
 * 
 * @param req Express request object
 * @param res Express response object  
 * @param next Express next function
 */
export const resolveTenant = async (req: TenantRequest, res: Response, next: NextFunction) => {
  const requestId = Math.random().toString(36).substring(7);
  const requestStartTime = Date.now();
  
  console.log(`[${requestId}] ========== TENANT RESOLUTION START ==========`);
  console.log(`[${requestId}] Time: ${new Date().toISOString()}`);
  console.log(`[${requestId}] URL: ${req.method} ${req.url}`);
  console.log(`[${requestId}] Host: ${req.get('host')}`);
  
  try {
    const tenantDomain = (req as any).get('x-tenant-domain') || (req as any).get('x-original-host');
    const host = (req as any).get('host') || (req as any).get('x-forwarded-host') || '';
    const protocol = (req as any).get('x-forwarded-proto') || (req as any).protocol || 'http';
    
    console.log(`[${requestId}] Headers - tenantDomain: ${tenantDomain}, host: ${host}, protocol: ${protocol}`);
    
    const domain = (tenantDomain || host).split(':')[0].toLowerCase();
    
    console.log('🔍 Tenant Resolution Debug:', {
      host,
      domain,
      allowedSuperAdminDomains: config.allowedSuperAdminDomains,
      protocol
    });
    
    const isSuperAdminDomain = config.allowedSuperAdminDomains.some(allowedDomain => {
      if (allowedDomain === 'localhost') {
        return domain === 'localhost' || domain.startsWith('localhost:');
      }
      return domain === allowedDomain;
    });
    
    console.log('🔍 Super Admin Domain Check:', {
      domain,
      isSuperAdminDomain,
      allowedDomains: config.allowedSuperAdminDomains
    });
    
    if (isSuperAdminDomain) {
      console.log(`[${requestId}] ✅ Super Admin Domain Detected: ${domain}`);
      (req as any).tenant = undefined;
      (req as any).tenantId = undefined;
      (req as any).isSuperAdmin = true;
      console.log(`[${requestId}] ========== TENANT RESOLUTION END (SUPER ADMIN) ==========`);
      return next();
    }
    
    // CRITICAL: Wrap tenant resolution in timeout
    console.log(`[${requestId}] 🔍 Starting tenant resolution for domain: ${domain}`);
    const resolutionPromise = resolveTenantByDomain(domain);
    const overallTimeoutPromise = new Promise<null>((_, reject) => 
      setTimeout(() => {
        console.log(`[${requestId}] ❌ RESOLUTION_TIMEOUT after 5 seconds`);
        reject(new Error('RESOLUTION_TIMEOUT'));
      }, 5000)
    );
    
    console.log(`[${requestId}] ⏱️  Racing tenant resolution promises...`);
    const tenant = await Promise.race([resolutionPromise, overallTimeoutPromise]);
    console.log(`[${requestId}] ✅ Tenant resolution completed`);
    
    if (tenant) {
      if (tenant.status !== 'active' && tenant.status !== 'trial') {
        return res.status(403).json({
          success: false,
          error: 'TENANT_SUSPENDED',
          message: 'Tenant account is suspended'
        });
      }
      
      (req as any).tenant = tenant;
      (req as any).tenantId = (tenant._id as any).toString();
      (req as any).isSuperAdmin = false;
      (req as any).tenantDomain = domain;
      
      (res as any).set('X-Tenant-ID', (tenant._id as any).toString());
      (res as any).set('X-Tenant-Name', tenant.name);
      
      const resolutionDuration = Date.now() - requestStartTime;
      console.log(`[${requestId}] ✅ Tenant resolved in ${resolutionDuration}ms`);
      console.log(`[${requestId}] ========== TENANT RESOLUTION END (SUCCESS) ==========`);
      
      return next();
    }
    
    if (domain === 'api.sehwagimmigration.com' || domain === config.apiDomain) {
      console.log(`[${requestId}] ========== TENANT RESOLUTION END (API DOMAIN) ==========`);
      return next();
    }
    
    console.log(`[${requestId}] ❌ No valid domain pattern found:`, {
      domain,
      host,
      allowedSuperAdminDomains: config.allowedSuperAdminDomains
    });
    
    console.log(`[${requestId}] ========== TENANT RESOLUTION END (NOT FOUND) ==========`);
    return res.status(404).json({
      success: false,
      error: 'TENANT_NOT_FOUND',
      message: 'Invalid domain or tenant not found'
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const resolutionDuration = Date.now() - requestStartTime;
    
    console.error(`[${requestId}] ❌ Tenant resolution error:`, {
      error: errorMessage,
      domain: (req as any).get('host'),
      duration: `${resolutionDuration}ms`
    });
    
    if (errorMessage.includes('TIMEOUT')) {
      console.log(`[${requestId}] ========== TENANT RESOLUTION END (TIMEOUT ERROR) ==========`);
      return res.status(503).json({
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        message: 'Tenant resolution timeout. Please try again.',
        details: 'Database query exceeded time limit'
      });
    }
    
    console.log(`[${requestId}] ========== TENANT RESOLUTION END (GENERAL ERROR) ==========`);
    return res.status(500).json({
      success: false,
      error: 'RESOLUTION_FAILED',
      message: 'Failed to resolve tenant'
    });
  }
};

/**
 * Parse domain to extract tenant information
 * 
 * @param host The host header from the request
 * @returns Object containing domain parsing results
 */
function parseDomain(host: string): {
  tenantDomain: string | null;
  isSuperAdmin: boolean;
  isApiDomain: boolean;
} {
  if (!host) {
    return {
      tenantDomain: null,
      isSuperAdmin: false,
      isApiDomain: false
    };
  }
  
  // Remove port if present
  const domain = host.split(':')[0].toLowerCase();
  
  // Check for super admin domain (including localhost for development)
  // Use dynamic domain list from environment variables
  const isSuperAdminDomain = config.allowedSuperAdminDomains.some(allowedDomain => {
    if (allowedDomain === 'localhost') {
      return domain === 'localhost' || domain.startsWith('localhost:');
    }
    return domain === allowedDomain;
  });
  
  if (isSuperAdminDomain) {
    return {
      tenantDomain: null,
      isSuperAdmin: true,
      isApiDomain: false
    };
  }
  
  // Check for API domain
  if (domain === 'api.sehwagimmigration.com' || domain === config.apiDomain) {
    return {
      tenantDomain: null,
      isSuperAdmin: false,
      isApiDomain: true
    };
  }
  
  return {
    tenantDomain: null,
    isSuperAdmin: false,
    isApiDomain: false
  };
}

/**
 * Validate tenant name format
 * 
 * @param tenantName The tenant name to validate
 * @returns True if valid, false otherwise
 */
function isValidTenantName(tenantName: string): boolean {
  // Tenant name should be 3-50 characters, alphanumeric and hyphens only
  const tenantNamePattern = /^[a-z0-9-]{3,50}$/;
  return tenantNamePattern.test(tenantName);
}

/**
 * Resolve tenant by domain
 * 
 * @param domain The domain to resolve
 * @returns Tenant object or null if not found
 */
async function resolveTenantByDomain(domain: string): Promise<ITenant | null> {
  const queryId = Math.random().toString(36).substring(7);
  try {
    console.log(`[${queryId}] 🔍 Resolving tenant by domain: ${domain}`);
    const queryStartTime = Date.now();
    
    // CRITICAL: Add timeout protection to prevent hanging
    const tenantQueryPromise = Tenant.findOne({ 
      domain: domain,
      status: { $in: ['active', 'trial'] }
    })
    .maxTimeMS(3000) // MongoDB server-side timeout: 3 seconds
    .lean()
    .exec();
    
    const timeoutPromise = new Promise<null>((_, reject) => 
      setTimeout(() => {
        console.log(`[${queryId}] ❌ TENANT_QUERY_TIMEOUT after 3.5 seconds`);
        reject(new Error('TENANT_QUERY_TIMEOUT'));
      }, 3500)
    );
    
    console.log(`[${queryId}] ⏱️  Starting MongoDB query with timeout...`);
    const tenant = await Promise.race([tenantQueryPromise, timeoutPromise]);
    
    const queryDuration = Date.now() - queryStartTime;
    console.log(`[${queryId}] ✅ Tenant query completed in ${queryDuration}ms:`, tenant ? {
      _id: tenant._id,
      name: tenant.name,
      domain: tenant.domain,
      status: tenant.status
    } : 'No tenant found');
    
    if (tenant) {
      return tenant as unknown as ITenant;
    }
    
    // Subdomain pattern matching with timeout
    const tenantPrefix = config.tenantDomainPrefix || 'portal';
    const subdomainPattern = new RegExp(`^${tenantPrefix}\\.(.+)\\.sehwagimmigration\\.com$`);
    const match = domain.match(subdomainPattern);
    
    if (match) {
      const tenantName = match[1];
      
      const subdomainQueryPromise = Tenant.findOne({
        $or: [
          { domain: tenantName },
          { name: { $regex: new RegExp(tenantName, 'i') } }
        ],
        status: { $in: ['active', 'trial'] }
      })
      .maxTimeMS(3000)
      .lean()
      .exec();
      
      const subdomainTimeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('SUBDOMAIN_QUERY_TIMEOUT')), 3500)
      );
      
      const subdomainTenant = await Promise.race([subdomainQueryPromise, subdomainTimeoutPromise]);
      
      if (subdomainTenant) {
        return subdomainTenant as unknown as ITenant;
      }
    }
    
    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('TIMEOUT')) {
      console.error('❌ Tenant resolution timeout:', {
        domain,
        error: errorMessage,
        suggestion: 'Check MongoDB connection pool and add domain index'
      });
    } else {
      console.error('❌ Error resolving tenant by domain:', error);
    }
    
    return null; // Return null instead of throwing to allow request to continue
  }
}

/**
 * Middleware to validate tenant access for specific routes
 * 
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export const validateTenantAccess = (req: TenantRequest, res: Response, next: NextFunction) => {
  // Super admins have access to everything
  if ((req as any).isSuperAdmin) {
    return next();
  }
  
  // API routes don't need tenant validation
  if ((req as any).tenantDomain && (req as any).tenantDomain.includes('api.')) {
    return next();
  }
  
  // Ensure tenant is resolved
  if (!(req as any).tenant || !(req as any).tenantId) {
    return next(new ValidationError(
      'Tenant access required',
      'tenant',
      (req as any).tenantDomain || 'unknown'
    ));
  }
  
  next();
};

/**
 * Middleware to ensure super admin access
 * 
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export const requireSuperAdmin = (req: TenantRequest, res: Response, next: NextFunction) => {
  if (!(req as any).isSuperAdmin) {
    return next(new ValidationError(
      'Super admin access required',
      'role',
      (req as any).user?.role || 'unknown'
    ));
  }
  
  next();
};

/**
 * Utility function to get tenant context from request
 * 
 * @param req Express request object
 * @returns Tenant context object
 */
export const getTenantContext = (req: TenantRequest) => {
  return {
    tenant: (req as any).tenant,
    tenantId: (req as any).tenantId,
    isSuperAdmin: (req as any).isSuperAdmin,
    tenantDomain: (req as any).tenantDomain
  };
};

/**
 * Utility function to check if request is from a specific tenant
 * 
 * @param req Express request object
 * @param tenantId The tenant ID to check against
 * @returns True if request is from the specified tenant
 */
export const isFromTenant = (req: TenantRequest, tenantId: string): boolean => {
  return (req as any).tenantId === tenantId || ((req as any).isSuperAdmin === true);
};

export default {
  resolveTenant,
  validateTenantAccess,
  requireSuperAdmin,
  getTenantContext,
  isFromTenant
};