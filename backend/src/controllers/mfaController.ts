// backend/src/controllers/mfaController.ts
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { TenantRequest } from '../middleware/tenantResolution';
import { MFAService } from '../services/mfaService';
import { ValidationError } from '../utils/errors';

// Get MFA status for current user
export const getMFAStatus = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    const status = await MFAService.getMFAStatus(user._id, tenantId);
    
    // Set tenant context headers
    res.set('X-Tenant-ID', tenantId);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get MFA status'
    });
  }
});

// Get MFA settings for current user
export const getMFASettings = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    const settings = await MFAService.getMFASettings(user._id, tenantId);
    
    // Set tenant context headers
    res.set('X-Tenant-ID', tenantId);
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get MFA settings'
    });
  }
});

// Setup TOTP for current user
export const setupTOTP = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    const setup = await MFAService.setupTOTP(user._id, tenantId);
    
    // Set tenant context headers
    res.set('X-Tenant-ID', tenantId);
    
    res.json({
      success: true,
      message: 'TOTP setup initiated successfully',
      data: setup
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to setup TOTP'
    });
  }
});

// Verify and enable TOTP
export const verifyTOTP = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    const { token } = req.body;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'TOTP token is required'
      });
    }

    const verified = await MFAService.verifyAndEnableTOTP(user._id, tenantId, token);
    
    if (verified) {
      // Set tenant context headers
      res.set('X-Tenant-ID', tenantId);
      
      res.json({
        success: true,
        message: 'TOTP verified and enabled successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid TOTP token'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to verify TOTP'
    });
  }
});

// Setup SMS verification
export const setupSMS = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    const { phoneNumber } = req.body;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    await MFAService.setupSMS(user._id, tenantId, phoneNumber);
    
    // Set tenant context headers
    res.set('X-Tenant-ID', tenantId);
    
    res.json({
      success: true,
      message: 'SMS verification setup initiated. Please check your phone for verification code.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to setup SMS verification'
    });
  }
});

// Verify SMS code
export const verifySMS = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    const { code } = req.body;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'SMS verification code is required'
      });
    }

    const verified = await MFAService.verifySMS(user._id, tenantId, code);
    
    if (verified) {
      // Set tenant context headers
      res.set('X-Tenant-ID', tenantId);
      
      res.json({
        success: true,
        message: 'SMS verification successful'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid SMS verification code'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to verify SMS code'
    });
  }
});

// Setup email verification
export const setupEmail = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    await MFAService.setupEmail(user._id, tenantId);
    
    // Set tenant context headers
    res.set('X-Tenant-ID', tenantId);
    
    res.json({
      success: true,
      message: 'Email verification setup initiated. Please check your email for verification code.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to setup email verification'
    });
  }
});

// Verify email code
export const verifyEmail = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    const { code } = req.body;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Email verification code is required'
      });
    }

    const verified = await MFAService.verifyEmail(user._id, tenantId, code);
    
    if (verified) {
      // Set tenant context headers
      res.set('X-Tenant-ID', tenantId);
      
      res.json({
        success: true,
        message: 'Email verification successful'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid email verification code'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to verify email code'
    });
  }
});

// Verify MFA (general endpoint)
export const verifyMFA = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    const { method, code } = req.body;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    if (!method || !code) {
      return res.status(400).json({
        success: false,
        message: 'MFA method and code are required'
      });
    }

    const result = await MFAService.verifyMFA(user._id, tenantId, method, code);
    
    // Set tenant context headers
    res.set('X-Tenant-ID', tenantId);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'MFA verification successful',
        data: {
          method: result.method,
          requiresBackup: result.requiresBackup
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'MFA verification failed'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to verify MFA'
    });
  }
});

// Disable MFA method
export const disableMFA = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    const { method } = req.body;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    if (!method) {
      return res.status(400).json({
        success: false,
        message: 'MFA method is required'
      });
    }

    await MFAService.disableMFA(user._id, tenantId, method);
    
    // Set tenant context headers
    res.set('X-Tenant-ID', tenantId);
    
    res.json({
      success: true,
      message: `${method.toUpperCase()} MFA method disabled successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to disable MFA'
    });
  }
});

// Update MFA policy (admin only)
export const updateMFAPolicy = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    const policy = req.body;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    // Check if user is admin
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to update MFA policy'
      });
    }

    await MFAService.updateMFAPolicy(user._id, tenantId, policy);
    
    // Set tenant context headers
    res.set('X-Tenant-ID', tenantId);
    
    res.json({
      success: true,
      message: 'MFA policy updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to update MFA policy'
    });
  }
});

// Generate new backup codes
export const generateBackupCodes = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    const backupCodes = await MFAService.generateNewBackupCodes(user._id, tenantId);
    
    // Set tenant context headers
    res.set('X-Tenant-ID', tenantId);
    
    res.json({
      success: true,
      message: 'New backup codes generated successfully',
      data: { backupCodes }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to generate backup codes'
    });
  }
});

// Check if MFA setup is needed
export const needsMFASetup = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    const needsSetup = await MFAService.needsMFASetup(user._id, tenantId);
    
    // Set tenant context headers
    res.set('X-Tenant-ID', tenantId);
    
    res.json({
      success: true,
      data: { needsSetup }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to check MFA setup status'
    });
  }
});
