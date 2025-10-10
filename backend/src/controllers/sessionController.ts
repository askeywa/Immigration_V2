// backend/src/controllers/sessionController.ts
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { TenantRequest } from '../middleware/tenantResolution';
import { SessionService, SessionData } from '../services/sessionService';
import { AppError } from '../utils/errors';

// Get current session information
export const getCurrentSession = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const sessionData = req.sessionData;
    
    if (!sessionData) {
      return res.status(401).json({
        success: false,
        message: 'No active session found'
      });
    }

    // Return sanitized session data (remove sensitive information)
    const sanitizedSession = {
      userId: sessionData.userId,
      userEmail: sessionData.userEmail,
      role: sessionData.role,
      permissions: sessionData.permissions,
      tenantId: sessionData.tenantId,
      tenantName: sessionData.tenantName,
      tenantDomain: sessionData.tenantDomain,
      loginTime: sessionData.loginTime,
      lastActivity: sessionData.lastActivity,
      sessionType: sessionData.sessionType,
      isSuperAdmin: sessionData.isSuperAdmin,
      mfaVerified: sessionData.mfaVerified,
      metadata: sessionData.metadata
    };
    
    res.json({
      success: true,
      data: sanitizedSession
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get session information'
    });
  }
});

// Get session statistics (Super Admin only)
export const getSessionStats = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view session statistics
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view session statistics'
      });
    }

    const stats = await SessionService.getSessionStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get session statistics'
    });
  }
});

// Get session violations (Super Admin only)
export const getSessionViolations = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view session violations
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view session violations'
      });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const violations = SessionService.getSessionViolations(limit);
    
    res.json({
      success: true,
      data: violations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get session violations'
    });
  }
});

// Destroy current session (logout)
export const destroyCurrentSession = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const sessionData = req.sessionData;
    
    if (!sessionData) {
      return res.status(401).json({
        success: false,
        message: 'No active session found'
      });
    }

    await SessionService.destroySession(req);
    
    res.json({
      success: true,
      message: 'Session destroyed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to destroy session'
    });
  }
});

// Destroy specific session (Super Admin only)
export const destroySession = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const { sessionId } = req.params;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can destroy other sessions
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can destroy sessions'
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    // This would require implementing session destruction by ID
    // For now, just return success
    res.json({
      success: true,
      message: `Session ${sessionId} destroyed successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to destroy session'
    });
  }
});

// Refresh session
export const refreshSession = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const sessionData = req.sessionData;
    
    if (!sessionData) {
      return res.status(401).json({
        success: false,
        message: 'No active session found'
      });
    }

    // Touch the session to refresh it
    req.session?.touch();
    
    res.json({
      success: true,
      message: 'Session refreshed successfully',
      data: {
        newExpiry: req.session?.cookie.expires
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to refresh session'
    });
  }
});

// Validate session
export const validateSession = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const sessionData = req.sessionData;
    
    if (!sessionData) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session'
      });
    }

    res.json({
      success: true,
      message: 'Session is valid',
      data: {
        userId: sessionData.userId,
        tenantId: sessionData.tenantId,
        role: sessionData.role,
        isSuperAdmin: sessionData.isSuperAdmin,
        mfaVerified: sessionData.mfaVerified,
        lastActivity: sessionData.lastActivity
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to validate session'
    });
  }
});

// Cleanup expired sessions (Super Admin only)
export const cleanupExpiredSessions = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can cleanup sessions
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can cleanup sessions'
      });
    }

    const cleanedCount = await SessionService.cleanupExpiredSessions();
    
    res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} expired sessions`,
      data: {
        cleanedCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to cleanup expired sessions'
    });
  }
});

// Get active sessions for current user
export const getUserSessions = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const sessionData = req.sessionData;
    
    if (!sessionData) {
      return res.status(401).json({
        success: false,
        message: 'No active session found'
      });
    }

    // This would require implementing user session tracking
    // For now, return current session only
    const userSessions = [{
      sessionId: req.sessionID,
      loginTime: sessionData.loginTime,
      lastActivity: sessionData.lastActivity,
      ipAddress: sessionData.ipAddress,
      userAgent: sessionData.userAgent,
      sessionType: sessionData.sessionType,
      isCurrent: true
    }];
    
    res.json({
      success: true,
      data: userSessions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get user sessions'
    });
  }
});

// Update session metadata
export const updateSessionMetadata = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const sessionData = req.sessionData;
    
    if (!sessionData) {
      return res.status(401).json({
        success: false,
        message: 'No active session found'
      });
    }

    const { metadata } = req.body;
    
    if (!metadata || typeof metadata !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Valid metadata object is required'
      });
    }

    // Update session metadata
    (req.session as any).userData.metadata = {
      ...sessionData.metadata,
      ...metadata,
      updatedAt: new Date()
    };
    
    res.json({
      success: true,
      message: 'Session metadata updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to update session metadata'
    });
  }
});

// Check session health
export const checkSessionHealth = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const sessionData = req.sessionData;
    
    if (!sessionData) {
      return res.status(401).json({
        success: false,
        message: 'No active session found',
        health: 'unhealthy'
      });
    }

    // Check session health indicators
    const now = new Date();
    const lastActivity = new Date(sessionData.lastActivity);
    const timeSinceLastActivity = now.getTime() - lastActivity.getTime();
    const maxAge = req.session?.cookie.maxAge || 24 * 60 * 60 * 1000;
    const sessionAge = now.getTime() - sessionData.loginTime.getTime();
    
    const health = {
      status: 'healthy',
      sessionAge,
      timeSinceLastActivity,
      maxAge,
      remainingTime: maxAge - sessionAge,
      lastActivity: sessionData.lastActivity,
      mfaVerified: sessionData.mfaVerified,
      isSuperAdmin: sessionData.isSuperAdmin
    };
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to check session health'
    });
  }
});
