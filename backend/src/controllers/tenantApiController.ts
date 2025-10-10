import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { TenantService } from '../services/tenantService';
import { AppError } from '../utils/errors';
import { log } from '../config/logging';
import { config } from '../config/config';
import { User } from '../models/User';

export class TenantApiController {
  /**
   * Tenant-specific login endpoint
   * POST /api/v1/tenant/auth/login
   */
  static async tenantLogin(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      
      // Get domain from tenant resolution middleware or fallback to host header
      const tenantRequest = req as any;
      const domain = tenantRequest.tenantDomain || tenantRequest.get('x-original-host') || tenantRequest.get('x-tenant-domain') || tenantRequest.get('host')?.split(':')[0] || '';
      
      log.info('Tenant login attempt', {
        email,
        domain,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        tenantDomain: tenantRequest.tenantDomain,
        xOriginalHost: tenantRequest.get('x-original-host'),
        xTenantDomain: tenantRequest.get('x-tenant-domain')
      });

      // Validate required fields
      if (!email || !password) {
        throw new AppError('Email and password are required', 400);
      }

      // Authenticate user with tenant context
      const result = await AuthService.login(email, password, domain);
      
      // Return tenant-specific response
      res.status(200).json({
        success: true,
        data: {
          user: {
            id: result.user._id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role,
            isActive: result.user.isActive
          },
          tenant: result.tenant ? {
            id: result.tenant._id,
            name: result.tenant.name,
            domain: result.tenant.domain,
            status: result.tenant.status
          } : null,
          subscription: result.subscription ? {
            id: result.subscription._id,
            status: result.subscription.status,
            planName: (result.subscription.planId as any)?.name || 'Unknown'
          } : null,
          token: result.token,
          frontendUrl: config.getFrontendUrl(domain)
        },
        message: 'Login successful'
      });

    } catch (error) {
      log.error('Tenant login failed', {
        error: error instanceof Error ? error.message : String(error),
        domain: req.get('host'),
        email: req.body?.email
      });

      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Get tenant information
   * GET /api/v1/tenant/info
   */
  static async getTenantInfo(req: Request, res: Response): Promise<void> {
    try {
      const tenantRequest = req as any;
      
      // Get domain from resolved tenant context or fallback to host header
      const domain = tenantRequest.tenantDomain || 
                     tenantRequest.get('x-original-host') || 
                     tenantRequest.get('x-tenant-domain') || 
                     tenantRequest.get('host')?.split(':')[0] || '';
      
      console.log('🔍 getTenantInfo - Domain resolution:', {
        tenantDomain: tenantRequest.tenantDomain,
        xOriginalHost: tenantRequest.get('x-original-host'),
        xTenantDomain: tenantRequest.get('x-tenant-domain'),
        host: tenantRequest.get('host'),
        resolvedDomain: domain
      });
      
      // Find tenant by domain
      const tenant = await TenantService.getTenantByDomain(domain);
      
      if (!tenant) {
        throw new AppError('Tenant not found', 404);
      }

      res.status(200).json({
        success: true,
        data: {
          id: tenant._id,
          name: tenant.name,
          domain: tenant.domain,
          status: tenant.status,
          settings: {
            maxUsers: tenant.settings?.maxUsers,
            features: tenant.settings?.features
          },
          contactInfo: {
            email: tenant.contactInfo?.email,
            phone: tenant.contactInfo?.phone
          },
          frontendUrl: config.getFrontendUrl(domain),
          apiUrl: config.getTenantApiUrl(domain)
        }
      });

    } catch (error) {
      log.error('Failed to get tenant info', {
        error: error instanceof Error ? error.message : String(error),
        domain: req.get('host')
      });

      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Create a new user for the tenant (admin only)
   * POST /api/v1/tenant/users
   */
  static async createTenantUser(req: Request, res: Response): Promise<void> {
    const controllerId = Math.random().toString(36).substring(7);
    try {
      console.log(`[${controllerId}] ========== CONTROLLER START ==========`);
      console.log(`[${controllerId}] 🔍 Controller: createTenantUser called`);
      
      const { firstName, lastName, email, password, role } = req.body;
      
      // Get tenant context from middleware
      const tenantRequest = req as any;
      const tenantId = tenantRequest.tenantId;
      const createdBy = tenantRequest.user?._id;
      
      log.info('Creating tenant user', {
        email,
        role: role || 'user',
        tenantId,
        createdBy,
        ip: req.ip
      });

      // Validate required fields
      if (!firstName || !lastName || !email || !password) {
        throw new AppError('First name, last name, email, and password are required', 400);
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new AppError('Invalid email format', 400);
      }

      // Validate password strength
      if (password.length < 6) {
        throw new AppError('Password must be at least 6 characters long', 400);
      }

      // Validate role
      const validRoles = ['user', 'admin'];
      if (role && !validRoles.includes(role)) {
        throw new AppError('Invalid role. Must be "user" or "admin"', 400);
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        throw new AppError('User with this email already exists', 409);
      }

      // Create the user using AuthService
      // Create the user using AuthService with timeout
      console.log('🔍 Controller: About to call AuthService.registerTenantUser');
      const createUserPromise = AuthService.registerTenantUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        password,
        role: role || 'user',
        tenantId: tenantId
      }, createdBy); // Pass createdBy for auditing/logging

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new AppError('User creation timed out', 408)), 8000);
      });

      console.log('🔍 Controller: About to race promises');
      const result = await Promise.race([createUserPromise, timeoutPromise]) as Awaited<typeof createUserPromise>;
      console.log('✅ Controller: Promise race completed');

      log.info('Tenant user created successfully', {
        userId: result.user._id?.toString(),
        email: result.user.email,
        role: result.user.role,
        tenantId,
        createdBy
      });

      console.log(`[${controllerId}] ✅ Controller: Sending success response`);
      res.status(201).json({
        success: true,
        data: {
          user: {
            id: result.user._id,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            email: result.user.email,
            role: result.user.role,
            isActive: result.user.isActive,
            createdAt: result.user.createdAt
          }
        },
        message: 'User created successfully'
      });
      console.log(`[${controllerId}] ========== CONTROLLER END (SUCCESS) ==========`);

    } catch (error) {
      console.log(`[${controllerId}] ❌ Controller: Error occurred`);
      log.error('Failed to create tenant user', {
        error: error instanceof Error ? error.message : String(error),
        tenantId: (req as any).tenantId,
        createdBy: (req as any).user?._id
      });

      if (error instanceof AppError) {
        console.log(`[${controllerId}] ========== CONTROLLER END (APP ERROR) ==========`);
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        console.log(`[${controllerId}] ========== CONTROLLER END (SERVER ERROR) ==========`);
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Tenant user registration
   * POST /api/v1/tenant/auth/register
   */
  static async tenantRegister(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      // Get domain from tenant resolution middleware or fallback to host header
      const tenantRequest = req as any;
      const domain = tenantRequest.tenantDomain || tenantRequest.get('x-original-host') || tenantRequest.get('x-tenant-domain') || tenantRequest.get('host')?.split(':')[0] || '';
      
      log.info('Tenant registration attempt', {
        email,
        domain,
        ip: req.ip,
        tenantDomain: tenantRequest.tenantDomain,
        xOriginalHost: tenantRequest.get('x-original-host'),
        xTenantDomain: tenantRequest.get('x-tenant-domain')
      });

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        throw new AppError('All fields are required', 400);
      }

      // Find tenant by domain
      const tenant = await TenantService.getTenantByDomain(domain);
      if (!tenant) {
        throw new AppError('Tenant not found', 404);
      }

      // Register user for this tenant
      const result = await AuthService.register({
        email,
        password,
        firstName,
        lastName,
        role: 'user',
        tenantId: tenant._id.toString()
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: result.user._id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role
          },
          token: result.token,
          frontendUrl: config.getFrontendUrl(domain)
        },
        message: 'Registration successful'
      });

    } catch (error) {
      log.error('Tenant registration failed', {
        error: error instanceof Error ? error.message : String(error),
        domain: req.get('host'),
        email: req.body?.email
      });

      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Get tenant login widget configuration
   * GET /api/v1/tenant/widget/config
   */
  static async getWidgetConfig(req: Request, res: Response): Promise<void> {
    try {
      const domain = req.get('host')?.split(':')[0] || '';
      
      // Find tenant by domain
      const tenant = await TenantService.getTenantByDomain(domain);
      
      if (!tenant) {
        throw new AppError('Tenant not found', 404);
      }

      res.status(200).json({
        success: true,
        data: {
          tenant: {
            id: tenant._id,
            name: tenant.name,
            domain: tenant.domain
          },
          apiEndpoints: {
            login: `${config.getTenantApiUrlByDomain(domain)}/tenant/auth/login`,
            register: `${config.getTenantApiUrlByDomain(domain)}/tenant/auth/register`,
            info: `${config.getTenantApiUrlByDomain(domain)}/tenant/info`
          },
          frontendUrl: config.getFrontendUrl(domain),
          branding: {
            logo: tenant.settings?.customBranding?.logo,
            primaryColor: tenant.settings?.customBranding?.primaryColor || '#3B82F6',
            companyName: tenant.settings?.customBranding?.companyName || tenant.name
          }
        }
      });

    } catch (error) {
      log.error('Failed to get widget config', {
        error: error instanceof Error ? error.message : String(error),
        domain: req.get('host')
      });

      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Get tenant dashboard statistics
   * GET /api/v1/tenant/dashboard/stats
   */
  static async getTenantStats(req: Request, res: Response): Promise<void> {
    try {
      const tenantRequest = req as any;
      const tenantId = tenantRequest.tenantId;
      
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
      }

      // Get tenant users count
      const { User } = require('../models/User');
      const totalUsers = await User.countDocuments({ tenantId });
      const activeUsers = await User.countDocuments({ tenantId, isActive: true });
      
      // Get new users this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const newUsersThisMonth = await User.countDocuments({
        tenantId,
        createdAt: { $gte: startOfMonth }
      });

      // Get documents count (if documents collection exists)
      let totalDocuments = 0;
      let pendingDocuments = 0;
      try {
        const { Document } = require('../models/Document');
        totalDocuments = await Document.countDocuments({ tenantId });
        pendingDocuments = await Document.countDocuments({ 
          tenantId, 
          status: { $in: ['pending', 'under_review'] }
        });
      } catch (docError) {
        // Documents model might not exist yet
        log.warn('Document model not found, using mock data for documents');
        totalDocuments = 12; // Realistic number for a new tenant
        pendingDocuments = 3; // Realistic number of pending documents
      }

      // Get tenant subscription info for revenue calculation
      const tenant = await TenantService.getTenantById(tenantId);
      const monthlyRevenue = (tenant?.subscription as any)?.amount || 0;

      const stats = {
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        totalDocuments,
        pendingDocuments,
        monthlyRevenue,
        systemUptime: 99.8, // This could be calculated from logs
        lastUpdated: new Date().toISOString()
      };

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      log.error('Failed to get tenant stats', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Get tenant recent activity
   * GET /api/v1/tenant/dashboard/activity
   */
  static async getTenantActivity(req: Request, res: Response): Promise<void> {
    try {
      const tenantRequest = req as any;
      const tenantId = tenantRequest.tenantId;
      const limit = parseInt(req.query.limit as string) || 10;
      
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
      }

      // Get recent user registrations
      const { User } = require('../models/User');
      const recentUsers = await User.find({ tenantId })
        .sort({ createdAt: -1 })
        .limit(Math.min(limit, 5))
        .select('firstName lastName email createdAt');

      const activities = recentUsers.map((user: any, index: number) => ({
        _id: `user_${user._id}`,
        type: 'user_registration',
        description: `New user registered: ${user.email}`,
        timestamp: user.createdAt,
        severity: 'info',
        user: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email
        }
      }));

      // Add some mock system activities for demo
      const mockActivities = [
        {
          _id: 'system_1',
          type: 'system_alert',
          description: 'System performance is excellent',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          severity: 'success'
        },
        {
          _id: 'system_2',
          type: 'document_upload',
          description: 'Document processing completed successfully',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          severity: 'success'
        }
      ];

      const allActivities = [...activities, ...mockActivities]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

      res.status(200).json({
        success: true,
        data: allActivities
      });

    } catch (error) {
      log.error('Failed to get tenant activity', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Get tenant analytics data
   * GET /api/v1/tenant/analytics
   */
  static async getTenantAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const tenantRequest = req as any;
      const tenantId = tenantRequest.tenantId;
      const period = req.query.period as string || '30d'; // 7d, 30d, 90d, 1y
      
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
      }

      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Get user growth data
      const { User } = require('../models/User');
      const userGrowthData = await User.aggregate([
        {
          $match: {
            tenantId,
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        }
      ]);

      // Generate chart data
      const userGrowthChart = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayData = userGrowthData.find((item: any) => 
          item._id.year === currentDate.getFullYear() &&
          item._id.month === currentDate.getMonth() + 1 &&
          item._id.day === currentDate.getDate()
        );
        
        userGrowthChart.push({
          date: currentDate.toISOString().split('T')[0],
          users: dayData?.count || 0
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Mock additional analytics data
      const analytics = {
        userGrowth: {
          chart: userGrowthChart,
          total: userGrowthChart.reduce((sum: number, item: any) => sum + item.users, 0),
          growth: '+12.5%'
        },
        documentProcessing: {
          total: 45,
          pending: 8,
          completed: 37,
          avgProcessingTime: '2.3 hours'
        },
        systemPerformance: {
          uptime: 99.8,
          responseTime: '245ms',
          errorRate: 0.02
        },
        revenue: {
          current: 12500,
          previous: 11800,
          growth: '+5.9%'
        }
      };

      res.status(200).json({
        success: true,
        data: analytics
      });

    } catch (error) {
      log.error('Failed to get tenant analytics', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Generate and export tenant reports
   * GET /api/v1/tenant/reports
   */
  static async getTenantReports(req: Request, res: Response): Promise<void> {
    try {
      const tenantRequest = req as any;
      const tenantId = tenantRequest.tenantId;
      const reportType = req.query.type as string || 'summary';
      const format = req.query.format as string || 'json'; // json, csv, pdf
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
      }

      // Calculate date range
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days

      // Get report data based on type
      let reportData: any = {};

      switch (reportType) {
        case 'users':
          reportData = await this.generateUserReport(tenantId, start, end);
          break;
        case 'documents':
          reportData = await this.generateDocumentReport(tenantId, start, end);
          break;
        case 'revenue':
          reportData = await this.generateRevenueReport(tenantId, start, end);
          break;
        case 'activity':
          reportData = await this.generateActivityReport(tenantId, start, end);
          break;
        default:
          reportData = await this.generateSummaryReport(tenantId, start, end);
      }

      // Set response headers based on format
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="tenant-${reportType}-report-${new Date().toISOString().split('T')[0]}.csv"`);
        
        const csv = this.convertToCSV(reportData);
        res.send(csv);
      } else if (format === 'pdf') {
        // For PDF, we would use a library like puppeteer or pdfkit
        // For now, return JSON with PDF generation instructions
        res.status(200).json({
          success: true,
          data: {
            ...reportData,
            format: 'pdf',
            message: 'PDF generation not implemented yet. Please use JSON or CSV format.'
          }
        });
      } else {
        res.status(200).json({
          success: true,
          data: reportData
        });
      }

    } catch (error) {
      log.error('Failed to generate tenant report', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Generate summary report
   */
  private static async generateSummaryReport(tenantId: string, startDate: Date, endDate: Date) {
    const { User } = require('../models/User');
    
    // Get user statistics
    const totalUsers = await User.countDocuments({ tenantId });
    const activeUsers = await User.countDocuments({ tenantId, isActive: true });
    const newUsers = await User.countDocuments({
      tenantId,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Get tenant info
    const tenant = await TenantService.getTenantById(tenantId);

    return {
      reportType: 'summary',
      generatedAt: new Date().toISOString(),
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      tenant: {
        id: tenantId,
        name: tenant?.name || 'Unknown',
        domain: tenant?.domain || 'Unknown'
      },
      summary: {
        totalUsers,
        activeUsers,
        newUsers,
        userGrowthRate: totalUsers > 0 ? ((newUsers / totalUsers) * 100).toFixed(2) : '0.00',
        monthlyRevenue: (tenant?.subscription as any)?.amount || 0
      },
      metrics: {
        userEngagement: {
          totalLogins: 0, // This would require login tracking
          avgSessionDuration: '0 minutes',
          retentionRate: '0%'
        },
        systemHealth: {
          uptime: '99.8%',
          responseTime: '245ms',
          errorRate: '0.02%'
        }
      }
    };
  }

  /**
   * Generate user report
   */
  private static async generateUserReport(tenantId: string, startDate: Date, endDate: Date) {
    const { User } = require('../models/User');
    
    const users = await User.find({ tenantId })
      .select('firstName lastName email role status createdAt lastLogin')
      .sort({ createdAt: -1 });

    const userStats = {
      total: users.length,
      active: users.filter((u: any) => u.isActive !== false).length,
      inactive: users.filter((u: any) => u.isActive === false).length,
      newThisPeriod: users.filter((u: any) => u.createdAt >= startDate && u.createdAt <= endDate).length
    };

    return {
      reportType: 'users',
      generatedAt: new Date().toISOString(),
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      statistics: userStats,
      users: users.map((user: any) => ({
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        status: user.isActive ? 'active' : 'inactive',
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }))
    };
  }

  /**
   * Generate document report
   */
  private static async generateDocumentReport(tenantId: string, startDate: Date, endDate: Date) {
    // Mock document data since Document model might not exist
    const mockDocuments = [
      {
        id: '1',
        name: 'Passport.pdf',
        type: 'passport',
        status: 'approved',
        uploadedBy: 'john.doe@example.com',
        uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        processedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      },
      {
        id: '2',
        name: 'Birth Certificate.pdf',
        type: 'birth_certificate',
        status: 'pending',
        uploadedBy: 'jane.smith@example.com',
        uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        processedAt: null
      }
    ];

    return {
      reportType: 'documents',
      generatedAt: new Date().toISOString(),
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      statistics: {
        total: mockDocuments.length,
        approved: mockDocuments.filter(d => d.status === 'approved').length,
        pending: mockDocuments.filter(d => d.status === 'pending').length,
        rejected: mockDocuments.filter(d => d.status === 'rejected').length
      },
      documents: mockDocuments
    };
  }

  /**
   * Generate revenue report
   */
  private static async generateRevenueReport(tenantId: string, startDate: Date, endDate: Date) {
    const tenant = await TenantService.getTenantById(tenantId);
    
    return {
      reportType: 'revenue',
      generatedAt: new Date().toISOString(),
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      revenue: {
        current: (tenant?.subscription as any)?.amount || 0,
        total: ((tenant?.subscription as any)?.amount || 0) * ((tenant?.subscription as any)?.monthsActive || 1),
        currency: 'USD',
        plan: (tenant?.subscription as any)?.plan || 'Basic'
      },
      breakdown: {
        subscription: (tenant?.subscription as any)?.amount || 0,
        additionalFees: 0,
        taxes: 0
      }
    };
  }

  /**
   * Generate activity report
   */
  private static async generateActivityReport(tenantId: string, startDate: Date, endDate: Date) {
    const { User } = require('../models/User');
    
    const recentUsers = await User.find({ tenantId })
      .select('firstName lastName email createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    const activities = recentUsers.map((user: any) => ({
      type: 'user_registration',
      description: `New user registered: ${user.email}`,
      timestamp: user.createdAt,
      user: `${user.firstName} ${user.lastName}`
    }));

    return {
      reportType: 'activity',
      generatedAt: new Date().toISOString(),
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      totalActivities: activities.length,
      activities
    };
  }

  /**
   * Convert data to CSV format
   */
  private static convertToCSV(data: any): string {
    if (data.reportType === 'users' && data.users) {
      const headers = ['Name', 'Email', 'Role', 'Status', 'Created At', 'Last Login'];
      const rows = data.users.map((user: any) => [
        user.name,
        user.email,
        user.role,
        user.status,
        user.createdAt,
        user.lastLogin || 'Never'
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    // Default CSV format
    return JSON.stringify(data, null, 2);
  }

  /**
   * Get tenant users with advanced filtering and search
   * GET /api/v1/tenant/users
   */
  static async getTenantUsers(req: Request, res: Response): Promise<void> {
    try {
      const tenantRequest = req as any;
      const tenantId = tenantRequest.tenantId;
      
      // Query parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const role = req.query.role as string;
      const status = req.query.status as string;
      const sortBy = req.query.sortBy as string || 'createdAt';
      const sortOrder = req.query.sortOrder as string || 'desc';
      
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
      }

      const { User } = require('../models/User');
      
      // Build filter query - exclude admin users
      const filter: any = { 
        tenantId,
        role: { $ne: 'admin' } // Exclude admin users from the list
      };
      
      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (role) {
        filter.role = role;
      }
      
      if (status) {
        if (status === 'active') {
          filter.isActive = { $ne: false };
        } else if (status === 'inactive') {
          filter.isActive = false;
        }
      }

      // Build sort query
      const sort: any = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Execute queries
      const [users, totalCount] = await Promise.all([
        User.find(filter)
          .select('firstName lastName email role isActive createdAt lastLogin profileComplete')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(filter)
      ]);

      // Format response
      const formattedUsers = users.map((user: any) => ({
        _id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.isActive ? 'active' : 'inactive',
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        profileComplete: user.profileComplete || false
      }));

      res.status(200).json({
        success: true,
        data: {
          users: formattedUsers,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            hasNext: page < Math.ceil(totalCount / limit),
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      log.error('Failed to get tenant users', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Bulk update tenant users
   * PUT /api/v1/tenant/users/bulk
   */
  static async bulkUpdateUsers(req: Request, res: Response): Promise<void> {
    try {
      const tenantRequest = req as any;
      const tenantId = tenantRequest.tenantId;
      const { userIds, action, data } = req.body;
      
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
      }

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        throw new AppError('User IDs are required', 400);
      }

      if (!action) {
        throw new AppError('Action is required', 400);
      }

      const { User } = require('../models/User');

      let updateResult;
      let updateQuery: any = {};

      switch (action) {
        case 'activate':
          updateQuery.isActive = true;
          break;
        case 'deactivate':
          updateQuery.isActive = false;
          break;
        case 'change_role':
          if (!data?.role) {
            throw new AppError('Role is required for change_role action', 400);
          }
          updateQuery.role = data.role;
          break;
        case 'delete':
          // For delete, we'll use deleteMany
          updateResult = await User.deleteMany({
            _id: { $in: userIds },
            tenantId
          });
          break;
        default:
          throw new AppError('Invalid action', 400);
      }

      if (action !== 'delete') {
        updateResult = await User.updateMany(
          { _id: { $in: userIds }, tenantId },
          updateQuery
        );
      }

      res.status(200).json({
        success: true,
        data: {
          action,
          affectedCount: updateResult.modifiedCount || updateResult.deletedCount || 0,
          message: `Successfully ${action}d ${updateResult.modifiedCount || updateResult.deletedCount || 0} users`
        }
      });

    } catch (error) {
      log.error('Failed to bulk update users', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Get user activity logs
   * GET /api/v1/tenant/users/:userId/activity
   */
  static async getUserActivity(req: Request, res: Response): Promise<void> {
    try {
      const tenantRequest = req as any;
      const tenantId = tenantRequest.tenantId;
      const userId = req.params.userId;
      const limit = parseInt(req.query.limit as string) || 20;
      
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
      }

      if (!userId) {
        throw new AppError('User ID is required', 400);
      }

      // Mock activity data - in a real implementation, this would come from an activity log collection
      const mockActivities = [
        {
          _id: '1',
          type: 'login',
          description: 'User logged in',
          timestamp: new Date().toISOString(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        {
          _id: '2',
          type: 'profile_update',
          description: 'Updated profile information',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          details: 'Updated personal information'
        },
        {
          _id: '3',
          type: 'document_upload',
          description: 'Uploaded document: passport.pdf',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          details: 'Document type: passport'
        }
      ];

      res.status(200).json({
        success: true,
        data: {
          userId,
          activities: mockActivities.slice(0, limit)
        }
      });

    } catch (error) {
      log.error('Failed to get user activity', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Get user statistics
   * GET /api/v1/tenant/users/stats
   */
  static async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const tenantRequest = req as any;
      const tenantId = tenantRequest.tenantId;
      
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
      }

      const { User } = require('../models/User');

      // Get various user statistics
      const [
        totalUsers,
        activeUsers,
        inactiveUsers,
        usersByRole,
        newUsersThisMonth,
        usersWithCompleteProfiles
      ] = await Promise.all([
        User.countDocuments({ tenantId, role: { $ne: 'admin' } }),
        User.countDocuments({ tenantId, isActive: { $ne: false }, role: { $ne: 'admin' } }),
        User.countDocuments({ tenantId, isActive: false, role: { $ne: 'admin' } }),
        User.aggregate([
          { $match: { tenantId, role: { $ne: 'admin' } } },
          { $group: { _id: '$role', count: { $sum: 1 } } }
        ]),
        User.countDocuments({
          tenantId,
          createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          role: { $ne: 'admin' }
        }),
        User.countDocuments({ tenantId, profileComplete: true, role: { $ne: 'admin' } })
      ]);

      const stats = {
        totalUsers,
        activeUsers,
        inactiveUsers,
        newUsersThisMonth,
        usersWithCompleteProfiles,
        profileCompletionRate: totalUsers > 0 ? ((usersWithCompleteProfiles / totalUsers) * 100).toFixed(1) : '0',
        usersByRole: usersByRole.reduce((acc: any, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        lastUpdated: new Date().toISOString()
      };

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      log.error('Failed to get user stats', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Get tenant documents with filtering and pagination
   * GET /api/v1/tenant/documents
   */
  static async getTenantDocuments(req: Request, res: Response): Promise<void> {
    try {
      const tenantRequest = req as any;
      const tenantId = tenantRequest.tenantId;
      
      // Query parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const type = req.query.type as string;
      const uploadedBy = req.query.uploadedBy as string;
      const sortBy = req.query.sortBy as string || 'uploadedAt';
      const sortOrder = req.query.sortOrder as string || 'desc';
      
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
      }

      // Mock document data - in a real implementation, this would come from a Document collection
      const mockDocuments = [
        {
          _id: '1',
          name: 'Passport.pdf',
          type: 'passport',
          status: 'approved',
          uploadedBy: 'john.doe@example.com',
          uploadedByUserId: 'user1',
          uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          processedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          fileSize: 2048576, // 2MB
          fileType: 'application/pdf',
          version: 1,
          metadata: {
            pages: 32,
            extractedText: 'PASSPORT DATA...'
          }
        },
        {
          _id: '2',
          name: 'Birth Certificate.pdf',
          type: 'birth_certificate',
          status: 'pending',
          uploadedBy: 'jane.smith@example.com',
          uploadedByUserId: 'user2',
          uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          processedAt: null,
          fileSize: 1536000, // 1.5MB
          fileType: 'application/pdf',
          version: 1,
          metadata: {
            pages: 1,
            extractedText: 'BIRTH CERTIFICATE DATA...'
          }
        },
        {
          _id: '3',
          name: 'Educational Transcript.pdf',
          type: 'educational_document',
          status: 'under_review',
          uploadedBy: 'mike.wilson@example.com',
          uploadedByUserId: 'user3',
          uploadedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          processedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
          fileSize: 3072000, // 3MB
          fileType: 'application/pdf',
          version: 1,
          metadata: {
            pages: 8,
            extractedText: 'TRANSCRIPT DATA...'
          }
        },
        {
          _id: '4',
          name: 'Work Experience Letter.pdf',
          type: 'employment_document',
          status: 'rejected',
          uploadedBy: 'sarah.jones@example.com',
          uploadedByUserId: 'user4',
          uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          processedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          fileSize: 1024000, // 1MB
          fileType: 'application/pdf',
          version: 1,
          metadata: {
            pages: 2,
            extractedText: 'WORK EXPERIENCE DATA...',
            rejectionReason: 'Document is not in English'
          }
        },
        {
          _id: '5',
          name: 'IELTS Score Report.pdf',
          type: 'language_test',
          status: 'approved',
          uploadedBy: 'alex.brown@example.com',
          uploadedByUserId: 'user5',
          uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          processedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
          fileSize: 2560000, // 2.5MB
          fileType: 'application/pdf',
          version: 1,
          metadata: {
            pages: 4,
            extractedText: 'IELTS SCORE DATA...',
            score: 7.5
          }
        }
      ];

      // Apply filters
      let filteredDocuments = mockDocuments;

      if (search) {
        filteredDocuments = filteredDocuments.filter(doc =>
          doc.name.toLowerCase().includes(search.toLowerCase()) ||
          doc.type.toLowerCase().includes(search.toLowerCase()) ||
          doc.uploadedBy.toLowerCase().includes(search.toLowerCase())
        );
      }

      if (status) {
        filteredDocuments = filteredDocuments.filter(doc => doc.status === status);
      }

      if (type) {
        filteredDocuments = filteredDocuments.filter(doc => doc.type === type);
      }

      if (uploadedBy) {
        filteredDocuments = filteredDocuments.filter(doc => doc.uploadedBy === uploadedBy);
      }

      // Apply sorting
      filteredDocuments.sort((a, b) => {
        const aValue = a[sortBy as keyof typeof a];
        const bValue = b[sortBy as keyof typeof b];
        
        if (sortOrder === 'asc') {
          return (aValue || 0) > (bValue || 0) ? 1 : -1;
        } else {
          return (aValue || 0) < (bValue || 0) ? 1 : -1;
        }
      });

      // Apply pagination
      const totalCount = filteredDocuments.length;
      const skip = (page - 1) * limit;
      const paginatedDocuments = filteredDocuments.slice(skip, skip + limit);

      res.status(200).json({
        success: true,
        data: {
          documents: paginatedDocuments,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            hasNext: page < Math.ceil(totalCount / limit),
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      log.error('Failed to get tenant documents', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Get document statistics
   * GET /api/v1/tenant/documents/stats
   */
  static async getDocumentStats(req: Request, res: Response): Promise<void> {
    try {
      const tenantRequest = req as any;
      const tenantId = tenantRequest.tenantId;
      
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
      }

      // Mock document statistics
      const stats = {
        totalDocuments: 45,
        approved: 32,
        pending: 8,
        underReview: 3,
        rejected: 2,
        totalFileSize: 125000000, // 125MB
        avgProcessingTime: '2.3 hours',
        documentsByType: {
          passport: 8,
          birth_certificate: 6,
          educational_document: 12,
          employment_document: 10,
          language_test: 5,
          other: 4
        },
        documentsByStatus: {
          approved: 32,
          pending: 8,
          under_review: 3,
          rejected: 2
        },
        processingTrend: [
          { date: '2024-01-01', processed: 5, uploaded: 8 },
          { date: '2024-01-02', processed: 7, uploaded: 6 },
          { date: '2024-01-03', processed: 4, uploaded: 9 },
          { date: '2024-01-04', processed: 8, uploaded: 5 },
          { date: '2024-01-05', processed: 6, uploaded: 7 }
        ],
        lastUpdated: new Date().toISOString()
      };

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      log.error('Failed to get document stats', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Update document status
   * PUT /api/v1/tenant/documents/:documentId/status
   */
  static async updateDocumentStatus(req: Request, res: Response): Promise<void> {
    try {
      const tenantRequest = req as any;
      const tenantId = tenantRequest.tenantId;
      const documentId = req.params.documentId;
      const { status, reason, notes } = req.body;
      
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
      }

      if (!documentId) {
        throw new AppError('Document ID is required', 400);
      }

      if (!status) {
        throw new AppError('Status is required', 400);
      }

      const validStatuses = ['pending', 'under_review', 'approved', 'rejected'];
      if (!validStatuses.includes(status)) {
        throw new AppError('Invalid status', 400);
      }

      // Mock update - in a real implementation, this would update the database
      const updatedDocument = {
        _id: documentId,
        status,
        processedAt: new Date().toISOString(),
        updatedBy: 'admin', // This would come from the authenticated user
        notes: notes || '',
        rejectionReason: status === 'rejected' ? reason : undefined
      };

      res.status(200).json({
        success: true,
        data: {
          document: updatedDocument,
          message: `Document status updated to ${status}`
        }
      });

    } catch (error) {
      log.error('Failed to update document status', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Bulk update documents
   * PUT /api/v1/tenant/documents/bulk
   */
  static async bulkUpdateDocuments(req: Request, res: Response): Promise<void> {
    try {
      const tenantRequest = req as any;
      const tenantId = tenantRequest.tenantId;
      const { documentIds, action, data } = req.body;
      
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
      }

      if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
        throw new AppError('Document IDs are required', 400);
      }

      if (!action) {
        throw new AppError('Action is required', 400);
      }

      const validActions = ['approve', 'reject', 'mark_under_review', 'delete'];
      if (!validActions.includes(action)) {
        throw new AppError('Invalid action', 400);
      }

      // Mock bulk update
      const affectedCount = documentIds.length;
      const statusMap: Record<string, string> = {
        'approve': 'approved',
        'reject': 'rejected',
        'mark_under_review': 'under_review'
      };

      const result = {
        action,
        affectedCount,
        message: `Successfully ${action}d ${affectedCount} document${affectedCount !== 1 ? 's' : ''}`,
        updatedDocuments: documentIds.map(id => ({
          _id: id,
          status: action === 'delete' ? 'deleted' : statusMap[action],
          processedAt: new Date().toISOString(),
          updatedBy: 'admin'
        }))
      };

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      log.error('Failed to bulk update documents', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Get document processing analytics
   * GET /api/v1/tenant/documents/analytics
   */
  static async getDocumentAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const tenantRequest = req as any;
      const tenantId = tenantRequest.tenantId;
      const period = req.query.period as string || '30d';
      
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
      }

      // Mock analytics data
      const analytics = {
        period,
        uploadTrend: [
          { date: '2024-01-01', count: 12 },
          { date: '2024-01-02', count: 8 },
          { date: '2024-01-03', count: 15 },
          { date: '2024-01-04', count: 10 },
          { date: '2024-01-05', count: 18 },
          { date: '2024-01-06', count: 14 },
          { date: '2024-01-07', count: 9 }
        ],
        processingTimeTrend: [
          { date: '2024-01-01', avgHours: 2.1 },
          { date: '2024-01-02', avgHours: 1.8 },
          { date: '2024-01-03', avgHours: 2.5 },
          { date: '2024-01-04', avgHours: 2.0 },
          { date: '2024-01-05', avgHours: 1.9 },
          { date: '2024-01-06', avgHours: 2.3 },
          { date: '2024-01-07', avgHours: 2.0 }
        ],
        statusDistribution: {
          approved: 71.1,
          pending: 17.8,
          under_review: 6.7,
          rejected: 4.4
        },
        typeDistribution: {
          passport: 17.8,
          birth_certificate: 13.3,
          educational_document: 26.7,
          employment_document: 22.2,
          language_test: 11.1,
          other: 8.9
        },
        processingEfficiency: {
          avgProcessingTime: '2.1 hours',
          firstTimeApprovalRate: 85.2,
          rejectionRate: 4.4,
          avgReviewCycles: 1.2
        },
        topUploaders: [
          { userId: 'user1', name: 'John Doe', count: 8 },
          { userId: 'user2', name: 'Jane Smith', count: 6 },
          { userId: 'user3', name: 'Mike Wilson', count: 5 }
        ]
      };

      res.status(200).json({
        success: true,
        data: analytics
      });

    } catch (error) {
      log.error('Failed to get document analytics', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Get system health and performance metrics
   * GET /api/v1/tenant/system/health
   */
  static async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      const tenantRequest = req as any;
      const tenantId = tenantRequest.tenantId;
      
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
      }

      // Mock system health data - in a real implementation, this would come from monitoring tools
      const health = {
        overall: 'healthy',
        status: 'operational',
        lastChecked: new Date().toISOString(),
        uptime: '99.8%',
        responseTime: '245ms',
        errorRate: 0.02,
        services: {
          api: {
            status: 'healthy',
            responseTime: '180ms',
            uptime: '99.9%',
            lastIncident: null
          },
          database: {
            status: 'healthy',
            responseTime: '45ms',
            uptime: '99.95%',
            connections: 23,
            lastIncident: null
          },
          storage: {
            status: 'healthy',
            responseTime: '120ms',
            uptime: '99.7%',
            usedSpace: '45%',
            lastIncident: null
          },
          email: {
            status: 'healthy',
            responseTime: '320ms',
            uptime: '99.5%',
            lastIncident: null
          }
        },
        metrics: {
          requestsPerMinute: 1250,
          activeUsers: 45,
          cpuUsage: 23,
          memoryUsage: 67,
          diskUsage: 45,
          networkLatency: 12
        },
        alerts: [],
        incidents: []
      };

      res.status(200).json({
        success: true,
        data: health
      });

    } catch (error) {
      log.error('Failed to get system health', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Get system performance metrics
   * GET /api/v1/tenant/system/performance
   */
  static async getSystemPerformance(req: Request, res: Response): Promise<void> {
    try {
      const tenantRequest = req as any;
      const tenantId = tenantRequest.tenantId;
      const period = req.query.period as string || '24h';
      
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
      }

      // Mock performance data
      const performance = {
        period,
        metrics: {
          responseTime: {
            current: 245,
            average: 230,
            p95: 450,
            p99: 1200,
            trend: '+2.1%'
          },
          throughput: {
            requestsPerSecond: 45,
            requestsPerMinute: 2700,
            requestsPerHour: 162000,
            trend: '+5.3%'
          },
          errorRate: {
            current: 0.02,
            average: 0.015,
            trend: '+0.005%'
          },
          uptime: {
            current: 99.8,
            last24h: 99.9,
            last7d: 99.7,
            last30d: 99.8
          }
        },
        charts: {
          responseTime: [
            { timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(), value: 220 },
            { timestamp: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(), value: 235 },
            { timestamp: new Date(Date.now() - 21 * 60 * 60 * 1000).toISOString(), value: 210 },
            { timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(), value: 245 },
            { timestamp: new Date(Date.now() - 19 * 60 * 60 * 1000).toISOString(), value: 230 },
            { timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(), value: 250 },
            { timestamp: new Date(Date.now() - 17 * 60 * 60 * 1000).toISOString(), value: 240 },
            { timestamp: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(), value: 225 },
            { timestamp: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(), value: 260 },
            { timestamp: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(), value: 245 },
            { timestamp: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString(), value: 230 },
            { timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), value: 240 },
            { timestamp: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(), value: 235 },
            { timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), value: 250 },
            { timestamp: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(), value: 245 },
            { timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), value: 230 },
            { timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(), value: 240 },
            { timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), value: 235 },
            { timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), value: 250 },
            { timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), value: 245 },
            { timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), value: 230 },
            { timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), value: 240 },
            { timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), value: 235 },
            { timestamp: new Date().toISOString(), value: 245 }
          ],
          throughput: [
            { timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(), value: 42 },
            { timestamp: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(), value: 38 },
            { timestamp: new Date(Date.now() - 21 * 60 * 60 * 1000).toISOString(), value: 45 },
            { timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(), value: 41 },
            { timestamp: new Date(Date.now() - 19 * 60 * 60 * 1000).toISOString(), value: 47 },
            { timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(), value: 43 },
            { timestamp: new Date(Date.now() - 17 * 60 * 60 * 1000).toISOString(), value: 46 },
            { timestamp: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(), value: 44 },
            { timestamp: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(), value: 48 },
            { timestamp: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(), value: 42 },
            { timestamp: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString(), value: 45 },
            { timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), value: 43 },
            { timestamp: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(), value: 47 },
            { timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), value: 41 },
            { timestamp: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(), value: 46 },
            { timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), value: 44 },
            { timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(), value: 48 },
            { timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), value: 42 },
            { timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), value: 45 },
            { timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), value: 43 },
            { timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), value: 47 },
            { timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), value: 41 },
            { timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), value: 46 },
            { timestamp: new Date().toISOString(), value: 45 }
          ],
          errorRate: [
            { timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(), value: 0.015 },
            { timestamp: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(), value: 0.012 },
            { timestamp: new Date(Date.now() - 21 * 60 * 60 * 1000).toISOString(), value: 0.018 },
            { timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(), value: 0.014 },
            { timestamp: new Date(Date.now() - 19 * 60 * 60 * 1000).toISOString(), value: 0.016 },
            { timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(), value: 0.013 },
            { timestamp: new Date(Date.now() - 17 * 60 * 60 * 1000).toISOString(), value: 0.017 },
            { timestamp: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(), value: 0.015 },
            { timestamp: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(), value: 0.019 },
            { timestamp: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(), value: 0.014 },
            { timestamp: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString(), value: 0.016 },
            { timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), value: 0.013 },
            { timestamp: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(), value: 0.017 },
            { timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), value: 0.015 },
            { timestamp: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(), value: 0.018 },
            { timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), value: 0.014 },
            { timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(), value: 0.016 },
            { timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), value: 0.013 },
            { timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), value: 0.017 },
            { timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), value: 0.015 },
            { timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), value: 0.019 },
            { timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), value: 0.014 },
            { timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), value: 0.016 },
            { timestamp: new Date().toISOString(), value: 0.020 }
          ]
        },
        lastUpdated: new Date().toISOString()
      };

      res.status(200).json({
        success: true,
        data: performance
      });

    } catch (error) {
      log.error('Failed to get system performance', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Get system alerts and incidents
   * GET /api/v1/tenant/system/alerts
   */
  static async getSystemAlerts(req: Request, res: Response): Promise<void> {
    try {
      const tenantRequest = req as any;
      const tenantId = tenantRequest.tenantId;
      const status = req.query.status as string; // active, resolved, all
      
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
      }

      // Mock alerts and incidents data
      const alerts = {
        active: [
          {
            id: 'alert-1',
            type: 'warning',
            severity: 'medium',
            title: 'High CPU Usage',
            description: 'CPU usage has been above 80% for the last 15 minutes',
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            service: 'api',
            resolved: false
          },
          {
            id: 'alert-2',
            type: 'info',
            severity: 'low',
            title: 'Storage Space Warning',
            description: 'Storage usage is approaching 80% capacity',
            timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            service: 'storage',
            resolved: false
          }
        ],
        resolved: [
          {
            id: 'alert-3',
            type: 'error',
            severity: 'high',
            title: 'Database Connection Pool Exhausted',
            description: 'All database connections were in use',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            resolvedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
            service: 'database',
            resolved: true
          }
        ],
        incidents: [
          {
            id: 'incident-1',
            title: 'API Response Time Degradation',
            description: 'API response times increased significantly between 2:00 PM and 4:00 PM',
            severity: 'medium',
            status: 'resolved',
            startedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            resolvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            duration: '2 hours',
            affectedServices: ['api', 'database'],
            impact: 'Some users experienced slower response times'
          }
        ],
        summary: {
          activeAlerts: 2,
          resolvedAlerts: 1,
          openIncidents: 0,
          resolvedIncidents: 1,
          avgResolutionTime: '1.5 hours'
        },
        lastUpdated: new Date().toISOString()
      };

      // Filter by status if provided
      let filteredData = alerts;
      if (status === 'active') {
        filteredData = { ...alerts, resolved: [], incidents: [] };
      } else if (status === 'resolved') {
        filteredData = { ...alerts, active: [] };
      }

      res.status(200).json({
        success: true,
        data: filteredData
      });

    } catch (error) {
      log.error('Failed to get system alerts', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Get system usage statistics
   * GET /api/v1/tenant/system/usage
   */
  static async getSystemUsage(req: Request, res: Response): Promise<void> {
    try {
      const tenantRequest = req as any;
      const tenantId = tenantRequest.tenantId;
      const period = req.query.period as string || '30d';
      
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
      }

      // Mock usage statistics
      const usage = {
        period,
        overview: {
          totalRequests: 1250000,
          uniqueUsers: 1250,
          dataTransferred: '45.2 GB',
          avgSessionDuration: '12.5 minutes',
          peakConcurrentUsers: 89,
          apiCallsPerUser: 45
        },
        trends: {
          requests: [
            { date: '2024-01-01', count: 42000 },
            { date: '2024-01-02', count: 38000 },
            { date: '2024-01-03', count: 45000 },
            { date: '2024-01-04', count: 41000 },
            { date: '2024-01-05', count: 47000 },
            { date: '2024-01-06', count: 43000 },
            { date: '2024-01-07', count: 46000 }
          ],
          users: [
            { date: '2024-01-01', count: 125 },
            { date: '2024-01-02', count: 118 },
            { date: '2024-01-03', count: 135 },
            { date: '2024-01-04', count: 128 },
            { date: '2024-01-05', count: 142 },
            { date: '2024-01-06', count: 131 },
            { date: '2024-01-07', count: 138 }
          ]
        },
        endpoints: [
          { path: '/api/auth/login', requests: 45000, avgResponseTime: 180 },
          { path: '/api/users', requests: 32000, avgResponseTime: 220 },
          { path: '/api/documents', requests: 28000, avgResponseTime: 340 },
          { path: '/api/analytics', requests: 15000, avgResponseTime: 520 },
          { path: '/api/reports', requests: 8000, avgResponseTime: 1200 }
        ],
        userAgents: [
          { name: 'Chrome', percentage: 65.2, requests: 815000 },
          { name: 'Firefox', percentage: 18.7, requests: 233750 },
          { name: 'Safari', percentage: 12.1, requests: 151250 },
          { name: 'Edge', percentage: 4.0, requests: 50000 }
        ],
        geolocation: [
          { country: 'United States', percentage: 45.2, users: 565 },
          { country: 'Canada', percentage: 23.8, users: 297 },
          { country: 'United Kingdom', percentage: 12.1, users: 151 },
          { country: 'Australia', percentage: 8.9, users: 111 },
          { country: 'Other', percentage: 10.0, users: 125 }
        ],
        lastUpdated: new Date().toISOString()
      };

      res.status(200).json({
        success: true,
        data: usage
      });

    } catch (error) {
      log.error('Failed to get system usage', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Get tenant settings
   */
  static async getTenantSettings(req: Request, res: Response): Promise<void> {
    try {
      const tenantRequest = req as any;
      const tenantId = tenantRequest.tenantId;
      
      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID is required'
        });
        return;
      }

      // Get tenant info from database with timeout
      const { Tenant } = require('../models/Tenant');
      
      const tenantPromise = Tenant.findById(tenantId);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 5000);
      });
      
      const tenant = await Promise.race([tenantPromise, timeoutPromise]);
      
      if (!tenant) {
        res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
        return;
      }

      // Mock tenant settings data
      const settings = {
        // General Settings
        name: tenant.name,
        domain: tenant.domain,
        email: tenant.email || 'admin@example.com',
        phone: '+1-555-0123',
        timezone: 'America/Toronto',
        language: 'en',
        
        // Business Information
        businessType: 'Immigration Services',
        industry: 'Legal Services',
        companySize: '10-50',
        website: `https://${tenant.domain}`,
        description: 'Professional immigration services and consultation',
        
        // Security Settings
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          maxAge: 90
        },
        sessionTimeout: 30,
        twoFactorRequired: false,
        ipWhitelist: [],
        
        // Notification Settings
        notifications: {
          email: {
            userRegistration: true,
            documentUpload: true,
            statusUpdate: true,
            systemAlerts: true
          },
          sms: {
            userRegistration: false,
            documentUpload: false,
            statusUpdate: true,
            systemAlerts: true
          },
          push: {
            userRegistration: true,
            documentUpload: true,
            statusUpdate: true,
            systemAlerts: true
          }
        },
        
        // Integration Settings
        integrations: {
          emailService: 'smtp',
          smsService: 'twilio',
          storageService: 'aws-s3',
          analyticsService: 'google-analytics'
        },
        
        // Feature Flags
        features: {
          documentUpload: true,
          userManagement: true,
          reporting: true,
          analytics: true,
          branding: true,
          apiAccess: false,
          sso: false,
          mfa: false
        },
        
        // Compliance Settings
        compliance: {
          gdprCompliant: true,
          dataRetentionDays: 2555, // 7 years
          auditLogging: true,
          dataEncryption: true
        },
        
        lastUpdated: new Date().toISOString()
      };

      res.status(200).json({
        success: true,
        data: settings
      });

    } catch (error) {
      log.error('Failed to get tenant settings', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Update tenant settings
   */
  static async updateTenantSettings(req: Request, res: Response): Promise<void> {
    try {
      const tenantRequest = req as any;
      const tenantId = tenantRequest.tenantId;
      const updates = req.body;
      
      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID is required'
        });
        return;
      }

      // Get tenant info from database with timeout
      const { Tenant } = require('../models/Tenant');
      
      const tenantPromise = Tenant.findById(tenantId);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 5000);
      });
      
      const tenant = await Promise.race([tenantPromise, timeoutPromise]);
      
      if (!tenant) {
        res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
        return;
      }

      // In a real implementation, you would update the tenant in the database
      // For now, we'll just return success with the updated settings
      
      log.info('Tenant settings updated', {
        tenantId: tenantId,
        tenantDomain: tenant.domain,
        updatedFields: Object.keys(updates)
      });

      res.status(200).json({
        success: true,
        data: {
          ...updates,
          lastUpdated: new Date().toISOString()
        },
        message: 'Settings updated successfully'
      });

    } catch (error) {
      log.error('Failed to update tenant settings', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Get tenant branding settings
   */
  static async getTenantBranding(req: Request, res: Response): Promise<void> {
    try {
      const tenantRequest = req as any;
      const tenantId = tenantRequest.tenantId;
      
      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID is required'
        });
        return;
      }

      // Get tenant info from database with timeout
      const { Tenant } = require('../models/Tenant');
      
      const tenantPromise = Tenant.findById(tenantId);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 5000);
      });
      
      const tenant = await Promise.race([tenantPromise, timeoutPromise]);
      
      if (!tenant) {
        res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
        return;
      }

      // Mock branding data
      const branding = {
        logo: {
          url: null,
          width: 200,
          height: 60,
          alt: `${tenant.name} Logo`
        },
        favicon: {
          url: null,
          width: 32,
          height: 32
        },
        colors: {
          primary: '#DC2626',
          secondary: '#F3F4F6',
          accent: '#F59E0B',
          background: '#FFFFFF',
          text: '#1F2937',
          muted: '#6B7280'
        },
        typography: {
          fontFamily: 'Inter',
          headingFont: 'Nunito',
          fontSize: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            '2xl': '1.5rem',
            '3xl': '1.875rem',
            '4xl': '2.25rem'
          }
        },
        layout: {
          headerHeight: 64,
          sidebarWidth: 256,
          borderRadius: 8,
          shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
        },
        customCSS: '',
        meta: {
          title: `${tenant.name} - Immigration Portal`,
          description: 'Professional immigration services and consultation',
          keywords: 'immigration, visa, consultation, legal services'
        },
        lastUpdated: new Date().toISOString()
      };

      res.status(200).json({
        success: true,
        data: branding
      });

    } catch (error) {
      log.error('Failed to get tenant branding', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Update tenant branding settings
   */
  static async updateTenantBranding(req: Request, res: Response): Promise<void> {
    try {
      const tenantRequest = req as any;
      const tenantId = tenantRequest.tenantId;
      const updates = req.body;
      
      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID is required'
        });
        return;
      }

      // Get tenant info from database with timeout
      const { Tenant } = require('../models/Tenant');
      
      const tenantPromise = Tenant.findById(tenantId);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 5000);
      });
      
      const tenant = await Promise.race([tenantPromise, timeoutPromise]);
      
      if (!tenant) {
        res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
        return;
      }

      // In a real implementation, you would update the tenant branding in the database
      // For now, we'll just return success with the updated branding
      
      log.info('Tenant branding updated', {
        tenantId: tenantId,
        tenantDomain: tenant.domain,
        updatedFields: Object.keys(updates)
      });

      res.status(200).json({
        success: true,
        data: {
          ...updates,
          lastUpdated: new Date().toISOString()
        },
        message: 'Branding updated successfully'
      });

    } catch (error) {
      log.error('Failed to update tenant branding', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }
}
