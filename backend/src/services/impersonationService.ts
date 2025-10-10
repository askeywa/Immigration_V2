// backend/src/services/impersonationService.ts
import { Request, Response } from 'express';
import { Impersonation, IImpersonation } from '../models/Impersonation';
import { User, IUser } from '../models/User';
import { Tenant, ITenant } from '../models/Tenant';
import { TenantRequest } from '../middleware/tenantResolution';
import { AppError } from '../utils/errors';
import { log } from '../utils/logger';
import jwt from 'jsonwebtoken';

export interface ImpersonationConfig {
  enabled: boolean;
  maxDuration: number; // in minutes
  requireReason: boolean;
  requireApproval: boolean;
  maxActiveSessions: number;
  allowCrossTenant: boolean;
  auditAllActions: boolean;
  autoEndInactive: boolean;
  inactiveTimeout: number; // in minutes
}

export interface ImpersonationSession {
  impersonationId: string;
  impersonationToken: string;
  superAdminId: string;
  superAdminEmail: string;
  targetUserId: string;
  targetUserEmail: string;
  targetTenantId: string;
  targetTenantName: string;
  targetUserRole: string;
  targetUserPermissions: string[];
  startTime: Date;
  reason: string;
  isActive: boolean;
  riskScore: number;
  flags: string[];
}

export interface ImpersonationStats {
  totalImpersonations: number;
  activeImpersonations: number;
  avgDuration: number;
  topTargetUsers: Array<{ userId: string; email: string; count: number }>;
  topSuperAdmins: Array<{ adminId: string; email: string; count: number }>;
  riskDistribution: Array<{ riskLevel: string; count: number }>;
  hourlyDistribution: Array<{ hour: number; count: number }>;
  recentImpersonations: IImpersonation[];
}

export class ImpersonationService {
  private static config: ImpersonationConfig;
  private static activeSessions: Map<string, ImpersonationSession> = new Map();
  private static readonly MAX_ACTIVE_SESSIONS = 50; // CRITICAL: Limit active sessions

