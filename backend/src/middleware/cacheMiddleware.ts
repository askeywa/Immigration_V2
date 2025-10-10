// backend/src/middleware/cacheMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { localCache } from '../services/localCacheService';
import { redisService } from '../services/redisService';
import { log } from '../utils/logger';

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  keyGenerator?: (req: Request) => string;
  skipCache?: (req: Request) => boolean;
  useRedis?: boolean; // Whether to use Redis (default: true if available)
}

/**
 * Cache middleware for API responses (supports both Redis and in-memory cache)
 */
export function cacheMiddleware(options: CacheOptions = {}) {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    keyGenerator = defaultKeyGenerator,
    skipCache = () => false,
    useRedis = true
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    console.log('🔍 Cache middleware called for:', req.url);
    
    // Skip cache if specified
    if (skipCache(req)) {
      console.log('🚫 Cache skipped for:', req.url);
      return next();
    }

    const cacheKey = keyGenerator(req);
    console.log('🔑 Generated cache key:', cacheKey);
    
    // Try Redis first if enabled and available
    if (useRedis && redisService.isConnected()) {
      try {
        const cachedResponse = await redisService.get(cacheKey);
        if (cachedResponse) {
          console.log('✅ REDIS CACHE HIT:', req.url);
          log.debug('Redis cache hit', { 
            method: req.method, 
            url: req.url, 
            cacheKey 
          });
          return res.json(cachedResponse);
        }
      } catch (error) {
        log.warn('Redis cache check failed, falling back to local cache', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // Fallback to local cache
    const cachedResponse = localCache.get(cacheKey);
    if (cachedResponse) {
      console.log('✅ LOCAL CACHE HIT:', req.url, 'Key:', cacheKey.substring(0, 50) + '...');
      log.debug('Local cache hit', { 
        method: req.method, 
        url: req.url, 
        cacheKey 
      });
      
      return res.json(cachedResponse);
    }
    
    console.log('❌ CACHE MISS:', req.url, 'Key:', cacheKey.substring(0, 50) + '...');

    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json method to cache response
    res.json = function(body: any) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Cache in local memory
        localCache.set(cacheKey, body, ttl);
        console.log('💾 LOCAL CACHE SET:', req.url, 'TTL:', ttl + 'ms');
        
        // Also cache in Redis if enabled
        if (useRedis && redisService.isConnected()) {
          const ttlSeconds = Math.floor(ttl / 1000);
          redisService.set(cacheKey, body, ttlSeconds).catch(err => {
            log.warn('Failed to cache in Redis, but local cache succeeded', {
              error: err instanceof Error ? err.message : String(err)
            });
          });
          console.log('💾 REDIS CACHE SET:', req.url, 'TTL:', ttlSeconds + 's');
        }
        
        log.debug('Cache set', { 
          method: req.method, 
          url: req.url, 
          cacheKey,
          ttl,
          redis: useRedis && redisService.isConnected()
        });
      } else {
        console.log('⚠️ NOT CACHING:', req.url, 'Status:', res.statusCode);
      }
      
      return originalJson(body);
    };

    next();
  };
}

/**
 * Default cache key generator
 */
function defaultKeyGenerator(req: Request): string {
  const { method, url, query, body } = req;
  const user = (req as any).user;
  const tenant = (req as any).tenant;
  
  // Include user and tenant context in cache key
  const context = {
    userId: user?._id,
    tenantId: tenant?._id,
    method,
    url,
    query,
    body: method === 'POST' || method === 'PUT' ? body : undefined
  };
  
  return `cache:${Buffer.from(JSON.stringify(context)).toString('base64')}`;
}

/**
 * Cache middleware for tenant-specific routes
 */
export function tenantCacheMiddleware(ttl: number = 5 * 60 * 1000) {
  return cacheMiddleware({
    ttl,
    keyGenerator: (req: Request) => {
      const tenant = (req as any).tenant;
      const user = (req as any).user;
      const { method, url, query } = req;
      
      console.log('🔑 Cache key generation:');
      console.log('  - tenant._id:', tenant?._id);
      console.log('  - user._id:', user?._id);
      console.log('  - method:', method);
      console.log('  - url:', url);
      console.log('  - query:', query);
      
      const cacheKey = `tenant:${tenant?._id}:user:${user?._id}:${method}:${url}:${JSON.stringify(query)}`;
      console.log('  - Generated key:', cacheKey);
      
      return cacheKey;
    }
  });
}

/**
 * Cache middleware for user-specific routes
 */
export function userCacheMiddleware(ttl: number = 3 * 60 * 1000) {
  return cacheMiddleware({
    ttl,
    keyGenerator: (req: Request) => {
      const user = (req as any).user;
      const { method, url, query } = req;
      
      return `user:${user?._id}:${method}:${url}:${JSON.stringify(query)}`;
    }
  });
}

/**
 * Cache middleware for super admin routes
 */
export function superAdminCacheMiddleware(ttl: number = 5 * 60 * 1000) {
  return cacheMiddleware({
    ttl,
    useRedis: true,
    keyGenerator: (req: Request) => {
      const user = (req as any).user;
      const { method, url, query } = req;
      
      return `superadmin:${user?._id}:${method}:${url}:${JSON.stringify(query)}`;
    }
  });
}

/**
 * Clear cache for specific patterns (both Redis and local)
 */
export async function clearCachePattern(pattern: string): Promise<void> {
  // Clear Redis cache
  if (redisService.isConnected()) {
    try {
      const clearedRedis = await redisService.clearPattern(`*${pattern}*`);
      log.info('Redis cache cleared for pattern', { pattern, clearedCount: clearedRedis });
    } catch (error) {
      log.warn('Failed to clear Redis cache', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  // Clear local cache
  const stats = localCache.getStats();
  let clearedCount = 0;
  
  stats.keys.forEach(key => {
    if (key.includes(pattern)) {
      localCache.delete(key);
      clearedCount++;
    }
  });
  
  log.info('Local cache cleared for pattern', { pattern, clearedCount });
}

/**
 * Clear all cache (both Redis and local)
 */
export async function clearAllCache(): Promise<void> {
  // Clear Redis cache
  if (redisService.isConnected()) {
    try {
      await redisService.clearPattern('*');
      log.info('All Redis cache cleared');
    } catch (error) {
      log.warn('Failed to clear all Redis cache', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  // Clear local cache
  localCache.clear();
  log.info('All local cache cleared');
}
