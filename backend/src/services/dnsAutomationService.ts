// backend/src/services/dnsAutomationService.ts
import { log } from '../utils/logger';
import CloudflareService from './cloudflareService';
import { ITenant } from '../models/Tenant';

export interface DNSAutomationConfig {
  cloudflareApiToken: string;
  cloudflareZoneId: string;
  mainDomain: string;
  loadBalancerIP: string;
}

export interface SubdomainConfig {
  subdomain: string;
  targetIP?: string;
  proxied: boolean;
  ttl: number;
  priority?: number;
}

export interface DNSRecord {
  id?: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
  priority?: number;
  created?: string;
  modified?: string;
}

export interface SubdomainStatus {
  subdomain: string;
  exists: boolean;
  recordId?: string;
  targetIP?: string;
  proxied: boolean;
  ttl: number;
  status: 'active' | 'pending' | 'error';
  lastChecked: string;
}

export class DNSAutomationService {
  private static instance: DNSAutomationService;
  private cloudflareService: CloudflareService;
  private config: DNSAutomationConfig;

  private constructor() {
    this.config = {
      cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN || '',
      cloudflareZoneId: process.env.CLOUDFLARE_ZONE_ID || '',
      mainDomain: process.env.MAIN_DOMAIN || 'sehwagimmigration.com',
      loadBalancerIP: process.env.DIGITALOCEAN_LOAD_BALANCER_IP || '127.0.0.1'
    };

    this.cloudflareService = CloudflareService.getInstance();
  }

  static getInstance(): DNSAutomationService {
    if (!DNSAutomationService.instance) {
      DNSAutomationService.instance = new DNSAutomationService();
    }
    return DNSAutomationService.instance;
  }

