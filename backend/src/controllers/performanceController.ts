// Performance Monitoring Controller
import { Request, Response } from 'express';
import { redisService } from '../services/redisService';
import { localCache } from '../services/localCacheService';
import mongoose from 'mongoose';
import os from 'os';
import { log } from '../utils/logger';

// Track API performance metrics in memory
const apiMetrics = {
  requests: [] as Array<{ endpoint: string; duration: number; timestamp: Date; statusCode: number }>,
  startTime: Date.now()
};

// Middleware to track API performance
export function trackApiPerformance(req: Request, res: Response, next: Function) {
  const startTime = Date.now();
  
  // Capture the original send function
  const originalSend = res.send;
  
  // Override the send function
  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    
    // Track the request
    apiMetrics.requests.push({
      endpoint: `${req.method} ${req.path}`,
      duration,
      timestamp: new Date(),
      statusCode: res.statusCode
    });
    
    // Keep only last 1000 requests
    if (apiMetrics.requests.length > 1000) {
      apiMetrics.requests = apiMetrics.requests.slice(-1000);
    }
    
    // Call the original send function
    return originalSend.call(this, data);
  };
  
  next();
}

export class PerformanceController {
  /**
   * Get comprehensive performance metrics
   */
  static async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      // System metrics
      const uptime = process.uptime();
      const memUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      
      // CPU usage (simplified)
      const cpuUsage = process.cpuUsage();
      const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000000) / uptime * 100;
      
      // Redis cache metrics
      const redisConnected = redisService.isConnected();
      let redisCacheMetrics = {
        connected: redisConnected,
        hits: 0,
        misses: 0,
        hitRate: 0,
        keys: 0
      };
      
      if (redisConnected) {
        try {
          const redisClient = redisService.getClient();
          if (redisClient) {
            const info = await redisClient.info('stats');
            const keyspace = await redisClient.info('keyspace');
            
            // Parse Redis stats
            const hitsMatch = info.match(/keyspace_hits:(\d+)/);
            const missesMatch = info.match(/keyspace_misses:(\d+)/);
            const keysMatch = keyspace.match(/keys=(\d+)/);
            
            const hits = hitsMatch ? parseInt(hitsMatch[1]) : 0;
            const misses = missesMatch ? parseInt(missesMatch[1]) : 0;
            const total = hits + misses;
            
            redisCacheMetrics = {
              connected: true,
              hits,
              misses,
              hitRate: total > 0 ? (hits / total) * 100 : 0,
              keys: keysMatch ? parseInt(keysMatch[1]) : 0
            };
          }
        } catch (error) {
          log.warn('Failed to get Redis stats', { error: error instanceof Error ? error.message : String(error) });
        }
      }
      
      // Local cache metrics
      const localCacheStats = localCache.getStats();
      const localTotal = localCacheStats.hits + localCacheStats.misses;
      const localCacheMetrics = {
        size: localCacheStats.size,
        hits: localCacheStats.hits,
        misses: localCacheStats.misses,
        hitRate: localTotal > 0 ? (localCacheStats.hits / localTotal) * 100 : 0
      };
      
      // API performance metrics
      const totalRequests = apiMetrics.requests.length;
      const avgResponseTime = totalRequests > 0
        ? apiMetrics.requests.reduce((sum, req) => sum + req.duration, 0) / totalRequests
        : 0;
      
      const errorRequests = apiMetrics.requests.filter(req => req.statusCode >= 400).length;
      const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;
      
      // Calculate slowest endpoints
      const endpointStats = new Map<string, { totalTime: number; count: number }>();
      apiMetrics.requests.forEach(req => {
        const existing = endpointStats.get(req.endpoint) || { totalTime: 0, count: 0 };
        endpointStats.set(req.endpoint, {
          totalTime: existing.totalTime + req.duration,
          count: existing.count + 1
        });
      });
      
      const slowestEndpoints = Array.from(endpointStats.entries())
        .map(([endpoint, stats]) => ({
          endpoint,
          avgTime: stats.totalTime / stats.count,
          count: stats.count
        }))
        .sort((a, b) => b.avgTime - a.avgTime)
        .slice(0, 10);
      
      // Database metrics
      const dbConnected = mongoose.connection.readyState === 1;
      const dbStats = mongoose.connection.db?.stats ? await mongoose.connection.db.stats() : null;
      
      // Calculate average query time (simplified - would need more sophisticated tracking)
      const recentQueries = apiMetrics.requests
        .filter(req => req.endpoint.includes('/api/'))
        .slice(-100);
      const avgQueryTime = recentQueries.length > 0
        ? recentQueries.reduce((sum, req) => sum + req.duration, 0) / recentQueries.length
        : 0;
      
      const slowQueries = apiMetrics.requests
        .filter(req => req.duration > 1000)
        .length;
      
      const metrics = {
        system: {
          uptime,
          memory: {
            used: usedMemory,
            total: totalMemory,
            percentage: (usedMemory / totalMemory) * 100,
            process: {
              heapUsed: memUsage.heapUsed,
              heapTotal: memUsage.heapTotal,
              external: memUsage.external,
              rss: memUsage.rss
            }
          },
          cpu: {
            usage: Math.min(cpuPercent, 100), // Cap at 100%
            user: cpuUsage.user,
            system: cpuUsage.system
          }
        },
        cache: {
          redis: redisCacheMetrics,
          local: localCacheMetrics
        },
        api: {
          totalRequests,
          averageResponseTime: avgResponseTime,
          slowestEndpoints,
          errorRate,
          recentRequests: apiMetrics.requests.slice(-20).reverse().map(req => ({
            url: req.endpoint,
            method: req.endpoint.split(' ')[0],
            statusCode: req.statusCode,
            duration: req.duration
          })) // Last 20 requests
        },
        database: {
          connected: dbConnected,
          avgQueryTime,
          activeConnections: dbStats?.connections || 0,
          slowQueries,
          collections: dbStats?.collections || 0,
          dataSize: dbStats?.dataSize || 0,
          indexes: dbStats?.indexes || 0,
          avgObjSize: dbStats?.avgObjSize || 0
        },
        timestamp: new Date()
      };
      
      res.json({
        success: true,
        data: metrics
      });
      
    } catch (error) {
      log.error('Failed to get performance metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve performance metrics'
      });
    }
  }
  
  /**
   * Get detailed cache analytics
   */
  static async getCacheAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const localStats = localCache.getStats();
      const redisConnected = redisService.isConnected();
      
      let redisInfo = null;
      if (redisConnected) {
        try {
          const redisClient = redisService.getClient();
          if (redisClient) {
            const info = await redisClient.info();
            redisInfo = info;
          }
        } catch (error) {
          log.warn('Failed to get Redis info', { error: error instanceof Error ? error.message : String(error) });
        }
      }
      
      res.json({
        success: true,
        data: {
          local: localStats,
          redis: {
            connected: redisConnected,
            info: redisInfo
          }
        }
      });
      
    } catch (error) {
      log.error('Failed to get cache analytics', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve cache analytics'
      });
    }
  }
  
  /**
   * Clear all caches
   */
  static async clearAllCaches(req: Request, res: Response): Promise<void> {
    try {
      // Clear local cache
      localCache.clear();
      
      // Clear Redis cache
      if (redisService.isConnected()) {
        await redisService.clearPattern('*');
      }
      
      log.info('All caches cleared', { clearedBy: (req as any).user?._id });
      
      res.json({
        success: true,
        message: 'All caches cleared successfully'
      });
      
    } catch (error) {
      log.error('Failed to clear caches', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to clear caches'
      });
    }
  }
  
  /**
   * Get API performance history
   */
  static async getApiPerformanceHistory(req: Request, res: Response): Promise<void> {
    try {
      const { hours = 1 } = req.query;
      const hoursNum = parseInt(hours as string);
      const cutoffTime = new Date(Date.now() - hoursNum * 60 * 60 * 1000);
      
      const recentRequests = apiMetrics.requests.filter(req => req.timestamp >= cutoffTime);
      
      // Group by minute
      const byMinute = new Map<string, { total: number; count: number; errors: number }>();
      recentRequests.forEach(req => {
        const minute = new Date(req.timestamp);
        minute.setSeconds(0, 0);
        const key = minute.toISOString();
        
        const existing = byMinute.get(key) || { total: 0, count: 0, errors: 0 };
        byMinute.set(key, {
          total: existing.total + req.duration,
          count: existing.count + 1,
          errors: existing.errors + (req.statusCode >= 400 ? 1 : 0)
        });
      });
      
      const history = Array.from(byMinute.entries())
        .map(([timestamp, stats]) => ({
          timestamp,
          avgResponseTime: stats.total / stats.count,
          requests: stats.count,
          errors: stats.errors,
          errorRate: (stats.errors / stats.count) * 100
        }))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      res.json({
        success: true,
        data: {
          history,
          summary: {
            totalRequests: recentRequests.length,
            avgResponseTime: recentRequests.reduce((sum, req) => sum + req.duration, 0) / recentRequests.length,
            errors: recentRequests.filter(req => req.statusCode >= 400).length
          }
        }
      });
      
    } catch (error) {
      log.error('Failed to get API performance history', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve API performance history'
      });
    }
  }
}
