// backend/src/controllers/indexingController.ts
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { TenantRequest } from '../middleware/tenantResolution';
import { IndexingService } from '../services/indexingService';
import { AuthorizationError } from '../utils/errors';

// Create all database indexes
export const createIndexes = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Only super admins can manage database indexes
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can manage database indexes'
      });
    }

    const result = await IndexingService.createAllIndexes();
    
    res.json({
      success: true,
      message: 'Database indexes creation completed',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to create database indexes'
    });
  }
});

// Get database performance overview
export const getDatabasePerformance = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Only super admins can view database performance
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view database performance'
      });
    }

    const performance = await IndexingService.getDatabasePerformance();
    
    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get database performance'
    });
  }
});

// Get index performance statistics
export const getIndexPerformance = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Only super admins can view index performance
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view index performance'
      });
    }

    const performance = await IndexingService.getIndexPerformance();
    
    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get index performance'
    });
  }
});

// Analyze query performance
export const analyzeQuery = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Only super admins can analyze queries
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can analyze database queries'
      });
    }

    const { collection, query, options } = req.body;

    if (!collection || !query) {
      return res.status(400).json({
        success: false,
        message: 'Collection and query are required'
      });
    }

    const result = await IndexingService.analyzeQuery(collection, query, options);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to analyze query'
    });
  }
});

// Optimize indexes
export const optimizeIndexes = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Only super admins can optimize indexes
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can optimize database indexes'
      });
    }

    const result = await IndexingService.optimizeIndexes();
    
    res.json({
      success: true,
      message: 'Index optimization analysis completed',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to optimize indexes'
    });
  }
});

// Monitor index usage
export const monitorIndexUsage = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Only super admins can monitor index usage
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can monitor index usage'
      });
    }

    const result = await IndexingService.monitorIndexUsage();
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to monitor index usage'
    });
  }
});

// Drop all indexes (dangerous operation)
export const dropIndexes = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Only super admins can drop indexes
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can drop database indexes'
      });
    }

    // Require confirmation
    const { confirm } = req.body;
    if (confirm !== 'DROP_ALL_INDEXES') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation required. Send confirm: "DROP_ALL_INDEXES" in request body.'
      });
    }

    const result = await IndexingService.dropAllIndexes();
    
    res.json({
      success: true,
      message: 'Database indexes deletion completed',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to drop database indexes'
    });
  }
});

// Get index definitions
export const getIndexDefinitions = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Only super admins can view index definitions
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can view index definitions'
      });
    }

    const definitions = IndexingService.getIndexDefinitions();
    
    res.json({
      success: true,
      data: definitions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get index definitions'
    });
  }
});

// Create tenant-specific indexes
export const createTenantIndexes = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    
    // Only super admins can create tenant-specific indexes
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can create tenant-specific indexes'
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    await IndexingService.createTenantIndexes(tenantId);
    
    res.json({
      success: true,
      message: `Tenant-specific indexes created for tenant: ${tenantId}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to create tenant-specific indexes'
    });
  }
});
