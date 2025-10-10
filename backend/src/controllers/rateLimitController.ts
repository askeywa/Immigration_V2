// backend/src/controllers/rateLimitController.ts
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { TenantRequest } from '../middleware/tenantResolution';
import { RateLimitService, RateLimitRule } from '../services/rateLimitService';
import { AppError } from '../utils/errors';

// Get rate limiting statistics
export const getRateLimitStats = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view rate limiting statistics
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view rate limiting statistics'
      });
    }

    const timeframe = (req.query.timeframe as 'hour' | 'day' | 'week') || 'hour';
    const stats = RateLimitService.getStats(timeframe);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get rate limiting statistics'
    });
  }
});

// Get rate limiting rules
export const getRateLimitRules = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view rate limiting rules
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view rate limiting rules'
      });
    }

    const rules = RateLimitService.getRules();
    
    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get rate limiting rules'
    });
  }
});

// Get specific rate limiting rule
export const getRateLimitRule = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const { ruleId } = req.params;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view rate limiting rules
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view rate limiting rules'
      });
    }

    if (!ruleId) {
      return res.status(400).json({
        success: false,
        message: 'Rule ID is required'
      });
    }

    const rule = RateLimitService.getRule(ruleId);
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting rule not found'
      });
    }
    
    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get rate limiting rule'
    });
  }
});

// Create rate limiting rule
export const createRateLimitRule = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can create rate limiting rules
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can create rate limiting rules'
      });
    }

    const {
      id,
      name,
      description,
      tenantId,
      userId,
      apiKeyId,
      ipAddress,
      endpoint,
      method,
      config,
      isActive,
      priority
    } = req.body;

    // Validate required fields
    if (!id || !name || !config) {
      return res.status(400).json({
        success: false,
        message: 'ID, name, and config are required'
      });
    }

    // Validate config
    if (!config.windowMs || !config.max) {
      return res.status(400).json({
        success: false,
        message: 'Config must include windowMs and max'
      });
    }

    const ruleData: Omit<RateLimitRule, 'createdAt' | 'updatedAt'> = {
      id,
      name,
      description,
      tenantId,
      userId,
      apiKeyId,
      ipAddress,
      endpoint,
      method,
      config,
      isActive: isActive !== undefined ? isActive : true,
      priority: priority || 5
    };

    const rule = await RateLimitService.addRule(ruleData);
    
    res.status(201).json({
      success: true,
      message: 'Rate limiting rule created successfully',
      data: rule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to create rate limiting rule'
    });
  }
});

// Update rate limiting rule
export const updateRateLimitRule = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const { ruleId } = req.params;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can update rate limiting rules
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can update rate limiting rules'
      });
    }

    if (!ruleId) {
      return res.status(400).json({
        success: false,
        message: 'Rule ID is required'
      });
    }

    const existingRule = RateLimitService.getRule(ruleId);
    if (!existingRule) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting rule not found'
      });
    }

    const updateData = req.body;
    
    // Remove read-only fields
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Update the rule
    const updatedRule: RateLimitRule = {
      ...existingRule,
      ...updateData,
      updatedAt: new Date()
    };

    await RateLimitService.addRule(updatedRule);
    
    res.json({
      success: true,
      message: 'Rate limiting rule updated successfully',
      data: updatedRule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to update rate limiting rule'
    });
  }
});

// Delete rate limiting rule
export const deleteRateLimitRule = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const { ruleId } = req.params;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can delete rate limiting rules
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can delete rate limiting rules'
      });
    }

    if (!ruleId) {
      return res.status(400).json({
        success: false,
        message: 'Rule ID is required'
      });
    }

    const deleted = await RateLimitService.removeRule(ruleId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting rule not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Rate limiting rule deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to delete rate limiting rule'
    });
  }
});

// Get rate limit violations
export const getRateLimitViolations = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view rate limit violations
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view rate limit violations'
      });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const violations = RateLimitService.getViolations(limit);
    
    res.json({
      success: true,
      data: violations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get rate limit violations'
    });
  }
});

// Clear rate limit for specific key
export const clearRateLimit = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can clear rate limits
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can clear rate limits'
      });
    }

    const { key } = req.body;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'Rate limit key is required'
      });
    }

    await RateLimitService.clearRateLimit(key);
    
    res.json({
      success: true,
      message: `Rate limit cleared for key: ${key}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to clear rate limit'
    });
  }
});

// Get current rate limit status
export const getRateLimitStatus = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const { key } = req.params;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Only super admins can view rate limit status
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view rate limit status'
      });
    }

    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'Rate limit key is required'
      });
    }

    const status = await RateLimitService.getRateLimitStatus(key);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get rate limit status'
    });
  }
});
