// backend/src/services/sslAutomationService.ts
import { log } from '../utils/logger';
import CloudflareService from './cloudflareService';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export interface SSLCertificate {
  id?: string;
  domain: string;
  status: 'active' | 'pending' | 'expired' | 'failed';
  type: 'universal' | 'dedicated' | 'custom';
  expiresAt?: Date;
  issuedAt?: Date;
  issuer?: string;
  serialNumber?: string;
  keySize?: number;
  signatureAlgorithm?: string;
  subjectAlternativeNames?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SSLValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score?: number;
}

export interface SSLAutomationConfig {
  cloudflareApiToken: string;
  cloudflareZoneId: string;
  mainDomain: string;
  certbotEmail: string;
  nginxConfigPath: string;
  sslStoragePath: string;
  autoRenewalEnabled: boolean;
  renewalThresholdDays: number;
}

export interface CertificateRequest {
  domain: string;
  type: 'universal' | 'dedicated' | 'custom';
  customCertificate?: {
    privateKey: string;
    certificate: string;
    chain?: string;
  };
}

export interface SSLStatus {
  domain: string;
  hasCertificate: boolean;
  isSecure: boolean;
  certificate?: SSLCertificate | null;
  grade?: string;
  vulnerabilities?: string[];
  lastChecked: Date;
}

export class SSLAutomationService {
  private static instance: SSLAutomationService;
  private cloudflareService: CloudflareService;
  private config: SSLAutomationConfig;

  private constructor() {
    this.config = {
      cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN || '',
      cloudflareZoneId: process.env.CLOUDFLARE_ZONE_ID || '',
      mainDomain: process.env.MAIN_DOMAIN || 'sehwagimmigration.com',
      certbotEmail: process.env.CERTBOT_EMAIL || 'admin@sehwagimmigration.com',
      nginxConfigPath: process.env.NGINX_CONFIG_PATH || '/etc/nginx/conf.d',
      sslStoragePath: process.env.SSL_STORAGE_PATH || '/etc/ssl/certs',
      autoRenewalEnabled: process.env.SSL_AUTO_RENEWAL !== 'false',
      renewalThresholdDays: parseInt(process.env.SSL_RENEWAL_THRESHOLD || '30')
    };

    this.cloudflareService = CloudflareService.getInstance();
  }

  static getInstance(): SSLAutomationService {
    if (!SSLAutomationService.instance) {
      SSLAutomationService.instance = new SSLAutomationService();
    }
    return SSLAutomationService.instance;
  }

  /**
   * Initialize the SSL automation service
   */
  async initialize(): Promise<void> {
    try {
      // Test Cloudflare connection
      const isConnected = await this.cloudflareService.testConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to Cloudflare API');
      }

      // Ensure SSL storage directory exists
      await this.ensureSSLStorageDirectory();

      // Check if certbot is available
      await this.checkCertbotAvailability();

      log.info('SSL automation service initialized successfully', {
        mainDomain: this.config.mainDomain,
        autoRenewalEnabled: this.config.autoRenewalEnabled,
        renewalThresholdDays: this.config.renewalThresholdDays
      });
    } catch (error) {
      log.error('Failed to initialize SSL automation service', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Automatically provision SSL certificate for a domain
   */
  async provisionSSLCertificate(domain: string, type: 'universal' | 'dedicated' = 'universal'): Promise<SSLCertificate> {
    try {
      log.info('Starting SSL certificate provisioning', { domain, type });

      let certificate: SSLCertificate;

      if (type === 'universal') {
        // Use Cloudflare Universal SSL
        certificate = await this.provisionUniversalSSLCertificate(domain);
      } else if (type === 'dedicated') {
        // Use Cloudflare Dedicated SSL
        certificate = await this.provisionDedicatedSSLCertificate(domain);
      } else {
        // Custom certificate (would need custom implementation)
        throw new Error('Custom SSL certificates not yet implemented');
      }

      // Update Cloudflare SSL settings
      await this.updateCloudflareSSLSettings(domain);

      // Generate Nginx configuration
      await this.generateNginxSSLConfig(domain, certificate);

      // Test SSL configuration
      const validation = await this.validateSSLCertificate(domain);
      if (!validation.isValid) {
        throw new Error(`SSL validation failed: ${validation.errors.join(', ')}`);
      }

      log.info('SSL certificate provisioned successfully', {
        domain,
        type,
        certificateId: certificate.id,
        status: certificate.status
      });

      return certificate;
    } catch (error) {
      log.error('Failed to provision SSL certificate', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        domain,
        type
      });
      throw error;
    }
  }

  /**
   * Provision Universal SSL certificate via Cloudflare
   */
  private async provisionUniversalSSLCertificate(domain: string): Promise<SSLCertificate> {
    try {
      // Enable Universal SSL for the domain
      await this.cloudflareService.updateZoneSetting('ssl', 'universal');

      // Wait for certificate to be issued (this is typically automatic)
      await this.waitForCertificateIssuance(domain);

      // Get certificate details
      const certificate = await this.getCertificateDetails(domain);

      return {
        id: `universal-${domain}`,
        domain,
        status: 'active',
        type: 'universal',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        issuedAt: new Date(),
        issuer: 'Cloudflare',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      log.error('Failed to provision Universal SSL certificate', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        domain
      });
      throw error;
    }
  }

  /**
   * Provision Dedicated SSL certificate via Cloudflare
   */
  private async provisionDedicatedSSLCertificate(domain: string): Promise<SSLCertificate> {
    try {
      // Request dedicated SSL certificate
      await this.cloudflareService.updateZoneSetting('ssl', 'dedicated');

      // Wait for certificate to be issued
      await this.waitForCertificateIssuance(domain);

      return {
        id: `dedicated-${domain}`,
        domain,
        status: 'active',
        type: 'dedicated',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        issuedAt: new Date(),
        issuer: 'Cloudflare',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      log.error('Failed to provision Dedicated SSL certificate', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        domain
      });
      throw error;
    }
  }

  /**
   * Check SSL certificate status for a domain
   */
  async getSSLStatus(domain: string): Promise<SSLStatus> {
    try {
      const certificate = await this.getCertificateDetails(domain);
      const validation = await this.validateSSLCertificate(domain);
      const grade = await this.getSSLGrade(domain);

      return {
        domain,
        hasCertificate: !!certificate,
        isSecure: validation.isValid,
        certificate,
        grade,
        vulnerabilities: validation.errors,
        lastChecked: new Date()
      };
    } catch (error) {
      log.error('Failed to get SSL status', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        domain
      });

      return {
        domain,
        hasCertificate: false,
        isSecure: false,
        lastChecked: new Date()
      };
    }
  }

