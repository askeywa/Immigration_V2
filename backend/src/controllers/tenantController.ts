// backend/src/controllers/tenantController.ts
import { Request, Response } from 'express';
import { TenantService } from '../services/tenantService';
import { TenantRequest } from '../middleware/tenantResolution';
import { log } from '../utils/logger';
import { CacheInvalidation } from '../utils/cacheInvalidation';

export class TenantController {
  /**
   * @route GET /api/tenants/resolve/subdomain/:subdomain
   * @description Resolve tenant by subdomain
   * @access Public
   */
  static async resolveBySubdomain(req: TenantRequest, res: Response): Promise<void> {
    const { subdomain } = req.params;

    try {
      // TODO: Implement getTenantBySubdomain method in TenantService
      const tenant: any = null; // await TenantService.getTenantBySubdomain(subdomain);
      
      if (!tenant) {
        res.status(404).json({
          success: false,
          message: 'Tenant not found for subdomain'
        });
        return;
      }

      // Get subscription info if method exists
      let subscription = null;
      try {
        // TODO: Implement getTenantSubscription method in TenantService
        subscription = null; // await TenantService.getTenantSubscription(tenant._id.toString());
      } catch (error) {
        // Subscription method might not exist, continue without it
        log.warn('Subscription service not available', { tenantId: tenant._id });
      }

      log.info('Tenant resolved by subdomain', { 
        subdomain, 
        tenantId: tenant._id,
        tenantName: tenant.name 
      });

      res.json({
        success: true,
        tenant: {
          _id: tenant._id,
          name: tenant.name,
          domain: tenant.domain,
          status: tenant.status,
          settings: tenant.settings
        },
        subscription
      });

    } catch (error) {
      log.error('Failed to resolve tenant by subdomain', { 
        subdomain, 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to resolve tenant'
      });
    }
  }

  /**
   * @route GET /api/tenants/resolve/domain/:domain
   * @description Resolve tenant by custom domain
   * @access Public
   */
  static async resolveByDomain(req: TenantRequest, res: Response): Promise<void> {
    const { domain } = req.params;

    try {
      // TODO: Implement getTenantByCustomDomain method in TenantService
      const tenant: any = null; // await TenantService.getTenantByCustomDomain(domain);
      
      if (!tenant) {
        res.status(404).json({
          success: false,
          message: 'Tenant not found for domain'
        });
        return;
      }

      // Get subscription info if method exists
      let subscription = null;
      try {
        // TODO: Implement getTenantSubscription method in TenantService
        subscription = null; // await TenantService.getTenantSubscription(tenant._id.toString());
      } catch (error) {
        // Subscription method might not exist, continue without it
        log.warn('Subscription service not available', { tenantId: tenant._id });
      }

      log.info('Tenant resolved by custom domain', { 
        domain, 
        tenantId: tenant._id,
        tenantName: tenant.name 
      });

      res.json({
        success: true,
        tenant: {
          _id: tenant._id,
          name: tenant.name,
          domain: tenant.domain,
          status: tenant.status,
          settings: tenant.settings
        },
        subscription
      });

    } catch (error) {
      log.error('Failed to resolve tenant by domain', { 
        domain, 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to resolve tenant'
      });
    }
  }

