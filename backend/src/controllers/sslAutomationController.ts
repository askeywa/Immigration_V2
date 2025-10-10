// backend/src/controllers/sslAutomationController.ts
import { Request, Response } from 'express';
import { TenantRequest } from '../middleware/tenantResolution';
import { AppError } from '../utils/errors';
import { log } from '../utils/logger';
import SSLAutomationService, { CertificateRequest, SSLStatus } from '../services/sslAutomationService';

export interface SSLCertificateRequest {
  domain: string;
  type: 'universal' | 'dedicated' | 'custom';
  customCertificate?: {
    privateKey: string;
    certificate: string;
    chain?: string;
  };
}

export interface SSLValidationRequest {
  domain: string;
  includeGrade?: boolean;
  includeVulnerabilities?: boolean;
}

export interface SSLRenewalRequest {
  domain: string;
  forceRenewal?: boolean;
}

export interface BulkSSLRequest {
  domains: string[];
  type: 'universal' | 'dedicated';
  forceRenewal?: boolean;
}

export class SSLAutomationController {
  private sslService: SSLAutomationService;

  constructor() {
    this.sslService = SSLAutomationService.getInstance();
  }

  /**
   * Provision SSL certificate for a domain
   */
  async provisionSSLCertificate(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { domain, type, customCertificate } = (req as any).body as SSLCertificateRequest;

      // Validate input
      const validation = this.validateSSLCertificateRequest((req as any).body);
      if (!validation.isValid) {
        throw new AppError('Invalid SSL certificate request', 400, 'VALIDATION_ERROR', true, validation.errors);
      }

      // Check permissions
      if (!this.hasSSLManagementPermission(req)) {
        throw new AppError('Insufficient permissions for SSL management', 403);
      }

      // Provision SSL certificate
      const certificate = await this.sslService.provisionSSLCertificate(domain, type as 'universal' | 'dedicated');

      log.info('SSL certificate provisioned', {
        tenantId: (req as any).tenantId,
        domain,
        type,
        certificateId: certificate.id,
        userId: (req as any).user?.id
      });

      (res as any).status(201).json({
        success: true,
        data: {
          id: certificate.id,
          domain: certificate.domain,
          status: certificate.status,
          type: certificate.type,
          expiresAt: certificate.expiresAt,
          issuedAt: certificate.issuedAt,
          issuer: certificate.issuer,
          createdAt: certificate.createdAt,
          updatedAt: certificate.updatedAt
        }
      });
    } catch (error) {
      log.error('Failed to provision SSL certificate', {
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
          error: 'Failed to provision SSL certificate'
        });
      }
    }
  }

  /**
   * Get SSL status for a domain
   */
  async getSSLStatus(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { domain } = (req as any).params;
      const { includeGrade = true, includeVulnerabilities = true } = (req as any).query;

      // Validate domain
      if (!domain || !this.isValidDomain(domain)) {
        throw new AppError('Invalid domain format', 400);
      }

      // Check permissions
      if (!this.hasSSLManagementPermission(req)) {
        throw new AppError('Insufficient permissions for SSL management', 403);
      }

      // Get SSL status
      const status = await this.sslService.getSSLStatus(domain);

      // Include additional information based on query parameters
      let enhancedStatus = { ...status };
      
      if (includeGrade === 'true') {
        enhancedStatus.grade = await this.sslService.getSSLGrade(domain);
      }

      if (includeVulnerabilities === 'true') {
        const validation = await this.sslService.validateSSLCertificate(domain);
        enhancedStatus.vulnerabilities = validation.errors;
      }

      log.info('SSL status retrieved', {
        tenantId: (req as any).tenantId,
        domain,
        hasCertificate: status.hasCertificate,
        isSecure: status.isSecure,
        userId: (req as any).user?.id
      });

      (res as any).json({
        success: true,
        data: enhancedStatus
      });
    } catch (error) {
      log.error('Failed to get SSL status', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        domain: (req as any).params.domain
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
          error: 'Failed to get SSL status'
        });
      }
    }
  }

  /**
   * Validate SSL certificate
   */
  async validateSSLCertificate(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { domain } = (req as any).params;

      // Validate domain
      if (!domain || !this.isValidDomain(domain)) {
        throw new AppError('Invalid domain format', 400);
      }

      // Check permissions
      if (!this.hasSSLManagementPermission(req)) {
        throw new AppError('Insufficient permissions for SSL management', 403);
      }

      // Validate SSL certificate
      const validation = await this.sslService.validateSSLCertificate(domain);

      log.info('SSL certificate validated', {
        tenantId: (req as any).tenantId,
        domain,
        isValid: validation.isValid,
        score: validation.score,
        userId: (req as any).user?.id
      });

      (res as any).json({
        success: true,
        data: {
          domain,
          isValid: validation.isValid,
          score: validation.score,
          errors: validation.errors,
          warnings: validation.warnings,
          validatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      log.error('Failed to validate SSL certificate', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        domain: (req as any).params.domain
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
          error: 'Failed to validate SSL certificate'
        });
      }
    }
  }

  /**
   * Renew SSL certificate
   */
  async renewSSLCertificate(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { domain } = (req as any).params;
      const { forceRenewal = false } = (req as any).body as SSLRenewalRequest;

      // Validate domain
      if (!domain || !this.isValidDomain(domain)) {
        throw new AppError('Invalid domain format', 400);
      }

      // Check permissions
      if (!this.hasSSLManagementPermission(req)) {
        throw new AppError('Insufficient permissions for SSL management', 403);
      }

      // Renew SSL certificate
      const success = await this.sslService.renewSSLCertificate(domain);

      if (!success) {
        throw new AppError('Failed to renew SSL certificate', 500);
      }

      log.info('SSL certificate renewed', {
        tenantId: (req as any).tenantId,
        domain,
        forceRenewal,
        userId: (req as any).user?.id
      });

      (res as any).json({
        success: true,
        message: 'SSL certificate renewed successfully',
        data: {
          domain,
          renewedAt: new Date().toISOString(),
          forceRenewal
        }
      });
    } catch (error) {
      log.error('Failed to renew SSL certificate', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        domain: (req as any).params.domain
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
          error: 'Failed to renew SSL certificate'
        });
      }
    }
  }

  /**
   * Bulk renew SSL certificates
   */
  async bulkRenewSSLCertificates(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { domains, type, forceRenewal = false } = (req as any).body as BulkSSLRequest;

      // Validate input
      if (!domains || !Array.isArray(domains) || domains.length === 0) {
        throw new AppError('Invalid domains array', 400);
      }

      if (domains.length > 100) {
        throw new AppError('Too many domains (maximum 100 allowed)', 400);
      }

      // Validate each domain
      const invalidDomains = domains.filter((domain: any) => !this.isValidDomain(domain));
      if (invalidDomains.length > 0) {
        throw new AppError('Invalid domain formats found', 400, 'VALIDATION_ERROR', true, JSON.stringify(invalidDomains));
      }

      // Check permissions
      if (!this.hasSSLManagementPermission(req)) {
        throw new AppError('Insufficient permissions for SSL management', 403);
      }

      // Bulk renew SSL certificates
      const results = await this.sslService.bulkRenewSSLCertificates(domains);

      log.info('Bulk SSL certificate renewal completed', {
        tenantId: (req as any).tenantId,
        total: domains.length,
        success: results.success,
        failed: results.failed,
        userId: (req as any).user?.id
      });

      (res as any).json({
        success: true,
        data: {
          summary: {
            total: domains.length,
            success: results.success,
            failed: results.failed
          },
          results: results.results,
          completedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      log.error('Failed to bulk renew SSL certificates', {
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
          error: 'Failed to bulk renew SSL certificates'
        });
      }
    }
  }

  /**
   * Monitor SSL certificates
   */
  async monitorSSLCertificates(req: TenantRequest, res: Response): Promise<void> {
    try {
      // Check permissions
      if (!this.hasSSLManagementPermission(req)) {
        throw new AppError('Insufficient permissions for SSL management', 403);
      }

      // Monitor SSL certificates
      const monitoring = await this.sslService.monitorSSLCertificates();

      log.info('SSL certificate monitoring completed', {
        tenantId: (req as any).tenantId,
        expiringSoon: monitoring.expiringSoon.length,
        expired: monitoring.expired.length,
        healthy: monitoring.healthy.length,
        userId: (req as any).user?.id
      });

      (res as any).json({
        success: true,
        data: {
          monitoring,
          checkedAt: new Date().toISOString(),
          summary: {
            total: monitoring.expiringSoon.length + monitoring.expired.length + monitoring.healthy.length,
            healthy: monitoring.healthy.length,
            expiringSoon: monitoring.expiringSoon.length,
            expired: monitoring.expired.length
          }
        }
      });
    } catch (error) {
      log.error('Failed to monitor SSL certificates', {
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
          error: 'Failed to monitor SSL certificates'
        });
      }
    }
  }

  /**
   * Get SSL grade for a domain
   */
  async getSSLGrade(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { domain } = (req as any).params;

      // Validate domain
      if (!domain || !this.isValidDomain(domain)) {
        throw new AppError('Invalid domain format', 400);
      }

      // Check permissions
      if (!this.hasSSLManagementPermission(req)) {
        throw new AppError('Insufficient permissions for SSL management', 403);
      }

      // Get SSL grade
      const grade = await this.sslService.getSSLGrade(domain);

      log.info('SSL grade retrieved', {
        tenantId: (req as any).tenantId,
        domain,
        grade,
        userId: (req as any).user?.id
      });

      (res as any).json({
        success: true,
        data: {
          domain,
          grade,
          checkedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      log.error('Failed to get SSL grade', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        domain: (req as any).params.domain
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
          error: 'Failed to get SSL grade'
        });
      }
    }
  }

  /**
   * Get SSL automation service health
   */
  async getSSLHealth(req: TenantRequest, res: Response): Promise<void> {
    try {
      // Check permissions
      if (!this.hasSSLManagementPermission(req)) {
        throw new AppError('Insufficient permissions for SSL management', 403);
      }

      // Get SSL automation health
      const health = await this.sslService.healthCheck();

      (res as any).json({
        success: true,
        data: {
          service: 'ssl-automation',
          healthy: health.healthy,
          details: health.details,
          checkedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      log.error('Failed to get SSL health', {
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
          error: 'Failed to get SSL health'
        });
      }
    }
  }

  /**
   * Validate SSL certificate request
   */
  private validateSSLCertificateRequest(request: any): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!(request as any).domain) {
      errors.push('Domain is required');
    } else if (!this.isValidDomain((request as any).domain)) {
      errors.push('Invalid domain format');
    }

    if (!(request as any).type) {
      errors.push('Certificate type is required');
    } else if (!['universal', 'dedicated', 'custom'].includes((request as any).type)) {
      errors.push('Invalid certificate type');
    }

    if ((request as any).type === 'custom') {
      if (!(request as any).customCertificate) {
        errors.push('Custom certificate data is required for custom type');
      } else {
        if (!(request as any).customCertificate.privateKey) {
          errors.push('Private key is required for custom certificate');
        }
        if (!(request as any).customCertificate.certificate) {
          errors.push('Certificate is required for custom certificate');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate domain format
   */
  private isValidDomain(domain: string): boolean {
    if (!domain || typeof domain !== 'string') {
      return false;
    }

    // Basic domain validation regex
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/;
    return domainRegex.test(domain) && domain.length <= 253;
  }

  /**
   * Check if user has SSL management permissions
   */
  private hasSSLManagementPermission(req: TenantRequest): boolean {
    // Super admin has all permissions
    if ((req as any).isSuperAdmin) {
      return true;
    }

    // Check if user has SSL management role
    if ((req as any).user?.role === 'super_admin' || (req as any).user?.role === 'admin') {
      return true;
    }

    // Check tenant-specific permissions
    if ((req as any).tenantId && (req as any).user?.tenantPermissions?.includes('ssl_management')) {
      return true;
    }

    return false;
  }
}

export default SSLAutomationController;
