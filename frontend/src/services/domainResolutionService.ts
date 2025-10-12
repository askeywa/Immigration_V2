// frontend/src/services/domainResolutionService.ts
import { log } from '@/utils/logger';

export interface TenantDomainInfo {
  tenantId: string;
  tenantName: string;
  domain: string;
  subdomain?: string;
  isCustomDomain: boolean;
  isSubdomain: boolean;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
}

export interface DomainValidationResult {
  isValid: boolean;
  success?: boolean; // Alternative success property
  tenantInfo?: TenantDomainInfo;
  error?: string;
  redirectUrl?: string;
}

class DomainResolutionService {
  private cache = new Map<string, TenantDomainInfo>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  // Enhanced caching for API responses
  private apiCache = new Map<string, { data: any; timestamp: number }>();
  private readonly API_CACHE_TTL = 10 * 60 * 1000; // 10 minutes for API responses

  /**
   * Resolve tenant information from current domain
   */
  async resolveTenantFromDomain(): Promise<DomainValidationResult> {
    try {
      // Skip domain resolution for super admin pages
      if (window.location.pathname.startsWith('/super-admin')) {
        log.info('Skipping domain resolution for super admin page');
        return { isValid: true, tenantInfo: null };
      }
      
      const currentDomain = window.location.hostname;
      const currentUrl = window.location.href;

      // Check cache first
      const cached = this.getCachedTenantInfo(currentDomain);
      if (cached) {
        log.info('Domain resolution cache hit', { domain: currentDomain });
        return { isValid: true, tenantInfo: cached };
      }

      // Parse domain type
      const domainType = this.parseDomainType(currentDomain);
      
      if (domainType.isMainDomain) {
        return this.handleMainDomain(currentUrl);
      }

      if (domainType.isSubdomain) {
        return await this.handleSubdomain(currentDomain, domainType.subdomain!);
      }

      if (domainType.isCustomDomain) {
        return await this.handleCustomDomain(currentDomain);
      }

      return {
        isValid: false,
        error: 'Invalid domain format',
        redirectUrl: '/'
      };

    } catch (error) {
      log.error('Domain resolution failed', { error: error instanceof Error ? error.message : String(error) });
      return {
        isValid: false,
        error: 'Domain resolution failed',
        redirectUrl: '/'
      };
    }
  }

  /**
   * Parse domain type and extract information
   */
  private parseDomainType(domain: string) {
    const mainDomain = this.getMainDomain();
    // Extract domain without port for comparison
    const domainWithoutPort = domain.split(':')[0];
    const isMainDomain = domainWithoutPort === mainDomain || domain === mainDomain;
    
    // Check if it's a subdomain
    const subdomainPattern = new RegExp(`^([a-zA-Z0-9][a-zA-Z0-9-]*)\\.${mainDomain.replace('.', '\\.')}$`);
    const subdomainMatch = domain.match(subdomainPattern);
    
    const isSubdomain = !!subdomainMatch;
    const subdomain = isSubdomain ? subdomainMatch![1] : undefined;
    
    // Check if it's a custom domain (not main domain and not subdomain)
    const isCustomDomain = !isMainDomain && !isSubdomain;

    return {
      isMainDomain,
      isSubdomain,
      isCustomDomain,
      subdomain,
      mainDomain
    };
  }

  /**
   * Handle main domain requests
   */
  private handleMainDomain(currentUrl: string): DomainValidationResult {
    // Main domain can be used for super admin or tenant selection
    const path = new URL(currentUrl).pathname;
    
    if (path === '/super-admin' || path.startsWith('/super-admin/')) {
      return {
        isValid: true,
        tenantInfo: {
          tenantId: 'super-admin',
          tenantName: 'Super Admin',
          domain: this.getMainDomain(),
          isCustomDomain: false,
          isSubdomain: false,
          status: 'active'
        }
      };
    }

    // For other paths on main domain, redirect to tenant selection
    return {
      isValid: false,
      error: 'Tenant selection required',
      redirectUrl: `/tenant-selection`
    };
  }