  /**
   * Initialize the impersonation service
   */
  static async initialize(): Promise<void> {
    try {
      this.config = {
        enabled: true,
        maxDuration: 120, // 2 hours
        requireReason: true,
        requireApproval: false,
        maxActiveSessions: 5,
        allowCrossTenant: true,
        auditAllActions: true,
        autoEndInactive: true,
        inactiveTimeout: 30 // 30 minutes
      };

      // Clean up expired sessions on startup
      await this.cleanupExpiredSessions();

      log.info('Impersonation service initialized with comprehensive security controls');
    } catch (error) {
      log.error('Failed to initialize impersonation service:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      throw new AppError('Failed to initialize impersonation service', 500);
    }
  }

  /**
   * Get impersonation configuration
   */
  static getConfig(): ImpersonationConfig {
    if (!this.config) {
      throw new AppError('Impersonation service not initialized', 500);
    }
    return this.config;
  }

  /**
   * Start impersonation session
   */
  static async startImpersonation(
    superAdminId: string,
    superAdminEmail: string,
    targetUserId: string,
    reason: string,
    req: Request
  ): Promise<{
    success: boolean;
    impersonation?: IImpersonation;
    token?: string;
    session?: ImpersonationSession;
    message?: string;
  }> {
    try {
      // Validate configuration
      if (!this.config.enabled) {
        throw new AppError('Impersonation is disabled', 403);
      }

      // Check if super admin has active sessions limit
      const activeSessions = await Impersonation.getActiveImpersonations(superAdminId);
      if (activeSessions.length >= this.config.maxActiveSessions) {
        throw new AppError(`Maximum active sessions limit reached (${this.config.maxActiveSessions})`, 429);
      }

      // Get target user
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        throw new AppError('Target user not found', 404);
      }

      // Get target user's tenant
      const targetTenant = await Tenant.findById(targetUser.tenantId);
      if (!targetTenant) {
        throw new AppError('Target user tenant not found', 404);
      }

      // Validate reason
      if (this.config.requireReason && (!reason || reason.trim().length < 10)) {
        throw new AppError('Valid reason is required (minimum 10 characters)', 400);
      }

      // Create session ID
      const sessionId = `imp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create impersonation record
      const impersonation = await Impersonation.createImpersonation(
        superAdminId,
        superAdminEmail,
        targetUserId,
        targetUser.email,
        (targetTenant._id as any).toString(),
        targetTenant.name,
        reason,
        sessionId,
        {
          ipAddress: (req as any).ip || 'unknown',
          userAgent: (req as any).get('User-Agent') || 'unknown',
          deviceId: (req as any).headers['x-device-id'] as string,
          location: (req as any).headers['x-location'] as string
        }
      );

      // Create impersonation session
      const impersonationSession: ImpersonationSession = {
        impersonationId: (impersonation._id as any).toString(),
        impersonationToken: impersonation.impersonationToken,
        superAdminId,
        superAdminEmail,
        targetUserId,
        targetUserEmail: targetUser.email,
        targetTenantId: (targetTenant._id as any).toString(),
        targetTenantName: targetTenant.name,
        targetUserRole: targetUser.role,
        targetUserPermissions: targetUser.permissions || [],
        startTime: impersonation.startTime,
        reason,
        isActive: true,
        riskScore: 0,
        flags: []
      };

      // Store session in memory
      this.activeSessions.set(sessionId, impersonationSession);
      
      // ✅ ADD: Prevent sessions map from growing indefinitely
      if (this.activeSessions.size > this.MAX_ACTIVE_SESSIONS) {
        const firstKey = this.activeSessions.keys().next().value;
        if (firstKey) {
          this.activeSessions.delete(firstKey);
        }
      }

      // Generate impersonation JWT token
      const token = jwt.sign(
        {
          impersonationId: (impersonation._id as any).toString(),
          sessionId,
          superAdminId,
          targetUserId,
          targetTenantId: (targetTenant._id as any).toString(),
          type: 'impersonation'
        },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: `${this.config.maxDuration}m` }
      );

      log.info('Impersonation session started:', {
        superAdminId,
        targetUserId,
        targetTenantId: (targetTenant._id as any).toString(),
        sessionId,
        reason
      });

      return {
        success: true,
        impersonation,
        token,
        session: impersonationSession
      };
    } catch (error) {
      log.error('Failed to start impersonation:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      return {
        success: false,
        message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to start impersonation'
      };
    }
  }

  /**
   * End impersonation session
   */
  static async endImpersonation(
    sessionId: string,
    superAdminId: string,
    reason?: string
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      // Find active impersonation
      const impersonation = await Impersonation.findOne({
        sessionId,
        superAdminId,
        isActive: true
      });

      if (!impersonation) {
        throw new AppError('Active impersonation session not found', 404);
      }

      // End impersonation
      impersonation.endImpersonation();
      await impersonation.save();

      // Remove from active sessions
      this.activeSessions.delete(sessionId);

      log.info('Impersonation session ended:', {
        superAdminId,
        sessionId,
        duration: Date.now() - impersonation.startTime.getTime(),
        reason
      });

      return {
        success: true,
        message: 'Impersonation session ended successfully'
      };
    } catch (error) {
      log.error('Failed to end impersonation:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      return {
        success: false,
        message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to end impersonation'
      };
    }
  }

  /**
   * Validate impersonation token
   */
  static async validateImpersonationToken(token: string): Promise<{
    valid: boolean;
    session?: ImpersonationSession;
    impersonation?: IImpersonation;
    error?: string;
  }> {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
      
      if (decoded.type !== 'impersonation') {
        return { valid: false, error: 'Invalid token type' };
      }

      // Get impersonation record
      const impersonation = await Impersonation.validateImpersonationToken(decoded.impersonationId);
      
      if (!impersonation || !impersonation.isActive) {
        return { valid: false, error: 'Impersonation session not active' };
      }

      // Check if expired
      if (impersonation.isExpired()) {
        await this.endImpersonation(decoded.sessionId, decoded.superAdminId, 'Session expired');
        return { valid: false, error: 'Impersonation session expired' };
      }

      // Get session from memory
      const session = this.activeSessions.get(decoded.sessionId);
      
      if (!session) {
        return { valid: false, error: 'Session not found in memory' };
      }

      return {
        valid: true,
        session,
        impersonation
      };
    } catch (error) {
      log.error('Failed to validate impersonation token:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      return {
        valid: false,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Token validation failed'
      };
    }
  }

  /**
   * Get active impersonations
   */
  static async getActiveImpersonations(superAdminId?: string): Promise<IImpersonation[]> {
    try {
      return await Impersonation.getActiveImpersonations(superAdminId);
    } catch (error) {
      log.error('Failed to get active impersonations:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      throw new AppError('Failed to get active impersonations', 500);
    }
  }

  /**
   * Get impersonation history
   */
  static async getImpersonationHistory(
    superAdminId?: string,
    targetUserId?: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      isActive?: boolean;
    },
    options?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{
    impersonations: IImpersonation[];
    pagination: any;
  }> {
    try {
      return await Impersonation.getImpersonationHistory(superAdminId, targetUserId, filters, options);
    } catch (error) {
      log.error('Failed to get impersonation history:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      throw new AppError('Failed to get impersonation history', 500);
    }
  }

  /**
   * Get impersonation statistics
   */
  static async getImpersonationStats(
    superAdminId?: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<ImpersonationStats> {
    try {
      const stats = await Impersonation.getImpersonationStats(superAdminId, filters);
      
      // Add recent impersonations
      const recentImpersonations = await Impersonation.find(
        superAdminId ? { superAdminId } : {}
      )
        .sort({ startTime: -1 })
        .limit(10)
        .lean() as unknown as IImpersonation[];
      
      return {
        ...stats,
        recentImpersonations
      };
    } catch (error) {
      log.error('Failed to get impersonation statistics:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      throw new AppError('Failed to get impersonation statistics', 500);
    }
  }

  /**
   * Log impersonation action
   */
  static async logAction(
    sessionId: string,
    action: string,
    endpoint: string,
    details?: any
  ): Promise<void> {
    try {
      const impersonation = await Impersonation.findOne({ sessionId, isActive: true });
      
      if (impersonation) {
        impersonation.addAction(action, endpoint, details);
        await impersonation.save();

        // Update risk score
        const session = this.activeSessions.get(sessionId);
        if (session) {
          session.riskScore = impersonation.metadata.riskScore;
          session.flags = impersonation.metadata.flags;
        }
      }
    } catch (error) {
      log.error('Failed to log impersonation action:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
    }
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const cleanedCount = await Impersonation.cleanupExpiredSessions();
      
      // Also clean up memory sessions
      for (const [sessionId, session] of this.activeSessions.entries()) {
        const impersonation = await Impersonation.findOne({ sessionId });
        if (!impersonation || !impersonation.isActive) {
          this.activeSessions.delete(sessionId);
        }
      }

      log.info(`Cleaned up ${cleanedCount} expired impersonation sessions`);
      return cleanedCount;
    } catch (error) {
      log.error('Failed to cleanup expired sessions:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      return 0;
    }
  }

  /**
   * End all active sessions for a super admin
   */
  static async endAllActiveSessions(superAdminId: string): Promise<number> {
    try {
      const endedCount = await Impersonation.endAllActiveSessions(superAdminId);
      
      // Clean up memory sessions
      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (session.superAdminId === superAdminId) {
          this.activeSessions.delete(sessionId);
        }
      }

      log.info(`Ended ${endedCount} active impersonation sessions for super admin: ${superAdminId}`);
      return endedCount;
    } catch (error) {
      log.error('Failed to end all active sessions:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      throw new AppError('Failed to end all active sessions', 500);
    }
  }

  /**
   * Get impersonation session from request
   */
  static getImpersonationFromRequest(req: Request): ImpersonationSession | null {
    const impersonationToken = (req as any).headers['x-impersonation-token'] as string;
    const sessionId = (req as any).headers['x-session-id'] as string;
    
    if (!sessionId) return null;
    
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Check if request is impersonated
   */
  static isImpersonated(req: Request): boolean {
    return this.getImpersonationFromRequest(req) !== null;
  }

  /**
   * Get impersonation context for request
   */
  static getImpersonationContext(req: Request): {
    isImpersonated: boolean;
    session?: ImpersonationSession;
    originalUser?: any;
    impersonatedUser?: any;
  } {
    const session = this.getImpersonationFromRequest(req);
    const user = (req as any).user;
    
    return {
      isImpersonated: !!session,
      session: session || undefined,
      originalUser: session ? { id: session.superAdminId, email: session.superAdminEmail } : user,
      impersonatedUser: session ? { id: session.targetUserId, email: session.targetUserEmail } : user
    };
  }
}
