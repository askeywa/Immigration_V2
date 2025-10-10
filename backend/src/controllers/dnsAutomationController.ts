// backend/src/controllers/dnsAutomationController.ts
import { Request, Response } from 'express';
import { TenantRequest } from '../middleware/tenantResolution';
import { AppError } from '../utils/errors';
import { log } from '../utils/logger';
import CloudflareService from '../services/cloudflareService';

export interface DNSRecordRequest {
  type: 'A' | 'CNAME' | 'MX' | 'TXT' | 'AAAA';
  name: string;
  content: string;
  ttl?: number;
  proxied?: boolean;
  priority?: number; // For MX records
}

export interface SubdomainRequest {
  subdomain: string;
  targetIP: string;
  proxied?: boolean;
  ttl?: number;
}

export interface BulkDNSRequest {
  records: DNSRecordRequest[];
  dryRun?: boolean;
}

export interface DNSValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class DNSAutomationController {
  private cloudflareService: CloudflareService;

  constructor() {
    this.cloudflareService = CloudflareService.getInstance();
  }

  /**
   * Create a new DNS record
   */
  async createDNSRecord(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { type, name, content, ttl, proxied, priority } = (req as any).body as DNSRecordRequest;

      // Validate input
      const validation = this.validateDNSRecord({ type, name, content, ttl, proxied, priority });
      if (!validation.isValid) {
        throw new AppError('Invalid DNS record data', 400, 'VALIDATION_ERROR', true, validation.errors);
      }

      // Check permissions
      if (!this.hasDNSManagementPermission(req)) {
        throw new AppError('Insufficient permissions for DNS management', 403);
      }

      // Create DNS record
      const record = await this.cloudflareService.createDNSRecord({
        type,
        name,
        content,
        ttl: ttl || 1,
        proxied: proxied ?? true
      });

      log.info('DNS record created', {
        tenantId: (req as any).tenantId,
        recordId: record.id,
        type,
        name,
        content,
        userId: (req as any).user?.id
      });

      (res as any).status(201).json({
        success: true,
        data: {
          id: record.id,
          type,
          name,
          content,
          ttl: record.ttl,
          proxied: record.proxied,
          created: new Date().toISOString()
        }
      });
    } catch (error) {
      log.error('Failed to create DNS record', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        body: (req as any).body
      });

