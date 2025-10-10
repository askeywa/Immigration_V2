// backend/src/security/securityHardening.ts
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import xss from 'xss';
// import validator from 'validator'; // Commented out - types not available
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { log } from '../utils/logger';

interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDuration: number;
  sessionTimeout: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    maxAge: number; // days
  };
  apiRateLimits: {
    windowMs: number;
    maxRequests: number;
  };
  securityHeaders: {
    hsts: boolean;
    csp: boolean;
    xframe: boolean;
    xss: boolean;
  };
}

class SecurityHardening {
  private config: SecurityConfig;
  private loginAttempts: Map<string, { count: number; lastAttempt: Date; locked: boolean }> = new Map();
  private suspiciousIPs: Map<string, { count: number; lastSeen: Date }> = new Map();

  constructor() {
    this.config = {
      maxLoginAttempts: 5,
      lockoutDuration: 30 * 60 * 1000, // 30 minutes
      sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        maxAge: 90 // 90 days
      },
      apiRateLimits: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100
      },
      securityHeaders: {
        hsts: true,
        csp: true,
        xframe: true,
        xss: true
      }
    };

    this.setupSecurityMonitoring();
  }

  /**
   * Comprehensive security middleware
   */
  securityMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      // Track request for security analysis
      this.trackRequest(req);

      // Apply security headers
      this.applySecurityHeaders(req, res);

      // Check for suspicious activity
      if (this.isSuspiciousActivity(req)) {
        log.warn('Suspicious activity detected', {
          ip: (req as any).ip,
          userAgent: (req as any).get('User-Agent'),
          url: (req as any).url,
          method: (req as any).method
        });
        
        return (res as any).status(429).json({
          success: false,
          message: 'Suspicious activity detected',
          retryAfter: 300 // 5 minutes
        });
      }

      // Add security context to request
      (req as any).securityContext = {
        isSecure: (req as any).secure,
        ip: (req as any).ip,
        userAgent: (req as any).get('User-Agent'),
        referer: (req as any).get('Referer'),
        timestamp: new Date()
      };

      next();
    };
  }

  /**
   * Enhanced rate limiting
   */
  createRateLimiters() {
    return {
      // General API rate limiting
      general: rateLimit({
        windowMs: this.config.apiRateLimits.windowMs,
        max: this.config.apiRateLimits.maxRequests,
        message: {
          success: false,
          message: 'Too many requests from this IP',
          retryAfter: Math.ceil(this.config.apiRateLimits.windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req: Request, res: Response) => {
          this.trackRateLimitViolation(req);
          (res as any).status(429).json({
            success: false,
            message: 'Too many requests from this IP',
            retryAfter: Math.ceil(this.config.apiRateLimits.windowMs / 1000)
          });
        }
      }),

      // Strict rate limiting for auth endpoints
      auth: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 login attempts per 15 minutes
        message: {
          success: false,
          message: 'Too many authentication attempts',
          retryAfter: 900 // 15 minutes
        },
        skipSuccessfulRequests: true,
        handler: (req: Request, res: Response) => {
          this.trackAuthRateLimitViolation(req);
          (res as any).status(429).json({
            success: false,
            message: 'Too many authentication attempts',
            retryAfter: 900
          });
        }
      }),

      // Rate limiting for password reset
      passwordReset: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // 3 password reset attempts per hour
        message: {
          success: false,
          message: 'Too many password reset attempts',
          retryAfter: 3600 // 1 hour
        }
      })
    };
  }

  /**
   * Enhanced helmet configuration
   */
  createHelmetConfig(): any {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: []
        }
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },
      xssFilter: true,
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      // permissionsPolicy: {
      //   camera: [],
      //   microphone: [],
      //   geolocation: [],
      //   payment: []
      // }
    });
  }

  /**
   * Input validation and sanitization
   */
  inputValidation(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Sanitize all string inputs
        this.sanitizeInputs(req);

        // Validate email inputs
        this.validateEmails(req);

        // Validate and sanitize file uploads
        this.validateFileUploads(req);

        // Check for SQL injection patterns
        if (this.containsSQLInjection(req)) {
          log.warn('SQL injection attempt detected', {
            ip: (req as any).ip,
            url: (req as any).url,
            body: (req as any).body,
            query: (req as any).query
          });
          
          return (res as any).status(400).json({
            success: false,
            message: 'Invalid input detected'
          });
        }

        // Check for XSS patterns
        if (this.containsXSS(req)) {
          log.warn('XSS attempt detected', {
            ip: (req as any).ip,
            url: (req as any).url,
            body: (req as any).body
          });
          
          return (res as any).status(400).json({
            success: false,
            message: 'Invalid input detected'
          });
        }

        next();
      } catch (error) {
        log.error('Input validation error', { error: error instanceof Error ? error.message : String(error) });
        (res as any).status(400).json({
          success: false,
          message: 'Input validation failed'
        });
      }
    };
  }

  /**
   * Password security validation
   */
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!password || typeof password !== 'string') {
      errors.push('Password is required');
      return { isValid: false, errors };
    }

    if (password.length < this.config.passwordPolicy.minLength) {
      errors.push(`Password must be at least ${this.config.passwordPolicy.minLength} characters long`);
    }

    if (this.config.passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (this.config.passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (this.config.passwordPolicy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (this.config.passwordPolicy.requireSpecialChars && !/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }

    // Check for common passwords
    const commonPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123'];
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common, please choose a stronger password');
    }

    // Check for repeated characters
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password cannot contain more than 2 consecutive identical characters');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Enhanced password hashing
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Password comparison with timing attack protection
   */
  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Login attempt tracking and account lockout
   */
  trackLoginAttempt(email: string, ip: string, success: boolean): void {
    const key = `${email}:${ip}`;
    const now = new Date();

    if (!this.loginAttempts.has(key)) {
      this.loginAttempts.set(key, { count: 0, lastAttempt: now, locked: false });
    }

    const attempt = this.loginAttempts.get(key)!;

    if (success) {
      // Reset attempts on successful login
      this.loginAttempts.delete(key);
      return;
    }

    attempt.count++;
    attempt.lastAttempt = now;

    if (attempt.count >= this.config.maxLoginAttempts) {
      attempt.locked = true;
      log.warn('Account locked due to failed login attempts', {
        email,
        ip,
        attempts: attempt.count,
        lockedUntil: new Date(now.getTime() + this.config.lockoutDuration)
      });
    }
  }

  /**
   * Check if account is locked
   */
  isAccountLocked(email: string, ip: string): boolean {
    const key = `${email}:${ip}`;
    const attempt = this.loginAttempts.get(key);

    if (!attempt || !attempt.locked) {
      return false;
    }

    const now = new Date();
    const lockoutExpiry = new Date(attempt.lastAttempt.getTime() + this.config.lockoutDuration);

    if (now > lockoutExpiry) {
      // Lockout expired, reset attempts
      this.loginAttempts.delete(key);
      return false;
    }

    return true;
  }

  /**
   * JWT token security
   */
  generateSecureToken(payload: any): string {
    return jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: '8h',
      issuer: 'immigration-app',
      audience: 'immigration-app-users',
      algorithm: 'HS256'
    });
  }

  /**
   * Verify JWT token with enhanced security
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, process.env.JWT_SECRET!, {
        issuer: 'immigration-app',
        audience: 'immigration-app-users',
        algorithms: ['HS256']
      });
    } catch (error) {
      log.warn('Invalid JWT token', { error: error instanceof Error ? error.message : String(error) });
      throw new Error('Invalid token');
    }
  }

  /**
   * Session security
   */
  createSecureSession(): any {
    return {
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: this.config.sessionTimeout,
        sameSite: 'strict' as const
      },
      name: 'immigration-app-session'
    };
  }

  /**
   * File upload security
   */
  validateFileUpload(file: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!file) {
      errors.push('File is required');
      return { isValid: false, errors };
    }

    if (!allowedTypes.includes((file as any).mimetype)) {
      errors.push('File type not allowed');
    }

    if ((file as any).size > maxSize) {
      errors.push('File size exceeds maximum allowed size (10MB)');
    }

    // Check file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'];
    const fileExtension = (file as any).originalname.toLowerCase().substring((file as any).originalname.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      errors.push('File extension not allowed');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Track request for security analysis
   */
  private trackRequest(req: Request): void {
    const ip = (req as any).ip;
    const now = new Date();

    if (!this.suspiciousIPs.has(ip)) {
      this.suspiciousIPs.set(ip, { count: 0, lastSeen: now });
    }

    const ipData = this.suspiciousIPs.get(ip)!;
    ipData.lastSeen = now;

    // Log all requests for security analysis
    log.info('Request tracked', {
      ip,
      method: (req as any).method,
      url: (req as any).url,
      userAgent: (req as any).get('User-Agent'),
      referer: (req as any).get('Referer'),
      timestamp: now.toISOString()
    });
  }

  /**
   * Apply security headers
   */
  private applySecurityHeaders(req: Request, res: Response): void {
    // Remove server header
    (res as any).removeHeader('X-Powered-By');

    // Add custom security headers
    (res as any).setHeader('X-Content-Type-Options', 'nosniff');
    (res as any).setHeader('X-Frame-Options', 'DENY');
    (res as any).setHeader('X-XSS-Protection', '1; mode=block');
    (res as any).setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    (res as any).setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  }

  /**
   * Check for suspicious activity
   */
  private isSuspiciousActivity(req: Request): boolean {
    const ip = (req as any).ip;
    const userAgent = (req as any).get('User-Agent') || '';
    const url = (req as any).url;

    // Check for common attack patterns
    const suspiciousPatterns = [
      /\.\.\//, // Directory traversal
      /<script/i, // XSS
      /union.*select/i, // SQL injection
      /eval\(/i, // Code injection
      /javascript:/i, // JavaScript injection
      /onload=/i, // Event handler injection
      /onerror=/i, // Event handler injection
      /document\.cookie/i, // Cookie theft
      /alert\(/i, // XSS
      /prompt\(/i, // XSS
      /confirm\(/i // XSS
    ];

    const suspiciousUserAgents = [
      'sqlmap',
      'nikto',
      'nmap',
      'masscan',
      'zap',
      'burp'
    ];

    // Check URL for suspicious patterns
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url) || pattern.test((req as any).body) || pattern.test((req as any).query)) {
        return true;
      }
    }

    // Check User-Agent for suspicious tools
    for (const suspiciousUA of suspiciousUserAgents) {
      if (userAgent.toLowerCase().includes(suspiciousUA)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Sanitize input data
   */
  private sanitizeInputs(req: Request): void {
    // Sanitize body
    if ((req as any).body && typeof (req as any).body === 'object') {
      (req as any).body = this.sanitizeObject((req as any).body);
    }

    // Sanitize query parameters
    if ((req as any).query && typeof (req as any).query === 'object') {
      (req as any).query = this.sanitizeObject((req as any).query);
    }

    // Sanitize URL parameters
    if ((req as any).params && typeof (req as any).params === 'object') {
      (req as any).params = this.sanitizeObject((req as any).params);
    }
  }

  /**
   * Recursively sanitize object properties
   */
  private sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return xss((obj as any).trim());
    }

    if (Array.isArray(obj)) {
      return (obj as any).map((item: any) => this.sanitizeObject(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        (sanitized as any)[key] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Simple email validation (replaces validator dependency)
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate email inputs
   */
  private validateEmails(req: Request): void {
    const emailFields = ['email', 'contactEmail', 'adminEmail'];

    for (const field of emailFields) {
      if ((req as any).body[field] && !this.isValidEmail((req as any).body[field])) {
        throw new Error(`Invalid email format: ${field}`);
      }
    }
  }

  /**
   * Validate file uploads
   */
  private validateFileUploads(req: Request): void {
    if ((req as any).files) {
      const files = Array.isArray((req as any).files) ? (req as any).files : Object.values((req as any).files).flat();
      
      for (const file of files) {
        const validation = this.validateFileUpload(file);
        if (!validation.isValid) {
          throw new Error(`File upload validation failed: ${validation.errors.join(', ')}`);
        }
      }
    }
  }

  /**
   * Check for SQL injection patterns
   */
  private containsSQLInjection(req: Request): boolean {
    const sqlPatterns = [
      /union.*select/i,
      /select.*from/i,
      /insert.*into/i,
      /update.*set/i,
      /delete.*from/i,
      /drop.*table/i,
      /create.*table/i,
      /alter.*table/i,
      /exec\(/i,
      /execute\(/i,
      /sp_/i,
      /xp_/i,
      /--/,
      /\/\*/,
      /\*\//
    ];

    const checkData = (data: any): boolean => {
      if (typeof data === 'string') {
        return sqlPatterns.some((pattern: any) => pattern.test(data));
      }
      
      if (Array.isArray(data)) {
        return (data as any).some((item: any) => checkData(item));
      }
      
      if (data && typeof data === 'object') {
        return Object.values(data).some((value: any) => checkData(value));
      }
      
      return false;
    };

    return checkData((req as any).body) || checkData((req as any).query) || checkData((req as any).params);
  }

  /**
   * Check for XSS patterns
   */
  private containsXSS(req: Request): boolean {
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /onload=/i,
      /onerror=/i,
      /onclick=/i,
      /onmouseover=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /<link/i,
      /<meta/i,
      /<style/i
    ];

    const checkData = (data: any): boolean => {
      if (typeof data === 'string') {
        return xssPatterns.some((pattern: any) => pattern.test(data));
      }
      
      if (Array.isArray(data)) {
        return (data as any).some((item: any) => checkData(item));
      }
      
      if (data && typeof data === 'object') {
        return Object.values(data).some((value: any) => checkData(value));
      }
      
      return false;
    };

    return checkData((req as any).body) || checkData((req as any).query) || checkData((req as any).params);
  }

  /**
   * Track rate limit violations
   */
  private trackRateLimitViolation(req: Request): void {
    log.warn('Rate limit violation', {
      ip: (req as any).ip,
      url: (req as any).url,
      method: (req as any).method,
      userAgent: (req as any).get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track authentication rate limit violations
   */
  private trackAuthRateLimitViolation(req: Request): void {
    log.warn('Authentication rate limit violation', {
      ip: (req as any).ip,
      url: (req as any).url,
      method: (req as any).method,
      userAgent: (req as any).get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Setup security monitoring
   */
  private setupSecurityMonitoring(): void {
    // Clean up old login attempts every hour
    setInterval(() => {
      const now = new Date();
      for (const [key, attempt] of this.loginAttempts.entries()) {
        if (attempt.locked && now.getTime() - attempt.lastAttempt.getTime() > this.config.lockoutDuration) {
          this.loginAttempts.delete(key);
        }
      }
    }, 60 * 60 * 1000);

    // Clean up old suspicious IPs every hour
    setInterval(() => {
      const now = new Date();
      for (const [ip, data] of this.suspiciousIPs.entries()) {
        if (now.getTime() - (data as any).lastSeen.getTime() > 24 * 60 * 60 * 1000) { // 24 hours
          this.suspiciousIPs.delete(ip);
        }
      }
    }, 60 * 60 * 1000);
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): any {
    return {
      lockedAccounts: Array.from(this.loginAttempts.values()).filter((a: any) => (a as any).locked).length,
      totalLoginAttempts: Array.from(this.loginAttempts.values()).reduce((sum: any, a: any) => sum + (a as any).count, 0),
      suspiciousIPs: this.suspiciousIPs.size,
      config: this.config
    };
  }
}

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      securityContext?: {
        isSecure: boolean;
        ip: string;
        userAgent: string;
        referer: string;
        timestamp: Date;
      };
    }
  }
}

export default SecurityHardening;