  /**
   * Initialize the DNS automation service
   */
  async initialize(): Promise<void> {
    try {
      // Test Cloudflare connection
      const isConnected = await this.cloudflareService.testConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to Cloudflare API');
      }

      log.info('DNS automation service initialized successfully', {
        mainDomain: this.config.mainDomain,
        loadBalancerIP: this.config.loadBalancerIP
      });
    } catch (error) {
      log.error('Failed to initialize DNS automation service', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Create tenant subdomain automatically
   */
  async createTenantSubdomain(tenant: ITenant): Promise<SubdomainStatus> {
    try {
      const subdomain = this.generateSubdomain(tenant);
      const config: SubdomainConfig = {
        subdomain,
        targetIP: this.config.loadBalancerIP,
        proxied: true,
        ttl: 1
      };

      // Check if subdomain already exists
      const existingStatus = await this.getSubdomainStatus(subdomain);
      if (existingStatus.exists) {
        log.warning('Subdomain already exists', {
          tenantId: tenant._id?.toString(),
          subdomain,
          existingRecordId: existingStatus.recordId
        });
        return existingStatus;
      }

      // Create DNS record
      const record = await this.cloudflareService.createDNSRecord({
        type: 'A',
        name: subdomain,
        content: config.targetIP || '127.0.0.1',
        proxied: config.proxied,
        ttl: config.ttl
      });

      // Create page rule for subdomain
      await this.createSubdomainPageRule(subdomain);

      log.info('Tenant subdomain created successfully', {
        tenantId: tenant._id?.toString(),
        tenantName: tenant.name,
        subdomain,
        recordId: record.id,
        targetIP: config.targetIP
      });

      return {
        subdomain,
        exists: true,
        recordId: record.id,
        targetIP: config.targetIP,
        proxied: config.proxied,
        ttl: config.ttl,
        status: 'active',
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      log.error('Failed to create tenant subdomain', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: tenant._id?.toString(),
        tenantName: tenant.name
      });
      throw error;
    }
  }

  /**
   * Remove tenant subdomain
   */
  async removeTenantSubdomain(tenant: ITenant): Promise<boolean> {
    try {
      const subdomain = this.generateSubdomain(tenant);

      // Remove DNS record
      const success = await this.cloudflareService.removeTenantSubdomain(subdomain);

      // Remove page rule (this would need to be implemented in CloudflareService)
      // For now, we'll log that it needs manual cleanup
      log.warn('Page rule cleanup required for subdomain', {
        tenantId: tenant._id?.toString(),
        subdomain
      });

      if (success) {
        log.info('Tenant subdomain removed successfully', {
          tenantId: tenant._id?.toString(),
          tenantName: tenant.name,
          subdomain
        });
      }

      return success;
    } catch (error) {
      log.error('Failed to remove tenant subdomain', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: tenant._id?.toString(),
        tenantName: tenant.name
      });
      return false;
    }
  }

  /**
   * Get subdomain status
   */
  async getSubdomainStatus(subdomain: string): Promise<SubdomainStatus> {
    try {
      const records = await this.cloudflareService.listDNSRecords();
      const record = records.find((r: any) => 
        r.name === subdomain || 
        r.name === `${subdomain}.${this.config.mainDomain}`
      );

      if (!record) {
        return {
          subdomain,
          exists: false,
          proxied: false,
          ttl: 0,
          status: 'error',
          lastChecked: new Date().toISOString()
        };
      }

      return {
        subdomain,
        exists: true,
        recordId: record.id,
        targetIP: record.content,
        proxied: record.proxied || false,
        ttl: record.ttl || 1,
        status: 'active',
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      log.error('Failed to get subdomain status', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        subdomain
      });
      
      return {
        subdomain,
        exists: false,
        proxied: false,
        ttl: 0,
        status: 'error',
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Bulk create subdomains for multiple tenants
   */
  async bulkCreateSubdomains(tenants: ITenant[]): Promise<{
    success: number;
    failed: number;
    results: Array<{
      tenantId: string;
      tenantName: string;
      subdomain: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    const results = [];
    let success = 0;
    let failed = 0;

    for (const tenant of tenants) {
      try {
        const status = await this.createTenantSubdomain(tenant);
        results.push({
          tenantId: (tenant._id as any)?.toString() || 'unknown',
          tenantName: tenant.name,
          subdomain: status.subdomain,
          success: true
        });
        success++;
      } catch (error) {
        results.push({
          tenantId: (tenant._id as any)?.toString() || 'unknown',
          tenantName: tenant.name,
          subdomain: this.generateSubdomain(tenant),
          success: false,
          error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
        });
        failed++;
      }
    }

    log.info('Bulk subdomain creation completed', {
      total: tenants.length,
      success,
      failed
    });

    return { success, failed, results };
  }

  /**
   * Validate subdomain availability
   */
  async validateSubdomainAvailability(subdomain: string): Promise<{
    available: boolean;
    reason?: string;
  }> {
    try {
      // Check format
      if (!/^[a-zA-Z0-9-]+$/.test(subdomain)) {
        return {
          available: false,
          reason: 'Invalid characters in subdomain'
        };
      }

      if (subdomain.length < 2 || subdomain.length > 63) {
        return {
          available: false,
          reason: 'Subdomain must be 2-63 characters long'
        };
      }

      if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
        return {
          available: false,
          reason: 'Subdomain cannot start or end with hyphen'
        };
      }

      // Check reserved names
      const reservedNames = [
        'www', 'api', 'admin', 'cdn', 'assets', 'static', 'mail', 'ftp', 'blog',
        'app', 'dev', 'test', 'staging', 'prod', 'production', 'support', 'help',
        'docs', 'status', 'monitor', 'health', 'metrics', 'logs', 'backup'
      ];

      if (reservedNames.includes(subdomain.toLowerCase())) {
        return {
          available: false,
          reason: 'Subdomain is reserved'
        };
      }

      // Check if subdomain exists
      const status = await this.getSubdomainStatus(subdomain);
      if (status.exists) {
        return {
          available: false,
          reason: 'Subdomain already exists'
        };
      }

      return { available: true };
    } catch (error) {
      log.error('Failed to validate subdomain availability', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        subdomain
      });
      
      return {
        available: false,
        reason: 'Validation failed'
      };
    }
  }

  /**
   * Generate subdomain from tenant information
   */
  private generateSubdomain(tenant: ITenant): string {
    // Use tenant slug if available, otherwise generate from name
    let baseSubdomain = (tenant as any).slug || tenant.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Clean the subdomain
    baseSubdomain = baseSubdomain
      .replace(/[^a-zA-Z0-9-]/g, '-') // Replace invalid characters with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    // Ensure minimum length
    if (baseSubdomain.length < 2) {
      baseSubdomain = `tenant-${baseSubdomain}`;
    }

    // Ensure maximum length
    if (baseSubdomain.length > 50) {
      baseSubdomain = baseSubdomain.substring(0, 50);
    }

    // Add tenant ID suffix if needed to ensure uniqueness
    const tenantId = (tenant._id as any)?.toString().substring(0, 8) || 'unknown';
    const finalSubdomain = `${baseSubdomain}-${tenantId}`;

    return finalSubdomain;
  }

  /**
   * Create page rule for subdomain
   */
  private async createSubdomainPageRule(subdomain: string): Promise<void> {
    try {
      await this.cloudflareService.createPageRule({
        targets: [{
          target: 'url',
          constraint: {
            operator: 'matches',
            value: `${subdomain}.${this.config.mainDomain}/*`
          }
        }],
        actions: [{
          id: 'cache_level',
          value: 'cache_everything'
        }],
        priority: 10,
        status: 'active'
      });

      log.info('Subdomain page rule created', { subdomain });
    } catch (error) {
      log.error('Failed to create subdomain page rule', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        subdomain
      });
      // Don't throw error as DNS record creation is more important
    }
  }

  /**
   * Get all tenant subdomains
   */
  async getAllTenantSubdomains(): Promise<SubdomainStatus[]> {
    try {
      const records = await this.cloudflareService.listDNSRecords();
      const subdomainRecords = records.filter((record: any) => 
        record.type === 'A' && 
        record.name.includes('.') &&
        record.name.endsWith(`.${this.config.mainDomain}`)
      );

      const subdomainStatuses = await Promise.all(
        subdomainRecords.map(async (record: any) => {
          const subdomain = record.name.replace(`.${this.config.mainDomain}`, '');
          return this.getSubdomainStatus(subdomain);
        })
      );

      return subdomainStatuses;
    } catch (error) {
      log.error('Failed to get all tenant subdomains', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      return [];
    }
  }

  /**
   * Sync tenant subdomains with database
   */
  async syncTenantSubdomains(tenants: ITenant[]): Promise<{
    created: number;
    updated: number;
    errors: number;
    summary: Array<{
      tenantId: string;
      tenantName: string;
      action: 'created' | 'updated' | 'error';
      subdomain: string;
      error?: string;
    }>;
  }> {
    const summary = [];
    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const tenant of tenants) {
      try {
        const expectedSubdomain = this.generateSubdomain(tenant);
        const currentStatus = await this.getSubdomainStatus(expectedSubdomain);

        if (!currentStatus.exists) {
          // Create new subdomain
          const newStatus = await this.createTenantSubdomain(tenant);
          summary.push({
            tenantId: (tenant._id as any)?.toString() || 'unknown',
            tenantName: tenant.name,
            action: 'created',
            subdomain: newStatus.subdomain
          });
          created++;
        } else {
          // Subdomain exists, check if it needs updating
          const needsUpdate = currentStatus.targetIP !== this.config.loadBalancerIP;
          
          if (needsUpdate) {
            // Update existing subdomain
            await this.cloudflareService.updateDNSRecord(currentStatus.recordId!, {
              content: this.config.loadBalancerIP,
              proxied: true,
              ttl: 1
            });
            
            summary.push({
              tenantId: (tenant._id as any)?.toString() || 'unknown',
              tenantName: tenant.name,
              action: 'updated',
              subdomain: expectedSubdomain
            });
            updated++;
          }
        }
      } catch (error) {
        summary.push({
          tenantId: (tenant._id as any)?.toString() || 'unknown',
          tenantName: tenant.name,
          action: 'error',
          subdomain: this.generateSubdomain(tenant),
          error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
        });
        errors++;
      }
    }

    log.info('Tenant subdomain sync completed', {
      total: tenants.length,
      created,
      updated,
      errors
    });

    return { created, updated, errors, summary: summary.map((s: any) => ({
      ...s,
      tenantId: s.tenantId || 'unknown',
      action: s.action as 'error' | 'created' | 'updated'
    })) };
  }

  /**
   * Health check for DNS automation service
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    details: {
      cloudflare: boolean;
      mainDomain: string;
      loadBalancerIP: string;
      subdomainCount: number;
    };
  }> {
    try {
      const cloudflareHealthy = await this.cloudflareService.testConnection();
      const subdomains = await this.getAllTenantSubdomains();

      return {
        healthy: cloudflareHealthy,
        details: {
          cloudflare: cloudflareHealthy,
          mainDomain: this.config.mainDomain,
          loadBalancerIP: this.config.loadBalancerIP,
          subdomainCount: subdomains.length
        }
      };
    } catch (error) {
      log.error('DNS automation health check failed', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });

      return {
        healthy: false,
        details: {
          cloudflare: false,
          mainDomain: this.config.mainDomain,
          loadBalancerIP: this.config.loadBalancerIP,
          subdomainCount: 0
        }
      };
    }
  }
}

export default DNSAutomationService;