      if (error instanceof AppError) {
        (res as any).status(error.statusCode).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          details: error.details
        });
      } else {
        (res as any).status(500).json({
          success: false,
          error: 'Failed to create DNS record'
        });
      }
    }
  }

  /**
   * Create tenant subdomain
   */
  async createTenantSubdomain(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { subdomain, targetIP, proxied, ttl } = (req as any).body as SubdomainRequest;

      // Validate subdomain
      const subdomainValidation = this.validateSubdomain(subdomain);
      if (!subdomainValidation.isValid) {
        throw new AppError('Invalid subdomain', 400, 'VALIDATION_ERROR', true, subdomainValidation.errors);
      }

      // Check if subdomain is available
      const isAvailable = await this.checkSubdomainAvailability(subdomain);
      if (!isAvailable) {
        throw new AppError('Subdomain already exists', 409);
      }

      // Check permissions
      if (!this.hasDNSManagementPermission(req)) {
        throw new AppError('Insufficient permissions for subdomain creation', 403);
      }

      // Create subdomain
      const success = await this.cloudflareService.setupTenantSubdomain(
        subdomain,
        targetIP || process.env.DIGITALOCEAN_LOAD_BALANCER_IP || '127.0.0.1'
      );

      if (!success) {
        throw new AppError('Failed to create subdomain', 500);
      }

      log.info('Tenant subdomain created', {
        tenantId: (req as any).tenantId,
        subdomain,
        targetIP,
        userId: (req as any).user?.id
      });

      (res as any).status(201).json({
        success: true,
        data: {
          subdomain,
          targetIP,
          proxied: proxied ?? true,
          ttl: ttl || 1,
          created: new Date().toISOString(),
          url: `https://${subdomain}.${process.env.MAIN_DOMAIN || 'sehwagimmigration.com'}`
        }
      });
    } catch (error) {
      log.error('Failed to create tenant subdomain', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        body: (req as any).body
      });

      if (error instanceof AppError) {
        (res as any).status(error.statusCode).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          details: error.details
        });
      } else {
        (res as any).status(500).json({
          success: false,
          error: 'Failed to create tenant subdomain'
        });
      }
    }
  }

  /**
   * Update DNS record
   */
  async updateDNSRecord(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { recordId } = (req as any).params;
      const updates = (req as any).body as Partial<DNSRecordRequest>;

      // Validate updates
      const validation = this.validateDNSRecord(updates, true);
      if (!validation.isValid) {
        throw new AppError('Invalid DNS record data', 400, 'VALIDATION_ERROR', true, validation.errors);
      }

      // Check permissions
      if (!this.hasDNSManagementPermission(req)) {
        throw new AppError('Insufficient permissions for DNS management', 403);
      }

      // Update DNS record
      const record = await this.cloudflareService.updateDNSRecord(recordId, updates);

      log.info('DNS record updated', {
        tenantId: (req as any).tenantId,
        recordId,
        updates,
        userId: (req as any).user?.id
      });

      (res as any).json({
        success: true,
        data: {
          id: record.id,
          ...updates,
          updated: new Date().toISOString()
        }
      });
    } catch (error) {
      log.error('Failed to update DNS record', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        recordId: (req as any).params.recordId,
        body: (req as any).body
      });

      if (error instanceof AppError) {
        (res as any).status(error.statusCode).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          details: error.details
        });
      } else {
        (res as any).status(500).json({
          success: false,
          error: 'Failed to update DNS record'
        });
      }
    }
  }

  /**
   * Delete DNS record
   */
  async deleteDNSRecord(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { recordId } = (req as any).params;

      // Check permissions
      if (!this.hasDNSManagementPermission(req)) {
        throw new AppError('Insufficient permissions for DNS management', 403);
      }

      // Delete DNS record
      const success = await this.cloudflareService.deleteDNSRecord(recordId);

      if (!success) {
        throw new AppError('Failed to delete DNS record', 500);
      }

      log.info('DNS record deleted', {
        tenantId: (req as any).tenantId,
        recordId,
        userId: (req as any).user?.id
      });

      (res as any).json({
        success: true,
        message: 'DNS record deleted successfully'
      });
    } catch (error) {
      log.error('Failed to delete DNS record', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        recordId: (req as any).params.recordId
      });

      if (error instanceof AppError) {
        (res as any).status(error.statusCode).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          details: error.details
        });
      } else {
        (res as any).status(500).json({
          success: false,
          error: 'Failed to delete DNS record'
        });
      }
    }
  }

  /**
   * Remove tenant subdomain
   */
  async removeTenantSubdomain(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { subdomain } = (req as any).params;

      // Check permissions
      if (!this.hasDNSManagementPermission(req)) {
        throw new AppError('Insufficient permissions for DNS management', 403);
      }

      // Remove subdomain
      const success = await this.cloudflareService.removeTenantSubdomain(subdomain);

      if (!success) {
        throw new AppError('Failed to remove subdomain', 500);
      }

      log.info('Tenant subdomain removed', {
        tenantId: (req as any).tenantId,
        subdomain,
        userId: (req as any).user?.id
      });

      (res as any).json({
        success: true,
        message: 'Tenant subdomain removed successfully'
      });
    } catch (error) {
      log.error('Failed to remove tenant subdomain', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        subdomain: (req as any).params.subdomain
      });

      if (error instanceof AppError) {
        (res as any).status(error.statusCode).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          details: error.details
        });
      } else {
        (res as any).status(500).json({
          success: false,
          error: 'Failed to remove tenant subdomain'
        });
      }
    }
  }

  /**
   * List DNS records
   */
  async listDNSRecords(req: TenantRequest, res: Response): Promise<void> {
    try {
      // Check permissions
      if (!this.hasDNSManagementPermission(req)) {
        throw new AppError('Insufficient permissions for DNS management', 403);
      }

      // Get DNS records
      const records = await this.cloudflareService.listDNSRecords();

      // Filter records based on tenant context if needed
      const filteredRecords = this.filterRecordsByTenant(records, (req as any).tenantId);

      log.info('DNS records listed', {
        tenantId: (req as any).tenantId,
        recordCount: filteredRecords.length,
        userId: (req as any).user?.id
      });

      (res as any).json({
        success: true,
        data: {
          records: filteredRecords,
          total: filteredRecords.length
        }
      });
    } catch (error) {
      log.error('Failed to list DNS records', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId
      });

      if (error instanceof AppError) {
        (res as any).status(error.statusCode).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          details: error.details
        });
      } else {
        (res as any).status(500).json({
          success: false,
          error: 'Failed to list DNS records'
        });
      }
    }
  }

  /**
   * Bulk create DNS records
   */
  async bulkCreateDNSRecords(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { records, dryRun = false } = (req as any).body as BulkDNSRequest;

      // Validate all records
      const validationResults = (records as any).map((record: any) => ({
        record,
        validation: this.validateDNSRecord(record)
      }));

      const invalidRecords = validationResults.filter((r: any) => !r.validation.isValid);
      if (invalidRecords.length > 0) {
        throw new AppError('Invalid DNS records found', 400, 'VALIDATION_ERROR', true, JSON.stringify({
          invalidRecords: invalidRecords.map((r: any) => ({
            record: r.record,
            errors: r.validation.errors
          }))
        }));
      }

      // Check permissions
      if (!this.hasDNSManagementPermission(req)) {
        throw new AppError('Insufficient permissions for DNS management', 403);
      }

      if (dryRun) {
        (res as any).json({
          success: true,
          data: {
            message: 'Dry run completed',
            recordsToCreate: (records as any).length,
            validRecords: (records as any).length
          }
        });
        return;
      }

      // Create records
      const results = [];
      for (const record of records) {
        try {
          const created = await this.cloudflareService.createDNSRecord(record);
          results.push({
            success: true,
            record: record.name,
            id: created.id
          });
        } catch (error) {
          results.push({
            success: false,
            record: record.name,
            error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
          });
        }
      }

      const successCount = results.filter((r: any) => r.success).length;
      const failureCount = results.filter((r: any) => !r.success).length;

      log.info('Bulk DNS records creation completed', {
        tenantId: (req as any).tenantId,
        total: (records as any).length,
        success: successCount,
        failures: failureCount,
        userId: (req as any).user?.id
      });

      (res as any).status(201).json({
        success: true,
        data: {
          results,
          summary: {
            total: (records as any).length,
            success: successCount,
            failures: failureCount
          }
        }
      });
    } catch (error) {
      log.error('Failed to bulk create DNS records', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        body: (req as any).body
      });

      if (error instanceof AppError) {
        (res as any).status(error.statusCode).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          details: error.details
        });
      } else {
        (res as any).status(500).json({
          success: false,
          error: 'Failed to bulk create DNS records'
        });
      }
    }
  }

  /**
   * Check subdomain availability
   */
  async checkSubdomainAvailabilityEndpoint(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { subdomain } = (req as any).params;

      // Validate subdomain
      const validation = this.validateSubdomain(subdomain);
      if (!validation.isValid) {
        throw new AppError('Invalid subdomain format', 400, 'VALIDATION_ERROR', true, validation.errors);
      }

      // Check availability
      const isAvailable = await this.checkSubdomainAvailability(subdomain);

      (res as any).json({
        success: true,
        data: {
          subdomain,
          available: isAvailable,
          checked: new Date().toISOString()
        }
      });
    } catch (error) {
      log.error('Failed to check subdomain availability', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        subdomain: (req as any).params.subdomain
      });

      if (error instanceof AppError) {
        (res as any).status(error.statusCode).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          details: error.details
        });
      } else {
        (res as any).status(500).json({
          success: false,
          error: 'Failed to check subdomain availability'
        });
      }
    }
  }

  /**
   * Validate DNS record data
   */
  private validateDNSRecord(record: Partial<DNSRecordRequest>, isUpdate: boolean = false): DNSValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!isUpdate) {
      if (!record.type) {
        errors.push('Type is required');
      } else if (!['A', 'CNAME', 'MX', 'TXT', 'AAAA'].includes(record.type)) {
        errors.push('Invalid record type');
      }

      if (!record.name) {
        errors.push('Name is required');
      }

      if (!record.content) {
        errors.push('Content is required');
      }
    }

    // Validate record type specific requirements
    if (record.type === 'MX' && record.priority === undefined) {
      errors.push('Priority is required for MX records');
    }

    if (record.type === 'CNAME' && record.content && !record.content.endsWith('.')) {
      warnings.push('CNAME content should end with a dot for absolute domain names');
    }

    // Validate TTL
    if (record.ttl !== undefined && (record.ttl < 1 || record.ttl > 86400)) {
      errors.push('TTL must be between 1 and 86400 seconds');
    }

    // Validate name format
    if (record.name && !/^[a-zA-Z0-9.-]+$/.test(record.name)) {
      errors.push('Name contains invalid characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate subdomain format
   */
  private validateSubdomain(subdomain: string): DNSValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!subdomain) {
      errors.push('Subdomain is required');
      return { isValid: false, errors, warnings };
    }

    // Check length
    if (subdomain.length < 2) {
      errors.push('Subdomain must be at least 2 characters long');
    }

    if (subdomain.length > 63) {
      errors.push('Subdomain must be less than 63 characters long');
    }

    // Check format
    if (!/^[a-zA-Z0-9-]+$/.test(subdomain)) {
      errors.push('Subdomain can only contain letters, numbers, and hyphens');
    }

    if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
      errors.push('Subdomain cannot start or end with a hyphen');
    }

    // Check reserved names
    const reservedNames = ['www', 'api', 'admin', 'cdn', 'assets', 'static', 'mail', 'ftp', 'blog'];
    if (reservedNames.includes(subdomain.toLowerCase())) {
      errors.push('Subdomain is reserved and cannot be used');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if subdomain is available
   */
  private async checkSubdomainAvailability(subdomain: string): Promise<boolean> {
    try {
      const records = await this.cloudflareService.listDNSRecords();
      const existingRecord = (records as any).find((record: any) => 
        record.name === subdomain || record.name === `${subdomain}.${process.env.MAIN_DOMAIN || 'sehwagimmigration.com'}`
      );
      return !existingRecord;
    } catch (error) {
      log.error('Failed to check subdomain availability', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        subdomain
      });
      return false;
    }
  }

  /**
   * Check if user has DNS management permissions
   */
  private hasDNSManagementPermission(req: TenantRequest): boolean {
    // Super admin has all permissions
    if ((req as any).isSuperAdmin) {
      return true;
    }

    // Check if user has DNS management role
    if ((req as any).user?.role === 'super_admin' || (req as any).user?.role === 'admin') {
      return true;
    }

    // Check tenant-specific permissions
    if ((req as any).tenantId && (req as any).user?.tenantPermissions?.includes('dns_management')) {
      return true;
    }

    return false;
  }

  /**
   * Filter DNS records by tenant context
   */
  private filterRecordsByTenant(records: any[], tenantId?: string): any[] {
    if (!tenantId || !tenantId) {
      return records;
    }

    // For tenant users, only show records related to their tenant
    return (records as any).filter((record: any) => {
      const recordName = record.name.toLowerCase();
      const tenantName = tenantId.toLowerCase();
      
      return recordName.includes(tenantName) || 
             recordName === tenantId || 
             recordName === `${tenantId}.${process.env.MAIN_DOMAIN || 'sehwagimmigration.com'}`;
    });
  }
}

export default DNSAutomationController;
