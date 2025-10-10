// backend/src/config/mongodb-cluster.ts
import mongoose from 'mongoose';
import { log } from '../utils/logger';

export interface MongoDBClusterConfig {
  uri: string;
  options: mongoose.ConnectOptions;
}

export class MongoDBClusterManager {
  private static instance: MongoDBClusterManager;
  private isConnected = false;
  private connectionRetries = 0;
  private maxRetries = 5;

  private constructor() {}

  static getInstance(): MongoDBClusterManager {
    if (!MongoDBClusterManager.instance) {
      MongoDBClusterManager.instance = new MongoDBClusterManager();
    }
    return MongoDBClusterManager.instance;
  }

  /**
   * Get MongoDB cluster configuration - SIMPLIFIED for better reliability
   */
  getClusterConfig(): MongoDBClusterConfig {
    // Use the provided MongoDB URI directly - no parsing or reconstruction
    const mongoUri = process.env.MONGODB_URI || 
                    process.env.MONGO_URI || 
                    'mongodb://localhost:27017/immigration_portal';
    
    // Environment-specific connection options
    const baseOptions: mongoose.ConnectOptions = {
      // Connection pool settings
      maxPoolSize: process.env.NODE_ENV === 'production' ? 20 : 10,
      minPoolSize: process.env.NODE_ENV === 'production' ? 5 : 1,
      
      // Timeout settings optimized for EC2/cloud environments
      serverSelectionTimeoutMS: 15000, // Increased for cloud latency
      socketTimeoutMS: 45000,
      connectTimeoutMS: 20000, // Increased for initial connection
      
      // Connection management
      maxIdleTimeMS: 30000,
      heartbeatFrequencyMS: 10000,
      
      // Retry and reliability settings
      retryWrites: true,
      retryReads: true,
      
      // Buffer settings for better performance
      bufferCommands: false, // Fail fast instead of buffering
    };

    // Add production-specific options
    if (process.env.NODE_ENV === 'production') {
      baseOptions.readPreference = 'primaryPreferred';
      
      // Only add auth source if not using Atlas (Atlas handles auth automatically)
      if (!mongoUri.includes('mongodb+srv://') && !mongoUri.includes('@')) {
        baseOptions.authSource = 'admin';
      }
      
      // SSL configuration
      if (process.env.MONGODB_SSL === 'true' || mongoUri.includes('mongodb+srv://')) {
        baseOptions.ssl = true;
      }
    }

    return {
      uri: mongoUri,
      options: baseOptions
    };
  }

