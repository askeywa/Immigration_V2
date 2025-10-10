// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { Tenant, ITenant } from '../models/Tenant';
import { Subscription, ISubscription } from '../models/Subscription';
import { config } from '../config/config';
import mongoose from 'mongoose';

export interface AuthRequest extends Request {
  user?: IUser;
  tenant?: ITenant;
  subscription?: ISubscription;
  tokenPayload?: {
    userId: string;
    tenantId?: string;
    role?: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false,
        message: 'Access denied. No token provided.' 
      });
    }
    
    // SECURITY: Validate Authorization header format
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid authorization header format.' 
      });
    }
    
    const token = authHeader.replace('Bearer ', '').trim();
    
    // SECURITY: Validate token format
    if (!token || token.length < 10) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token format.' 
      });
    }

    const decoded = jwt.verify(token, config.jwtSecret) as {
      userId: string;
      tenantId?: string;
      role?: string;
      iat?: number;
      exp?: number;
    };
    
    // SECURITY: Validate token expiration and structure
    if (!decoded.userId || (decoded.exp && Date.now() >= decoded.exp * 1000)) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid or expired token.' 
      });
    }
    
    // SECURITY: Re-validate user status to prevent race conditions
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token or user account deactivated.' 
      });
    }
    
    // SECURITY: Validate user role hasn't changed
    if (decoded.role && decoded.role !== user.role) {
      return res.status(401).json({ 
        success: false,
        message: 'User role has changed. Please log in again.' 
      });
    }

    // Store token payload for additional context
    req.tokenPayload = decoded;
    req.user = user;

    // For super admins, no tenant validation needed
    if (user.isSuperAdmin()) {
      next();
      return;
    }

    // For tenant users, validate tenant context
    if (decoded.tenantId && user.tenantId) {
      const userTenantId = user.tenantId.toString();
      
      // Verify token tenant matches user tenant
      if (userTenantId !== decoded.tenantId) {
        return res.status(401).json({ 
          success: false,
          message: 'Token tenant mismatch.' 
        });
      }

      // Note: Tenant active status check removed for performance
      // If needed, can be added back with a separate query

      // Get subscription info
      const subscription = await Subscription.findOne({ tenantId: userTenantId }).populate('planId');
      
      // Check subscription status
      if (subscription && !subscription.isActive()) {
        return res.status(401).json({ 
          success: false,
          message: 'Subscription has expired. Please renew to continue.' 
        });
      }

      // Note: tenant object removed for performance - tenant ID available in req.user.tenantId
      req.subscription = subscription || undefined;
    }

    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false,
      message: 'Invalid token.' 
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Insufficient permissions.' 
      });
    }
    next();
  };
};

// Middleware to ensure user belongs to a specific tenant
export const requireTenant = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required.' 
    });
  }

  // Super admins can access any tenant
  if (req.user.isSuperAdmin()) {
    next();
    return;
  }

  if (!req.tenant) {
    return res.status(403).json({ 
      success: false,
      message: 'Tenant access required.' 
    });
  }

  next();
};

// Middleware to validate tenant ID parameter matches user's tenant
export const validateTenantAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
  const tenantId = req.params.tenantId || req.body.tenantId || req.query.tenantId;
  
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required.' 
    });
  }

  // Super admins can access any tenant
  if (req.user.isSuperAdmin()) {
    next();
    return;
  }

  if (!tenantId) {
    return res.status(400).json({ 
      success: false,
      message: 'Tenant ID required.' 
    });
  }

  if (!req.user.belongsToTenant(tenantId)) {
    return res.status(403).json({ 
      success: false,
      message: 'Access denied to this tenant.' 
    });
  }

  next();
};

// Middleware to require super admin access
export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required.' 
    });
  }

  if (!req.user.isSuperAdmin()) {
    return res.status(403).json({ 
      success: false,
      message: 'Super admin access required.' 
    });
  }

  next();
};

// Middleware to check subscription limits before allowing user creation
export const checkSubscriptionLimits = (type: 'user' | 'admin') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.subscription) {
      // If no subscription info, allow (for super admin operations)
      next();
      return;
    }

    try {
      const canAdd = type === 'admin' 
        ? await req.subscription.canAddAdmins(1)
        : await req.subscription.canAddUsers(1);

      if (!canAdd) {
        return res.status(403).json({
          success: false,
          message: `${type === 'admin' ? 'Admin' : 'User'} limit exceeded for current subscription plan.`,
          details: {
            currentUsers: req.subscription.usage.currentUsers,
            currentAdmins: req.subscription.usage.currentAdmins,
            planLimits: {
              maxUsers: (req.subscription.planId as any)?.limits?.maxUsers,
              maxAdmins: (req.subscription.planId as any)?.limits?.maxAdmins
            }
          }
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error checking subscription limits.'
      });
    }
  };
};

// Export alias for backward compatibility
export const authenticateToken = authenticate;