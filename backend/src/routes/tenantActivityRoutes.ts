// backend/src/routes/tenantActivityRoutes.ts
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolution';
import { tenantCacheMiddleware } from '../middleware/cacheMiddleware';

const router = Router();

// Get tenant recent activity with simple caching
const activityCache = new Map();
router.get('/recent-activity', authenticate, resolveTenant, async (req: Request, res: Response) => {
  try {
    // Simple cache check
    const cacheKey = 'activity';
    const cached = activityCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 2 * 60 * 1000) { // 2 minutes
      console.log('✅ CACHE HIT: /api/tenant/recent-activity');
      return res.json(cached.data);
    }
    
    console.log('❌ CACHE MISS: /api/tenant/recent-activity');
    
    // Mock activity data matching frontend interface
    const mockActivity = [
      {
        _id: '1',
        type: 'user_registered',
        description: 'New user John Doe registered',
        timestamp: new Date(),
        userId: '68ccab15a795ec580e162c57',
        severity: 'low',
        metadata: { email: 'john.doe@example.com' }
      },
      {
        _id: '2', 
        type: 'document_uploaded',
        description: 'Document passport.pdf uploaded by Charles Smith',
        timestamp: new Date(Date.now() - 3600000),
        userId: '68ccab15a795ec580e162c58',
        severity: 'low',
        metadata: { fileName: 'passport.pdf', size: '2.3MB' }
      },
      {
        _id: '3',
        type: 'payment_received',
        description: 'Payment of $299 received for Professional plan',
        timestamp: new Date(Date.now() - 7200000),
        severity: 'medium',
        metadata: { amount: 299, plan: 'Professional' }
      },
      {
        _id: '4',
        type: 'system_alert',
        description: 'Storage usage exceeded 80% threshold',
        timestamp: new Date(Date.now() - 10800000),
        severity: 'high',
        metadata: { usage: '8.5GB', limit: '10GB' }
      },
      {
        _id: '5',
        type: 'user_updated',
        description: 'User profile updated by Sarah Johnson',
        timestamp: new Date(Date.now() - 14400000),
        userId: '68ccab15a795ec580e162c59',
        severity: 'low',
        metadata: { fields: ['phone', 'address'] }
      }
    ];
    
    const response = {
      success: true,
      data: mockActivity
    };
    
    // Cache the response
    activityCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });
    console.log('💾 CACHE SET: /api/tenant/recent-activity');
    
    res.status(200).json(response);
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tenant activity'
    });
  }
});

// Get tenant stats with simple caching
const statsCache = new Map();
router.get('/stats', authenticate, resolveTenant, async (req: Request, res: Response) => {
  try {
    // Simple cache check
    const cacheKey = 'stats';
    const cached = statsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 3 * 60 * 1000) { // 3 minutes
      console.log('✅ CACHE HIT: /api/tenant/stats');
      return res.json(cached.data);
    }
    
    console.log('❌ CACHE MISS: /api/tenant/stats');
    
    // Mock tenant stats - complete data matching frontend interface
    const mockStats = {
      totalUsers: 16,
      activeUsers: 14,
      newUsersThisMonth: 3,
      totalDocuments: 45,
      pendingDocuments: 8,
      monthlyRevenue: 2850,
      subscription: {
        planName: 'Professional',
        status: 'active',
        expiresAt: '2025-10-19',
        features: ['basic', 'advanced', 'premium']
      },
      usage: {
        storageUsed: 2.1 * 1024 * 1024 * 1024, // 2.1 GB in bytes
        storageLimit: 10 * 1024 * 1024 * 1024, // 10 GB in bytes
        bandwidthUsed: 45.2 * 1024 * 1024 * 1024, // 45.2 GB in bytes
        bandwidthLimit: 100 * 1024 * 1024 * 1024, // 100 GB in bytes
        apiCallsUsed: 12450,
        apiCallsLimit: 50000
      },
      performance: {
        avgResponseTime: 245, // milliseconds
        uptime: 99.8, // percentage
        errorRate: 0.2 // percentage
      }
    };
    
    const response = {
      success: true,
      data: mockStats
    };
    
    // Cache the response
    statsCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });
    console.log('💾 CACHE SET: /api/tenant/stats');
    
    res.status(200).json(response);
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tenant stats'
    });
  }
});

export default router;