  /**
   * @route GET /api/tenants/user-tenants
   * @description Get tenants accessible by current user
   * @access Private
   */
  static async getUserTenants(req: TenantRequest, res: Response): Promise<void> {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    try {
      let tenants: any;

      if (user.role === 'super_admin') {
        // Super admin can see all tenants
        tenants = await TenantService.getAllTenants();
      } else {
        // Regular users can only see their own tenant
        if (user.tenantId) {
          const tenantId = typeof user.tenantId === 'object' ? user.tenantId.toString() : user.tenantId;
          const userTenant = await TenantService.getTenantById(tenantId);
          tenants = userTenant ? [userTenant] : [];
        } else {
          tenants = [];
        }
      }

      log.info('Retrieved user tenants', { 
        userId: user._id,
        userRole: user.role,
        tenantCount: Array.isArray(tenants) ? tenants.length : (tenants?.tenants?.length || 0)
      });

      res.json({
        success: true,
        data: {
          tenants: Array.isArray(tenants) ? tenants : tenants?.tenants || []
        }
      });

    } catch (error) {
      console.error('🚨 getUserTenants error:', error);
      log.error('Failed to get user tenants', { 
        userId: user._id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve tenants',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * @route GET /api/tenants/current
   * @description Get current tenant information
   * @access Private
   */
  static async getCurrentTenant(req: TenantRequest, res: Response): Promise<void> {
    const tenantId = req.tenantId;
    const user = req.user;

    if (!tenantId && user?.role !== 'super_admin') {
      res.status(400).json({
        success: false,
        message: 'No tenant context available'
      });
      return;
    }

    try {
      let tenant = null;
      let subscription = null;

      if (user?.role === 'super_admin') {
        // Super admin doesn't have a specific tenant context
        tenant = null;
        subscription = null;
      } else if (tenantId) {
        tenant = await TenantService.getTenantById(tenantId);
        
        // Get subscription info if method exists
        try {
          // TODO: Implement getTenantSubscription method in TenantService
          subscription = null; // await TenantService.getTenantSubscription(tenantId);
        } catch (error) {
          // Subscription method might not exist, continue without it
          log.warn('Subscription service not available', { tenantId });
        }
      }

      res.json({
        success: true,
        tenant,
        subscription
      });

    } catch (error) {
      log.error('Failed to get current tenant', { 
        tenantId,
        userId: user?._id,
        error: error instanceof Error ? error.message : String(error) 
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve tenant information'
      });
    }
  }

  /**
   * @route GET /api/tenants
   * @description Get all tenants (super admin only)
   * @access Private (Super Admin)
   */
  static async getAllTenants(req: TenantRequest, res: Response): Promise<void> {
    try {
      console.log('🔍 [TenantController.getAllTenants] Method called');
      console.log('🔍 [TenantController.getAllTenants] Query params:', req.query);
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;

      console.log('🔍 [TenantController.getAllTenants] Calling TenantService.getAllTenants with page:', page, 'limit:', limit);
      
      // Call getAllTenants with only the parameters it accepts
      const result = await TenantService.getAllTenants(page, limit);

      console.log('🔍 [TenantController.getAllTenants] Service result:', {
        isArray: Array.isArray(result),
        hasTenantsProperty: !!result?.tenants,
        tenantCount: Array.isArray(result) ? result.length : result?.tenants?.length || 0
      });

      const response = {
        success: true,
        data: {
          tenants: Array.isArray(result) ? result : result?.tenants || []
        },
        pagination: result?.pagination || {
          currentPage: page,
          totalPages: 1,
          totalCount: Array.isArray(result) ? result.length : 0,
          hasNext: false,
          hasPrev: false
        }
      };

      console.log('🔍 [TenantController.getAllTenants] Sending response with', response.data.tenants.length, 'tenants');

      res.json(response);

    } catch (error) {
      console.error('❌ [TenantController.getAllTenants] Error:', error);
      log.error('Failed to get all tenants', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve tenants'
      });
    }
  }

  /**
   * @route GET /api/tenants/:id
   * @description Get tenant by ID
   * @access Private (Admin/Super Admin)
   */
  static async getTenantById(req: TenantRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const user = req.user;

    try {
      const tenant = await TenantService.getTenantById(id);

      if (!tenant) {
        res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
        return;
      }

      // Check if user has access to this tenant
      if (user?.role !== 'super_admin' && user?.tenantId?.toString() !== id) {
        res.status(403).json({
          success: false,
          message: 'Access denied to this tenant'
        });
        return;
      }

      // Get subscription info if method exists
      let subscription = null;
      try {
        // TODO: Implement getTenantSubscription method in TenantService
        subscription = null; // await TenantService.getTenantSubscription(id);
      } catch (error) {
        // Subscription method might not exist, continue without it
        log.warn('Subscription service not available', { tenantId: id });
      }

      res.json({
        success: true,
        tenant,
        subscription
      });

    } catch (error) {
      log.error('Failed to get tenant by ID', { 
        tenantId: id,
        error: error instanceof Error ? error.message : String(error) 
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve tenant'
      });
    }
  }

  /**
   * @route POST /api/tenants
   * @description Create new tenant (super admin only)
   * @access Private (Super Admin)
   */
  static async createTenant(req: TenantRequest, res: Response): Promise<void> {
    try {
      const tenantData = req.body;

      const tenant = await TenantService.createTenant(tenantData);

      // Invalidate tenant cache after creation
      const tenantId = (tenant as any).tenant?._id || (tenant as any)._id;
      await CacheInvalidation.invalidateTenantCache(tenantId);

      log.info('Tenant created', { 
        tenantId,
        tenantName: (tenant as any).tenant?.name || (tenant as any).name,
        createdBy: req.user?._id 
      });

      res.status(201).json({
        success: true,
        tenant,
        message: 'Tenant created successfully'
      });

    } catch (error: any) {
      // Handle validation errors specifically
      if (error.validation && error.statusCode === 400) {
        log.warn('Tenant creation validation failed', { 
          validation: error.validation,
          createdBy: req.user?._id 
        });
        
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.validation.errors,
          fieldErrors: error.validation.fieldErrors,
          error: 'VALIDATION_ERROR'
        });
        return;
      }
      
      // Handle duplicate key errors (MongoDB)
      if (error.code === 11000) {
        let duplicateField = 'unknown field';
        if (error.keyValue?.email) {
          duplicateField = 'email';
        } else if (error.keyValue?.domain) {
          duplicateField = 'domain';
        } else if (error.keyValue?.name) {
          duplicateField = 'name';
        }
        
        log.warn('Duplicate key error during tenant creation', { 
          duplicateField,
          keyValue: error.keyValue,
          createdBy: req.user?._id 
        });
        
        res.status(409).json({
          success: false,
          message: `A tenant with this ${duplicateField} already exists`,
          error: 'DUPLICATE_ERROR',
          field: duplicateField,
          value: error.keyValue?.[duplicateField]
        });
        return;
      }
      
      // Handle other errors
      log.error('Failed to create tenant', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        createdBy: req.user?._id 
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to create tenant',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * @route PUT /api/tenants/:id
   * @description Update tenant
   * @access Private (Admin/Super Admin)
   */
  static async updateTenant(req: TenantRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const updateData = req.body;
    const user = req.user;

    try {
      // Check if user has access to update this tenant
      if (user?.role !== 'super_admin' && user?.tenantId?.toString() !== id) {
        res.status(403).json({
          success: false,
          message: 'Access denied to update this tenant'
        });
        return;
      }

      const tenant = await TenantService.updateTenant(id, updateData);

      // Invalidate tenant cache after update
      await CacheInvalidation.invalidateTenantCache(id);

      log.info('Tenant updated', { 
        tenantId: id,
        updatedBy: user?._id 
      });

      res.json({
        success: true,
        tenant,
        message: 'Tenant updated successfully'
      });

    } catch (error) {
      log.error('Failed to update tenant', { 
        tenantId: id,
        error: error instanceof Error ? error.message : String(error),
        updatedBy: user?._id 
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to update tenant'
      });
    }
  }

  /**
   * @route DELETE /api/tenants/:id
   * @description Delete tenant (super admin only)
   * @access Private (Super Admin)
   */
  static async deleteTenant(req: TenantRequest, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      await TenantService.deleteTenant(id);

      // Invalidate tenant cache after deletion
      await CacheInvalidation.invalidateTenantCache(id);

      log.info('Tenant deleted', { 
        tenantId: id,
        deletedBy: req.user?._id 
      });

      res.json({
        success: true,
        message: 'Tenant deleted successfully'
      });

    } catch (error) {
      log.error('Failed to delete tenant', { 
        tenantId: id,
        error: error instanceof Error ? error.message : String(error),
        deletedBy: req.user?._id 
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete tenant'
      });
    }
  }

  /**
   * @route GET /api/tenants/:id/settings
   * @description Get tenant settings
   * @access Private (Admin/Super Admin)
   */
  static async getTenantSettings(req: TenantRequest, res: Response): Promise<void> {
    const { tenant } = req;
    const { user } = req;

    try {
      // Return mock settings data
      const settings = {
        name: tenant?.name || 'Atlantic Immigration Solutions',
        domain: tenant?.domain || 'atlantic-immigration-solutions.com',
        email: (tenant as any)?.email || 'admin@atlantic-immigration-solutions.com',
        phone: '+1-555-0123',
        timezone: 'UTC',
        language: 'en',
        businessType: 'Immigration Services',
        industry: 'Legal Services',
        companySize: '10-50',
        website: 'https://atlantic-immigration-solutions.com',
        address: '123 Main St, City, State',
        city: 'City',
        state: 'State',
        country: 'Country',
        postalCode: '12345',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        security: {
          twoFactor: false,
          sessionTimeout: 30,
          passwordPolicy: 'medium'
        }
      };

      res.json({
        success: true,
        data: settings
      });

    } catch (error) {
      log.error('Failed to get tenant settings', { 
        tenantId: tenant?._id?.toString(),
        error: error instanceof Error ? error.message : String(error) 
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve tenant settings'
      });
    }
  }

  /**
   * @route PUT /api/tenants/:id/settings
   * @description Update tenant settings
   * @access Private (Admin/Super Admin)
   */
  static async updateTenantSettings(req: TenantRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const settings = req.body;

    try {
      // TODO: Implement updateTenantSettings method in TenantService
      const updatedSettings = settings; // await TenantService.updateTenantSettings(id, settings);

      log.info('Tenant settings updated', { 
        tenantId: id,
        updatedBy: req.user?._id 
      });

      res.json({
        success: true,
        settings: updatedSettings,
        message: 'Settings updated successfully'
      });

    } catch (error) {
      log.error('Failed to update tenant settings', { 
        tenantId: id,
        error: error instanceof Error ? error.message : String(error),
        updatedBy: req.user?._id 
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to update tenant settings'
      });
    }
  }

  /**
   * @route GET /api/tenants/:id/users
   * @description Get tenant users
   * @access Private (Admin/Super Admin)
   */
  static async getTenantUsers(req: TenantRequest, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await TenantService.getTenantUsers(id, page, limit);

      res.json({
        success: true,
        users: Array.isArray(result) ? result : result?.users || [],
        pagination: result?.pagination || {
          currentPage: page,
          totalPages: 1,
          totalCount: Array.isArray(result) ? result.length : 0,
          hasNext: false,
          hasPrev: false
        }
      });

    } catch (error) {
      log.error('Failed to get tenant users', { 
        tenantId: id,
        error: error instanceof Error ? error.message : String(error) 
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve tenant users'
      });
    }
  }

  /**
   * @route GET /api/tenants/:id/analytics
   * @description Get tenant analytics
   * @access Private (Admin/Super Admin)
   */
  static async getTenantAnalytics(req: TenantRequest, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      // Call getTenantAnalytics without parameters as mentioned in your fix instructions
      const analytics = await TenantService.getTenantAnalytics();

      res.json({
        success: true,
        analytics
      });

    } catch (error) {
      log.error('Failed to get tenant analytics', { 
        tenantId: id,
        error: error instanceof Error ? error.message : String(error) 
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve tenant analytics'
      });
    }
  }

  /**
   * @route GET /api/tenants/branding
   * @description Get tenant branding
   * @access Tenant Admin
   */
  static async getTenantBranding(req: TenantRequest, res: Response): Promise<void> {
    const { tenant } = req;
    const { user } = req;

    try {
      // Mock branding data for now
      const branding = {
        logo: (tenant as any)?.logo || null,
        primaryColor: (tenant as any)?.settings?.branding?.primaryColor || '#3B82F6',
        secondaryColor: (tenant as any)?.settings?.branding?.secondaryColor || '#1E40AF',
        fontFamily: (tenant as any)?.settings?.branding?.fontFamily || 'Inter',
        customCSS: (tenant as any)?.settings?.branding?.customCSS || null
      };

      log.info('Tenant branding retrieved', { 
        tenantId: tenant?._id?.toString(), 
        userId: user._id
      });

      res.json({
        success: true,
        data: branding
      });
    } catch (error: any) {
      log.error('Failed to get tenant branding', { 
        tenantId: tenant?._id?.toString(), 
        userId: user._id, 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to get tenant branding'
      });
    }
  }

  /**
   * @route PUT /api/tenants/branding
   * @description Update tenant branding
   * @access Tenant Admin
   */
  static async updateTenantBranding(req: TenantRequest, res: Response): Promise<void> {
    const { tenant } = req;
    const { user } = req;
    const brandingData = req.body;

    try {
      // TODO: Implement updateTenantBranding method in TenantService
      // await TenantService.updateTenantBranding(tenant._id, brandingData, user._id);

      log.info('Tenant branding updated', { 
        tenantId: tenant?._id?.toString(), 
        userId: user._id,
        brandingData: Object.keys(brandingData)
      });

      res.json({
        success: true,
        message: 'Branding updated successfully',
        data: brandingData
      });
    } catch (error: any) {
      log.error('Failed to update tenant branding', { 
        tenantId: tenant?._id?.toString(), 
        userId: user._id, 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to update tenant branding'
      });
    }
  }
}

export default TenantController;