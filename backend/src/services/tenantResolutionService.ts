// backend/src/services/tenantResolutionService.ts
import { Request, Response } from 'express';
import { Tenant, ITenant } from '../models/Tenant';
import { TenantRequest } from '../middleware/tenantResolution';
import { AppError } from '../utils/errors';
import { log } from '../utils/logger';
import { config } from '../config/config';

export interface TenantResolutionConfig {
  enabled: boolean;
  strictMode: boolean;
  cacheEnabled: boolean;
  cacheTtl: number; // in seconds
  maxRetries: number;
  timeout: number; // in milliseconds
  allowCustomDomains: boolean;
  requireHttps: boolean;
  validateDns: boolean;
  logResolutionAttempts: boolean;
}

export interface DomainInfo {
  host: string;
  protocol: string;
  port?: number;
  subdomain?: string;
  domain: string;
  tld: string;
  isCustomDomain: boolean;
  isSubdomain: boolean;
  tenantName?: string;
}

export interface TenantResolutionResult {
  tenant?: ITenant;
  tenantId?: string;
  isSuperAdmin: boolean;
  isApiDomain: boolean;
  domainInfo: DomainInfo;
  resolutionMethod: 'subdomain' | 'custom_domain' | 'super_admin' | 'api' | 'none';
  cacheHit: boolean;
  resolutionTime: number;
}

export interface TenantResolutionStats {
  totalResolutions: number;
  successfulResolutions: number;
  failedResolutions: number;
  cacheHits: number;
  cacheMisses: number;
  resolutionMethods: Array<{ method: string; count: number }>;
  topTenants: Array<{ tenantId: string; name: string; count: number }>;
  averageResolutionTime: number;
  errorRate: number;
  recentResolutions: Array<{
    host: string;
    tenantId?: string;
    method: string;
    success: boolean;
    timestamp: Date;
  }>;
}

export class TenantResolutionService {
  private static config: TenantResolutionConfig;
  private static cache: Map<string, { tenant: ITenant; timestamp: number }> = new Map();
  private static readonly MAX_CACHE_SIZE = 50; // CRITICAL: Limit cache growth
  private static readonly MAX_RECENT_RESOLUTIONS = 50; // CRITICAL: Limit stats arrays
  private static stats: TenantResolutionStats = {
    totalResolutions: 0,
    successfulResolutions: 0,
    failedResolutions: 0,
    cacheHits: 0,
    cacheMisses: 0,
    resolutionMethods: [],
    topTenants: [],
    averageResolutionTime: 0,
    errorRate: 0,
    recentResolutions: []
  };

