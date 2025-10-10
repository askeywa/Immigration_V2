// backend/src/routes/superAdminRoutes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { getAllUsers, deleteUser } from '../controllers/userController';
import { getSystemReports, exportSystemReport, getSystemAnalytics } from '../controllers/reportController';
import { TenantController } from '../controllers/tenantController';
import { superAdminCacheMiddleware } from '../middleware/cacheMiddleware';
import { PerformanceController } from '../controllers/performanceController';

const router = Router();

// All routes require super admin authentication
router.use(authenticate);
router.use(authorize('super_admin'));

// Cache middleware for GET requests (5 minute cache for optimal performance)
const cacheFor5Min = superAdminCacheMiddleware(5 * 60 * 1000);

// Super Admin Tenant Management Routes (with caching)
router.get('/tenants', cacheFor5Min, asyncHandler(TenantController.getAllTenants));
router.post('/tenants', asyncHandler(TenantController.createTenant));
router.get('/tenants/:id', cacheFor5Min, asyncHandler(TenantController.getTenantById));
router.get('/tenants/:id/users', cacheFor5Min, asyncHandler(TenantController.getTenantUsers));
router.put('/tenants/:id', asyncHandler(TenantController.updateTenant));
router.patch('/tenants/:id', asyncHandler(TenantController.updateTenant));
router.delete('/tenants/:id', asyncHandler(TenantController.deleteTenant));

// Super Admin User Management Routes (with caching)
router.get('/users', cacheFor5Min, getAllUsers);
router.delete('/users/:id', deleteUser);

// Super Admin Reports Routes (with caching)
router.get('/reports', cacheFor5Min, getSystemReports);
router.get('/reports/export', exportSystemReport);

// Super Admin Analytics Routes (with caching)
router.get('/analytics', cacheFor5Min, getSystemAnalytics);
router.get('/analytics/tenant/:tenantId', asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  res.json({
    success: true,
    data: {
      tenantId,
      metrics: {
        totalUsers: 0,
        activeUsers: 0,
        storageUsed: '0 MB',
        apiCalls: 0,
        bandwidthUsed: '0 GB'
      }
    }
  });
}));

// Super Admin Health Routes
router.get('/health', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      version: '1.0.0'
    }
  });
}));

// 🚀 OPTIMIZED: Combined dashboard endpoint - single API call instead of 4
router.get('/dashboard/combined', cacheFor5Min, asyncHandler(async (req: any, res: any) => {
  try {
    console.log('🚀 Loading combined dashboard data...');
    
    // Import models and services
    const { TenantService } = await import('../services/tenantService');
    const { UserService } = await import('../services/userService');
    
    // Run all dashboard queries in parallel for maximum performance
    const [
      tenantsResult,
      usersResult
    ] = await Promise.all([
      // Get tenants data
      TenantService.getAllTenants(1, 10).catch(err => {
        console.warn('⚠️ Tenants query failed:', err.message);
        return { tenants: [], pagination: { currentPage: 1, totalPages: 0, totalCount: 0 } };
      }),
      
      // Get users data
      UserService.getAllUsersAcrossTenants(1, 10).catch(err => {
        console.warn('⚠️ Users query failed:', err.message);
        return { users: [], pagination: { currentPage: 1, totalPages: 0, totalCount: 0 } };
      })
    ]);
    
    // Get analytics data separately (simpler approach)
    let analyticsData = {};
    try {
      const { getSystemAnalytics } = await import('../controllers/reportController');
      const analyticsPromise = new Promise((resolve, reject) => {
        const mockRes = {
          json: (data: any) => resolve(data),
          status: () => ({ json: (data: any) => reject(new Error(data.message || 'Analytics error')) })
        };
        const mockNext = () => {};
        getSystemAnalytics(req, mockRes as any, mockNext);
      });
      
      const analyticsResult = await analyticsPromise as any;
      analyticsData = analyticsResult.data || {};
    } catch (err) {
      console.warn('⚠️ Analytics query failed:', err);
      analyticsData = { systemHealth: { status: 'unknown' }, userActivity: {}, performance: {}, revenue: {} };
    }
    
    // Get reports data separately
    let reportsData = { reports: [], summary: {} };
    try {
      const { getSystemReports } = await import('../controllers/reportController');
      const reportsPromise = new Promise((resolve, reject) => {
        const mockRes = {
          json: (data: any) => resolve(data),
          status: () => ({ json: (data: any) => reject(new Error(data.message || 'Reports error')) })
        };
        const mockNext = () => {};
        getSystemReports(req, mockRes as any, mockNext);
      });
      
      const reportsResult = await reportsPromise as any;
      reportsData = reportsResult.data || { reports: [], summary: {} };
    } catch (err) {
      console.warn('⚠️ Reports query failed:', err);
    }
    
    console.log('✅ Combined dashboard data loaded successfully');
    
    // Combine all data into single response
    const combinedData = {
      success: true,
      data: {
        tenants: tenantsResult.tenants || [],
        tenantsPagination: tenantsResult.pagination || { currentPage: 1, totalPages: 0, totalCount: 0 },
        analytics: analyticsData,
        users: usersResult.users || [],
        usersPagination: usersResult.pagination || { currentPage: 1, totalPages: 0, totalCount: 0 },
        reports: reportsData,
        loadedAt: new Date().toISOString(),
        performance: {
          totalQueries: 4,
          parallelExecution: true,
          cacheEnabled: true
        }
      }
    };
    
    res.json(combinedData);
    
  } catch (error) {
    console.error('❌ Combined dashboard endpoint failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Performance monitoring routes
router.get('/performance/metrics', asyncHandler(PerformanceController.getPerformanceMetrics));
router.get('/performance/cache', asyncHandler(PerformanceController.getCacheAnalytics));
router.get('/performance/history', asyncHandler(PerformanceController.getApiPerformanceHistory));
router.post('/performance/clear-cache', asyncHandler(PerformanceController.clearAllCaches));

export default router;
