// backend/src/services/sessionService.ts
import { Request, Response } from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import MemoryStore from 'memorystore';
import { TenantRequest } from '../middleware/tenantResolution';
import { AppError } from '../utils/errors';
import { log } from '../utils/logger';
import mongoose from 'mongoose';

export interface SessionData {
  userId: string;
  tenantId: string;
  userEmail: string;
  role: string;
  permissions: string[];
  tenantName?: string;
  tenantDomain?: string;
  loginTime: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
  isSuperAdmin: boolean;
  mfaVerified: boolean;
  sessionType: 'web' | 'api' | 'mobile';
  deviceId?: string;
  metadata?: {
    browser?: string;
    os?: string;
    location?: string;
    [key: string]: any;
  };
}

export interface SessionConfig {
  secret: string;
  store: session.Store;
  name: string;
  resave: boolean;
  saveUninitialized: boolean;
  rolling: boolean;
  cookie: {
    secure: boolean;
    httpOnly: boolean;
    maxAge: number;
    sameSite: 'strict' | 'lax' | 'none';
  };
}

export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  sessionsByTenant: Array<{ tenantId: string; tenantName: string; count: number }>;
  sessionsByUser: Array<{ userId: string; userEmail: string; count: number }>;
  sessionsByType: Array<{ type: string; count: number }>;
  recentSessions: SessionData[];
  sessionDuration: {
    average: number;
    min: number;
    max: number;
  };
}

export interface SessionViolation {
  id: string;
  timestamp: Date;
  sessionId: string;
  userId?: string;
  tenantId?: string;
  ipAddress: string;
  userAgent: string;
  violationType: 'concurrent_limit' | 'ip_mismatch' | 'user_agent_mismatch' | 'expired_session' | 'invalid_session' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata?: any;
}

export class SessionService {
  private static sessionStore: session.Store;
  private static violations: SessionViolation[] = [];
  private static readonly MAX_VIOLATIONS_HISTORY = 100; // Limit violations stored in memory (production-ready)
  private static sessionConfig: SessionConfig;

  /**
   * Initialize the session management service
   */
  static async initialize(): Promise<void> {
    try {
      // Configure session store based on environment
      if (process.env.NODE_ENV === 'production' && process.env.MONGODB_URI) {
        // Use MongoDB store for production
        this.sessionStore = MongoStore.create({
          mongoUrl: process.env.MONGODB_URI,
          touchAfter: 24 * 3600, // lazy session update
          ttl: 14 * 24 * 60 * 60, // 14 days
          stringify: false
        });
        log.info('Session store initialized with MongoDB');
      } else {
        // Use memory store for development
        const MemoryStoreClass = MemoryStore(session);
        this.sessionStore = new MemoryStoreClass({
          checkPeriod: 30 * 60 * 1000, // 30 minutes cleanup
          max: 20, // ⚠️ CRITICAL: Reduce to 20 sessions max (production-ready)
          ttl: 30 * 60 * 1000 // 30 minutes session timeout
        });
        log.info('Session store initialized with Memory Store');
      }

      // Configure session settings
      this.sessionConfig = {
        secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
        store: this.sessionStore,
        name: 'immigration-portal.sid',
        resave: false,
        saveUninitialized: false,
        rolling: true,
        cookie: {
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
        }
      };

      // Start periodic cleanup for memory optimization
      setInterval(() => {
        this.performMemoryCleanup();
      }, 5 * 60 * 1000); // Every 5 minutes

      log.info('Session management service initialized with memory optimization');
    } catch (error) {
      log.error('Failed to initialize session service:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      throw new AppError('Failed to initialize session management', 500);
    }
  }

  /**
   * Perform memory cleanup to prevent memory leaks
   */
  private static performMemoryCleanup(): void {
    const beforeViolations = this.violations.length;
    
    // Clean up old violations (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.violations = this.violations.filter(violation => 
      new Date(violation.timestamp) > oneHourAgo
    );
    
    // Ensure we don't exceed maximum
    if (this.violations.length > this.MAX_VIOLATIONS_HISTORY) {
      this.violations = this.violations.slice(-this.MAX_VIOLATIONS_HISTORY);
    }
    
    const afterViolations = this.violations.length;
    
    if (beforeViolations - afterViolations > 10) {
      log.info('Session service memory cleanup completed', {
        violationsBefore: beforeViolations,
        violationsAfter: afterViolations,
        cleaned: beforeViolations - afterViolations
      });
    }
  }

  /**
   * Get session configuration
   */
  static getSessionConfig(): SessionConfig {
    if (!this.sessionConfig) {
      throw new AppError('Session service not initialized', 500);
    }
    return this.sessionConfig;
  }

  /**
   * Create session middleware
   */
  static createSessionMiddleware(): any {
    if (!this.sessionConfig) {
      throw new AppError('Session service not initialized', 500);
    }
    return session(this.sessionConfig);
  }

