// backend/src/controllers/subdomainProvisioningController.ts
import { Request, Response } from 'express';
import { TenantRequest } from '../middleware/tenantResolution';
import { AppError } from '../utils/errors';
import { log } from '../utils/logger';
import SubdomainProvisioningService, { 
  SubdomainProvisioningRequest, 
  BulkProvisioningRequest,
  SubdomainValidationResult 
} from '../services/subdomainProvisioningService';
import Subdomain from '../models/Subdomain';

export interface SubdomainCreateRequest {
  subdomain: string;
  type: 'tenant' | 'admin' | 'api' | 'custom';
  isPrimary?: boolean;
  isCustomDomain?: boolean;
  customDomain?: string;
  configuration?: {
    rateLimits?: {
      requestsPerMinute: number;
      burstSize: number;
    };
    caching?: {
      enabled: boolean;
      ttl: number;
    };
    security?: {
      corsOrigins: string[];
      allowedMethods: string[];
      securityHeaders: Record<string, string>;
    };
  };
  metadata?: {
    description?: string;
    tags?: string[];
    notes?: string;
  };
}

export interface SubdomainUpdateRequest {
  configuration?: {
    rateLimits?: {
      requestsPerMinute: number;
      burstSize: number;
    };
    caching?: {
      enabled: boolean;
      ttl: number;
    };
    security?: {
      corsOrigins: string[];
      allowedMethods: string[];
      securityHeaders: Record<string, string>;
    };
  };
  metadata?: {
    description?: string;
    tags?: string[];
    notes?: string;
  };
}

export interface SubdomainListQuery {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  healthStatus?: string;
  sslStatus?: string;
  search?: string;
  tenantId?: string;
}

export class SubdomainProvisioningController {
  private subdomainService: SubdomainProvisioningService;

  constructor() {
    this.subdomainService = SubdomainProvisioningService.getInstance();
  }

