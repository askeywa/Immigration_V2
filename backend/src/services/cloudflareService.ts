// backend/src/services/cloudflareService.ts
import { log } from '../utils/logger';

export interface CloudflareConfig {
  apiToken: string;
  zoneId: string;
  baseUrl: string;
}

export interface DNSRecord {
  id?: string;
  type: string;
  name: string;
  content: string;
  proxied?: boolean;
  ttl?: number;
}

export interface PageRule {
  id?: string;
  targets: Array<{
    target: string;
    constraint: {
      operator: string;
      value: string;
    };
  }>;
  actions: Array<{
    id: string;
    value: any;
  }>;
  priority: number;
  status: string;
}

export interface FirewallRule {
  id?: string;
  action: string;
  priority: number;
  paused: boolean;
  description: string;
  filter: {
    expression: string;
  };
}

export interface Worker {
  id?: string;
  name: string;
  script: string;
  route?: string;
  environment?: string;
}

export class CloudflareService {
  private static instance: CloudflareService;
  private config: CloudflareConfig;

  private constructor() {
    this.config = {
      apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
      zoneId: process.env.CLOUDFLARE_ZONE_ID || '',
      baseUrl: 'https://api.cloudflare.com/client/v4'
    };
  }

  static getInstance(): CloudflareService {
    if (!CloudflareService.instance) {
      CloudflareService.instance = new CloudflareService();
    }
    return CloudflareService.instance;
  }

  /**
   * Make authenticated request to Cloudflare API
   */
  private async makeRequest(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(`Cloudflare API error: ${(result as any)?.errors?.[0]?.message || 'Unknown error'}`);
      }