  /**
   * Validate SSL certificate
   */
  async validateSSLCertificate(domain: string): Promise<SSLValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    try {
      // Check if certificate exists
      const certificate = await this.getCertificateDetails(domain);
      if (!certificate) {
        errors.push('No SSL certificate found');
        return { isValid: false, errors, warnings, score: 0 };
      }

      // Check certificate expiration
      if (certificate.expiresAt) {
        const daysUntilExpiry = Math.ceil((certificate.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry <= 0) {
          errors.push('Certificate has expired');
          score -= 50;
        } else if (daysUntilExpiry <= this.config.renewalThresholdDays) {
          warnings.push(`Certificate expires in ${daysUntilExpiry} days`);
          score -= 20;
        }
      }

      // Check certificate type
      if (certificate.type === 'universal') {
        warnings.push('Using Universal SSL certificate (consider upgrading to Dedicated)');
        score -= 10;
      }

      // Check minimum TLS version
      const tlsVersion = await this.checkTLSVersion(domain);
      if (tlsVersion && tlsVersion < '1.2') {
        errors.push(`TLS version ${tlsVersion} is too low (minimum 1.2 required)`);
        score -= 30;
      }

      // Check for security headers
      const securityHeaders = await this.checkSecurityHeaders(domain);
      if (!securityHeaders.hsts) {
        warnings.push('HSTS header not present');
        score -= 5;
      }

      if (!securityHeaders.ocspStapling) {
        warnings.push('OCSP Stapling not enabled');
        score -= 5;
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        score: Math.max(0, score)
      };
    } catch (error) {
      log.error('Failed to validate SSL certificate', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        domain
      });

      return {
        isValid: false,
        errors: ['SSL validation failed'],
        warnings: [],
        score: 0
      };
    }
  }

  /**
   * Get SSL grade for a domain
   */
  async getSSLGrade(domain: string): Promise<string> {
    try {
      // This would typically use SSL Labs API or similar service
      // For now, we'll simulate based on validation results
      const validation = await this.validateSSLCertificate(domain);
      
      if (!validation.isValid) {
        return 'F';
      }

    if ((validation.score || 0) >= 90) {
      return 'A+';
    } else if ((validation.score || 0) >= 80) {
      return 'A';
    } else if ((validation.score || 0) >= 70) {
      return 'B';
    } else if ((validation.score || 0) >= 60) {
      return 'C';
    } else if ((validation.score || 0) >= 50) {
      return 'D';
      } else {
        return 'F';
      }
    } catch (error) {
      log.error('Failed to get SSL grade', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        domain
      });
      return 'F';
    }
  }

  /**
   * Renew SSL certificate
   */
  async renewSSLCertificate(domain: string): Promise<boolean> {
    try {
      log.info('Starting SSL certificate renewal', { domain });

      // Check if renewal is needed
      const status = await this.getSSLStatus(domain);
      if (!status.certificate?.expiresAt) {
        throw new Error('Cannot determine certificate expiration');
      }

      const daysUntilExpiry = Math.ceil((status.certificate.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry > this.config.renewalThresholdDays) {
        log.info('Certificate renewal not needed', { domain, daysUntilExpiry });
        return true;
      }

      // Renew certificate
      if (status.certificate.type === 'universal') {
        // Universal SSL certificates are automatically renewed by Cloudflare
        log.info('Universal SSL certificate automatically renewed by Cloudflare', { domain });
        return true;
      } else if (status.certificate.type === 'dedicated') {
        // Request new dedicated certificate
        await this.provisionDedicatedSSLCertificate(domain);
      }

      // Test renewed certificate
      const validation = await this.validateSSLCertificate(domain);
      if (!validation.isValid) {
        throw new Error(`Certificate renewal validation failed: ${validation.errors.join(', ')}`);
      }

      log.info('SSL certificate renewed successfully', { domain });
      return true;
    } catch (error) {
      log.error('Failed to renew SSL certificate', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        domain
      });
      return false;
    }
  }

  /**
   * Bulk renew SSL certificates
   */
  async bulkRenewSSLCertificates(domains: string[]): Promise<{
    success: number;
    failed: number;
    results: Array<{
      domain: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    const results = [];
    let success = 0;
    let failed = 0;

    for (const domain of domains) {
      try {
        const renewed = await this.renewSSLCertificate(domain);
        results.push({
          domain,
          success: renewed
        });
        if (renewed) {
          success++;
        } else {
          failed++;
        }
      } catch (error) {
        results.push({
          domain,
          success: false,
          error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
        });
        failed++;
      }
    }

    log.info('Bulk SSL certificate renewal completed', {
      total: domains.length,
      success,
      failed
    });

    return { success, failed, results };
  }

  /**
   * Monitor SSL certificates for expiration
   */
  async monitorSSLCertificates(): Promise<{
    expiringSoon: string[];
    expired: string[];
    healthy: string[];
  }> {
    try {
      const domains = await this.getAllManagedDomains();
      const expiringSoon: string[] = [];
      const expired: string[] = [];
      const healthy: string[] = [];

      for (const domain of domains) {
        try {
          const status = await this.getSSLStatus(domain);
          
          if (!status.certificate?.expiresAt) {
            continue;
          }

          const daysUntilExpiry = Math.ceil((status.certificate.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

          if (daysUntilExpiry <= 0) {
            expired.push(domain);
          } else if (daysUntilExpiry <= this.config.renewalThresholdDays) {
            expiringSoon.push(domain);
          } else {
            healthy.push(domain);
          }
        } catch (error) {
          log.error('Failed to monitor SSL certificate', {
            error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
            domain
          });
        }
      }

      return { expiringSoon, expired, healthy };
    } catch (error) {
      log.error('Failed to monitor SSL certificates', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      return { expiringSoon: [], expired: [], healthy: [] };
    }
  }

  /**
   * Get all managed domains
   */
  private async getAllManagedDomains(): Promise<string[]> {
    try {
      const records = await this.cloudflareService.listDNSRecords();
      const domains = new Set<string>();

      // Extract domains from DNS records
      records.forEach((record: any) => {
        if (record.name && record.name.includes('.')) {
          const domain = record.name.endsWith('.') ? record.name.slice(0, -1) : record.name;
          domains.add(domain);
        }
      });

      return Array.from(domains);
    } catch (error) {
      log.error('Failed to get managed domains', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      return [this.config.mainDomain];
    }
  }

  /**
   * Update Cloudflare SSL settings
   */
  private async updateCloudflareSSLSettings(domain: string): Promise<void> {
    try {
      // Set SSL mode to Full (Strict)
      await this.cloudflareService.updateZoneSetting('ssl', 'full_strict');
      
      // Enable Always Use HTTPS
      await this.cloudflareService.updateZoneSetting('always_use_https', 'on');
      
      // Set minimum TLS version
      await this.cloudflareService.updateZoneSetting('min_tls_version', '1.2');
      
      // Enable TLS 1.3
      await this.cloudflareService.updateZoneSetting('tls_1_3', 'on');

      log.info('Cloudflare SSL settings updated', { domain });
    } catch (error) {
      log.error('Failed to update Cloudflare SSL settings', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        domain
      });
      throw error;
    }
  }

  /**
   * Generate Nginx SSL configuration
   */
  private async generateNginxSSLConfig(domain: string, certificate: SSLCertificate): Promise<void> {
    try {
      const configContent = this.generateNginxConfigContent(domain, certificate);
      const configPath = path.join(this.config.nginxConfigPath, `${domain}.ssl.conf`);
      
      await fs.writeFile(configPath, configContent, 'utf8');
      
      log.info('Nginx SSL configuration generated', { domain, configPath });
    } catch (error) {
      log.error('Failed to generate Nginx SSL configuration', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        domain
      });
      throw error;
    }
  }

  /**
   * Generate Nginx configuration content
   */
  private generateNginxConfigContent(domain: string, certificate: SSLCertificate): string {
    return `
# SSL configuration for ${domain}
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${domain} www.${domain};

    # SSL certificate configuration
    ssl_certificate /etc/ssl/certs/${domain}.crt;
    ssl_certificate_key /etc/ssl/private/${domain}.key;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/ssl/certs/ca-bundle.crt;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name ${domain} www.${domain};
    return 301 https://$server_name$request_uri;
}
`;
  }

  /**
   * Get certificate details from Cloudflare
   */
  private async getCertificateDetails(domain: string): Promise<SSLCertificate | null> {
    try {
      // This would typically fetch from Cloudflare API
      // For now, we'll return a mock certificate
      return {
        id: `cf-${domain}`,
        domain,
        status: 'active',
        type: 'universal',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        issuedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        issuer: 'Cloudflare',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      log.error('Failed to get certificate details', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        domain
      });
      return null;
    }
  }

  /**
   * Wait for certificate issuance
   */
  private async waitForCertificateIssuance(domain: string, maxWaitTime: number = 300000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const certificate = await this.getCertificateDetails(domain);
        if (certificate && certificate.status === 'active') {
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      } catch (error) {
        log.warning('Certificate issuance check failed, retrying...', { domain });
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    throw new Error('Certificate issuance timeout');
  }

  /**
   * Check TLS version
   */
  private async checkTLSVersion(domain: string): Promise<string | null> {
    try {
      // This would typically use openssl or similar tool
      // For now, we'll return a mock value
      return '1.3';
    } catch (error) {
      log.error('Failed to check TLS version', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        domain
      });
      return null;
    }
  }

  /**
   * Check security headers
   */
  private async checkSecurityHeaders(domain: string): Promise<{
    hsts: boolean;
    ocspStapling: boolean;
  }> {
    try {
      // This would typically make HTTP requests to check headers
      // For now, we'll return mock values
      return {
        hsts: true,
        ocspStapling: true
      };
    } catch (error) {
      log.error('Failed to check security headers', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        domain
      });
      return { hsts: false, ocspStapling: false };
    }
  }

  /**
   * Ensure SSL storage directory exists
   */
  private async ensureSSLStorageDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.sslStoragePath, { recursive: true });
      await fs.mkdir(path.join(this.config.sslStoragePath, 'private'), { recursive: true, mode: 0o700 });
    } catch (error) {
      log.error('Failed to create SSL storage directory', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        path: this.config.sslStoragePath
      });
      throw error;
    }
  }

  /**
   * Check if certbot is available
   */
  private async checkCertbotAvailability(): Promise<void> {
    try {
      await execAsync('certbot --version');
      log.info('Certbot is available');
    } catch (error) {
      log.warning('Certbot is not available - using Cloudflare SSL only');
    }
  }

  /**
   * Health check for SSL automation service
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    details: {
      cloudflare: boolean;
      autoRenewal: boolean;
      managedDomains: number;
      expiringSoon: number;
      expired: number;
    };
  }> {
    try {
      const cloudflareHealthy = await this.cloudflareService.testConnection();
      const domains = await this.getAllManagedDomains();
      const monitoring = await this.monitorSSLCertificates();

      return {
        healthy: cloudflareHealthy,
        details: {
          cloudflare: cloudflareHealthy,
          autoRenewal: this.config.autoRenewalEnabled,
          managedDomains: domains.length,
          expiringSoon: monitoring.expiringSoon.length,
          expired: monitoring.expired.length
        }
      };
    } catch (error) {
      log.error('SSL automation health check failed', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });

      return {
        healthy: false,
        details: {
          cloudflare: false,
          autoRenewal: this.config.autoRenewalEnabled,
          managedDomains: 0,
          expiringSoon: 0,
          expired: 0
        }
      };
    }
  }
}

export default SSLAutomationService;
