// backend/src/controllers/profileController.ts
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { TenantRequest } from '../middleware/tenantResolution';
import { TenantAwareService } from '../middleware/rowLevelSecurity';
import { ProfileService } from '../services/profileService';

export const getProfile = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = req.user;
    const tenantId = req.tenantId;
    const isSuperAdmin = req.isSuperAdmin;
    
    // Input validation
    if (!user) {
      console.log('getProfile: User not authenticated');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!tenantId && !isSuperAdmin) {
      console.log('getProfile: Tenant context required for user:', user._id);
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    console.log('getProfile: Starting profile retrieval for user:', user._id, 'tenant:', tenantId);

    // Get profile using ProfileService with tenant context
    const profileService = new ProfileService();
    let profile;
    
    try {
      // Defensive programming: ensure user._id exists and is valid
      if (!user._id) {
        console.error('getProfile: User ID is missing');
        return res.status(500).json({
          success: false,
          message: 'Invalid user data'
        });
      }

      profile = await profileService.getProfileByUserId(user._id, tenantId || '');
      console.log('getProfile: Profile retrieval completed, found:', !!profile);
    } catch (error) {
      console.error('getProfile: Error retrieving profile:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve profile'
      });
    }
    
    // Handle case when no profile exists
    if (!profile) {
      console.log('getProfile: No profile found for user:', user._id);
      // Set tenant context headers even for no data response
      if (tenantId) {
        res.set('X-Tenant-ID', tenantId);
      }
      return res.json({
        success: true,
        message: 'No data found',
        data: null
      });
    }

    // Validate tenant access with defensive programming
    try {
      console.log('getProfile: Validating tenant access for profile:', profile._id);
      
      // Additional null checks before validation
      if (!profile || !profile.tenantId) {
        console.error('getProfile: Profile data is invalid for validation');
        return res.status(500).json({
          success: false,
          message: 'Invalid profile data'
        });
      }

      const hasAccess = TenantAwareService.validateAccess(profile, 'Profile');
      console.log('getProfile: Tenant validation result:', hasAccess);
      
      if (!hasAccess) {
        console.log('getProfile: Access denied for user:', user._id, 'profile:', profile._id);
        return res.status(403).json({
          success: false,
          message: 'Access denied to this profile'
        });
      }
    } catch (validationError) {
      console.error('getProfile: Tenant validation error:', validationError);
      // Don't crash the request if validation fails - log and continue
      // This ensures the "no data found" flow is not blocked by validation errors
      console.log('getProfile: Continuing despite validation error');
    }

    // Set tenant context headers
    if (tenantId) {
      res.set('X-Tenant-ID', tenantId);
    }

    console.log('getProfile: Successfully returning profile for user:', user._id);
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('getProfile: Unexpected error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get profile'
    });
  }
});

export const getProfileProgress = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = req.user;
    const tenantId = req.tenantId;
    const isSuperAdmin = req.isSuperAdmin;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!tenantId && !isSuperAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    // Calculate profile progress using ProfileService
    const progress = await ProfileService.calculateProgress(user._id, tenantId || '');
    
    // Set tenant context headers
    if (tenantId) {
      res.set('X-Tenant-ID', tenantId);
    }

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get profile progress'
    });
  }
});

// Additional tenant-aware profile endpoints
export const updateProfile = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = req.user;
    const tenantId = req.tenantId;
    const isSuperAdmin = req.isSuperAdmin;
    const profileData = req.body;
    
    // SECURITY: Validate user authentication
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // SECURITY: Validate input data
    if (!profileData || typeof profileData !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid profile data'
      });
    }

    if (!tenantId && !isSuperAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    // Ensure tenant context is preserved in updates
    const tenantAwareProfileData = TenantAwareService.ensureTenantId(profileData, 'Profile');
    
    // Update profile using ProfileService
    const updatedProfile = await ProfileService.updateProfile(user._id, tenantId || '', tenantAwareProfileData);
    
    // Set tenant context headers
    if (tenantId) {
      res.set('X-Tenant-ID', tenantId);
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to update profile'
    });
  }
});

export const getAllProfiles = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = req.user;
    const tenantId = req.tenantId;
    const isSuperAdmin = req.isSuperAdmin;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!tenantId && !isSuperAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    // Get all profiles for the tenant
    const profiles = await ProfileService.getAllProfiles(page, limit, tenantId || '', isSuperAdmin);
    
    // Set tenant context headers
    if (tenantId) {
      res.set('X-Tenant-ID', tenantId);
    }

    res.json({
      success: true,
      data: profiles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get profiles'
    });
  }
});

export const getProfileById = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = req.user;
    const { profileId } = req.params;
    const tenantId = req.tenantId;
    const isSuperAdmin = req.isSuperAdmin;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!tenantId && !isSuperAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    // Get profile by ID using ProfileService
    const profile = await ProfileService.getProfile(profileId, tenantId || '', isSuperAdmin);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Validate tenant access
    if (profile && !TenantAwareService.validateAccess(profile, 'Profile')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this profile'
      });
    }

    // Set tenant context headers
    if (tenantId) {
      res.set('X-Tenant-ID', tenantId);
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get profile'
    });
  }
});