  /**
   * Initialize the tenant resolution service
   */
  static async initialize(): Promise<void> {
    try {
      this.config = {
        enabled: true,
        strictMode: process.env.NODE_ENV === 'production',
        cacheEnabled: true,
        cacheTtl: 300, // 5 minutes
        maxRetries: 3,
        timeout: 5000, // 5 seconds
        allowCustomDomains: true,
        requireHttps: process.env.NODE_ENV === 'production',
        validateDns: false, // Can be enabled for production
        logResolutionAttempts: true
      };

      // Clean up expired cache entries
      this.cleanupCache();

      log.info('Tenant resolution service initialized with comprehensive domain management');
    } catch (error) {
      log.error('Failed to initialize tenant resolution service:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      throw new AppError('Failed to initialize tenant resolution service', 500);
    }
  }

  /**
   * Get tenant resolution configuration
   */
  static getConfig(): TenantResolutionConfig {
    if (!this.config) {
      throw new AppError('Tenant resolution service not initialized', 500);
    }
    return this.config;
  }

  /**
   * Resolve tenant from request with comprehensive domain analysis
   */
  static async resolveTenant(req: Request): Promise<TenantResolutionResult> {
    const startTime = Date.now();
    
    try {
      if (!this.config.enabled) {
        throw new AppError('Tenant resolution is disabled', 503);
      }

      const host = req.get('host') || req.get('x-forwarded-host') || '';
      const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
      
      if (!host) {
        throw new AppError('Host header is required', 400);
      }

      // Parse domain information
      const domainInfo = this.parseDomain(host, protocol);
      
      // Check cache first
      let cacheHit = false;
      let cachedTenant: ITenant | undefined;
      
      if (this.config.cacheEnabled) {
        const cacheKey = this.generateCacheKey(domainInfo);
        const cached = this.cache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < (this.config.cacheTtl * 1000)) {
          cacheHit = true;
          cachedTenant = cached.tenant;
          this.stats.cacheHits++;
        } else {
          this.stats.cacheMisses++;
          if (cached) {
            this.cache.delete(cacheKey);
          }
        }
      }

      let result: TenantResolutionResult;

      // Handle super admin domain
      if (this.isSuperAdminDomain(domainInfo)) {
        result = {
          tenant: undefined,
          tenantId: undefined,
          isSuperAdmin: true,
          isApiDomain: false,
          domainInfo,
          resolutionMethod: 'super_admin',
          cacheHit,
          resolutionTime: Date.now() - startTime
        };
      }
      // Handle API domain
      else if (this.isApiDomain(domainInfo)) {
        result = {
          tenant: undefined,
          tenantId: undefined,
          isSuperAdmin: false,
          isApiDomain: true,
          domainInfo,
          resolutionMethod: 'api',
          cacheHit,
          resolutionTime: Date.now() - startTime
        };
      }
      // Handle tenant resolution
      else {
        let tenant: ITenant | null = null;

        if (cacheHit && cachedTenant) {
          tenant = cachedTenant;
        } else {
          // Resolve tenant from database
          tenant = await this.resolveTenantFromDatabase(domainInfo);
          
          // Cache the result
          if (tenant && this.config.cacheEnabled) {
            const cacheKey = this.generateCacheKey(domainInfo);
            this.cache.set(cacheKey, { tenant, timestamp: Date.now() });
            
            // ✅ ADD: Prevent cache from growing indefinitely
            if (this.cache.size > this.MAX_CACHE_SIZE) {
              const firstKey = this.cache.keys().next().value;
              if (firstKey) {
                this.cache.delete(firstKey);
              }
            }
          }
        }

        result = {
          tenant: tenant || undefined,
          tenantId: tenant ? (tenant._id as any).toString() : undefined,
          isSuperAdmin: false,
          isApiDomain: false,
          domainInfo,
          resolutionMethod: domainInfo.isCustomDomain ? 'custom_domain' : 'subdomain',
          cacheHit,
          resolutionTime: Date.now() - startTime
        };
      }

      // Update statistics
      this.updateStats(result, true);

      // Log resolution attempt
      if (this.config.logResolutionAttempts) {
        log.info('Tenant resolution completed:', {
          host,
          tenantId: result.tenantId,
          method: result.resolutionMethod,
          cacheHit,
          resolutionTime: result.resolutionTime,
          isSuperAdmin: result.isSuperAdmin,
          isApiDomain: result.isApiDomain
        });
      }

      return result;
    } catch (error) {
      const resolutionTime = Date.now() - startTime;
      
      // Update statistics
      this.updateStats({
        tenant: undefined,
        tenantId: undefined,
        isSuperAdmin: false,
        isApiDomain: false,
        domainInfo: this.parseDomain(req.get('host') || '', req.protocol),
        resolutionMethod: 'none',
        cacheHit: false,
        resolutionTime
      }, false);

      log.error('Tenant resolution failed:', { 
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        host: req.get('host'),
        resolutionTime
      });

      throw error;
    }
  }

  /**
   * Parse domain to extract comprehensive information
   */
  private static parseDomain(host: string, protocol: string): DomainInfo {
    if (!host) {
      return {
        host: '',
        protocol,
        domain: '',
        tld: '',
        isCustomDomain: false,
        isSubdomain: false
      };
    }

    const [domain, port] = host.split(':');
    const domainParts = domain.toLowerCase().split('.');
    
    // Handle localhost specially
    if (domain === 'localhost' || domain.startsWith('localhost')) {
      return {
        host,
        protocol,
        port: port ? parseInt(port) : undefined,
        domain: 'localhost',
        tld: '',
        isCustomDomain: false,
        isSubdomain: false,
        tenantName: undefined
      };
    }
    
    let subdomain: string | undefined;
    let tenantName: string | undefined;
    let isSubdomain = false;
    let isCustomDomain = false;

    if (domainParts.length >= 3) {
      // Check if it's a subdomain of our main domain
      const mainDomain = config.mainDomain || config.superAdminDomain || 'sehwagimmigration.com';
      const mainDomainParts = mainDomain.split('.');
      
      if (domainParts.length >= mainDomainParts.length + 1) {
        const domainSuffix = domainParts.slice(-mainDomainParts.length).join('.');
        
        if (domainSuffix === mainDomain) {
          isSubdomain = true;
          subdomain = domainParts[0];
          
          // Extract tenant name from subdomain pattern
          if (subdomain === config.tenantDomainPrefix || subdomain === 'portal') {
            tenantName = domainParts[1];
          } else {
            tenantName = subdomain;
          }
        }
      }
    }

    // Check if it's a custom domain
    if (!isSubdomain && domainParts.length >= 2) {
      const mainDomain = config.mainDomain || config.superAdminDomain || 'sehwagimmigration.com';
      if (!domain.endsWith(mainDomain)) {
        isCustomDomain = true;
        tenantName = domainParts[0];
      }
    }

    return {
      host,
      protocol,
      port: port ? parseInt(port) : undefined,
      subdomain,
      domain: domain,
      tld: domainParts.length > 1 ? domainParts.slice(-2).join('.') : '',
      isCustomDomain,
      isSubdomain,
      tenantName
    };
  }