      return result;
    } catch (error) {
      log.error('Cloudflare API request failed', {
        endpoint,
        method,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.makeRequest(`/zones/${this.config.zoneId}`);
      log.info('Cloudflare API connection successful', {
        zone: result.result?.name,
        status: result.result?.status
      });
      return true;
    } catch (error) {
      log.error('Cloudflare API connection failed', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      return false;
    }
  }

  /**
   * Get zone information
   */
  async getZoneInfo(): Promise<any> {
    try {
      const result = await this.makeRequest(`/zones/${this.config.zoneId}`);
      return result.result;
    } catch (error) {
      log.error('Failed to get zone info', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Create DNS record
   */
  async createDNSRecord(record: DNSRecord): Promise<any> {
    try {
      const result = await this.makeRequest(
        `/zones/${this.config.zoneId}/dns_records`,
        'POST',
        record
      );
      
      log.info('DNS record created', {
        name: record.name,
        type: record.type,
        content: record.content
      });
      
      return result.result;
    } catch (error) {
      log.error('Failed to create DNS record', {
        record,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Update DNS record
   */
  async updateDNSRecord(recordId: string, record: Partial<DNSRecord>): Promise<any> {
    try {
      const result = await this.makeRequest(
        `/zones/${this.config.zoneId}/dns_records/${recordId}`,
        'PUT',
        record
      );
      
      log.info('DNS record updated', {
        recordId,
        updates: record
      });
      
      return result.result;
    } catch (error) {
      log.error('Failed to update DNS record', {
        recordId,
        record,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Delete DNS record
   */
  async deleteDNSRecord(recordId: string): Promise<boolean> {
    try {
      await this.makeRequest(
        `/zones/${this.config.zoneId}/dns_records/${recordId}`,
        'DELETE'
      );
      
      log.info('DNS record deleted', { recordId });
      return true;
    } catch (error) {
      log.error('Failed to delete DNS record', {
        recordId,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      return false;
    }
  }

  /**
   * List DNS records
   */
  async listDNSRecords(): Promise<DNSRecord[]> {
    try {
      const result = await this.makeRequest(`/zones/${this.config.zoneId}/dns_records`);
      return result.result;
    } catch (error) {
      log.error('Failed to list DNS records', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Create Page Rule
   */
  async createPageRule(rule: PageRule): Promise<any> {
    try {
      const result = await this.makeRequest(
        `/zones/${this.config.zoneId}/pagerules`,
        'POST',
        rule
      );
      
      log.info('Page rule created', {
        targets: rule.targets,
        actions: rule.actions
      });
      
      return result.result;
    } catch (error) {
      log.error('Failed to create page rule', {
        rule,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Update Page Rule
   */
  async updatePageRule(ruleId: string, rule: Partial<PageRule>): Promise<any> {
    try {
      const result = await this.makeRequest(
        `/zones/${this.config.zoneId}/pagerules/${ruleId}`,
        'PUT',
        rule
      );
      
      log.info('Page rule updated', {
        ruleId,
        updates: rule
      });
      
      return result.result;
    } catch (error) {
      log.error('Failed to update page rule', {
        ruleId,
        rule,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Delete Page Rule
   */
  async deletePageRule(ruleId: string): Promise<boolean> {
    try {
      await this.makeRequest(
        `/zones/${this.config.zoneId}/pagerules/${ruleId}`,
        'DELETE'
      );
      
      log.info('Page rule deleted', { ruleId });
      return true;
    } catch (error) {
      log.error('Failed to delete page rule', {
        ruleId,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      return false;
    }
  }

  /**
   * Create Firewall Rule
   */
  async createFirewallRule(rule: FirewallRule): Promise<any> {
    try {
      const result = await this.makeRequest(
        `/zones/${this.config.zoneId}/firewall/rules`,
        'POST',
        rule
      );
      
      log.info('Firewall rule created', {
        description: rule.description,
        action: rule.action
      });
      
      return result.result;
    } catch (error) {
      log.error('Failed to create firewall rule', {
        rule,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Update Firewall Rule
   */
  async updateFirewallRule(ruleId: string, rule: Partial<FirewallRule>): Promise<any> {
    try {
      const result = await this.makeRequest(
        `/zones/${this.config.zoneId}/firewall/rules/${ruleId}`,
        'PUT',
        rule
      );
      
      log.info('Firewall rule updated', {
        ruleId,
        updates: rule
      });
      
      return result.result;
    } catch (error) {
      log.error('Failed to update firewall rule', {
        ruleId,
        rule,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Delete Firewall Rule
   */
  async deleteFirewallRule(ruleId: string): Promise<boolean> {
    try {
      await this.makeRequest(
        `/zones/${this.config.zoneId}/firewall/rules/${ruleId}`,
        'DELETE'
      );
      
      log.info('Firewall rule deleted', { ruleId });
      return true;
    } catch (error) {
      log.error('Failed to delete firewall rule', {
        ruleId,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      return false;
    }
  }

  /**
   * Create Worker
   */
  async createWorker(worker: Worker): Promise<any> {
    try {
      const result = await this.makeRequest(
        `/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${worker.name}`,
        'PUT',
        { script: worker.script }
      );
      
      log.info('Worker created', { name: worker.name });
      return result;
    } catch (error) {
      log.error('Failed to create worker', {
        worker: worker.name,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Deploy Worker with route
   */
  async deployWorker(workerName: string, route: string): Promise<any> {
    try {
      const result = await this.makeRequest(
        `/zones/${this.config.zoneId}/workers/routes`,
        'POST',
        {
          pattern: route,
          script: workerName
        }
      );
      
      log.info('Worker deployed', {
        name: workerName,
        route
      });
      
      return result.result;
    } catch (error) {
      log.error('Failed to deploy worker', {
        workerName,
        route,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Update zone settings
   */
  async updateZoneSetting(setting: string, value: any): Promise<any> {
    try {
      const result = await this.makeRequest(
        `/zones/${this.config.zoneId}/settings/${setting}`,
        'PATCH',
        { value }
      );
      
      log.info('Zone setting updated', {
        setting,
        value
      });
      
      return result.result;
    } catch (error) {
      log.error('Failed to update zone setting', {
        setting,
        value,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Purge cache
   */
  async purgeCache(purgeAll: boolean = false, tags?: string[], hosts?: string[]): Promise<boolean> {
    try {
      const data: any = {};
      
      if (purgeAll) {
        (data as any).purge_everything = true;
      } else {
        if (tags && tags.length > 0) {
          (data as any).tags = tags;
        }
        if (hosts && hosts.length > 0) {
          (data as any).hosts = hosts;
        }
      }

      await this.makeRequest(
        `/zones/${this.config.zoneId}/purge_cache`,
        'POST',
        data
      );
      
      log.info('Cache purged', {
        purgeAll,
        tags,
        hosts
      });
      
      return true;
    } catch (error) {
      log.error('Failed to purge cache', {
        purgeAll,
        tags,
        hosts,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      return false;
    }
  }

  /**
   * Get analytics data
   */
  async getAnalytics(startDate: string, endDate: string, metrics: string[] = ['requests', 'bandwidth']): Promise<any> {
    try {
      const params = new URLSearchParams({
        since: startDate,
        until: endDate,
        metrics: metrics.join(',')
      });

      const result = await this.makeRequest(`/zones/${this.config.zoneId}/analytics/dashboard?${params}`);
      return result.result;
    } catch (error) {
      log.error('Failed to get analytics', {
        startDate,
        endDate,
        metrics,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Setup tenant subdomain
   */
  async setupTenantSubdomain(tenantName: string, targetIP: string): Promise<boolean> {
    try {
      // Create A record for tenant subdomain
      await this.createDNSRecord({
        type: 'A',
        name: tenantName,
        content: targetIP,
        proxied: true,
        ttl: 1
      });

      // Create page rule for tenant subdomain
      await this.createPageRule({
        targets: [{
          target: 'url',
          constraint: {
            operator: 'matches',
            value: `${tenantName}.${process.env.MAIN_DOMAIN}/*`
          }
        }],
        actions: [{
          id: 'cache_level',
          value: 'cache_everything'
        }],
        priority: 10,
        status: 'active'
      });

      log.info('Tenant subdomain setup completed', {
        tenantName,
        targetIP
      });

      return true;
    } catch (error) {
      log.error('Failed to setup tenant subdomain', {
        tenantName,
        targetIP,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      return false;
    }
  }

  /**
   * Remove tenant subdomain
   */
  async removeTenantSubdomain(tenantName: string): Promise<boolean> {
    try {
      // Find and delete DNS record
      const records = await this.listDNSRecords();
      const record = records.find((r: any) => r.name === tenantName && r.type === 'A');
      
      if (record && record.id) {
        await this.deleteDNSRecord(record.id);
      }

      // Find and delete page rule (this would require listing page rules first)
      // For now, we'll just log that it needs to be done manually
      log.warning('Page rule cleanup required for tenant', { tenantName });

      log.info('Tenant subdomain removed', { tenantName });
      return true;
    } catch (error) {
      log.error('Failed to remove tenant subdomain', {
        tenantName,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      return false;
    }
  }
}

export default CloudflareService;