  /**
   * Handle subdomain requests
   */
  private async handleSubdomain(domain: string, subdomain: string): Promise<DomainValidationResult> {
    try {
      // Validate subdomain format
      if (!this.isValidSubdomain(subdomain)) {
        return {
          isValid: false,
          error: 'Invalid subdomain format',
          redirectUrl: '/'
        };
      }

      // Fetch tenant info from API
      const tenantInfo = await this.fetchTenantBySubdomain(subdomain);
      
      if (!tenantInfo) {
        return {
          isValid: false,
          error: 'Tenant not found',
          redirectUrl: '/'
        };
      }

      // Cache the result
      this.setCachedTenantInfo(domain, tenantInfo);

      return {
        isValid: true,
        tenantInfo
      };

    } catch (error) {
      log.error('Subdomain resolution failed', { 
        subdomain, 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      return {
        isValid: false,
        error: 'Subdomain resolution failed',
        redirectUrl: '/'
      };
    }
  }

  /**
   * Handle custom domain requests
   */
  private async handleCustomDomain(domain: string): Promise<DomainValidationResult> {
    try {
      // Fetch tenant info from API
      const tenantInfo = await this.fetchTenantByCustomDomain(domain);
      
      if (!tenantInfo) {
        return {
          isValid: false,
          error: 'Domain not configured',
          redirectUrl: '/'
        };
      }

      // Cache the result
      this.setCachedTenantInfo(domain, tenantInfo);

      return {
        isValid: true,
        tenantInfo
      };

    } catch (error) {
      log.error('Custom domain resolution failed', { 
        domain, 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      return {
        isValid: false,
        error: 'Custom domain resolution failed',
        redirectUrl: '/'
      };
    }
  }

  /**
   * Fetch tenant information by subdomain
   */
  private async fetchTenantBySubdomain(subdomain: string): Promise<TenantDomainInfo | null> {
    try {
      const cacheKey = `subdomain:${subdomain}`;
      
      // Check API cache first
      const cached = this.apiCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.API_CACHE_TTL) {
        log.info('API cache hit for subdomain', { subdomain });
        return cached.data;
      }
      
      const response = await fetch(`/api/tenants/resolve/subdomain/${subdomain}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      if (!data.success || !data.tenant) {
        return null;
      }

      const tenantInfo = {
        tenantId: data.tenant._id,
        tenantName: data.tenant.name,
        domain: data.tenant.domain,
        subdomain: subdomain,
        isCustomDomain: false,
        isSubdomain: true,
        status: data.tenant.status
      };
      
      // Cache the API response
      this.apiCache.set(cacheKey, {
        data: tenantInfo,
        timestamp: Date.now()
      });

      return tenantInfo;

    } catch (error) {
      log.error('Failed to fetch tenant by subdomain', { 
        subdomain, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
  }

  /**
   * Fetch tenant information by custom domain
   */
  private async fetchTenantByCustomDomain(domain: string): Promise<TenantDomainInfo | null> {
    try {
      const cacheKey = `domain:${domain}`;
      
      // Check API cache first
      const cached = this.apiCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.API_CACHE_TTL) {
        log.info('API cache hit for custom domain', { domain });
        return cached.data;
      }
      
      const response = await fetch(`/api/tenants/resolve/domain/${encodeURIComponent(domain)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      if (!data.success || !data.tenant) {
        return null;
      }

      const tenantInfo = {
        tenantId: data.tenant._id,
        tenantName: data.tenant.name,
        domain: domain,
        isCustomDomain: true,
        isSubdomain: false,
        status: data.tenant.status
      };
      
      // Cache the API response
      this.apiCache.set(cacheKey, {
        data: tenantInfo,
        timestamp: Date.now()
      });

      return tenantInfo;

    } catch (error) {
      log.error('Failed to fetch tenant by custom domain', { 
        domain, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
  }

  /**
   * Validate subdomain format
   */
  private isValidSubdomain(subdomain: string): boolean {
    // Subdomain must be 3-63 characters, alphanumeric and hyphens only
    // Cannot start or end with hyphen
    const pattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    return pattern.test(subdomain) && subdomain.length >= 3 && subdomain.length <= 63;
  }

  /**
   * Get main domain from environment or current location
   */
  private getMainDomain(): string {
    const isDevelopment = import.meta.env.DEV;
    
    if (isDevelopment) {
      return import.meta.env.VITE_MAIN_DOMAIN || 'localhost';
    }
    
    return import.meta.env.VITE_MAIN_DOMAIN || 'ibuyscrap.ca';
  }

  /**
   * Get main domain URL
   */
  private getMainDomainUrl(): string {
    const protocol = window.location.protocol;
    const mainDomain = this.getMainDomain();
    return `${protocol}//${mainDomain}`;
  }

  /**
   * Cache management
   */
  private getCachedTenantInfo(domain: string): TenantDomainInfo | null {
    const expiry = this.cacheExpiry.get(domain);
    if (expiry && Date.now() < expiry) {
      return this.cache.get(domain) || null;
    }
    
    // Remove expired cache
    this.cache.delete(domain);
    this.cacheExpiry.delete(domain);
    return null;
  }

  private setCachedTenantInfo(domain: string, tenantInfo: TenantDomainInfo): void {
    this.cache.set(domain, tenantInfo);
    this.cacheExpiry.set(domain, Date.now() + this.CACHE_TTL);
  }

  /**
   * Clear cache for a specific domain
   */
  clearCache(domain?: string): void {
    if (domain) {
      this.cache.delete(domain);
      this.cacheExpiry.delete(domain);
    } else {
      this.cache.clear();
      this.cacheExpiry.clear();
    }
  }

  /**
   * Get current domain information
   */
  getCurrentDomainInfo(): { domain: string; isMain: boolean; isSubdomain: boolean; isCustom: boolean } {
    const domain = window.location.hostname;
    const domainType = this.parseDomainType(domain);
    
    return {
      domain,
      isMain: domainType.isMainDomain,
      isSubdomain: domainType.isSubdomain,
      isCustom: domainType.isCustomDomain
    };
  }

  /**
   * Generate tenant URL
   */
  generateTenantUrl(tenantInfo: TenantDomainInfo, path: string = ''): string {
    const protocol = window.location.protocol;
    
    if (tenantInfo.isSubdomain && tenantInfo.subdomain) {
      const mainDomain = this.getMainDomain();
      return `${protocol}//${tenantInfo.subdomain}.${mainDomain}${path}`;
    }
    
    if (tenantInfo.isCustomDomain) {
      return `${protocol}//${tenantInfo.domain}${path}`;
    }
    
    return `${protocol}//${this.getMainDomain()}${path}`;
  }
}

// Export singleton instance
export const domainResolutionService = new DomainResolutionService();
export default domainResolutionService;