  /**
   * Check if domain is super admin domain
   */
  private static isSuperAdminDomain(domainInfo: DomainInfo): boolean {
    const superAdminDomains = [
      config.superAdminDomain || 'sehwagimmigration.com',
      'www.sehwagimmigration.com',
      'admin.sehwagimmigration.com'
    ];
    
    return superAdminDomains.includes(domainInfo.domain) || 
           domainInfo.subdomain === 'www' || 
           domainInfo.subdomain === 'admin';
  }

  /**
   * Check if domain is API domain
   */
  private static isApiDomain(domainInfo: DomainInfo): boolean {
    const apiDomains = [
      config.apiDomain || 'api.sehwagimmigration.com',
      'api.sehwagimmigration.com'
    ];
    
    return apiDomains.includes(domainInfo.domain) || domainInfo.subdomain === 'api';
  }

  /**
   * Resolve tenant from database
   */
  private static async resolveTenantFromDatabase(domainInfo: DomainInfo): Promise<ITenant | null> {
    try {
      let tenant: ITenant | null = null;

      // Try exact domain match first
      tenant = await Tenant.findOne({
        domain: domainInfo.domain,
        status: { $in: ['active', 'trial'] }
      }).lean() as unknown as ITenant | null;

      if (tenant) {
        return tenant;
      }

      // Try subdomain pattern match
      if (domainInfo.isSubdomain && domainInfo.tenantName) {
        tenant = await Tenant.findOne({
          $or: [
            { domain: domainInfo.tenantName },
            { name: { $regex: new RegExp(domainInfo.tenantName, 'i') } },
            { subdomain: domainInfo.tenantName }
          ],
          status: { $in: ['active', 'trial'] }
        }).lean() as unknown as ITenant | null;
      }

      // Try custom domain match
      if (!tenant && domainInfo.isCustomDomain) {
        tenant = await Tenant.findOne({
          customDomains: { $in: [domainInfo.domain] },
          status: { $in: ['active', 'trial'] }
        }).lean() as unknown as ITenant | null;
      }

      return tenant;
    } catch (error) {
      log.error('Error resolving tenant from database:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      return null;
    }
  }

  /**
   * Generate cache key for domain
   */
  private static generateCacheKey(domainInfo: DomainInfo): string {
    return `tenant_resolution:${domainInfo.domain}:${domainInfo.subdomain || ''}`;
  }

  /**
   * Update resolution statistics
   */
  private static updateStats(result: TenantResolutionResult, success: boolean): void {
    this.stats.totalResolutions++;
    
    if (success) {
      this.stats.successfulResolutions++;
    } else {
      this.stats.failedResolutions++;
    }

    // Update resolution methods
    const methodIndex = this.stats.resolutionMethods.findIndex(m => m.method === result.resolutionMethod);
    if (methodIndex >= 0) {
      this.stats.resolutionMethods[methodIndex].count++;
    } else {
      this.stats.resolutionMethods.push({ method: result.resolutionMethod, count: 1 });
    }

    // Update top tenants
    if (result.tenantId && result.tenant) {
      const tenantIndex = this.stats.topTenants.findIndex(t => t.tenantId === result.tenantId);
      if (tenantIndex >= 0) {
        this.stats.topTenants[tenantIndex].count++;
      } else {
        this.stats.topTenants.push({
          tenantId: result.tenantId,
          name: result.tenant.name,
          count: 1
        });
      }
    }

    // Update average resolution time
    const totalTime = this.stats.averageResolutionTime * (this.stats.totalResolutions - 1) + result.resolutionTime;
    this.stats.averageResolutionTime = totalTime / this.stats.totalResolutions;

    // Update error rate
    this.stats.errorRate = this.stats.failedResolutions / this.stats.totalResolutions;

    // Add to recent resolutions (keep only last 100)
    this.stats.recentResolutions.push({
      host: result.domainInfo.host,
      tenantId: result.tenantId,
      method: result.resolutionMethod,  
      success,
      timestamp: new Date()
    });

    // ✅ AGGRESSIVE CLEANUP
    if (this.stats.recentResolutions.length > this.MAX_RECENT_RESOLUTIONS) {
      this.stats.recentResolutions = this.stats.recentResolutions.slice(-this.MAX_RECENT_RESOLUTIONS);
    }

    // ✅ LIMIT OTHER STATS ARRAYS
    if (this.stats.topTenants.length > 20) {
      this.stats.topTenants = this.stats.topTenants.slice(0, 20);
    }
    
    if (this.stats.resolutionMethods.length > 10) {
      this.stats.resolutionMethods = this.stats.resolutionMethods.slice(0, 10);
    }

    // Sort top tenants by count
    this.stats.topTenants.sort((a, b) => b.count - a.count);
    this.stats.topTenants = this.stats.topTenants.slice(0, 10);

    // Sort resolution methods by count
    this.stats.resolutionMethods.sort((a, b) => b.count - a.count);
  }

  /**
   * Get tenant resolution statistics
   */
  static getStats(): TenantResolutionStats {
    return { ...this.stats };
  }

  /**
   * Clear resolution cache
   */
  static clearCache(): number {
    const count = this.cache.size;
    this.cache.clear();
    return count;
  }

  /**
   * Clean up expired cache entries
   */
  static cleanupCache(): number {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > (this.config.cacheTtl * 1000)) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }

