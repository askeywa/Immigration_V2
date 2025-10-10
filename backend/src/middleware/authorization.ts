// backend/src/middleware/authorization.ts
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export interface AuthorizedRequest extends AuthRequest {
  // Inherits user from AuthRequest which is IUser
}

export const authorize = (allowedRoles: string | string[]) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req: AuthorizedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. User not authenticated.'
        });
      }

      const userRole = req.user.role;
      
      if (!roles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Authorization error.'
      });
    }
  };
};

export const requireRole = (role: string) => {
  return authorize([role]);
};

export const requireSuperAdmin = authorize(['super_admin']);
export const requireTenantAdmin = authorize(['tenant_admin', 'super_admin']);
export const requireUser = authorize(['user', 'tenant_admin', 'super_admin']);

// Check if user has access to specific tenant
export const requireTenantAccess = (req: AuthorizedRequest, res: Response, next: NextFunction) => {
  try {
    const requestedTenantId = req.params.tenantId || req.body.tenantId || req.query.tenantId;
    const userTenantId = req.user?.tenantId;

    // Super admin can access any tenant
    if (req.user?.role === 'super_admin') {
      return next();
    }

    // Regular users can only access their own tenant
    if (requestedTenantId && userTenantId !== requestedTenantId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Cannot access other tenant data.'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Tenant access validation error.'
    });
  }
};
