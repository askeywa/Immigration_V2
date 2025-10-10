// backend/src/services/securityService.ts
import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import crypto from 'crypto';
import { TenantRequest } from '../middleware/tenantResolution';
import { AppError } from '../utils/errors';
import { log } from '../utils/logger';

export interface SecurityConfig {
  csrf: {
    enabled: boolean;
    secret: string;
    tokenLength: number;
    cookieName: string;
    headerName: string;
  };
  validation: {
    enabled: boolean;
    strictMode: boolean;
    sanitizeInput: boolean;
  };
  headers: {
    hsts: boolean;
    xssProtection: boolean;
    contentSecurityPolicy: boolean;
    frameOptions: boolean;
    contentTypeOptions: boolean;
  };
  bruteForce: {
    enabled: boolean;
    maxAttempts: number;
    windowMs: number;
    blockDuration: number;
  };
  sqlInjection: {
    enabled: boolean;
    strictMode: boolean;
  };
}

export interface SecurityViolation {
  id: string;
  timestamp: Date;
  type: 'csrf' | 'xss' | 'sql_injection' | 'brute_force' | 'validation' | 'headers' | 'rate_limit';
  severity: 'low' | 'medium' | 'high' | 'critical';
  ipAddress: string;
  userAgent: string;
  userId?: string;
  tenantId?: string;
  endpoint: string;
  method: string;
  details: any;
  blocked: boolean;
  metadata?: any;
}

export interface SecurityStats {
  totalViolations: number;
  violationsByType: Array<{ type: string; count: number }>;
  violationsBySeverity: Array<{ severity: string; count: number }>;
  topBlockedIPs: Array<{ ip: string; count: number }>;
  topViolatedEndpoints: Array<{ endpoint: string; count: number }>;
  recentViolations: SecurityViolation[];
  securityScore: number;
  recommendations: string[];
}

export class SecurityService {
  private static violations: SecurityViolation[] = [];
  private static blockedIPs: Map<string, { count: number; blockedUntil: Date }> = new Map();
  private static readonly MAX_VIOLATIONS_HISTORY = 100; // Reduced from 1000 to 100
  private static readonly MAX_BLOCKED_IPS = 500; // Limit blocked IPs stored in memory
  private static config: SecurityConfig;

  /**
   * Initialize the security service
   */
  static async initialize(): Promise<void> {
    try {
      this.config = {
        csrf: {
          enabled: true,
          secret: process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex'),
          tokenLength: 32,
          cookieName: '_csrf',
          headerName: 'X-CSRF-Token'
        },
        validation: {
          enabled: true,
          strictMode: process.env.NODE_ENV === 'production',
          sanitizeInput: true
        },
        headers: {
          hsts: true,
          xssProtection: true,
          contentSecurityPolicy: true,
          frameOptions: true,
          contentTypeOptions: true
        },
        bruteForce: {
          enabled: true,
          maxAttempts: 5,
          windowMs: 15 * 60 * 1000, // 15 minutes
          blockDuration: 60 * 60 * 1000 // 1 hour
        },
        sqlInjection: {
          enabled: true,
          strictMode: process.env.NODE_ENV === 'production'
        }
      };

      // Start periodic cleanup for memory optimization
    setInterval(() => {
      this.performMemoryCleanup();
    }, 10 * 60 * 1000); // Every 10 minutes

    log.info('Security service initialized with comprehensive protection and memory optimization');
    } catch (error) {
      log.error('Failed to initialize security service:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      throw new AppError('Failed to initialize security service', 500);
    }
  }

  /**
   * Get security configuration
   */
  static getConfig(): SecurityConfig {
    if (!this.config) {
      throw new AppError('Security service not initialized', 500);
    }
    return this.config;
  }

  /**
   * Generate CSRF token
   */
  static generateCSRFToken(): string {
    return crypto.randomBytes(this.config.csrf.tokenLength).toString('hex');
  }

  /**
   * Validate CSRF token
   */
  static validateCSRFToken(req: Request): boolean {
    if (!this.config.csrf.enabled) {
      return true;
    }

    const token = (req as any).headers[this.config.csrf.headerName.toLowerCase()] as string ||
                  (req as any).body._csrf ||
                  (req as any).query._csrf;

    if (!token) {
      return false;
    }

    // In a real implementation, you would validate the token against the session
    // For now, we'll do basic validation
    return token.length === this.config.csrf.tokenLength * 2;
  }

  /**
   * Sanitize input to prevent XSS
   */
  static sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }

    if (Array.isArray(input)) {
      return (input as any).map((item: any) => this.sanitizeInput(item));
    }

    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        (sanitized as any)[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return input;
  }

  /**
   * Detect SQL injection attempts
   */
  static detectSQLInjection(input: any): boolean {
    if (!this.config.sqlInjection.enabled) {
      return false;
    }

    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(;|\-\-|\/\*|\*\/)/,
      /(\bUNION\b.*\bSELECT\b)/i,
      /(\bDROP\b.*\bTABLE\b)/i,
      /(\bINSERT\b.*\bINTO\b)/i,
      /(\bUPDATE\b.*\bSET\b)/i,
      /(\bDELETE\b.*\bFROM\b)/i
    ];

    const checkInput = (value: any): boolean => {
      if (typeof value === 'string') {
        return sqlPatterns.some((pattern: any) => pattern.test(value));
      }
      
      if (Array.isArray(value)) {
        return (value as any).some((item: any) => checkInput(item));
      }
      
      if (typeof value === 'object' && value !== null) {
        return Object.values(value).some((item: any) => checkInput(item));
      }
      
      return false;
    };

    return checkInput(input);
  }

  /**
   * Detect XSS attempts
   */
  static detectXSS(input: any): boolean {
    if (typeof input !== 'string') {
      return false;
    }

    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
      /<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi,
      /<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<[^>]*on\w+\s*=/gi
    ];

    return xssPatterns.some((pattern: any) => pattern.test(input));
  }

  /**
   * Check for brute force attempts
   */
  static checkBruteForce(ipAddress: string): boolean {
    if (!this.config.bruteForce.enabled) {
      return false;
    }

    const now = new Date();
    const blocked = this.blockedIPs.get(ipAddress);

    if (blocked && blocked.blockedUntil > now) {
      return true;
    }

    // Check recent violations from this IP
    const recentViolations = this.violations.filter((v: any) => 
      v.ipAddress === ipAddress &&
      (now.getTime() - v.timestamp.getTime()) < this.config.bruteForce.windowMs
    );

    if (recentViolations.length >= this.config.bruteForce.maxAttempts) {
      this.blockedIPs.set(ipAddress, {
        count: recentViolations.length,
        blockedUntil: new Date(now.getTime() + this.config.bruteForce.blockDuration)
      });

      // Clean up old blocked IPs if we exceed the limit
      if (this.blockedIPs.size > this.MAX_BLOCKED_IPS) {
        this.cleanupBlockedIPs();
      }

      return true;
    }

    return false;
  }

  /**
   * Log security violation
   */
  static logViolation(
    type: SecurityViolation['type'],
    severity: SecurityViolation['severity'],
    req: Request,
    details: any,
    blocked: boolean = false
  ): SecurityViolation {
    const tenantRequest = req as TenantRequest;
    
    const violation: SecurityViolation = {
      id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      severity,
      ipAddress: (req as any).ip || 'unknown',
      userAgent: (req as any).get('User-Agent') || 'unknown',
      userId: (req as any).user?._id,
      tenantId: tenantRequest.tenantId,
      endpoint: (req as any).path,
      method: (req as any).method,
      details,
      blocked,
      metadata: {
        referer: (req as any).get('Referer'),
        origin: (req as any).get('Origin'),
        xForwardedFor: (req as any).get('X-Forwarded-For')
      }
    };

    this.violations.push(violation);

    // Keep only recent violations in memory (optimized for memory usage)
    if (this.violations.length > this.MAX_VIOLATIONS_HISTORY) {
      this.violations = this.violations.slice(-this.MAX_VIOLATIONS_HISTORY);
    }

    log.warn('Security violation detected:', { violation });

    return violation;
  }

  /**
   * Get security statistics
   */
  static getSecurityStats(): SecurityStats {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentViolations = this.violations.filter((v: any) => v.timestamp >= last24Hours);
    
    // Calculate violations by type
    const violationsByType = new Map<string, number>();
    recentViolations.forEach((v: any) => {
      violationsByType.set(v.type, (violationsByType.get(v.type) || 0) + 1);
    });

    // Calculate violations by severity
    const violationsBySeverity = new Map<string, number>();
    recentViolations.forEach((v: any) => {
      violationsBySeverity.set(v.severity, (violationsBySeverity.get(v.severity) || 0) + 1);
    });

    // Calculate top blocked IPs
    const ipCounts = new Map<string, number>();
    recentViolations.forEach((v: any) => {
      ipCounts.set(v.ipAddress, (ipCounts.get(v.ipAddress) || 0) + 1);
    });

    // Calculate top violated endpoints
    const endpointCounts = new Map<string, number>();
    recentViolations.forEach((v: any) => {
      endpointCounts.set(v.endpoint, (endpointCounts.get(v.endpoint) || 0) + 1);
    });

    // Calculate security score (0-100)
    const criticalViolations = recentViolations.filter((v: any) => v.severity === 'critical').length;
    const highViolations = recentViolations.filter((v: any) => v.severity === 'high').length;
    const mediumViolations = recentViolations.filter((v: any) => v.severity === 'medium').length;
    
    const securityScore = Math.max(0, 100 - (criticalViolations * 20) - (highViolations * 10) - (mediumViolations * 5));

    // Generate recommendations
    const recommendations: string[] = [];
    if (criticalViolations > 0) {
      recommendations.push('Critical security violations detected. Immediate attention required.');
    }
    if (highViolations > 5) {
      recommendations.push('High number of high-severity violations. Review security policies.');
    }
    if (securityScore < 70) {
      recommendations.push('Security score is low. Consider implementing additional security measu(res as any).');
    }

    return {
      totalViolations: recentViolations.length,
      violationsByType: Array.from(violationsByType.entries()).map(([type, count]) => ({ type, count })),
      violationsBySeverity: Array.from(violationsBySeverity.entries()).map(([severity, count]) => ({ severity, count })),
      topBlockedIPs: Array.from(ipCounts.entries())
        .map(([ip, count]) => ({ ip, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topViolatedEndpoints: Array.from(endpointCounts.entries())
        .map(([endpoint, count]) => ({ endpoint, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      recentViolations: recentViolations.slice(0, 20),
      securityScore,
      recommendations
    };
  }

  /**
   * Perform memory cleanup to prevent memory leaks
   */
  private static performMemoryCleanup(): void {
    const before = {
      violations: this.violations.length,
      blockedIPs: this.blockedIPs.size
    };

    // Clean up old violations (older than 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    this.violations = this.violations.filter(violation => 
      new Date(violation.timestamp) > twoHoursAgo
    );

    // Ensure we don't exceed maximum
    if (this.violations.length > this.MAX_VIOLATIONS_HISTORY) {
      this.violations = this.violations.slice(-this.MAX_VIOLATIONS_HISTORY);
    }

    // Clean up blocked IPs
    this.cleanupBlockedIPs();

    const after = {
      violations: this.violations.length,
      blockedIPs: this.blockedIPs.size
    };

    const totalBefore = before.violations + before.blockedIPs;
    const totalAfter = after.violations + after.blockedIPs;

    if (totalBefore - totalAfter > 20) {
      log.info('Security service memory cleanup completed', {
        before,
        after,
        cleaned: totalBefore - totalAfter
      });
    }
  }

  /**
   * Clean up expired blocked IPs
   */
  private static cleanupBlockedIPs(): void {
    const now = new Date();
    
    // Remove expired blocked IPs
    for (const [ip, data] of this.blockedIPs.entries()) {
      if (now > data.blockedUntil) {
        this.blockedIPs.delete(ip);
      }
    }

    // If still too many, remove oldest entries
    if (this.blockedIPs.size > this.MAX_BLOCKED_IPS) {
      const entries = Array.from(this.blockedIPs.entries());
      entries.sort((a, b) => a[1].blockedUntil.getTime() - b[1].blockedUntil.getTime());
      
      // Keep only the most recent entries
      const toKeep = entries.slice(-this.MAX_BLOCKED_IPS);
      this.blockedIPs.clear();
      
      for (const [ip, data] of toKeep) {
        this.blockedIPs.set(ip, data);
      }
    }
  }

  /**
   * Get recent violations
   */
  static getViolations(limit: number = 50): SecurityViolation[] {
    return this.violations
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clear blocked IPs
   */
  static clearBlockedIPs(): number {
    const now = new Date();
    let cleared = 0;
    
    for (const [ip, data] of this.blockedIPs.entries()) {
      if (data.blockedUntil <= now) {
        this.blockedIPs.delete(ip);
        cleared++;
      }
    }
    
    return cleared;
  }

  /**
   * Validate input using express-validator
   */
  static createValidationRules() {
    return {
      // Common validation rules
      email: body('email').isEmail().normalizeEmail().withMessage('Invalid email format'),
      password: body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
      name: body('name').isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
      phone: body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
      
      // ID validation
      objectId: param('id').isMongoId().withMessage('Invalid ID format'),
      userId: param('userId').isMongoId().withMessage('Invalid user ID format'),
      tenantId: param('tenantId').isMongoId().withMessage('Invalid tenant ID format'),
      
      // Pagination
      page: query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
      limit: query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
      
      // Search
      search: query('search').optional().isLength({ max: 100 }).withMessage('Search term too long'),
      
      // Date ranges
      startDate: query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
      endDate: query('endDate').optional().isISO8601().withMessage('Invalid end date format')
    };
  }

  /**
   * Handle validation errors
   */
  static handleValidationErrors(req: Request): void {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const violation = this.logViolation(
        'validation',
        'medium',
        req,
        { errors: errors.array() },
        false
      );
      
      throw new AppError('Validation failed', 400, violation.details);
    }
  }

  /**
   * Security middleware factory
   */
  static createSecurityMiddleware() {
    return (req: Request, res: Response, next: Function) => {
      try {
        // Check for brute force
        if (this.checkBruteForce((req as any).ip || '')) {
          const violation = this.logViolation(
            'brute_force',
            'high',
            req,
            { reason: 'IP blocked due to brute force attempts' },
            true
          );
          
          return (res as any).status(429).json({
            success: false,
            message: 'Too many failed attempts. Please try again later.',
            code: 'BRUTE_FORCE_BLOCKED'
          });
        }

        // Check for SQL injection in request body
        if (this.detectSQLInjection((req as any).body)) {
          const violation = this.logViolation(
            'sql_injection',
            'critical',
            req,
            { body: (req as any).body },
            true
          );
          
          return (res as any).status(400).json({
            success: false,
            message: 'Invalid request data',
            code: 'SECURITY_VIOLATION'
          });
        }

        // Check for XSS in request body
        if (this.detectXSS(JSON.stringify((req as any).body))) {
          const violation = this.logViolation(
            'xss',
            'high',
            req,
            { body: (req as any).body },
            true
          );
          
          return (res as any).status(400).json({
            success: false,
            message: 'Invalid request data',
            code: 'SECURITY_VIOLATION'
          });
        }

        // Sanitize input if enabled
        if (this.config.validation.sanitizeInput) {
          (req as any).body = this.sanitizeInput((req as any).body);
          (req as any).query = this.sanitizeInput((req as any).query);
        }

        next();
      } catch (error) {
        log.error('Security middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
        next(error);
      }
    };
  }
}