  /**
   * Create secure session for user
   */
  static async createSession(
    req: Request,
    res: Response,
    userData: {
      userId: string;
      userEmail: string;
      role: string;
      permissions: string[];
      tenantId: string;
      tenantName?: string;
      tenantDomain?: string;
      isSuperAdmin: boolean;
      mfaVerified: boolean;
      sessionType?: 'web' | 'api' | 'mobile';
      deviceId?: string;
    }
  ): Promise<void> {
    try {
      const tenantRequest = req as TenantRequest;
      const ipAddress = (req as any).ip || (req as any).connection.remoteAddress || 'unknown';
      const userAgent = (req as any).get('User-Agent') || 'unknown';

      const sessionData: SessionData = {
        userId: userData.userId,
        tenantId: userData.tenantId,
        userEmail: userData.userEmail,
        role: userData.role,
        permissions: userData.permissions,
        tenantName: userData.tenantName,
        tenantDomain: userData.tenantDomain,
        loginTime: new Date(),
        lastActivity: new Date(),
        ipAddress,
        userAgent,
        isSuperAdmin: userData.isSuperAdmin,
        mfaVerified: userData.mfaVerified,
        sessionType: userData.sessionType || 'web',
        deviceId: userData.deviceId,
        metadata: {
          browser: this.extractBrowser(userAgent),
          os: this.extractOS(userAgent)
        }
      };

      // Store session data - FIXED: Check if session exists first
      if (!(req as any).session) {
        log.error('Session not available in request');
        throw new AppError('Session not available', 500);
      }
      
      ((req as any).session as any).userData = sessionData;
      ((req as any).session as any).authenticated = true;

      // Set session cookie options
      (req as any).session.cookie.maxAge = this.getSessionMaxAge(userData.role, userData.sessionType);

      // Log session creation
      log.info('Session created:', {
        userId: userData.userId,
        tenantId: userData.tenantId,
        sessionType: userData.sessionType,
        ipAddress
      });

    } catch (error) {
      log.error('Failed to create session:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      throw new AppError('Failed to create session', 500);
    }
  }

  /**
   * Update session activity
   */
  static updateSessionActivity(req: Request): void {
    try {
      if ((req as any).session && ((req as any).session as any).userData) {
        ((req as any).session as any).userData.lastActivity = new Date();
        (req as any).session.touch();
      }
    } catch (error) {
      log.error('Failed to update session activity:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
    }
  }

  /**
   * Validate session
   */
  static validateSession(req: Request): {
    isValid: boolean;
    sessionData?: SessionData;
    violations?: SessionViolation[];
  } {
    try {
      const violations: SessionViolation[] = [];
      
      if (!(req as any).session || !((req as any).session as any).authenticated) {
        return { isValid: false, violations };
      }

      const sessionData = ((req as any).session as any).userData as SessionData;
      if (!sessionData) {
        return { isValid: false, violations };
      }

      // Check session expiration
      const now = new Date();
      const maxAge = (req as any).session.cookie.maxAge || 24 * 60 * 60 * 1000;
      const sessionAge = now.getTime() - sessionData.loginTime.getTime();
      
      if (sessionAge > maxAge) {
        violations.push(this.createViolation(
          (req as any).sessionID,
          'expired_session',
          'Session has expired',
          'medium',
          sessionData
        ));
        return { isValid: false, violations };
      }

      // Check IP address (optional security check)
      const currentIP = (req as any).ip || (req as any).connection.remoteAddress;
      if (sessionData.ipAddress && currentIP && sessionData.ipAddress !== currentIP) {
        violations.push(this.createViolation(
          (req as any).sessionID,
          'ip_mismatch',
          'IP address mismatch detected',
          'high',
          { ...sessionData, currentIP }
        ));
      }

      // Check user agent (optional security check)
      const currentUserAgent = (req as any).get('User-Agent');
      if (sessionData.userAgent && currentUserAgent && sessionData.userAgent !== currentUserAgent) {
        violations.push(this.createViolation(
          (req as any).sessionID,
          'user_agent_mismatch',
          'User agent mismatch detected',
          'medium',
          { ...sessionData, currentUserAgent }
        ));
      }

      // Update last activity
      this.updateSessionActivity(req);

      return {
        isValid: violations.length === 0,
        sessionData,
        violations: violations.length > 0 ? violations : undefined
      };

    } catch (error) {
      log.error('Failed to validate session:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      return { isValid: false };
    }
  }

  /**
   * Destroy session
   */
  static async destroySession(req: Request): Promise<void> {
    try {
      if ((req as any).session) {
        const sessionData = ((req as any).session as any).userData;
        
        // Log session destruction
        if (sessionData) {
          log.info('Session destroyed:', {
            userId: sessionData.userId,
            tenantId: sessionData.tenantId,
            sessionId: (req as any).sessionID
          });
        }

        (req as any).session.destroy((err: Error | null) => {
          if (err) {
            log.error('Failed to destroy session:', { error: err.message });
          }
        });
      }
    } catch (error) {
      log.error('Failed to destroy session:', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Get session statistics
   */
  static async getSessionStats(): Promise<SessionStats> {
    try {
      // This would require implementing session store statistics
      // For now, return mock data
      return {
        totalSessions: 0,
        activeSessions: 0,
        expiredSessions: 0,
        sessionsByTenant: [],
        sessionsByUser: [],
        sessionsByType: [],
        recentSessions: [],
        sessionDuration: {
          average: 0,
          min: 0,
          max: 0
        }
      };
    } catch (error) {
      log.error('Failed to get session statistics:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      throw new AppError('Failed to get session statistics', 500);
    }
  }

  /**
   * Get session violations
   */
  static getSessionViolations(limit: number = 50): SessionViolation[] {
    return this.violations
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      // This would require implementing session cleanup logic
      // For now, return 0
      return 0;
    } catch (error) {
      log.error('Failed to cleanup expired sessions:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      return 0;
    }
  }

  /**
   * Get session max age based on role and type
   */
  private static getSessionMaxAge(role: string, sessionType?: string): number {
    // Super admins get longer sessions
    if (role === 'super_admin') {
      return 7 * 24 * 60 * 60 * 1000; // 7 days
    }

    // API sessions are shorter
    if (sessionType === 'api') {
      return 60 * 60 * 1000; // 1 hour
    }

    // Mobile sessions are longer
    if (sessionType === 'mobile') {
      return 30 * 24 * 60 * 60 * 1000; // 30 days
    }

    // Default web sessions
    return 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Extract browser from user agent
   */
  private static extractBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  /**
   * Extract OS from user agent
   */
  private static extractOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  /**
   * Create session violation
   */
  private static createViolation(
    sessionId: string,
    type: SessionViolation['violationType'],
    description: string,
    severity: SessionViolation['severity'],
    metadata?: any
  ): SessionViolation {
    const violation: SessionViolation = {
      id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      sessionId,
      violationType: type,
      severity,
      description,
      ipAddress: metadata?.ipAddress || 'unknown',
      userAgent: metadata?.userAgent || 'unknown',
      userId: metadata?.userId,
      tenantId: metadata?.tenantId,
      metadata
    };

    this.violations.push(violation);

    // Keep only recent violations in memory (optimized for memory usage)
    if (this.violations.length > this.MAX_VIOLATIONS_HISTORY) {
      this.violations = this.violations.slice(-this.MAX_VIOLATIONS_HISTORY);
    }

    log.warn('Session violation:', { violation });

    return violation;
  }

  /**
   * Middleware to validate session on each request
   */
  static sessionValidationMiddleware() {
    return (req: Request, res: Response, next: Function) => {
      try {
        const validation = this.validateSession(req);
        
        if (!validation.isValid) {
          if (validation.violations && validation.violations.length > 0) {
            // Log violations but don't block the request for minor violations
            const criticalViolations = validation.violations.filter((v: any) => v.severity === 'critical');
            
            if (criticalViolations.length > 0) {
              return (res as any).status(401).json({
                success: false,
                message: 'Session security violation detected',
                violations: criticalViolations
              });
            }
          } else {
            return (res as any).status(401).json({
              success: false,
              message: 'Invalid or expired session'
            });
          }
        }

        next();
      } catch (error) {
        log.error('Session validation middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
        next(error);
      }
    };
  }

  /**
   * Middleware to require authentication
   */
  static requireAuth() {
    return (req: Request, res: Response, next: Function) => {
      try {
        if (!(req as any).session || !((req as any).session as any).authenticated) {
          return (res as any).status(401).json({
            success: false,
            message: 'Authentication required'
          });
        }

        next();
      } catch (error) {
        log.error('Auth middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
        next(error);
      }
    };
  }

  /**
   * Middleware to require specific role
   */
  static requireRole(roles: string[]) {
    return (req: Request, res: Response, next: Function) => {
      try {
        const sessionData = ((req as any).session as any)?.userData as SessionData;
        
        if (!sessionData || !roles.includes(sessionData.role)) {
          return (res as any).status(403).json({
            success: false,
            message: 'Insufficient permissions'
          });
        }

        next();
      } catch (error) {
        log.error('Role middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
        next(error);
      }
    };
  }

  /**
   * Middleware to require MFA verification
   */
  static requireMFA() {
    return (req: Request, res: Response, next: Function) => {
      try {
        const sessionData = ((req as any).session as any)?.userData as SessionData;
        
        if (!sessionData || !sessionData.mfaVerified) {
          return (res as any).status(403).json({
            success: false,
            message: 'Multi-factor authentication required'
          });
        }

        next();
      } catch (error) {
        log.error('MFA middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
        next(error);
      }
    };
  }
}
