// backend/src/services/redisService.ts
import { RedisClusterManager } from '../config/redis-cluster';
import { log } from '../utils/logger';

export class RedisService {
  private static instance: RedisService;
  private redisManager: RedisClusterManager;
  private isInitialized = false;

  private constructor() {
    this.redisManager = RedisClusterManager.getInstance();
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  /**
   * Initialize Redis connection
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      log.info('Redis service already initialized');
      return;
    }

    const isEnabled = process.env.REDIS_ENABLED === 'true';
    
    if (!isEnabled) {
      log.warn('⚠️  Redis is disabled in configuration - using in-memory cache only');
      return;
    }

    try {
      log.info('🔄 Initializing Redis connection...');
      await this.redisManager.connect();
      this.isInitialized = true;
      log.info('✅ Redis service initialized successfully');
    } catch (error) {
      log.error('❌ Redis initialization failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Don't throw - allow graceful degradation to in-memory cache
      log.warn('⚠️  Application will continue with in-memory cache only');
    }
  }

  /**
   * Get Redis client instance
   */
  public getClient() {
    try {
      return this.redisManager.getRedis();
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if Redis is connected
   */
  public isConnected(): boolean {
    const health = this.redisManager.getHealthStatus();
    return this.isInitialized && health.isConnected;
  }

  /**
   * Disconnect Redis
   */
  public async disconnect(): Promise<void> {
    if (this.isInitialized) {
      await this.redisManager.disconnect();
      this.isInitialized = false;
      log.info('✅ Redis service disconnected');
    }
  }

  /**
   * Get a value from Redis cache
   */
  public async get(key: string): Promise<any | null> {
    if (!this.isConnected()) {
      return null;
    }

    try {
      const value = await this.redisManager.get(key);
      if (!value) return null;

      return JSON.parse(value);
    } catch (error) {
      log.error('Redis get error', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Set a value in Redis cache
   */
  public async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.redisManager.set(key, serialized, ttlSeconds);
      return true;
    } catch (error) {
      log.error('Redis set error', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Delete a key from Redis cache
   */
  public async delete(key: string): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      await this.redisManager.del(key);
      return true;
    } catch (error) {
      log.error('Redis delete error', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Clear all keys matching a pattern
   */
  public async clearPattern(pattern: string): Promise<number> {
    if (!this.isConnected()) {
      return 0;
    }

    try {
      const client = this.getClient();
      if (!client) return 0;

      const keys = await client.keys(pattern);
      if (keys.length === 0) return 0;

      await client.del(...keys);
      return keys.length;
    } catch (error) {
      log.error('Redis clearPattern error', {
        pattern,
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  }

  /**
   * Check if a key exists
   */
  public async exists(key: string): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      const result = await this.redisManager.exists(key);
      return result;
    } catch (error) {
      log.error('Redis exists error', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Get TTL (Time To Live) for a key
   */
  public async ttl(key: string): Promise<number> {
    if (!this.isConnected()) {
      return -1;
    }

    try {
      const result = await this.redisManager.ttl(key);
      return result;
    } catch (error) {
      log.error('Redis TTL error', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      return -1;
    }
  }

  /**
   * Delete a key
   */
  public async del(key: string): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      const result = await this.redisManager.del(key);
      return result > 0;
    } catch (error) {
      log.error('Redis delete error', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
}

export const redisService = RedisService.getInstance();


