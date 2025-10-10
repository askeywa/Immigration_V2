// backend/src/services/rateLimitService.ts
import { Request, Response } from 'express';
import rateLimit, { RateLimitRequestHandler, Store, IncrementResponse } from 'express-rate-limit';
import Redis from 'ioredis';
import { TenantRequest } from '../middleware/tenantResolution';
import { AppError } from '../utils/errors';
import { log } from '../utils/logger';
import RedisClusterManager from '../config/redis-cluster';

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request, res: Response) => boolean;
  onLimitReached?: (req: Request, res: Response, options: any) => void;
}

export interface RateLimitRule {
  id: string;
  name: string;
  description?: string;
  tenantId?: string;
  userId?: string;
  apiKeyId?: string;
  ipAddress?: string;
  endpoint?: string;
  method?: string;
  config: RateLimitConfig;
  isActive: boolean;
  priority: number; // Higher number = higher priority
  createdAt: Date;
  updatedAt: Date;
}

export interface RateLimitStats {
  totalRequests: number;
  blockedRequests: number;
  blockedPercentage: number;
  topBlockedIPs: Array<{ ip: string; count: number }>;
  topBlockedTenants: Array<{ tenantId: string; count: number }>;
  topBlockedUsers: Array<{ userId: string; count: number }>;
  topBlockedEndpoints: Array<{ endpoint: string; count: number }>;
  hourlyStats: Array<{ hour: string; requests: number; blocked: number }>;
}

export interface RateLimitViolation {
  id: string;
  timestamp: Date;
  tenantId?: string;
  userId?: string;
  apiKeyId?: string;
  ipAddress: string;
  userAgent?: string;
  endpoint: string;
  method: string;
  ruleId: string;
  ruleName: string;
  limit: number;
  windowMs: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: any;
}

export class RateLimitService {
  private static redis: Redis | null;
  private static rules: Map<string, RateLimitRule> = new Map();
  private static violations: RateLimitViolation[] = [];
  private static readonly MAX_VIOLATIONS = 50; // CRITICAL: Reduce from 1000
  private static readonly MAX_RULES = 100; // CRITICAL: Prevent unlimited growth

  /**
   * Initialize the rate limiting service
   */
  static async initialize(redisConfig?: any): Promise<void> {
    try {
      // Check if Redis is enabled
      const redisEnabled = process.env.REDIS_ENABLED === 'true';
      
      if (redisEnabled) {
        // Use cluster manager for production
        const clusterManager = RedisClusterManager.getInstance();
        await clusterManager.connect();
        this.redis = clusterManager.getRedis() as Redis;
        log.info('Rate limiting service initialized with Redis cluster');
      } else {
        console.log('⚠️  Redis disabled - using in-memory rate limiting');
        this.redis = null;
      }

      if (this.redis) {
        // Test Redis connection
        await this.redis.ping();
        log.info('Rate limiting service initialized with Redis');
      } else {
        log.info('Rate limiting service initialized with in-memory storage');
      }

      // Load default rate limiting rules
      await this.loadDefaultRules();
    } catch (error) {
      log.warn('Redis not available, using in-memory rate limiting:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      // Fallback to in-memory storage
    }
  }

  /**
   * Load default rate limiting rules
   */
  private static async loadDefaultRules(): Promise<void> {
    const defaultRules: RateLimitRule[] = [
      {
        id: 'global_default',
        name: 'Global Default Rate Limit',
        description: 'Default rate limit for all requests',
        config: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 100, // 100 requests per 15 minutes
          message: 'Too many requests from this IP, please try again later.',
          standardHeaders: true,
          legacyHeaders: false
        },
        isActive: true,
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'tenant_default',
        name: 'Tenant Default Rate Limit',
        description: 'Default rate limit per tenant',
        config: {
          windowMs: 60 * 1000, // 1 minute
          max: 1000, // 1000 requests per minute per tenant
          message: 'Tenant rate limit exceeded, please try again later.',
          keyGenerator: (req: Request) => {
            const tenantRequest = req as TenantRequest;
            return `tenant:${tenantRequest.tenantId}`;
          }
        },
        isActive: true,
        priority: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'user_default',
        name: 'User Default Rate Limit',
        description: 'Default rate limit per user',
        config: {
          windowMs: 60 * 1000, // 1 minute
          max: 200, // 200 requests per minute per user
          message: 'User rate limit exceeded, please try again later.',
          keyGenerator: (req: Request) => {
            const user = (req as any).user;
            return `user:${user?._id}`;
          }
        },
        isActive: true,
        priority: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'api_key_default',
        name: 'API Key Default Rate Limit',
        description: 'Default rate limit per API key',
        config: {
          windowMs: 60 * 1000, // 1 minute
          max: 500, // 500 requests per minute per API key
          message: 'API key rate limit exceeded, please try again later.',
          keyGenerator: (req: Request) => {
            const apiKeyRequest = req as any;
            return `apikey:${apiKeyRequest.apiKey?.keyId}`;
          }
        },
        isActive: true,
        priority: 4,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'auth_endpoints',
        name: 'Authentication Endpoints Rate Limit',
        description: 'Stricter rate limit for authentication endpoints',
        config: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 5, // 5 attempts per 15 minutes
          message: 'Too many authentication attempts, please try again later.',
          keyGenerator: (req: Request) => `auth:${(req as any).ip}`,
          skip: (req: Request) => !(req as any).path.includes('/auth')
        },
        isActive: true,
        priority: 10,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const rule of defaultRules) {
      this.rules.set(rule.id, rule);
    }

    log.info(`Loaded ${defaultRules.length} default rate limiting rules`);
  }