  /**
   * Validate tenant domain format
   */
  static validateDomainFormat(domain: string): {
    isValid: boolean;
    errors: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const suggestions: string[] = [];

    if (!domain || domain.trim().length === 0) {
      errors.push('Domain is required');
      return { isValid: false, errors, suggestions };
    }

    const trimmedDomain = domain.trim().toLowerCase();

    // Check for valid domain format
    const domainPattern = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;
    if (!domainPattern.test(trimmedDomain)) {
      errors.push('Invalid domain format');
      suggestions.push('Use only lowercase letters, numbers, hyphens, and dots');
    }

    // Check for reserved subdomains
    const reservedSubdomains = ['www', 'api', 'admin', 'mail', 'ftp', 'blog', 'shop', 'app', 'dev', 'test', 'staging'];
    const domainParts = trimmedDomain.split('.');
    if (domainParts.length > 0 && reservedSubdomains.includes(domainParts[0])) {
      errors.push(`Cannot use reserved subdomain: ${domainParts[0]}`);
      suggestions.push('Choose a different subdomain name');
    }

    // Check for minimum length
    if (trimmedDomain.length < 3) {
      errors.push('Domain must be at least 3 characters long');
    }

    // Check for maximum length
    if (trimmedDomain.length > 253) {
      errors.push('Domain cannot exceed 253 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions
    };
  }

  /**
   * Generate tenant subdomain
   */
  static generateTenantSubdomain(tenantName: string): string {
    // Clean tenant name
    const cleanName = tenantName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const prefix = config.tenantDomainPrefix || 'portal';
    const mainDomain = config.superAdminDomain || 'sehwagimmigration.com';
    
    return `${prefix}.${cleanName}.${mainDomain}`;
  }

  /**
   * Check domain availability
   */
  static async checkDomainAvailability(domain: string): Promise<{
    available: boolean;
    reason?: string;
    suggestions?: string[];
  }> {
    try {
      // Validate domain format first
      const validation = this.validateDomainFormat(domain);
      if (!validation.isValid) {
        return {
          available: false,
          reason: 'Invalid domain format',
          suggestions: validation.suggestions
        };
      }

      // Check if domain is already taken
      const existingTenant = await Tenant.findOne({
        $or: [
          { domain },
          { customDomains: { $in: [domain] } }
        ]
      });

      if (existingTenant) {
        return {
          available: false,
          reason: 'Domain is already taken',
          suggestions: [`Try ${domain}-2`, `Try ${domain}-new`, `Try ${domain}-app`]
        };
      }

      // Check for reserved domains
      const reservedDomains = [
        'www.sehwagimmigration.com',
        'api.sehwagimmigration.com',
        'admin.sehwagimmigration.com',
        'mail.sehwagimmigration.com',
        'ftp.sehwagimmigration.com'
      ];

      if (reservedDomains.includes(domain)) {
        return {
          available: false,
          reason: 'Domain is reserved',
          suggestions: ['Choose a different domain name']
        };
      }

      return { available: true };
    } catch (error) {
      log.error('Error checking domain availability:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      return {
        available: false,
        reason: 'Error checking domain availability'
      };
    }
  }
}
