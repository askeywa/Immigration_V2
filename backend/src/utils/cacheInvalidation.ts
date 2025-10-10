// backend/src/utils/cacheInvalidation.ts
import { clearCachePattern } from '../middleware/cacheMiddleware';
import { log } from './logger';

/**
 * Cache invalidation utilities for clearing cached data after mutations
 */
export class CacheInvalidation {
  /**
   * Clear cache after tenant mutation (create, update, delete)
   */
  static async invalidateTenantCache(tenantId?: string): Promise<void> {
    try {
      if (tenantId) {
        // Clear specific tenant cache
        await clearCachePattern(`tenant:${tenantId}`);
        await clearCachePattern(`superadmin:*:GET:/super-admin/tenants/${tenantId}`);
        log.info('Cleared cache for specific tenant', { tenantId });
      }
      
      // Clear all tenants list cache
      await clearCachePattern('superadmin:*:GET:/super-admin/tenants');
      await clearCachePattern('tenant:*:GET:/tenant/stats');
      
      log.info('Cleared tenant-related cache');
    } catch (error) {
      log.error('Failed to clear tenant cache', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Clear cache after user mutation (create, update, delete)
   */
  static async invalidateUserCache(userId?: string, tenantId?: string): Promise<void> {
    try {
      if (userId) {
        // Clear specific user cache
        await clearCachePattern(`user:${userId}`);
        log.info('Cleared cache for specific user', { userId });
      }
      
      if (tenantId) {
        // Clear tenant users cache
        await clearCachePattern(`tenant:${tenantId}:*:GET:/super-admin/tenants/*/users`);
        await clearCachePattern(`tenant:${tenantId}:*`);
      }
      
      // Clear all users list cache
      await clearCachePattern('superadmin:*:GET:/super-admin/users');
      
      log.info('Cleared user-related cache');
    } catch (error) {
      log.error('Failed to clear user cache', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Clear cache after profile mutation
   */
  static async invalidateProfileCache(userId: string, tenantId?: string): Promise<void> {
    try {
      // Clear user profile cache
      await clearCachePattern(`user:${userId}:GET:/api/profiles`);
      await clearCachePattern(`user:${userId}:GET:/api/profiles/progress`);
      
      if (tenantId) {
        await clearCachePattern(`tenant:${tenantId}:user:${userId}`);
      }
      
      log.info('Cleared profile cache', { userId });
    } catch (error) {
      log.error('Failed to clear profile cache', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Clear cache after subscription mutation
   */
  static async invalidateSubscriptionCache(tenantId: string): Promise<void> {
    try {
      await clearCachePattern(`tenant:${tenantId}:*:GET:/api/subscriptions`);
      await clearCachePattern(`superadmin:*:GET:/super-admin/tenants/${tenantId}`);
      await clearCachePattern('superadmin:*:GET:/super-admin/analytics');
      
      log.info('Cleared subscription cache', { tenantId });
    } catch (error) {
      log.error('Failed to clear subscription cache', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Clear cache after analytics data changes
   */
  static async invalidateAnalyticsCache(tenantId?: string): Promise<void> {
    try {
      if (tenantId) {
        await clearCachePattern(`tenant:${tenantId}:*:GET:/api/analytics`);
      }
      
      await clearCachePattern('superadmin:*:GET:/super-admin/analytics');
      await clearCachePattern('superadmin:*:GET:/super-admin/reports');
      
      log.info('Cleared analytics cache');
    } catch (error) {
      log.error('Failed to clear analytics cache', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Clear all dashboard caches (use sparingly)
   */
  static async invalidateAllDashboardCache(): Promise<void> {
    try {
      await clearCachePattern('superadmin:*');
      await clearCachePattern('tenant:*');
      await clearCachePattern('user:*');
      
      log.info('Cleared all dashboard cache');
    } catch (error) {
      log.error('Failed to clear all dashboard cache', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