  /**
   * Create rate limiting middleware
   */
  static createRateLimitMiddleware(ruleId: string): RateLimitRequestHandler {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new AppError(`Rate limit rule not found: ${ruleId}`, 404);
    }

    if (!rule.isActive) {
      // Return a no-op middleware if rule is inactive
      return rateLimit({
        windowMs: rule.config.windowMs,
        max: Number.MAX_SAFE_INTEGER,
        message: 'Rate limit rule is inactive'
      });
    }

    const rateLimitConfig: RateLimitRequestHandler = rateLimit({
      windowMs: rule.config.windowMs,
      max: rule.config.max,
      message: rule.config.message || 'Rate limit exceeded',
      standardHeaders: rule.config.standardHeaders,
      legacyHeaders: rule.config.legacyHeaders,
      skipSuccessfulRequests: rule.config.skipSuccessfulRequests,
      skipFailedRequests: rule.config.skipFailedRequests,
      keyGenerator: rule.config.keyGenerator || this.defaultKeyGenerator,
      skip: rule.config.skip,
      // onLimitReached: (req: Request, res: Response, options: any) => {
      //   this.logViolation(req, rule);
      //   if (rule.config.onLimitReached) {
      //     rule.config.onLimitReached(req, res, options);
      //   }
      // },
      // store: this.redis ? new RedisStore(this.redis, ruleId) : undefined // TODO: Implement Redis store
    });