  /**
   * Connect to MongoDB with retry logic
   */
  async connect(): Promise<void> {
    if (this.isConnected && mongoose.connection.readyState === 1) {
      log.info('MongoDB cluster already connected');
      return;
    }

    const config = this.getClusterConfig();
    
    log.info('Attempting MongoDB cluster connection...', {
      environment: process.env.NODE_ENV,
      isAtlasUri: config.uri.includes('mongodb+srv://'),
      isLocalUri: config.uri.includes('localhost') || config.uri.includes('127.0.0.1'),
      hasAuth: config.uri.includes('@'),
      attempt: this.connectionRetries + 1,
      maxRetries: this.maxRetries
    });

    try {
      await mongoose.connect(config.uri, config.options);

      this.isConnected = true;
      this.connectionRetries = 0; // Reset retry counter on success
      
      // Set up event listeners
      this.setupEventListeners();

      log.info('MongoDB cluster connected successfully', {
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
        collections: await this.getCollectionCount()
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      log.error('MongoDB cluster connection failed', {
        error: errorMessage,
        attempt: this.connectionRetries + 1,
        maxRetries: this.maxRetries,
        willRetry: this.connectionRetries < this.maxRetries - 1
      });

      this.connectionRetries++;
      
      // If we haven't exceeded max retries, throw the error for retry logic
      if (this.connectionRetries < this.maxRetries) {
        throw error;
      } else {
        // Max retries exceeded
        const finalError = new Error(`MongoDB connection failed after ${this.maxRetries} attempts: ${errorMessage}`);
        log.error('MongoDB cluster connection exhausted all retries', {
          error: finalError.message,
          totalAttempts: this.connectionRetries
        });
        throw finalError;
      }
    }
  }

  /**
   * Disconnect from MongoDB cluster
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected && mongoose.connection.readyState === 0) {
      log.info('MongoDB cluster not connected');
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      this.connectionRetries = 0;
      log.info('MongoDB cluster disconnected successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error('Failed to disconnect from MongoDB cluster', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Setup comprehensive MongoDB event listeners
   */
  private setupEventListeners(): void {
    // Connection events
    mongoose.connection.on('connected', () => {
      log.info('MongoDB cluster connected event fired');
      this.isConnected = true;
    });

    mongoose.connection.on('open', () => {
      log.info('MongoDB cluster connection opened');
    });

    mongoose.connection.on('error', (error: any) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error('MongoDB cluster connection error', {
        error: errorMessage,
        readyState: mongoose.connection.readyState
      });
      
      // Don't automatically set isConnected to false on error
      // Let the disconnected event handle that
    });

    mongoose.connection.on('disconnected', () => {
      log.warn('MongoDB cluster disconnected event fired');
      this.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      log.info('MongoDB cluster reconnected event fired');
      this.isConnected = true;
    });

    mongoose.connection.on('close', () => {
      log.info('MongoDB cluster connection closed event fired');
      this.isConnected = false;
    });

    // Handle process termination gracefully
    const handleTermination = async (signal: string) => {
      log.info(`Received ${signal}, closing MongoDB cluster connection...`);
      try {
        await this.disconnect();
        log.info('MongoDB connection closed successfully during termination');
      } catch (error) {
        log.error('Error during MongoDB disconnection on termination', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    };

    process.on('SIGINT', () => handleTermination('SIGINT'));
    process.on('SIGTERM', () => handleTermination('SIGTERM'));
    
    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      log.error('Unhandled Rejection at Promise', {
        promise,
        reason: reason instanceof Error ? reason.message : String(reason)
      });
    });
  }

  /**
   * Get connection health status with detailed information
   */
  getHealthStatus(): {
    isConnected: boolean;
    readyState: number;
    readyStateDescription: string;
    connectionRetries: number;
    connectionInfo: {
      host?: string;
      port?: number;
      name?: string;
    };
  } {
    const readyStateMap: { [key: number]: string } = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
      99: 'uninitialized'
    };

    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      readyStateDescription: readyStateMap[mongoose.connection.readyState] || 'unknown',
      connectionRetries: this.connectionRetries,
      connectionInfo: {
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name
      }
    };
  }

  /**
   * Check if cluster is healthy with comprehensive tests
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Check connection state
      if (!this.isConnected || mongoose.connection.readyState !== 1) {
        return false;
      }

      // Ping the database
      const startTime = Date.now();
      await mongoose.connection.db?.admin().ping();
      const pingTime = Date.now() - startTime;
      
      log.debug('MongoDB health check ping successful', { 
        pingTimeMs: pingTime 
      });

      // Consider slow responses as potential issues
      if (pingTime > 5000) {
        log.warn('MongoDB ping response is slow', { pingTimeMs: pingTime });
      }

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error('MongoDB cluster health check failed', { error: errorMessage });
      return false;
    }
  }

  /**
   * Execute database operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    retryDelay: number = 1000,
    operationName: string = 'Database Operation'
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const result = await operation();
        const duration = Date.now() - startTime;
        
        if (attempt > 1) {
          log.info(`${operationName} succeeded after retry`, {
            attempt,
            duration,
            maxRetries
          });
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        log.warn(`${operationName} failed (attempt ${attempt}/${maxRetries})`, {
          error: lastError.message,
          attempt,
          maxRetries
        });

        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          log.debug(`Retrying ${operationName} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    const finalError = lastError || new Error(`${operationName} failed after all retries`);
    log.error(`${operationName} exhausted all retries`, {
      error: finalError.message,
      totalAttempts: maxRetries
    });
    
    throw finalError;
  }

  /**
   * Get read preference for queries based on environment
   */
  getReadPreference(): 'primary' | 'primaryPreferred' | 'secondary' | 'secondaryPreferred' | 'nearest' {
    // In production, prefer primary but allow secondary reads for scalability
    if (process.env.NODE_ENV === 'production') {
      return 'primaryPreferred';
    } else {
      // In development, always use primary for consistency
      return 'primary';
    }
  }

  /**
   * Get write concern for operations based on environment
   */
  getWriteConcern(): mongoose.WriteConcern {
    if (process.env.NODE_ENV === 'production') {
      // Production: require majority write concern for consistency
      return { w: 'majority', j: true, wtimeout: 10000 };
    } else {
      // Development: basic write concern for speed
      return { w: 1, j: true, wtimeout: 5000 };
    }
  }

  /**
   * Get collection count (useful for health checks)
   */
  private async getCollectionCount(): Promise<number> {
    try {
      const collections = await mongoose.connection.db?.listCollections().toArray();
      return collections?.length || 0;
    } catch (error) {
      log.debug('Could not get collection count', {
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<any> {
    try {
      if (!this.isConnected) {
        return null;
      }

      const stats = await mongoose.connection.db?.stats();
      return stats;
    } catch (error) {
      log.error('Failed to get database statistics', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Force reconnection if needed
   */
  async forceReconnect(): Promise<void> {
    log.info('Forcing MongoDB reconnection...');
    
    try {
      // Close existing connection
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      
      // Reset state
      this.isConnected = false;
      this.connectionRetries = 0;
      
      // Reconnect
      await this.connect();
      
      log.info('Force reconnection completed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error('Force reconnection failed', { error: errorMessage });
      throw error;
    }
  }
}

export default MongoDBClusterManager;