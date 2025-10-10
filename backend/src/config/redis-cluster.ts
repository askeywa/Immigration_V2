// backend/src/config/redis-cluster.ts
import Redis, { Cluster, ClusterNode, ClusterOptions } from 'ioredis';
import { log } from '../utils/logger';

export interface RedisClusterConfig {
  nodes: ClusterNode[];
  options: ClusterOptions;
}

export class RedisClusterManager {
  private static instance: RedisClusterManager;
  private cluster: Cluster | Redis | null = null;
  private isConnected = false;
  private isClusterMode = false;

  private constructor() {}

  static getInstance(): RedisClusterManager {
    if (!RedisClusterManager.instance) {
      RedisClusterManager.instance = new RedisClusterManager();
    }
    return RedisClusterManager.instance;
  }

  /**
   * Get Redis cluster configuration
   */
  getClusterConfig(): RedisClusterConfig {
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = process.env.NODE_ENV === 'development';
    const clusterMode = process.env.REDIS_CLUSTER_MODE === 'true';

    // Force single instance mode if REDIS_CLUSTER_MODE is false
    if (!clusterMode) {
      return {
        nodes: [{ host: 'localhost', port: 6379 }],
        options: {
          redisOptions: {
            password: process.env.REDIS_PASSWORD,
            connectTimeout: 5000,
            lazyConnect: true,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            keepAlive: 30000,
            family: 4,
            db: 0
          },
          enableOfflineQueue: false
        }
      };
    }

    if (isProduction && clusterMode) {
      // Production cluster configuration
      const clusterNodes: ClusterNode[] = [
        { host: process.env.REDIS_MASTER_1_HOST || 'redis-master-1', port: parseInt(process.env.REDIS_MASTER_1_PORT || '6379') },
        { host: process.env.REDIS_MASTER_2_HOST || 'redis-master-2', port: parseInt(process.env.REDIS_MASTER_2_PORT || '6379') },
        { host: process.env.REDIS_MASTER_3_HOST || 'redis-master-3', port: parseInt(process.env.REDIS_MASTER_3_PORT || '6379') },
        { host: process.env.REDIS_REPLICA_1_HOST || 'redis-replica-1', port: parseInt(process.env.REDIS_REPLICA_1_PORT || '6379') },
        { host: process.env.REDIS_REPLICA_2_HOST || 'redis-replica-2', port: parseInt(process.env.REDIS_REPLICA_2_PORT || '6379') },
        { host: process.env.REDIS_REPLICA_3_HOST || 'redis-replica-3', port: parseInt(process.env.REDIS_REPLICA_3_PORT || '6379') }
      ];

      return {
        nodes: clusterNodes,
        options: {
          redisOptions: {
            password: process.env.REDIS_PASSWORD,
            connectTimeout: 10000,
            lazyConnect: true,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            keepAlive: 30000,
            family: 4,
            db: 0
          },
          enableOfflineQueue: false,
          scaleReads: 'slave',
          maxRedirections: 16,
          retryDelayOnFailover: 100,
          retryDelayOnClusterDown: 300
        }
      };
    } else if (isDevelopment) {
      // Development single instance
      return {
        nodes: [{ host: 'localhost', port: 6379 }],
        options: {
          redisOptions: {
            password: process.env.REDIS_PASSWORD,
            connectTimeout: 5000,
            lazyConnect: true,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            keepAlive: 30000,
            family: 4,
            db: 0
          },
          enableOfflineQueue: false
        }
      };
    } else {
      // Default configuration
      return {
        nodes: [{ host: 'localhost', port: 6379 }],
        options: {
          redisOptions: {
            password: process.env.REDIS_PASSWORD,
            connectTimeout: 10000,
            lazyConnect: true,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            keepAlive: 30000,
            family: 4,
            db: 0
          },
          enableOfflineQueue: false
        }
      };
    }
  }