  /**
   * Create a new subdomain
   */
  async createSubdomain(req: TenantRequest, res: Response): Promise<void> {
    try {
      const subdomainData = (req as any).body as SubdomainCreateRequest;
      const tenantId = (req as any).tenantId || (req as any).body.tenantId;

      // Validate input
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
      }

      // Check permissions
      if (!this.hasSubdomainManagementPermission(req)) {
        throw new AppError('Insufficient permissions for subdomain management', 403);
      }

      // Create provisioning request
      const provisioningRequest: SubdomainProvisioningRequest = {
        tenantId,
        subdomain: subdomainData.subdomain,
        type: subdomainData.type,
        isPrimary: subdomainData.isPrimary,
        isCustomDomain: subdomainData.isCustomDomain,
        customDomain: subdomainData.customDomain,
        configuration: subdomainData.configuration,
        metadata: subdomainData.metadata
      };

      // Provision subdomain
      const result = await this.subdomainService.provisionSubdomain(
        provisioningRequest,
        (req as any).user?.id || 'system'
      );

      log.info('Subdomain created successfully', {
        tenantId,
        subdomain: subdomainData.subdomain,
        type: subdomainData.type,
        userId: (req as any).user?.id
      });

      (res as any).status(201).json({
        success: true,
        data: {
          id: result.subdomain._id,
          subdomain: result.subdomain.subdomain,
          fullDomain: result.subdomain.fullDomain,
          type: result.subdomain.type,
          status: result.subdomain.status,
          isPrimary: result.subdomain.isPrimary,
          isCustomDomain: result.subdomain.isCustomDomain,
          sslStatus: result.subdomain.sslStatus,
          healthStatus: result.subdomain.healthStatus,
          dnsRecordId: result.dnsRecordId,
          sslCertificateId: result.sslCertificateId,
          nginxConfigPath: result.nginxConfigPath,
          provisioningSteps: result.provisioningSteps,
          createdAt: result.subdomain.createdAt,
          updatedAt: result.subdomain.updatedAt
        }
      });
    } catch (error) {
      log.error('Failed to create subdomain', {
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
          error: 'Failed to create subdomain'
        });
      }
    }
  }

  /**
   * Validate subdomain request
   */
  async validateSubdomain(req: TenantRequest, res: Response): Promise<void> {
    try {
      const subdomainData = (req as any).body as SubdomainCreateRequest;
      const tenantId = (req as any).tenantId || (req as any).body.tenantId;

      // Validate input
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
      }

      if (!subdomainData.subdomain) {
        throw new AppError('Subdomain is required', 400);
      }

      // Check permissions
      if (!this.hasSubdomainManagementPermission(req)) {
        throw new AppError('Insufficient permissions for subdomain management', 403);
      }

      // Create validation request
      const validationRequest: SubdomainProvisioningRequest = {
        tenantId,
        subdomain: subdomainData.subdomain,
        type: subdomainData.type || 'tenant',
        isPrimary: subdomainData.isPrimary,
        isCustomDomain: subdomainData.isCustomDomain,
        customDomain: subdomainData.customDomain,
        configuration: subdomainData.configuration,
        metadata: subdomainData.metadata
      };

      // Validate subdomain
      const validation = await this.subdomainService.validateSubdomainRequest(validationRequest);

      log.info('Subdomain validation completed', {
        tenantId,
        subdomain: subdomainData.subdomain,
        isValid: validation.isValid,
        userId: (req as any).user?.id
      });

      (res as any).json({
        success: true,
        data: {
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings,
          suggestions: validation.suggestions,
          validatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      log.error('Failed to validate subdomain', {
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
          error: 'Failed to validate subdomain'
        });
      }
    }
  }

  /**
   * Get subdomain by ID
   */
  async getSubdomain(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { subdomainId } = (req as any).params;

      // Check permissions
      if (!this.hasSubdomainManagementPermission(req)) {
        throw new AppError('Insufficient permissions for subdomain management', 403);
      }

      // Get subdomain
      const subdomain = await Subdomain.findById(subdomainId)
        .populate('tenant')
        .populate('metadata.createdBy', 'name email')
        .populate('metadata.updatedBy', 'name email');

      if (!subdomain) {
        throw new AppError('Subdomain not found', 404);
      }

      // Check tenant access
      if (!(req as any).isSuperAdmin && subdomain.tenantId.toString() !== (req as any).tenantId) {
        throw new AppError('Access denied to this subdomain', 403);
      }

      log.info('Subdomain retrieved', {
        tenantId: (req as any).tenantId,
        subdomainId,
        subdomain: subdomain.subdomain,
        userId: (req as any).user?.id
      });

      (res as any).json({
        success: true,
        data: {
          id: subdomain._id,
          tenantId: subdomain.tenantId,
          subdomain: subdomain.subdomain,
          fullDomain: subdomain.fullDomain,
          type: subdomain.type,
          status: subdomain.status,
          isPrimary: subdomain.isPrimary,
          isCustomDomain: subdomain.isCustomDomain,
          dnsRecordId: subdomain.dnsRecordId,
          sslCertificateId: subdomain.sslCertificateId,
          sslStatus: subdomain.sslStatus,
          lastHealthCheck: subdomain.lastHealthCheck,
          healthStatus: subdomain.healthStatus,
          configuration: subdomain.configuration,
          metadata: subdomain.metadata,
          provisioningLog: subdomain.provisioningLog,
          createdAt: subdomain.createdAt,
          updatedAt: subdomain.updatedAt,
          tenant: subdomain.tenant
        }
      });
    } catch (error) {
      log.error('Failed to get subdomain', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        subdomainId: (req as any).params.subdomainId
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
          error: 'Failed to get subdomain'
        });
      }
    }
  }

  /**
   * List subdomains
   */
  async listSubdomains(req: TenantRequest, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        type,
        status,
        healthStatus,
        sslStatus,
        search,
        tenantId
      } = (req as any).query as SubdomainListQuery;

      // Check permissions
      if (!this.hasSubdomainManagementPermission(req)) {
        throw new AppError('Insufficient permissions for subdomain management', 403);
      }

      // Build filter
      const filter: any = {};

      // Apply tenant filter for non-super admins
      if (!(req as any).isSuperAdmin) {
        (filter as any).tenantId = (req as any).tenantId;
      } else if (tenantId) {
        (filter as any).tenantId = tenantId;
      }

      // Apply other filters
      if (type) (filter as any).type = type;
      if (status) (filter as any).status = status;
      if (healthStatus) (filter as any).healthStatus = healthStatus;
      if (sslStatus) (filter as any).sslStatus = sslStatus;

      // Apply search filter
      if (search) {
        filter.$or = [
          { subdomain: { $regex: search, $options: 'i' } },
          { fullDomain: { $regex: search, $options: 'i' } },
          { 'metadata.description': { $regex: search, $options: 'i' } }
        ];
      }

      // Calculate pagination
      const skip = (parseInt(page.toString()) - 1) * parseInt(limit.toString());

      // Get subdomains
      const [subdomains, total] = await Promise.all([
        Subdomain.find(filter)
          .populate('tenant', 'name domain')
          .populate('metadata.createdBy', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit.toString())),
        Subdomain.countDocuments(filter)
      ]);

      log.info('Subdomains listed', {
        tenantId: (req as any).tenantId,
        total,
        page: parseInt(page.toString()),
        limit: parseInt(limit.toString()),
        userId: (req as any).user?.id
      });

      (res as any).json({
        success: true,
        data: {
          subdomains: subdomains.map((subdomain: any) => ({
            id: subdomain._id,
            tenantId: subdomain.tenantId,
            subdomain: subdomain.subdomain,
            fullDomain: subdomain.fullDomain,
            type: subdomain.type,
            status: subdomain.status,
            isPrimary: subdomain.isPrimary,
            isCustomDomain: subdomain.isCustomDomain,
            sslStatus: subdomain.sslStatus,
            healthStatus: subdomain.healthStatus,
            lastHealthCheck: subdomain.lastHealthCheck,
            createdAt: subdomain.createdAt,
            updatedAt: subdomain.updatedAt,
            tenant: subdomain.tenant
          })),
          pagination: {
            page: parseInt(page.toString()),
            limit: parseInt(limit.toString()),
            total,
            pages: Math.ceil(total / parseInt(limit.toString()))
          }
        }
      });
    } catch (error) {
      log.error('Failed to list subdomains', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        query: (req as any).query
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
          error: 'Failed to list subdomains'
        });
      }
    }
  }

  /**
   * Update subdomain
   */
  async updateSubdomain(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { subdomainId } = (req as any).params;
      const updateData = (req as any).body as SubdomainUpdateRequest;

      // Check permissions
      if (!this.hasSubdomainManagementPermission(req)) {
        throw new AppError('Insufficient permissions for subdomain management', 403);
      }

      // Get subdomain
      const subdomain = await Subdomain.findById(subdomainId);
      if (!subdomain) {
        throw new AppError('Subdomain not found', 404);
      }

      // Check tenant access
      if (!(req as any).isSuperAdmin && subdomain.tenantId.toString() !== (req as any).tenantId) {
        throw new AppError('Access denied to this subdomain', 403);
      }

      // Update subdomain
      if (updateData.configuration) {
        subdomain.configuration = {
          ...subdomain.configuration,
          ...updateData.configuration
        };
      }

      if (updateData.metadata) {
        subdomain.metadata = {
          ...subdomain.metadata,
          ...updateData.metadata,
          updatedBy: (req as any).user?.id
        };
      }

      subdomain.updatedAt = new Date();
      await subdomain.save();

      log.info('Subdomain updated', {
        tenantId: (req as any).tenantId,
        subdomainId,
        subdomain: subdomain.subdomain,
        userId: (req as any).user?.id
      });

      (res as any).json({
        success: true,
        data: {
          id: subdomain._id,
          subdomain: subdomain.subdomain,
          fullDomain: subdomain.fullDomain,
          type: subdomain.type,
          status: subdomain.status,
          configuration: subdomain.configuration,
          metadata: subdomain.metadata,
          updatedAt: subdomain.updatedAt
        }
      });
    } catch (error) {
      log.error('Failed to update subdomain', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        subdomainId: (req as any).params.subdomainId,
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
          error: 'Failed to update subdomain'
        });
      }
    }
  }

  /**
   * Delete subdomain
   */
  async deleteSubdomain(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { subdomainId } = (req as any).params;

      // Check permissions
      if (!this.hasSubdomainManagementPermission(req)) {
        throw new AppError('Insufficient permissions for subdomain management', 403);
      }

      // Get subdomain
      const subdomain = await Subdomain.findById(subdomainId);
      if (!subdomain) {
        throw new AppError('Subdomain not found', 404);
      }

      // Check tenant access
      if (!(req as any).isSuperAdmin && subdomain.tenantId.toString() !== (req as any).tenantId) {
        throw new AppError('Access denied to this subdomain', 403);
      }

      // Check if subdomain can be deleted
      if (!(subdomain as any).canBeDeleted()) {
        throw new AppError('Subdomain cannot be deleted in its current status', 400);
      }

      // Mark as deleted (soft delete)
      subdomain.status = 'deleted';
      subdomain.healthStatus = 'critical';
      await (subdomain as any).addProvisioningLog('deletion', 'success', 'Subdomain marked as deleted');
      await subdomain.save();

      log.info('Subdomain deleted', {
        tenantId: (req as any).tenantId,
        subdomainId,
        subdomain: subdomain.subdomain,
        userId: (req as any).user?.id
      });

      (res as any).json({
        success: true,
        message: 'Subdomain deleted successfully',
        data: {
          id: subdomain._id,
          subdomain: subdomain.subdomain,
          status: subdomain.status,
          deletedAt: subdomain.updatedAt
        }
      });
    } catch (error) {
      log.error('Failed to delete subdomain', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        subdomainId: (req as any).params.subdomainId
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
          error: 'Failed to delete subdomain'
        });
      }
    }
  }

  /**
   * Bulk create subdomains
   */
  async bulkCreateSubdomains(req: TenantRequest, res: Response): Promise<void> {
    try {
      const bulkData = (req as any).body as BulkProvisioningRequest;
      const tenantId = (req as any).tenantId || bulkData.tenantId;

      // Validate input
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
      }

      if (!bulkData.subdomains || !Array.isArray(bulkData.subdomains) || bulkData.subdomains.length === 0) {
        throw new AppError('Subdomains array is required and cannot be empty', 400);
      }

      if (bulkData.subdomains.length > 50) {
        throw new AppError('Maximum 50 subdomains can be created at once', 400);
      }

      // Check permissions
      if (!this.hasSubdomainManagementPermission(req)) {
        throw new AppError('Insufficient permissions for subdomain management', 403);
      }

      // Bulk provision subdomains
      const result = await this.subdomainService.bulkProvisionSubdomains(
        { ...bulkData, tenantId },
        (req as any).user?.id || 'system'
      );

      log.info('Bulk subdomain creation completed', {
        tenantId,
        total: bulkData.subdomains.length,
        success: result.success,
        failed: result.failed,
        userId: (req as any).user?.id
      });

      (res as any).json({
        success: true,
        data: {
          summary: {
            total: bulkData.subdomains.length,
            success: result.success,
            failed: result.failed
          },
          results: result.results,
          completedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      log.error('Failed to bulk create subdomains', {
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
          error: 'Failed to bulk create subdomains'
        });
      }
    }
  }

  /**
   * Health check subdomain
   */
  async healthCheckSubdomain(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { subdomainId } = (req as any).params;

      // Check permissions
      if (!this.hasSubdomainManagementPermission(req)) {
        throw new AppError('Insufficient permissions for subdomain management', 403);
      }

      // Perform health check
      const healthCheck = await this.subdomainService.healthCheckSubdomain(subdomainId);

      log.info('Subdomain health check completed', {
        tenantId: (req as any).tenantId,
        subdomainId,
        overallStatus: healthCheck.overallStatus,
        userId: (req as any).user?.id
      });

      (res as any).json({
        success: true,
        data: healthCheck
      });
    } catch (error) {
      log.error('Failed to perform health check', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId: (req as any).tenantId,
        subdomainId: (req as any).params.subdomainId
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
          error: 'Failed to perform health check'
        });
      }
    }
  }

  /**
   * Get subdomain statistics
   */
  async getSubdomainStatistics(req: TenantRequest, res: Response): Promise<void> {
    try {
      // Check permissions
      if (!this.hasSubdomainManagementPermission(req)) {
        throw new AppError('Insufficient permissions for subdomain management', 403);
      }

      // Get statistics
      const tenantId = (req as any).isSuperAdmin ? (req as any).query.tenantId as string : (req as any).tenantId;
      const statistics = await this.subdomainService.getSubdomainStatistics(tenantId);

      log.info('Subdomain statistics retrieved', {
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });

      (res as any).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      log.error('Failed to get subdomain statistics', {
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
          error: 'Failed to get subdomain statistics'
        });
      }
    }
  }

  /**
   * Get subdomain provisioning service health
   */
  async getServiceHealth(req: TenantRequest, res: Response): Promise<void> {
    try {
      // Check permissions
      if (!this.hasSubdomainManagementPermission(req)) {
        throw new AppError('Insufficient permissions for subdomain management', 403);
      }

      // Get service health
      const health = await this.subdomainService.healthCheck();

      (res as any).json({
        success: true,
        data: {
          service: 'subdomain-provisioning',
          healthy: health.healthy,
          details: health.details,
          checkedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      log.error('Failed to get service health', {
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
          error: 'Failed to get service health'
        });
      }
    }
  }

  /**
   * Check if user has subdomain management permissions
   */
  private hasSubdomainManagementPermission(req: TenantRequest): boolean {
    // Super admin has all permissions
    if ((req as any).isSuperAdmin) {
      return true;
    }

    // Check if user has subdomain management role
    if ((req as any).user?.role === 'super_admin' || (req as any).user?.role === 'admin') {
      return true;
    }

    // Check tenant-specific permissions
    if ((req as any).tenantId && (req as any).user?.tenantPermissions?.includes('subdomain_management')) {
      return true;
    }

    return false;
  }
}

export default SubdomainProvisioningController;
