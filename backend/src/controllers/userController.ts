// backend/src/controllers/userController.ts
import { Response } from 'express';
import { UserService } from '../services/userService';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { TenantRequest } from '../middleware/tenantResolution';
import { TenantAwareService } from '../middleware/rowLevelSecurity';

export const getUsers = asyncHandler(async (req: TenantRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const tenantId = req.tenantId;
  const userRole = req.user?.role;

  // Use TenantAwareService to get tenant-scoped users
  const result = await UserService.getAllUsers(page, limit, tenantId, userRole);
  
  // Set tenant context headers
  if (tenantId) {
    res.set('X-Tenant-ID', tenantId);
  }
  
  res.json({
    success: true,
    data: result,
  });
});

export const getUserStats = asyncHandler(async (req: TenantRequest, res: Response) => {
  const tenantId = req.tenantId;
  const isSuperAdmin = req.isSuperAdmin;

  const stats = await UserService.getUserStats(tenantId, isSuperAdmin);
  
  // Set tenant context headers
  if (tenantId) {
    res.set('X-Tenant-ID', tenantId);
  }
  
  res.json({
    success: true,
    data: stats,
  });
});

export const getCurrentUser = asyncHandler(async (req: TenantRequest, res: Response) => {
  const tenantId = req.tenantId;
  const isSuperAdmin = req.isSuperAdmin;
  
  // Enhance user data with tenant context
  const user = req.user as any;
  const enhancedUser = {
    ...user,
    tenantId: tenantId || null,
    isSuperAdmin: isSuperAdmin || false
  };
  
  // Set tenant context headers
  if (tenantId) {
    res.set('X-Tenant-ID', tenantId);
  }
  
  res.json({
    success: true,
    data: { user: enhancedUser },
  });
});

export const getAllUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Super admin method to get all users across all tenants
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  
  const result = await UserService.getAllUsersAcrossTenants(page, limit);
  
  res.json({
    success: true,
    data: {
      users: result.users
    },
    pagination: result.pagination
  });
});

export const deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Super admin method to delete any user
  const { id } = req.params;
  
  await UserService.deleteUser(id);
  
  res.json({
    success: true,
    message: 'User deleted successfully',
  });
});

export const updateUser = asyncHandler(async (req: TenantRequest, res: Response) => {
  const { userId } = req.params;
  const updateData = req.body;
  const tenantId = req.tenantId;
  const isSuperAdmin = req.isSuperAdmin;

  // Ensure tenant context is preserved in updates
  const tenantAwareUpdateData = TenantAwareService.ensureTenantId(updateData, 'User');
  
  const user = await UserService.updateUser(userId, tenantAwareUpdateData, tenantId, req.user?.role);
  
  if (!user) {
    return res.status(404).json({ 
      success: false,
      message: 'User not found' 
    });
  }

  // Validate tenant access
  if (!TenantAwareService.validateAccess(user, 'User')) {
    return res.status(403).json({ 
      success: false,
      message: 'Access denied to this user' 
    });
  }

  // Set tenant context headers
  if (tenantId) {
    res.set('X-Tenant-ID', tenantId);
  }

  res.json({
    success: true,
    message: 'User updated successfully',
    data: { user },
  });
});

export const getUserById = asyncHandler(async (req: TenantRequest, res: Response) => {
  const { userId } = req.params;
  const tenantId = req.tenantId;
  const isSuperAdmin = req.isSuperAdmin;
  
  const user = await UserService.getUserById(userId, tenantId, req.user?.role);
  
  if (!user) {
    return res.status(404).json({ 
      success: false, 
      message: 'User not found' 
    });
  }

  // Validate tenant access
  if (!TenantAwareService.validateAccess(user, 'User')) {
    return res.status(403).json({ 
      success: false,
      message: 'Access denied to this user' 
    });
  }

  // Set tenant context headers
  if (tenantId) {
    res.set('X-Tenant-ID', tenantId);
  }
  
  res.json({ 
    success: true, 
    data: { user } 
  });
});