    return rateLimitConfig;
  }

  /**
   * Default key generator
   */
  private static defaultKeyGenerator(req: Request): string {
    const tenantRequest = req as TenantRequest;
    const user = (req as any).user;
    const apiKey = (req as any).apiKey;

    // Priority order: API key > user > tenant > IP
    if (apiKey) {
      return `apikey:${apiKey.keyId}`;
    }
    if (user) {
      return `user:${user._id}`;
    }
    if (tenantRequest.tenantId) {
      return `tenant:${tenantRequest.tenantId}`;
    }
    return `ip:${(req as any).ip}`;
  }

  /**
   * Log rate limit violation
   */
  private static logViolation(req: Request, rule: RateLimitRule): void {
    const violation: RateLimitViolation = {
      id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      tenantId: (req as TenantRequest).tenantId,
      userId: (req as any).user?._id,
      apiKeyId: (req as any).apiKey?.keyId,
      ipAddress: (req as any).ip || 'unknown',
      userAgent: (req as any).get('User-Agent'),
      endpoint: (req as any).path,
      method: (req as any).method,
      ruleId: rule.id,
      ruleName: rule.name,
      limit: rule.config.max,
      windowMs: rule.config.windowMs,
      severity: this.calculateSeverity(rule, req),
      metadata: {
        referer: (req as any).get('Referer'),
        origin: (req as any).get('Origin'),
        xForwardedFor: (req as any).get('X-Forwarded-For')
      }
    };

    this.violations.push(violation);

    // ✅ AGGRESSIVE MEMORY CLEANUP
    if (this.violations.length > this.MAX_VIOLATIONS) {
      this.violations = this.violations.slice(-this.MAX_VIOLATIONS);
    }

    log.warn('Rate limit violation:', { violation });
  }

  /**
   * Calculate violation severity
   */
  private static calculateSeverity(rule: RateLimitRule, req: Request): 'low' | 'medium' | 'high' | 'critical' {
    // Critical for auth endpoints
    if ((req as any).path.includes('/auth')) {
      return 'critical';
    }

    // High for admin endpoints
    if ((req as any).path.includes('/admin') || (req as any).path.includes('/super-admin')) {
      return 'high';
    }

    // Medium for API key violations
    if ((req as any).apiKey) {
      return 'medium';
    }

    // Low for regular user requests
    return 'low';
  }

  /**
   * Add or update a rate limiting rule
   */
  static async addRule(rule: Omit<RateLimitRule, 'createdAt' | 'updatedAt'>): Promise<RateLimitRule> {
    const newRule: RateLimitRule = {
      ...rule,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.rules.set(rule.id, newRule);
    
    // ✅ ADD: Prevent rules Map from growing indefinitely
    if (this.rules.size > this.MAX_RULES) {
      const firstKey = this.rules.keys().next().value;
      if (firstKey) {
        this.rules.delete(firstKey);
      }
    }
    
    if (this.redis) {
      await this.redis.hset('rate_limit_rules', rule.id, JSON.stringify(newRule));
    }

    log.info(`Added rate limiting rule: ${rule.id}`);
    return newRule;
  }

  /**
   * Remove a rate limiting rule
   */
  static async removeRule(ruleId: string): Promise<boolean> {
    const exists = this.rules.has(ruleId);
    this.rules.delete(ruleId);
    
    if (this.redis) {
      await this.redis.hdel('rate_limit_rules', ruleId);
    }

    if (exists) {
      log.info(`Removed rate limiting rule: ${ruleId}`);
    }
    
    return exists;
  }

  /**
   * Get all rate limiting rules
   */
  static getRules(): RateLimitRule[] {
    return Array.from(this.rules.values()).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get rate limiting rule by ID
   */
  static getRule(ruleId: string): RateLimitRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get rate limiting statistics
   */
  static getStats(timeframe: 'hour' | 'day' | 'week' = 'hour'): RateLimitStats {
    const now = new Date();
    let startTime: Date;

    switch (timeframe) {
      case 'hour':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    const recentViolations = this.violations.filter((v: any) => v.timestamp >= startTime);
    
    const totalRequests = recentViolations.reduce((sum: any, v: any) => sum + v.limit, 0);
    const blockedRequests = recentViolations.length;
    const blockedPercentage = totalRequests > 0 ? (blockedRequests / totalRequests) * 100 : 0;

    // Group violations by various criteria
    const ipCounts = new Map<string, number>();
    const tenantCounts = new Map<string, number>();
    const userCounts = new Map<string, number>();
    const endpointCounts = new Map<string, number>();

    recentViolations.forEach((violation: any) => {
      ipCounts.set(violation.ipAddress, (ipCounts.get(violation.ipAddress) || 0) + 1);
      
      if (violation.tenantId) {
        tenantCounts.set(violation.tenantId, (tenantCounts.get(violation.tenantId) || 0) + 1);
      }
      
      if (violation.userId) {
        userCounts.set(violation.userId, (userCounts.get(violation.userId) || 0) + 1);
      }
      
      endpointCounts.set(violation.endpoint, (endpointCounts.get(violation.endpoint) || 0) + 1);
    });

    return {
      totalRequests,
      blockedRequests,
      blockedPercentage,
      topBlockedIPs: Array.from(ipCounts.entries())
        .map(([ip, count]) => ({ ip, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topBlockedTenants: Array.from(tenantCounts.entries())
        .map(([tenantId, count]) => ({ tenantId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topBlockedUsers: Array.from(userCounts.entries())
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topBlockedEndpoints: Array.from(endpointCounts.entries())
        .map(([endpoint, count]) => ({ endpoint, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      hourlyStats: this.getHourlyStats(recentViolations)
    };
  }

  /**
   * Get hourly statistics
   */
  private static getHourlyStats(violations: RateLimitViolation[]): Array<{ hour: string; requests: number; blocked: number }> {
    const hourlyMap = new Map<string, { requests: number; blocked: number }>();
    
    violations.forEach((violation: any) => {
      const hour = violation.timestamp.toISOString().substring(0, 13) + ':00:00.000Z';
      const current = hourlyMap.get(hour) || { requests: 0, blocked: 0 };
      current.requests += violation.limit;
      current.blocked += 1;
      hourlyMap.set(hour, current);
    });

    return Array.from(hourlyMap.entries())
      .map(([hour, stats]) => ({ hour, ...stats }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }

  /**
   * Get recent violations
   */
  static getViolations(limit: number = 50): RateLimitViolation[] {
    return this.violations
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clear rate limit for a specific key
   */
  static async clearRateLimit(key: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(key);
      log.info(`Cleared rate limit for key: ${key}`);
    }
  }

  /**
   * Get current rate limit status for a key
   */
  static async getRateLimitStatus(key: string): Promise<{
    remaining: number;
    resetTime: Date;
    totalHits: number;
  }> {
    if (this.redis) {
      const result = await this.redis.multi()
        .hget(key, 'totalHits')
        .hget(key, 'resetTime')
        .expire(key, 0)
        .exec();

      const totalHits = parseInt(result?.[0]?.[1] as string || '0');
      const resetTime = new Date(parseInt(result?.[1]?.[1] as string || '0'));

      return {
        remaining: Math.max(0, 100 - totalHits), // Assuming max of 100, should be dynamic
        resetTime,
        totalHits
      };
    }

    return {
      remaining: 100,
      resetTime: new Date(Date.now() + 15 * 60 * 1000),
      totalHits: 0
    };
  }
}

/**
 * Redis store implementation for express-rate-limit
 */
class RedisStore implements Store {
  public prefix: string;
  private redis: Redis;

  constructor(redis: Redis, prefix: string = 'rate_limit') {
    this.redis = redis;
    this.prefix = prefix;
  }

  async increment(key: string): Promise<IncrementResponse> {
    const prefixedKey = `${this.prefix}:${key}`;
    const windowMs = 15 * 60 * 1000; // Default window
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const windowKey = `${prefixedKey}:${window}`;

    const result = await this.redis.multi()
      .incr(windowKey)
      .expire(windowKey, Math.ceil(windowMs / 1000))
      .exec();

    const totalHits = result?.[0]?.[1] as number || 0;
    const ttl = await this.redis.ttl(windowKey);

    return {
      totalHits,
      resetTime: new Date(now + (ttl * 1000))
    };
  }

  async decrement(key: string): Promise<void> {
    const prefixedKey = `${this.prefix}:${key}`;
    const windowMs = 15 * 60 * 1000;
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const windowKey = `${prefixedKey}:${window}`;

    await this.redis.decr(windowKey);
  }

  async resetKey(key: string): Promise<void> {
    const prefixedKey = `${this.prefix}:${key}`;
    const pattern = `${prefixedKey}:*`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
