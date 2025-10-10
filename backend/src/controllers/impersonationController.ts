// backend/src/controllers/impersonationController.ts
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { TenantRequest } from '../middleware/tenantResolution';
import { ImpersonationService } from '../services/impersonationService';
import { AppError } from '../utils/errors';

// Start impersonation session (Super Admin only)
export const startImpersonation = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const { targetUserId, reason } = req.body;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can start impersonation
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can start impersonation'
      });
    }

    if (!targetUserId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Target user ID and reason are required'
      });
    }

    const result = await ImpersonationService.startImpersonation(
      user._id,
      user.email,
      targetUserId,
      reason,
      req
    );
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.status(201).json({
      success: true,
      message: 'Impersonation session started successfully',
      data: {
        impersonation: result.impersonation,
        token: result.token,
        session: result.session
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to start impersonation'
    });
  }
});

// End impersonation session (Super Admin only)
export const endImpersonation = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const { sessionId, reason } = req.body;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can end impersonation
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can end impersonation'
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    const result = await ImpersonationService.endImpersonation(sessionId, user._id, reason);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to end impersonation'
    });
  }
});

// Get active impersonations (Super Admin only)
export const getActiveImpersonations = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view active impersonations
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view active impersonations'
      });
    }

    const superAdminId = req.query.superAdminId as string;
    const impersonations = await ImpersonationService.getActiveImpersonations(superAdminId);
    
    res.json({
      success: true,
      data: impersonations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get active impersonations'
    });
  }
});

// Get impersonation history (Super Admin only)
export const getImpersonationHistory = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view impersonation history
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view impersonation history'
      });
    }

    const superAdminId = req.query.superAdminId as string;
    const targetUserId = req.query.targetUserId as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const isActive = req.query.isActive ? req.query.isActive === 'true' : undefined;
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const sortBy = req.query.sortBy as string || 'startTime';
    const sortOrder = req.query.sortOrder as 'asc' | 'desc' || 'desc';

    const result = await ImpersonationService.getImpersonationHistory(
      superAdminId,
      targetUserId,
      { startDate, endDate, isActive },
      { page, limit, sortBy, sortOrder }
    );
    
    res.json({
      success: true,
      data: result.impersonations,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get impersonation history'
    });
  }
});

// Get impersonation statistics (Super Admin only)
export const getImpersonationStats = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view impersonation statistics
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view impersonation statistics'
      });
    }

    const superAdminId = req.query.superAdminId as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const stats = await ImpersonationService.getImpersonationStats(superAdminId, { startDate, endDate });
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get impersonation statistics'
    });
  }
});

// Get impersonation configuration (Super Admin only)
export const getImpersonationConfig = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view impersonation configuration
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view impersonation configuration'
      });
    }

    const config = ImpersonationService.getConfig();
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get impersonation configuration'
    });
  }
});

// End all active impersonations (Super Admin only)
export const endAllActiveImpersonations = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can end all impersonations
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can end all impersonations'
      });
    }

    const targetSuperAdminId = req.body.superAdminId || user._id;
    const endedCount = await ImpersonationService.endAllActiveSessions(targetSuperAdminId);
    
    res.json({
      success: true,
      message: `Ended ${endedCount} active impersonation sessions`,
      data: {
        endedCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to end all active impersonations'
    });
  }
});

// Validate impersonation token
export const validateImpersonationToken = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    const validation = await ImpersonationService.validateImpersonationToken(token);
    
    if (!validation.valid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid impersonation token',
        error: validation.error
      });
    }

    res.json({
      success: true,
      data: {
        valid: true,
        session: validation.session,
        impersonation: validation.impersonation
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to validate impersonation token'
    });
  }
});

// Get current impersonation context
export const getCurrentImpersonationContext = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const impersonationContext = ImpersonationService.getImpersonationContext(req);
    
    res.json({
      success: true,
      data: impersonationContext
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get impersonation context'
    });
  }
});

// Cleanup expired impersonation sessions (Super Admin only)
export const cleanupExpiredSessions = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can cleanup expired sessions
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can cleanup expired sessions'
      });
    }

    const cleanedCount = await ImpersonationService.cleanupExpiredSessions();
    
    res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} expired impersonation sessions`,
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
