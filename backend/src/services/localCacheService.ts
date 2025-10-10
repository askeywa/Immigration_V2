// backend/src/services/localCacheService.ts
import { log } from '../utils/logger';

interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class LocalCacheService {
  private static instance: LocalCacheService;
  private cache = new Map<string, CacheItem>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000; // Maximum number of cached items
  private stats = {
    hits: 0,
    misses: 0
  };

  private constructor() {
    // Clean up expired items every minute
    setInterval(() => {
      this.cleanupExpiredItems();
    }, 60 * 1000);
  }

  public static getInstance(): LocalCacheService {
    if (!LocalCacheService.instance) {
      LocalCacheService.instance = new LocalCacheService();
    }
    return LocalCacheService.instance;
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    console.log('💾 LocalCache.set called:', key.substring(0, 50) + '...', 'TTL:', ttl || this.DEFAULT_TTL);
    
    // Remove oldest items if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldestItems();
    }

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL
    };

    this.cache.set(key, item);
    console.log('💾 LocalCache.set completed, cache size:', this.cache.size);
    log.debug('Cache set', { key, ttl: item.ttl });
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | null {
    console.log('🔍 LocalCache.get called:', key.substring(0, 50) + '...');
    
    const item = this.cache.get(key);
    
    if (!item) {
      console.log('❌ LocalCache.get: No item found');
      this.stats.misses++;
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      console.log('❌ LocalCache.get: Item expired');
      log.debug('Cache miss - expired', { key });
      this.stats.misses++;
      return null;
    }

    console.log('✅ LocalCache.get: Cache hit!');
    log.debug('Cache hit', { key });
    this.stats.hits++;
    return item.data as T;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    log.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[]; hits: number; misses: number } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      hits: this.stats.hits,
      misses: this.stats.misses
    };
  }

  /**
   * Clean up expired items
   */
  private cleanupExpiredItems(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      log.debug('Cache cleanup', { cleanedCount, remaining: this.cache.size });
    }
  }

  /**
   * Evict oldest items when cache is full
   */
  private evictOldestItems(): void {
    const items = Array.from(this.cache.entries());
    items.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 10% of items
    const toRemove = Math.ceil(items.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(items[i][0]);
    }
    
    log.debug('Cache eviction', { removed: toRemove, remaining: this.cache.size });
  }
}

export const localCache = LocalCacheService.getInstance();
