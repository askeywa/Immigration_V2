// backend/src/middleware/dynamicCorsSecurity.ts
import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Tenant } from '../models/Tenant';
import { log } from '../utils/logger';

// Cache for trusted domains (refresh every 5 minutes)
let trustedDomainsCache: string[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all trusted domains from database
 * IMPROVED: Better handling of database failures with extended cache and fallback
 */
async function fetchTrustedDomains(): Promise<string[]> {
  try {
    // Check cache first
    if (Date.now() - cacheTimestamp < CACHE_TTL && trustedDomainsCache.length > 0) {
      return trustedDomainsCache;
    }

    // Base trusted domains (super admin) - these are ALWAYS trusted
    const baseDomains = [
      'http://localhost:3000',
      'http://localhost:5174',
      'http://localhost:5173',
      'https://ibuyscrap.ca',
      'https://www.ibuyscrap.ca',
    ];

    // Fetch all active tenants with timeout protection
    const tenants = await Promise.race([
      Tenant.find({
        status: { $in: ['active', 'trial'] }
      }).select('domain customDomains').lean().exec(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Tenant query timeout')), 5000)
      )
    ]) as any[];

    // Build list of all trusted domains
    const tenantDomains = tenants.flatMap(tenant => {
      const domains = [tenant.domain];
      if (tenant.customDomains && Array.isArray(tenant.customDomains)) {
        domains.push(...tenant.customDomains);
      }
      return domains;
    });

    // Add protocol prefixes for CORS
    const allDomains = [
      ...baseDomains,
      ...tenantDomains.map(d => `https://${d}`),
      ...tenantDomains.map(d => `http://${d}`), // For development
    ];

    // Update cache
    trustedDomainsCache = [...new Set(allDomains)]; // Remove duplicates
    cacheTimestamp = Date.now();

    log.info('Trusted Domains Cache Updated', {
      count: trustedDomainsCache.length,
      baseDomains: baseDomains.length,
      tenantDomains: tenantDomains.length,
    });

    return trustedDomainsCache;
  } catch (error) {
    log.error('Failed to fetch trusted domains from database', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    // IMPROVED: If cache exists but is stale, extend its lifetime during database issues
    if (trustedDomainsCache.length > 0) {
      log.warn('Using stale cache due to database error', {
        cacheAge: Date.now() - cacheTimestamp,
        cachedDomainsCount: trustedDomainsCache.length
      });
      return trustedDomainsCache;
    }
    
    // IMPROVED: If no cache exists, return base domains as emergency fallback
    const emergencyFallback = [
      'http://localhost:3000',
      'http://localhost:5174',
      'http://localhost:5173',
      'https://ibuyscrap.ca',
      'https://www.ibuyscrap.ca',
      'https://honeynwild.com', // Known tenant domain
    ];
    
    log.warn('Using emergency fallback domains', {
      count: emergencyFallback.length
    });
    
    return emergencyFallback;
  }
}

/**
 * Dynamic CORS middleware that checks database for trusted domains
 * Improved with fallback handling for database failures
 */
export const dynamicCorsSecurity = () => {
  return cors({
    origin: async (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      try {
        // Get trusted domains from cache/database
        const trustedDomains = await fetchTrustedDomains();

        // Check if origin is trusted
        if (trustedDomains.includes(origin)) {
          log.debug('CORS: Origin Allowed', { origin });
          return callback(null, true);
        }

        // Check for localhost variations in development
        if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
          log.debug('CORS: Development Localhost Allowed', { origin });
          return callback(null, true);
        }

        // IMPROVED: Check against hardcoded fallback domains if cache is empty or stale
        const fallbackDomains = [
          'https://ibuyscrap.ca',
          'https://www.ibuyscrap.ca',
          'https://honeynwild.com',
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:5174',
        ];

        if (fallbackDomains.some(domain => origin.startsWith(domain))) {
          log.warn('CORS: Origin allowed via fallback (database may be unavailable)', { origin });
          return callback(null, true);
        }

        // Origin not trusted
        log.warn('CORS: Origin Rejected', { origin });
        return callback(new Error(`Origin ${origin} not allowed by CORS`), false);
      } catch (error) {
        log.error('CORS: Error checking origin', {
          origin,
          error: error instanceof Error ? error.message : String(error),
        });
        
        // IMPROVED: Instead of blocking all requests, allow known domains as fallback
        const emergencyFallbackDomains = [
          'https://ibuyscrap.ca',
          'https://www.ibuyscrap.ca',
          'https://honeynwild.com',
        ];

        if (emergencyFallbackDomains.some(domain => origin.startsWith(domain))) {
          log.warn('CORS: Emergency fallback - allowing known domain despite error', { origin });
          return callback(null, true);
        }

        // For development, be more permissive during errors
        if (process.env.NODE_ENV === 'development') {
          log.warn('CORS: Development mode - allowing request despite error', { origin });
          return callback(null, true);
        }

        // Only block if we're certain it's not a trusted domain
        return callback(new Error('CORS configuration error'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-CSRF-Token',
      'X-Tenant-ID',
      'X-Tenant-Name',
      'X-Tenant-Domain',
      'X-Original-Host',
      'X-Is-Super-Admin',
    ],
    exposedHeaders: [
      'X-Tenant-ID',
      'X-Tenant-Name',
      'X-Tenant-Domain',
      'X-Is-Super-Admin',
      'X-Session-ID',
      'X-User-ID',
      'X-Last-Activity',
      'X-Domain-Match-Type',
    ],
    maxAge: 86400, // 24 hours
  });
};

/**
 * Manually refresh trusted domains cache
 */
export const refreshTrustedDomainsCache = async (): Promise<void> => {
  cacheTimestamp = 0; // Force cache refresh
  await fetchTrustedDomains();
  log.info('Trusted Domains Cache Manually Refreshed');
};

/**
 * Get current cached trusted domains (for debugging)
 */
export const getTrustedDomains = (): string[] => {
  return [...trustedDomainsCache];
};