  /**
   * Connect to Redis cluster
   */
  async connect(): Promise<void> {
    if (this.isConnected && this.cluster) {
      log.info('Redis cluster already connected');
      return;
    }

    const maxRetries = 3;
    const retryDelay = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const config = this.getClusterConfig();
        const isProduction = process.env.NODE_ENV === 'production';
        const clusterMode = process.env.REDIS_CLUSTER_MODE === 'true';

        log.info(`Connecting to Redis... (attempt ${attempt}/${maxRetries})`, {
          environment: process.env.NODE_ENV,
          isClusterMode: clusterMode && config.nodes.length > 1,
          nodeCount: config.nodes.length,
          clusterModeEnabled: clusterMode
        });

        if (clusterMode && config.nodes.length > 1) {
          // Use cluster mode when explicitly enabled
          this.cluster = new Redis.Cluster(config.nodes, config.options);
          this.isClusterMode = true;
        } else {
          // Use single instance (default behavior)
          const node = config.nodes[0];
          this.cluster = new Redis({
            host: typeof node === 'string' ? (node as any).split(':')[0] : (node as any).host,
            port: typeof node === 'string' ? parseInt((node as any).split(':')[1]) : (node as any).port,
            ...config.options.redisOptions
          });
          this.isClusterMode = false;
        }

        // Set up event listeners
        this.setupEventListeners();

        this.isConnected = true;

        log.info('Redis connected successfully', {
          isClusterMode: this.isClusterMode,
          nodeCount: config.nodes.length
        });

        return; // Success, exit retry loop

      } catch (error) {
        log.error(`Redis connection attempt ${attempt}/${maxRetries} failed:`, {
          error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
          attempt,
          maxRetries
        });

        if (attempt === maxRetries) {
          log.error('❌ All Redis connection attempts failed. Continuing without Redis caching.');
          log.warn('⚠️  Application will continue without Redis - caching and sessions will be unavailable');
          this.isConnected = false;
          this.cluster = null;
          return; // Don't throw error, allow graceful degradation
        }

        log.info(`⏳ Retrying Redis connection in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  /**
   * Disconnect from Redis cluster
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected || !this.cluster) {
      log.info('Redis cluster not connected');
      return;
    }

    try {
      await this.cluster.disconnect();
      this.cluster = null;
      this.isConnected = false;
      this.isClusterMode = false;
      log.info('Redis cluster disconnected successfully');
    } catch (error) {
      log.error('Failed to disconnect from Redis cluster', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Setup Redis event listeners
   */
  private setupEventListeners(): void {
    if (!this.cluster) return;

    this.cluster.on('connect', () => {
      log.info('Redis cluster connected');
    });

    this.cluster.on('ready', () => {
      log.info('Redis cluster ready');
    });

    this.cluster.on('error', (error: any) => {
      log.error('Redis cluster error', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
    });

    this.cluster.on('close', () => {
      log.warn('Redis cluster connection closed');
      this.isConnected = false;
    });

    this.cluster.on('reconnecting', () => {
      log.info('Redis cluster reconnecting...');
    });

    this.cluster.on('end', () => {
      log.warn('Redis cluster connection ended');
      this.isConnected = false;
    });

    if (this.isClusterMode && this.cluster instanceof Redis.Cluster) {
      this.cluster.on('+node', (node: any) => {
        log.info('Redis node added', { node: `${(node as any).options.host}:${(node as any).options.port}` });
      });

      this.cluster.on('-node', (node: any) => {
        log.warn('Redis node removed', { node: `${(node as any).options.host}:${(node as any).options.port}` });
      });

      this.cluster.on('node error', (error: any, node: any) => {
        log.error('Redis node error', {
          error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
          node: `${(node as any).options.host}:${(node as any).options.port}`
        });
      });

      this.cluster.on('+move', (slot: any, key: any, node: any) => {
        log.info('Redis slot moved', {
          slot,
          key,
          node: `${(node as any).options.host}:${(node as any).options.port}`
        });
      });

      this.cluster.on('+slave', (node: any) => {
        log.info('Redis slave added', { node: `${(node as any).options.host}:${(node as any).options.port}` });
      });

      this.cluster.on('-slave', (node: any) => {
        log.warn('Redis slave removed', { node: `${(node as any).options.host}:${(node as any).options.port}` });
      });

      this.cluster.on('+master', (node: any) => {
        log.info('Redis master added', { node: `${(node as any).options.host}:${(node as any).options.port}` });
      });

      this.cluster.on('-master', (node: any) => {
        log.warn('Redis master removed', { node: `${(node as any).options.host}:${(node as any).options.port}` });
      });
    }

    // Handle process termination
    process.on('SIGINT', async () => {
      log.info('Received SIGINT, closing Redis cluster connection...');
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      log.info('Received SIGTERM, closing Redis cluster connection...');
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * Get Redis instance
   */
  getRedis(): Cluster | Redis {
    if (!this.cluster) {
      throw new Error('Redis cluster not connected');
    }
    return this.cluster;
  }

  /**
   * Execute Redis command with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        log.warn(`Redis operation failed (attempt ${attempt}/${maxRetries})`, {
          error: lastError.message,
          attempt,
          maxRetries
        });

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }

    throw lastError || new Error('Redis operation failed after all retries');
  }

  /**
   * Get cluster health status
   */
  getHealthStatus(): {
    isConnected: boolean;
    isClusterMode: boolean;
    nodeCount: number;
    clusterInfo?: any;
  } {
    const clusterInfo = this.isClusterMode && this.cluster instanceof Redis.Cluster 
      ? this.cluster.nodes() 
      : undefined;

    return {
      isConnected: this.isConnected,
      isClusterMode: this.isClusterMode,
      nodeCount: clusterInfo ? clusterInfo.length : 1,
      clusterInfo: clusterInfo ? clusterInfo.map((node: any) => ({
        host: (node as any).options.host,
        port: (node as any).options.port,
        status: (node as any).status,
        role: (node as any).role
      })) : undefined
    };
  }

  /**
   * Check if cluster is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      if (!this.isConnected || !this.cluster) {
        return false;
      }

      // Ping the cluster
      await this.cluster.ping();
      
      // Check cluster status if in cluster mode
      if (this.isClusterMode && this.cluster instanceof Redis.Cluster) {
        const nodes = this.cluster.nodes();
        const healthyNodes = nodes.filter((node: any) => (node as any).status === 'ready');
        return healthyNodes.length >= Math.ceil(nodes.length / 2); // At least half the nodes should be healthy
      }

      return true;
    } catch (error) {
      log.error('Redis cluster health check failed', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      return false;
    }
  }

  /**
   * Get cluster info
   */
  async getClusterInfo(): Promise<any> {
    if (!this.cluster) {
      throw new Error('Redis cluster not connected');
    }

    try {
      if (this.isClusterMode && this.cluster instanceof Redis.Cluster) {
        return await (this.cluster as any).cluster('info');
      } else {
        return await this.cluster.info();
      }
    } catch (error) {
      log.error('Failed to get cluster info', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Get cluster nodes
   */
  async getClusterNodes(): Promise<any[]> {
    if (!this.cluster) {
      throw new Error('Redis cluster not connected');
    }

    try {
      if (this.isClusterMode && this.cluster instanceof Redis.Cluster) {
        return await (this.cluster as any).cluster('nodes');
      } else {
        return [{
          id: 'single-node',
          host: (this.cluster as Redis).options.host,
          port: (this.cluster as Redis).options.port,
          role: 'master',
          status: 'connected'
        }];
      }
    } catch (error) {
      log.error('Failed to get cluster nodes', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Set key-value pair with expiration
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.cluster) {
      throw new Error('Redis cluster not connected');
    }

    try {
      if (ttlSeconds) {
        await this.cluster.setex(key, ttlSeconds, value);
      } else {
        await this.cluster.set(key, value);
      }
    } catch (error) {
      log.error('Failed to set Redis key', {
        key,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Get value by key
   */
  async get(key: string): Promise<string | null> {
    if (!this.cluster) {
      throw new Error('Redis cluster not connected');
    }

    try {
      return await this.cluster.get(key);
    } catch (error) {
      log.error('Failed to get Redis key', {
        key,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Delete key
   */
  async del(key: string): Promise<number> {
    if (!this.cluster) {
      throw new Error('Redis cluster not connected');
    }

    try {
      return await this.cluster.del(key);
    } catch (error) {
      log.error('Failed to delete Redis key', {
        key,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.cluster) {
      throw new Error('Redis cluster not connected');
    }

    try {
      const result = await this.cluster.exists(key);
      return result === 1;
    } catch (error) {
      log.error('Failed to check Redis key existence', {
        key,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Set expiration for key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.cluster) {
      throw new Error('Redis cluster not connected');
    }

    try {
      const result = await this.cluster.expire(key, seconds);
      return result === 1;
    } catch (error) {
      log.error('Failed to set Redis key expiration', {
        key,
        seconds,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }

  /**
   * Get TTL for key
   */
  async ttl(key: string): Promise<number> {
    if (!this.cluster) {
      throw new Error('Redis cluster not connected');
    }

    try {
      return await this.cluster.ttl(key);
    } catch (error) {
      log.error('Failed to get Redis key TTL', {
        key,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      throw error;
    }
  }
}

export default RedisClusterManager;
