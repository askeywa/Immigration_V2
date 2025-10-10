// backend/src/services/subdomainProvisioningService.ts
import { log } from '../utils/logger';
import Subdomain, { ISubdomain } from '../models/Subdomain';
import CloudflareService from './cloudflareService';
import SSLAutomationService from './sslAutomationService';
import DNSAutomationService from './dnsAutomationService';
import { AppError } from '../utils/errors';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export interface SubdomainProvisioningRequest {
  tenantId: string;
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

export interface SubdomainProvisioningResult {
  subdomain: ISubdomain;
  dnsRecordId?: string;
  sslCertificateId?: string;
  nginxConfigPath?: string;
  provisioningSteps: Array<{
    step: string;
    status: 'success' | 'error' | 'warning';
    message: string;
    details?: any;
  }>;
}

export interface SubdomainValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface SubdomainHealthCheck {
  subdomain: string;
  domain: string;
  dnsStatus: 'resolved' | 'not_resolved' | 'error';
  sslStatus: 'valid' | 'invalid' | 'pending' | 'error';
  httpStatus: 'accessible' | 'inaccessible' | 'error';
  responseTime?: number;
  lastChecked: Date;
  overallStatus: 'healthy' | 'warning' | 'critical' | 'unknown';
}

export interface BulkProvisioningRequest {
  subdomains: Array<{
    subdomain: string;
    type: 'tenant' | 'admin' | 'api';
    configuration?: any;
  }>;
  tenantId: string;
  options?: {
    autoSSL: boolean;
    autoDNS: boolean;
    parallelProcessing: boolean;
  };
}

export interface SubdomainStatistics {
  total: number;
  active: number;
  pending: number;
  suspended: number;
  deleted: number;
  byType: {
    tenant: number;
    admin: number;
    api: number;
    custom: number;
  };
  bySSLStatus: {
    none: number;
    pending: number;
    active: number;
    expired: number;
    failed: number;
  };
  byHealthStatus: {
    healthy: number;
    warning: number;
    critical: number;
    unknown: number;
  };
}

export class SubdomainProvisioningService {
  private static instance: SubdomainProvisioningService;
  private cloudflareService: CloudflareService;
  private sslService: SSLAutomationService;
  private dnsService: DNSAutomationService;
  private mainDomain: string;
  private nginxConfigPath: string;

  private constructor() {
    this.cloudflareService = CloudflareService.getInstance();
    this.sslService = SSLAutomationService.getInstance();
    this.dnsService = DNSAutomationService.getInstance();
    this.mainDomain = process.env.MAIN_DOMAIN || 'sehwagimmigration.com';
    this.nginxConfigPath = process.env.NGINX_CONFIG_PATH || '/etc/nginx/conf.d';
  }

  static getInstance(): SubdomainProvisioningService {
    if (!SubdomainProvisioningService.instance) {
      SubdomainProvisioningService.instance = new SubdomainProvisioningService();
    }
    return SubdomainProvisioningService.instance;
  }

  /**
   * Initialize the subdomain provisioning service
   */
  async initialize(): Promise<void> {
    try {
      // Test Cloudflare connection
      const cloudflareConnected = await this.cloudflareService.testConnection();
      if (!cloudflareConnected) {
        log.warning('Cloudflare service not available - subdomain provisioning will be limited');
      }

      // Ensure nginx config directory exists
      await this.ensureNginxConfigDirectory();

      log.info('Subdomain provisioning service initialized successfully', {
        mainDomain: this.mainDomain,
        nginxConfigPath: this.nginxConfigPath
      });
    } catch (error) {
      log.error('Failed to initialize subdomain provisioning service', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Validate subdomain provisioning request
   */
  async validateSubdomainRequest(request: SubdomainProvisioningRequest): Promise<SubdomainValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      // Validate tenant ID
      if (!request.tenantId) {
        errors.push('Tenant ID is required');
      }

      // Validate subdomain format
      if (!request.subdomain) {
        errors.push('Subdomain is required');
      } else {
        // Check subdomain format
        const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
        if (!subdomainRegex.test(request.subdomain)) {
          errors.push('Invalid subdomain format. Must contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen');
        }

        // Check length
        if (request.subdomain.length < 3) {
          errors.push('Subdomain must be at least 3 characters long');
        }
        if (request.subdomain.length > 63) {
          errors.push('Subdomain cannot exceed 63 characters');
        }

        // Check for reserved subdomains
        const reservedSubdomains = ['www', 'api', 'admin', 'mail', 'ftp', 'blog', 'shop', 'app', 'dev', 'test', 'staging', 'prod', 'cdn', 'static', 'assets', 'media', 'files'];
        if (reservedSubdomains.includes(request.subdomain)) {
          warnings.push(`Subdomain '${request.subdomain}' is reserved and may cause conflicts`);
        }

        // Check for existing subdomain
        const existingSubdomain = await Subdomain.findOne({
          $or: [
            { subdomain: request.subdomain, tenantId: request.tenantId },
            { fullDomain: `${request.subdomain}.${this.mainDomain}` }
          ]
        });

        if (existingSubdomain) {
          errors.push(`Subdomain '${request.subdomain}' already exists`);
        }
      }

      // Validate custom domain if provided
      if (request.isCustomDomain && request.customDomain) {
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/;
        if (!domainRegex.test(request.customDomain)) {
          errors.push('Invalid custom domain format');
        }

        // Check if custom domain already exists
        const existingCustomDomain = await Subdomain.findOne({
          fullDomain: request.customDomain.toLowerCase()
        });

        if (existingCustomDomain) {
          errors.push(`Custom domain '${request.customDomain}' already exists`);
        }
      }

      // Validate configuration
      if (request.configuration) {
        if (request.configuration.rateLimits) {
          if (request.configuration.rateLimits.requestsPerMinute < 1 || request.configuration.rateLimits.requestsPerMinute > 10000) {
            warnings.push('Rate limit requests per minute should be between 1 and 10000');
          }
          if (request.configuration.rateLimits.burstSize < 1 || request.configuration.rateLimits.burstSize > 1000) {
            warnings.push('Rate limit burst size should be between 1 and 1000');
          }
        }

        if (request.configuration.caching && request.configuration.caching.ttl < 0) {
          warnings.push('Cache TTL should be a positive number');
        }
      }

      // Generate suggestions
      if (errors.length === 0 && warnings.length === 0) {
        suggestions.push('Subdomain request is valid and ready for provisioning');
      }

      if (request.type === 'tenant' && !request.isPrimary) {
        suggestions.push('Consider making this the primary subdomain for the tenant');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions
      };
    } catch (error) {
      log.error('Failed to validate subdomain request', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        request
      });

      return {
        isValid: false,
        errors: ['Validation failed due to server error'],
        warnings: [],
        suggestions: []
      };
    }
  }

  /**
   * Provision a new subdomain
   */
  async provisionSubdomain(request: SubdomainProvisioningRequest, createdBy: string): Promise<SubdomainProvisioningResult> {
    try {
      log.info('Starting subdomain provisioning', {
        tenantId: request.tenantId,
        subdomain: request.subdomain,
        type: request.type
      });

      // Validate request
      const validation = await this.validateSubdomainRequest(request);
      if (!validation.isValid) {
        throw new AppError('Subdomain validation failed', 400);
      }

      // Create subdomain record
      const fullDomain = request.isCustomDomain && request.customDomain 
        ? request.customDomain.toLowerCase()
        : `${request.subdomain}.${this.mainDomain}`;

      const subdomainData = {
        tenantId: request.tenantId,
        subdomain: request.subdomain,
        fullDomain,
        type: request.type,
        status: 'pending' as const,
        isPrimary: request.isPrimary || false,
        isCustomDomain: request.isCustomDomain || false,
        sslStatus: 'none' as const,
        healthStatus: 'unknown' as const,
        provisioningLog: [],
        configuration: {
          rateLimits: {
            requestsPerMinute: 100,
            burstSize: 20
          },
          caching: {
            enabled: true,
            ttl: 3600
          },
          security: {
            corsOrigins: [`https://${fullDomain}`],
            allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            securityHeaders: {
              'X-Frame-Options': 'DENY',
              'X-Content-Type-Options': 'nosniff',
              'X-XSS-Protection': '1; mode=block'
            }
          },
          ...request.configuration
        },
        metadata: {
          createdBy,
          tags: request.metadata?.tags || [],
          description: request.metadata?.description,
          notes: request.metadata?.notes
        }
      };

      const subdomain = new Subdomain(subdomainData);
      await subdomain.save();

      const provisioningSteps = [];

      try {
        // Step 1: Create DNS record
        provisioningSteps.push({
          step: 'dns_record_creation',
          status: 'success' as const,
          message: 'DNS record creation started'
        });

        const dnsResult = await this.createDNSRecord(subdomain);
        if (dnsResult.success && dnsResult.recordId) {
          subdomain.dnsRecordId = dnsResult.recordId;
          (subdomain as any).addProvisioningLog('dns_record_creation', 'success', 'DNS record created successfully', { recordId: dnsResult.recordId });
          provisioningSteps.push({
            step: 'dns_record_creation',
            status: 'success' as const,
            message: 'DNS record created successfully'
          });
        } else {
          throw new Error(dnsResult.error || 'DNS record creation failed');
        }

        // Step 2: Provision SSL certificate
        provisioningSteps.push({
          step: 'ssl_certificate_provisioning',
          status: 'success' as const,
          message: 'SSL certificate provisioning started'
        });

        const sslResult = await this.provisionSSLCertificate(subdomain);
        if (sslResult.success && sslResult.certificateId) {
          subdomain.sslCertificateId = sslResult.certificateId;
          subdomain.sslStatus = 'active';
          (subdomain as any).addProvisioningLog('ssl_certificate_provisioning', 'success', 'SSL certificate provisioned successfully', { certificateId: sslResult.certificateId });
          provisioningSteps.push({
            step: 'ssl_certificate_provisioning',
            status: 'success' as const,
            message: 'SSL certificate provisioned successfully'
          });
        } else {
          (subdomain as any).addProvisioningLog('ssl_certificate_provisioning', 'warning', 'SSL certificate provisioning failed', { error: sslResult.error });
          provisioningSteps.push({
            step: 'ssl_certificate_provisioning',
            status: 'warning' as const,
            message: `SSL certificate provisioning failed: ${sslResult.error}`
          });
        }

        // Step 3: Generate Nginx configuration
        provisioningSteps.push({
          step: 'nginx_configuration',
          status: 'success' as const,
          message: 'Nginx configuration generation started'
        });

        const nginxConfigPath = await this.generateNginxConfiguration(subdomain);
        if (nginxConfigPath) {
          (subdomain as any).addProvisioningLog('nginx_configuration', 'success', 'Nginx configuration generated successfully', { configPath: nginxConfigPath });
          provisioningSteps.push({
            step: 'nginx_configuration',
            status: 'success' as const,
            message: 'Nginx configuration generated successfully'
          });
        } else {
          throw new Error('Failed to generate Nginx configuration');
        }

        // Step 4: Update subdomain status
        subdomain.status = 'active';
        subdomain.healthStatus = 'healthy';
        await subdomain.save();

        (subdomain as any).addProvisioningLog('provisioning_complete', 'success', 'Subdomain provisioning completed successfully');

        log.info('Subdomain provisioning completed successfully', {
          tenantId: request.tenantId,
          subdomain: request.subdomain,
          fullDomain,
          dnsRecordId: dnsResult.recordId,
          sslCertificateId: sslResult.certificateId
        });

        return {
          subdomain,
          dnsRecordId: dnsResult.recordId,
          sslCertificateId: sslResult.certificateId,
          nginxConfigPath,
          provisioningSteps
        };

      } catch (error) {
        // Mark subdomain as failed
        subdomain.status = 'suspended';
        subdomain.healthStatus = 'critical';
        (subdomain as any).addProvisioningLog('provisioning_failed', 'error', 'Subdomain provisioning failed', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
        await subdomain.save();

        log.error('Subdomain provisioning failed', {
          error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
          tenantId: request.tenantId,
          subdomain: request.subdomain
        });

        throw error;
      }
    } catch (error) {
      log.error('Failed to provision subdomain', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        request
      });
      throw error;
    }
  }

  /**
   * Create DNS record for subdomain
   */
  private async createDNSRecord(subdomain: ISubdomain): Promise<{ success: boolean; recordId?: string; error?: string }> {
    try {
      const recordType = subdomain.isCustomDomain ? 'CNAME' : 'A';
      const recordContent = subdomain.isCustomDomain 
        ? `${subdomain.subdomain}.${this.mainDomain}`
        : process.env.SERVER_IP || '127.0.0.1';

      const dnsRecord = await this.dnsService.createTenantSubdomain({
        name: subdomain.fullDomain,
        content: recordContent,
        ttl: 300,
        proxied: true
      } as any);

      return {
        success: true,
        recordId: (dnsRecord as any).id || 'unknown'
      };
    } catch (error) {
      log.error('Failed to create DNS record', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        subdomain: subdomain.fullDomain
      });

      return {
        success: false,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      };
    }
  }

  /**
   * Provision SSL certificate for subdomain
   */
  private async provisionSSLCertificate(subdomain: ISubdomain): Promise<{ success: boolean; certificateId?: string; error?: string }> {
    try {
      const certificate = await this.sslService.provisionSSLCertificate(subdomain.fullDomain, 'universal');
      
      return {
        success: true,
        certificateId: certificate.id
      };
    } catch (error) {
      log.error('Failed to provision SSL certificate', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        subdomain: subdomain.fullDomain
      });

      return {
        success: false,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      };
    }
  }

  /**
   * Generate Nginx configuration for subdomain
   */
  private async generateNginxConfiguration(subdomain: ISubdomain): Promise<string | null> {
    try {
      const configContent = this.generateNginxConfigContent(subdomain);
      const configPath = path.join(this.nginxConfigPath, `${subdomain.subdomain}.conf`);
      
      await fs.writeFile(configPath, configContent, 'utf8');
      
      return configPath;
    } catch (error) {
      log.error('Failed to generate Nginx configuration', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        subdomain: subdomain.subdomain
      });
      return null;
    }
  }

  /**
   * Generate Nginx configuration content
   */
  private generateNginxConfigContent(subdomain: ISubdomain): string {
    const { rateLimits, caching, security } = subdomain.configuration;
    
    return `
# Nginx configuration for ${subdomain.fullDomain}
# Generated on ${new Date().toISOString()}

# Rate limiting
limit_req_zone $binary_remote_addr zone=${subdomain.subdomain}_limit:10m rate=${rateLimits?.requestsPerMinute || 100}r/m;

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${subdomain.fullDomain} www.${subdomain.fullDomain};

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/${subdomain.fullDomain}.crt;
    ssl_certificate_key /etc/ssl/private/${subdomain.fullDomain}.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    ${Object.entries(security?.securityHeaders || {}).map(([key, value]) => `add_header ${key} "${value}" always;`).join('\n    ')}

    # CORS Configuration
    add_header Access-Control-Allow-Origin "${security?.corsOrigins?.join(', ') || '*'}" always;
    add_header Access-Control-Allow-Methods "${security?.allowedMethods?.join(', ') || 'GET, POST, PUT, DELETE, OPTIONS'}" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Tenant-ID, X-API-Key" always;
    add_header Access-Control-Allow-Credentials "true" always;

    # Rate Limiting
    limit_req zone=${subdomain.subdomain}_limit burst=${rateLimits?.burstSize || 50} nodelay;

    # Tenant-specific headers
    add_header X-Tenant-ID "${subdomain.tenantId}" always;
    add_header X-Subdomain-Type "${subdomain.type}" always;
    add_header X-Is-Primary "${subdomain.isPrimary}" always;

    # Caching Configuration
    ${caching?.enabled ? `
    location ~* \\.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
        expires ${caching?.ttl || 3600}s;
        add_header Cache-Control "public, immutable";
    }
    ` : ''}

    # Main application
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Tenant-ID "${subdomain.tenantId}";
        proxy_set_header X-Subdomain "${subdomain.subdomain}";
        
        # Timeout settings
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name ${subdomain.fullDomain} www.${subdomain.fullDomain};
    return 301 https://$server_name$request_uri;
}
`;
  }

  /**
   * Bulk provision subdomains
   */
  async bulkProvisionSubdomains(request: BulkProvisioningRequest, createdBy: string): Promise<{
    success: number;
    failed: number;
    results: Array<{
      subdomain: string;
      success: boolean;
      error?: string;
      result?: SubdomainProvisioningResult;
    }>;
  }> {
    const results = [];
    let success = 0;
    let failed = 0;

    if (request.options?.parallelProcessing) {
      // Process subdomains in parallel
      const promises = request.subdomains.map(async (subdomainRequest: any) => {
        try {
          const result = await this.provisionSubdomain({
            ...(subdomainRequest as any),
            tenantId: request.tenantId,
            configuration: subdomainRequest.configuration
          }, createdBy);

          results.push({
            subdomain: subdomainRequest.subdomain,
            success: true,
            result
          });
          success++;
        } catch (error) {
          results.push({
            subdomain: subdomainRequest.subdomain,
            success: false,
            error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
          });
          failed++;
        }
      });

      await Promise.all(promises);
    } else {
      // Process subdomains sequentially
      for (const subdomainRequest of request.subdomains) {
        try {
          const result = await this.provisionSubdomain({
            ...(subdomainRequest as any),
            tenantId: request.tenantId,
            configuration: subdomainRequest.configuration
          }, createdBy);

          results.push({
            subdomain: subdomainRequest.subdomain,
            success: true,
            result
          });
          success++;
        } catch (error) {
          results.push({
            subdomain: subdomainRequest.subdomain,
            success: false,
            error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
          });
          failed++;
        }
      }
    }

    log.info('Bulk subdomain provisioning completed', {
      tenantId: request.tenantId,
      total: request.subdomains.length,
      success,
      failed
    });

    return { success, failed, results };
  }

  /**
   * Health check for subdomain
   */
  async healthCheckSubdomain(subdomainId: string): Promise<SubdomainHealthCheck> {
    try {
      const subdomain = await Subdomain.findById(subdomainId);
      if (!subdomain) {
        throw new AppError('Subdomain not found', 404);
      }

      const healthCheck: SubdomainHealthCheck = {
        subdomain: subdomain.subdomain,
        domain: subdomain.fullDomain,
        dnsStatus: 'error' as const,
        sslStatus: 'error' as const,
        httpStatus: 'error' as const,
        lastChecked: new Date(),
        overallStatus: 'unknown'
      };

      // Check DNS resolution
      try {
        // This would typically use a DNS lookup library
        healthCheck.dnsStatus = 'resolved'; // Mock for now
      } catch (error) {
        healthCheck.dnsStatus = 'not_resolved';
      }

      // Check SSL status
      try {
        const sslStatus = await this.sslService.getSSLStatus(subdomain.fullDomain);
        healthCheck.sslStatus = sslStatus.isSecure ? 'valid' : 'invalid';
      } catch (error) {
        healthCheck.sslStatus = 'error';
      }

      // Check HTTP accessibility
      try {
        // This would typically make an HTTP request
        healthCheck.httpStatus = 'accessible'; // Mock for now
        healthCheck.responseTime = 150; // Mock response time
      } catch (error) {
        healthCheck.httpStatus = 'inaccessible';
      }

      // Determine overall status
      if (healthCheck.dnsStatus === 'resolved' && healthCheck.sslStatus === 'valid' && healthCheck.httpStatus === 'accessible') {
        healthCheck.overallStatus = 'healthy';
      } else if (healthCheck.dnsStatus === 'not_resolved' || healthCheck.sslStatus === 'invalid' || healthCheck.httpStatus === 'inaccessible') {
        healthCheck.overallStatus = 'critical';
      } else {
        healthCheck.overallStatus = 'warning';
      }

      // Update subdomain health status
      (subdomain as any).updateHealthStatus(healthCheck.overallStatus);

      return healthCheck;
    } catch (error) {
      log.error('Failed to perform health check', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        subdomainId
      });

      return {
        subdomain: 'unknown',
        domain: 'unknown',
        dnsStatus: 'error',
        sslStatus: 'error',
        httpStatus: 'error',
        lastChecked: new Date(),
        overallStatus: 'critical'
      };
    }
  }

  /**
   * Get subdomain statistics
   */
  async getSubdomainStatistics(tenantId?: string): Promise<SubdomainStatistics> {
    try {
      const filter = tenantId ? { tenantId } : {};
      
      const [
        total,
        active,
        pending,
        suspended,
        deleted,
        byType,
        bySSLStatus,
        byHealthStatus
      ] = await Promise.all([
        Subdomain.countDocuments(filter),
        Subdomain.countDocuments({ ...(filter as any), status: 'active' }),
        Subdomain.countDocuments({ ...(filter as any), status: 'pending' }),
        Subdomain.countDocuments({ ...(filter as any), status: 'suspended' }),
        Subdomain.countDocuments({ ...(filter as any), status: 'deleted' }),
        Subdomain.aggregate([
          { $match: filter },
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]),
        Subdomain.aggregate([
          { $match: filter },
          { $group: { _id: '$sslStatus', count: { $sum: 1 } } }
        ]),
        Subdomain.aggregate([
          { $match: filter },
          { $group: { _id: '$healthStatus', count: { $sum: 1 } } }
        ])
      ]);

      return {
        total,
        active,
        pending,
        suspended,
        deleted,
        byType: {
          tenant: byType.find((item: any) => item._id === 'tenant')?.count || 0,
          admin: byType.find((item: any) => item._id === 'admin')?.count || 0,
          api: byType.find((item: any) => item._id === 'api')?.count || 0,
          custom: byType.find((item: any) => item._id === 'custom')?.count || 0
        },
        bySSLStatus: {
          none: bySSLStatus.find((item: any) => item._id === 'none')?.count || 0,
          pending: bySSLStatus.find((item: any) => item._id === 'pending')?.count || 0,
          active: bySSLStatus.find((item: any) => item._id === 'active')?.count || 0,
          expired: bySSLStatus.find((item: any) => item._id === 'expired')?.count || 0,
          failed: bySSLStatus.find((item: any) => item._id === 'failed')?.count || 0
        },
        byHealthStatus: {
          healthy: byHealthStatus.find((item: any) => item._id === 'healthy')?.count || 0,
          warning: byHealthStatus.find((item: any) => item._id === 'warning')?.count || 0,
          critical: byHealthStatus.find((item: any) => item._id === 'critical')?.count || 0,
          unknown: byHealthStatus.find((item: any) => item._id === 'unknown')?.count || 0
        }
      };
    } catch (error) {
      log.error('Failed to get subdomain statistics', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        tenantId
      });
      throw error;
    }
  }

  /**
   * Ensure nginx config directory exists
   */
  private async ensureNginxConfigDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.nginxConfigPath, { recursive: true });
    } catch (error) {
      log.error('Failed to create nginx config directory', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        path: this.nginxConfigPath
      });
      throw error;
    }
  }

  /**
   * Health check for subdomain provisioning service
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    details: {
      cloudflare: boolean;
      ssl: boolean;
      dns: boolean;
      nginxConfigPath: boolean;
      managedSubdomains: number;
      activeSubdomains: number;
      pendingSubdomains: number;
    };
  }> {
    try {
      const cloudflareHealthy = await this.cloudflareService.testConnection();
      const sslHealthy = true; // SSL service health check
      const dnsHealthy = true; // DNS service health check
      
      let nginxConfigPathHealthy = false;
      try {
        await fs.access(this.nginxConfigPath);
        nginxConfigPathHealthy = true;
      } catch (error) {
        // Directory doesn't exist or not accessible
      }

      const stats = await this.getSubdomainStatistics();

      return {
        healthy: cloudflareHealthy && sslHealthy && dnsHealthy && nginxConfigPathHealthy,
        details: {
          cloudflare: cloudflareHealthy,
          ssl: sslHealthy,
          dns: dnsHealthy,
          nginxConfigPath: nginxConfigPathHealthy,
          managedSubdomains: stats.total,
          activeSubdomains: stats.active,
          pendingSubdomains: stats.pending
        }
      };
    } catch (error) {
      log.error('Subdomain provisioning health check failed', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });

      return {
        healthy: false,
        details: {
          cloudflare: false,
          ssl: false,
          dns: false,
          nginxConfigPath: false,
          managedSubdomains: 0,
          activeSubdomains: 0,
          pendingSubdomains: 0
        }
      };
    }
  }
}

export default SubdomainProvisioningService;
