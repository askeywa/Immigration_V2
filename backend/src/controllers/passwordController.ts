// backend/src/controllers/passwordController.ts
import { Request, Response } from 'express';
import { User } from '../models/User';
import { AuthService } from '../services/authService';
import { asyncHandler } from '../middleware/errorHandler';
import { TenantRequest } from '../middleware/tenantResolution';
import { AppError } from '../utils/errors';
import { log } from '../config/logging';

export class PasswordController {
  /**
   * Change password for authenticated user
   * POST /api/auth/change-password
   */
  static async changePassword(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      const user = req.user;

      if (!user) {
        throw new AppError('User not authenticated', 401);
      }

      // Validate required fields
      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new AppError('Current password, new password, and confirmation are required', 400);
      }

      // Validate password confirmation
      if (newPassword !== confirmPassword) {
        throw new AppError('New password and confirmation do not match', 400);
      }

      // Validate password strength
      if (newPassword.length < 6) {
        throw new AppError('Password must be at least 6 characters long', 400);
      }

      // Get full user document from database
      const fullUser = await User.findById(user._id);
      if (!fullUser) {
        throw new AppError('User not found', 404);
      }

      // Verify current password
      const isCurrentPasswordValid = await fullUser.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new AppError('Current password is incorrect', 400);
      }

      // Update password and reset password change flags
      fullUser.password = newPassword;
      fullUser.mustChangePassword = false;
      fullUser.passwordChangeRequired = false;
      fullUser.isFirstLogin = false;

      await fullUser.save();

      log.info('Password changed successfully', {
        userId: user._id,
        email: user.email,
        tenantId: req.tenantId,
        ip: req.ip
      });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
        data: {
          user: fullUser.toJSON()
        }
      });

    } catch (error: any) {
      log.error('Password change failed', {
        userId: req.user?._id,
        email: req.user?.email,
        error: error.message,
        ip: req.ip
      });

      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }

  /**
   * Force password change for a user (admin only)
   * POST /api/auth/force-password-change/:userId
   */
  static async forcePasswordChange(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const currentUser = req.user;

      if (!currentUser) {
        throw new AppError('User not authenticated', 401);
      }

      // Validate userId format (must be valid MongoDB ObjectId)
      if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
        throw new AppError('Invalid user ID format', 400);
      }

      // Check if current user has permission to force password change
      const isSuperAdmin = currentUser.role === 'super_admin';
      const isTenantAdmin = currentUser.role === 'admin' || currentUser.role === 'tenant_admin';

      if (!isSuperAdmin && !isTenantAdmin) {
        throw new AppError('Insufficient permissions to force password change', 403);
      }

      // Find the target user
      const targetUser = await User.findById(userId);
      if (!targetUser) {
        throw new AppError('User not found', 404);
      }

      // For tenant admins, ensure they can only force password change for users in their tenant
      if (isTenantAdmin && !isSuperAdmin) {
        if (targetUser.tenantId?.toString() !== currentUser.tenantId?.toString()) {
          throw new AppError('You can only force password change for users in your tenant', 403);
        }
      }

      // Set password change requirement
      targetUser.mustChangePassword = true;
      targetUser.passwordChangeRequired = true;
      await targetUser.save();

      log.info('Password change forced for user', {
        targetUserId: userId,
        targetUserEmail: targetUser.email,
        forcedBy: currentUser._id,
        forcedByEmail: currentUser.email,
        tenantId: req.tenantId,
        ip: req.ip
      });

      res.status(200).json({
        success: true,
        message: 'Password change requirement set successfully',
        data: {
          user: targetUser.toJSON()
        }
      });

    } catch (error: any) {
      log.error('Force password change failed', {
        userId: req.user?._id,
        targetUserId: req.params.userId,
        error: error.message,
        ip: req.ip
      });

      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }

  /**
   * Check if user requires password change
   * GET /api/auth/password-change-required
   */
  static async checkPasswordChangeRequired(req: TenantRequest, res: Response): Promise<void> {
    try {
      const user = req.user;

      if (!user) {
        throw new AppError('User not authenticated', 401);
      }

      // Get full user document from database
      const fullUser = await User.findById(user._id);
      if (!fullUser) {
        throw new AppError('User not found', 404);
      }

      const requiresPasswordChange = fullUser.requiresPasswordChange();

      res.status(200).json({
        success: true,
        data: {
          requiresPasswordChange,
          mustChangePassword: fullUser.mustChangePassword,
          isFirstLogin: fullUser.isFirstLogin,
          passwordChangeRequired: fullUser.passwordChangeRequired
        }
      });

    } catch (error: any) {
      log.error('Check password change required failed', {
        userId: req.user?._id,
        error: error.message,
        ip: req.ip
      });

      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }
}

// Export individual handler functions for route binding
export const changePassword = asyncHandler(PasswordController.changePassword);
export const forcePasswordChange = asyncHandler(PasswordController.forcePasswordChange);
export const checkPasswordChangeRequired = asyncHandler(PasswordController.checkPasswordChangeRequired);
