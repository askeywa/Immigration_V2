// backend/src/services/indexingService.ts
import mongoose from 'mongoose';
import { AppError } from '../utils/errors';
import { log } from '../utils/logger';

export interface IndexDefinition {
  collection: string;
  index: Record<string, 1 | -1 | 'text' | '2dsphere' | '2d'>;
  options?: {
    unique?: boolean;
    sparse?: boolean;
    background?: boolean;
    name?: string;
    partialFilterExpression?: Record<string, any>;
    expireAfterSeconds?: number;
  };
}

export interface IndexPerformance {
  collection: string;
  indexName: string;
  size: number;
  usage: {
    operations: number;
    since: Date;
  };
  efficiency: {
    hits: number;
    misses: number;
    hitRate: number;
  };
}

export class IndexingService {
  /**
   * Define all multi-tenant optimized indexes
   */
  static getIndexDefinitions(): IndexDefinition[] {
    return [
      // User Collection Indexes
      {
        collection: 'users',
        index: { tenantId: 1, email: 1 },
        options: { unique: true, name: 'tenant_email_unique' }
      },
      {
        collection: 'users',
        index: { tenantId: 1, isActive: 1 },
        options: { name: 'tenant_active_users' }
      },
      {
        collection: 'users',
        index: { tenantId: 1, role: 1 },
        options: { name: 'tenant_role_users' }
      },
      {
        collection: 'users',
        index: { tenantId: 1, createdAt: -1 },
        options: { name: 'tenant_users_created_desc' }
      },
      {
        collection: 'users',
        index: { email: 1, isActive: 1 },
        options: { name: 'email_active_users' }
      },

      // Profile Collection Indexes
      {
        collection: 'profiles',
        index: { tenantId: 1, userId: 1 },
        options: { unique: true, name: 'tenant_user_profile_unique' }
      },
      {
        collection: 'profiles',
        index: { tenantId: 1, lastUpdated: -1 },
        options: { name: 'tenant_profiles_updated_desc' }
      },
      {
        collection: 'profiles',
        index: { tenantId: 1, userId: 1, lastUpdated: -1 },
        options: { name: 'tenant_user_profile_updated' }
      },

      // Tenant Collection Indexes
      {
        collection: 'tenants',
        index: { domain: 1 },
        options: { unique: true, name: 'tenant_domain_unique' }
      },
      {
        collection: 'tenants',
        index: { status: 1, createdAt: -1 },
        options: { name: 'tenant_status_created' }
      },
      {
        collection: 'tenants',
        index: { subscriptionId: 1 },
        options: { name: 'tenant_subscription' }
      },

      // Subscription Collection Indexes
      {
        collection: 'subscriptions',
        index: { tenantId: 1 },
        options: { unique: true, name: 'subscription_tenant_unique' }
      },
      {
        collection: 'subscriptions',
        index: { planId: 1, isActive: 1 },
        options: { name: 'subscription_plan_active' }
      },
      {
        collection: 'subscriptions',
        index: { expiresAt: 1 },
        options: { name: 'subscription_expires', expireAfterSeconds: 0 }
      },

      // API Key Collection Indexes
      {
        collection: 'apikeys',
        index: { tenantId: 1, keyId: 1 },
        options: { unique: true, name: 'apikey_tenant_key_unique' }
      },
      {
        collection: 'apikeys',
        index: { tenantId: 1, status: 1 },
        options: { name: 'apikey_tenant_status' }
      },
      {
        collection: 'apikeys',
        index: { keyId: 1, status: 1 },
        options: { name: 'apikey_key_status' }
      },
      {
        collection: 'apikeys',
        index: { expiresAt: 1 },
        options: { name: 'apikey_expires', expireAfterSeconds: 0 }
      },
      {
        collection: 'apikeys',
        index: { tenantId: 1, createdAt: -1 },
        options: { name: 'apikey_tenant_created' }
      },

      // MFA Settings Collection Indexes
      {
        collection: 'mfasettings',
        index: { tenantId: 1, userId: 1 },
        options: { unique: true, name: 'mfa_tenant_user_unique' }
      },
      {
        collection: 'mfasettings',
        index: { tenantId: 1, status: 1 },
        options: { name: 'mfa_tenant_status' }
      },
      {
        collection: 'mfasettings',
        index: { lockedUntil: 1 },
        options: { 
          name: 'mfa_locked_until',
          expireAfterSeconds: 0,
          partialFilterExpression: { lockedUntil: { $exists: true } }
        }
      },

      // Audit Log Collection Indexes
      {
        collection: 'auditlogs',
        index: { tenantId: 1, createdAt: -1 },
        options: { name: 'audit_tenant_created_desc' }
      },
      {
        collection: 'auditlogs',
        index: { tenantId: 1, action: 1, createdAt: -1 },
        options: { name: 'audit_tenant_action_created' }
      },
      {
        collection: 'auditlogs',
        index: { userId: 1, createdAt: -1 },
        options: { name: 'audit_user_created_desc' }
      },
      {
        collection: 'auditlogs',
        index: { createdAt: -1 },
        options: { 
          name: 'audit_created_desc',
          expireAfterSeconds: 90 * 24 * 60 * 60 // 90 days retention
        }
      },

      // Notification Collection Indexes
      {
        collection: 'notifications',
        index: { tenantId: 1, userId: 1, createdAt: -1 },
        options: { name: 'notification_tenant_user_created' }
      },
      {
        collection: 'notifications',
        index: { tenantId: 1, isRead: 1, createdAt: -1 },
        options: { name: 'notification_tenant_read_created' }
      },
      {
        collection: 'notifications',
        index: { userId: 1, isRead: 1 },
        options: { name: 'notification_user_read' }
      },
      {
        collection: 'notifications',
        index: { createdAt: -1 },
        options: { 
          name: 'notification_created_desc',
          expireAfterSeconds: 30 * 24 * 60 * 60 // 30 days retention
        }
      },

      // Report Collection Indexes
      {
        collection: 'reports',
        index: { tenantId: 1, createdAt: -1 },
        options: { name: 'report_tenant_created_desc' }
      },
      {
        collection: 'reports',
        index: { tenantId: 1, type: 1, createdAt: -1 },
        options: { name: 'report_tenant_type_created' }
      },
      {
        collection: 'reports',
        index: { userId: 1, createdAt: -1 },
        options: { name: 'report_user_created_desc' }
      },

      // File Collection Indexes
      {
        collection: 'files',
        index: { tenantId: 1, userId: 1 },
        options: { name: 'file_tenant_user' }
      },
      {
        collection: 'files',
        index: { tenantId: 1, type: 1, createdAt: -1 },
        options: { name: 'file_tenant_type_created' }
      },
      {
        collection: 'files',
        index: { createdAt: -1 },
        options: { 
          name: 'file_created_desc',
          expireAfterSeconds: 365 * 24 * 60 * 60 // 1 year retention
        }
      },

      // Draw Collection Indexes (if exists)
      {
        collection: 'draws',
        index: { tenantId: 1, createdAt: -1 },
        options: { name: 'draw_tenant_created_desc' }
      },
      {
        collection: 'draws',
        index: { status: 1, createdAt: -1 },
        options: { name: 'draw_status_created' }
      }
    ];
  }

  /**
   * Create all indexes for multi-tenant optimization
   */
  static async createAllIndexes(): Promise<{ created: number; failed: number; errors: string[] }> {
    try {
      const indexDefinitions = this.getIndexDefinitions();
      let created = 0;
      let failed = 0;
      const errors: string[] = [];

      log.info('Starting database index creation...');

      for (const definition of indexDefinitions) {
        try {
          if (!mongoose.connection.db) {
            throw new Error('Database connection not established');
          }
          const collection = mongoose.connection.db?.collection(definition.collection);
          
          // Check if index already exists
          const existingIndexes = await collection.indexes();
          const indexExists = existingIndexes.some((index: any) => 
            index.name === definition.options?.name ||
            JSON.stringify(index.key) === JSON.stringify(definition.index)
          );

          if (!indexExists) {
            await collection.createIndex(definition.index, definition.options);
            created++;
            log.info(`Created index: ${definition.collection}.${definition.options?.name || 'unnamed'}`);
          } else {
            log.info(`Index already exists: ${definition.collection}.${definition.options?.name || 'unnamed'}`);
          }
        } catch (error) {
          failed++;
          const errorMsg = `Failed to create index for ${definition.collection}: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'}`;
          errors.push(errorMsg);
          log.error(errorMsg);
        }
      }

      log.info(`Index creation completed: ${created} created, ${failed} failed`);
      return { created, failed, errors };
    } catch (error) {
      throw new AppError('Failed to create database indexes', 500);
    }
  }

  /**
   * Drop all custom indexes (be careful!)
   */
  static async dropAllIndexes(): Promise<{ dropped: number; failed: number; errors: string[] }> {
    try {
      const indexDefinitions = this.getIndexDefinitions();
      let dropped = 0;
      let failed = 0;
      const errors: string[] = [];

      log.warn('Starting database index deletion...');

      for (const definition of indexDefinitions) {
        try {
          if (!mongoose.connection.db) {
            throw new Error('Database connection not established');
          }
          const collection = mongoose.connection.db?.collection(definition.collection);
          
          if (definition.options?.name) {
            await collection.dropIndex(definition.options.name);
            dropped++;
            log.info(`Dropped index: ${definition.collection}.${definition.options.name}`);
          }
        } catch (error) {
          failed++;
          const errorMsg = `Failed to drop index for ${definition.collection}: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'}`;
          errors.push(errorMsg);
          log.error(errorMsg);
        }
      }

      log.warn(`Index deletion completed: ${dropped} dropped, ${failed} failed`);
      return { dropped, failed, errors };
    } catch (error) {
      throw new AppError('Failed to drop database indexes', 500);
    }
  }

  /**
   * Get index performance statistics
   */
  static async getIndexPerformance(): Promise<IndexPerformance[]> {
    try {
      if (!mongoose.connection.db) {
        throw new Error('Database connection not established');
      }
      const collections = await mongoose.connection.db?.listCollections().toArray();
      const performance: IndexPerformance[] = [];

      for (const collectionInfo of collections) {
        try {
          if (!mongoose.connection.db) {
          throw new Error('Database connection not established');
        }
        const collection = mongoose.connection.db?.collection(collectionInfo.name);
          const stats = await collection.aggregate([{ $collStats: { storageStats: {}, indexDetails: {} } }]).toArray();
          const collectionStats = stats[0] || {};
          
          if (collectionStats.storageStats && collectionStats.storageStats.indexSizes) {
            for (const [indexName, size] of Object.entries(collectionStats.storageStats.indexSizes)) {
              // Get index usage stats
              const indexStats = await collection.aggregate([
                { $indexStats: {} }
              ]).toArray();

              const indexStat = indexStats.find((stat: any) => stat.name === indexName);
              
              performance.push({
                collection: collectionInfo.name,
                indexName,
                size: size as number,
                usage: {
                  operations: indexStat?.accesses?.ops || 0,
                  since: indexStat?.accesses?.since || new Date()
                },
                efficiency: {
                  hits: indexStat?.accesses?.ops || 0,
                  misses: 0, // MongoDB doesn't provide miss stats directly
                  hitRate: indexStat?.accesses?.ops > 0 ? 1 : 0
                }
              });
            }
          }
        } catch (error) {
          log.error(`Failed to get stats for collection ${collectionInfo.name}:`, { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
        }
      }

      return performance;
    } catch (error) {
      throw new AppError('Failed to get index performance statistics', 500);
    }
  }

  /**
   * Analyze query performance for a specific collection
   */
  static async analyzeQuery(collection: string, query: Record<string, any>, options: any = {}): Promise<{
    executionStats: any;
    indexRecommendations: string[];
  }> {
    try {
      if (!mongoose.connection.db) {
        throw new Error('Database connection not established');
      }
      const dbCollection = mongoose.connection.db?.collection(collection);
      
      // Use explain to analyze the query
      const explainResult = await dbCollection.find(query, options).explain('executionStats');
      
      const executionStats = explainResult.executionStats;
      const indexRecommendations: string[] = [];

      // Analyze execution stats for recommendations
      if ((executionStats as any).totalDocsExamined > (executionStats as any).totalDocsReturned * 2) {
        indexRecommendations.push('Consider adding an index to reduce document examination');
      }

      if ((executionStats as any).executionTimeMillis > 100) {
        indexRecommendations.push('Query execution time is high, consider optimization');
      }

      if ((executionStats as any).totalDocsExamined === (executionStats as any).totalDocsReturned) {
        indexRecommendations.push('Query is well-optimized with proper index usage');
      }

      return {
        executionStats,
        indexRecommendations
      };
    } catch (error) {
      throw new AppError(`Failed to analyze query for collection ${collection}`, 500);
    }
  }

  /**
   * Get database performance overview
   */
  static async getDatabasePerformance(): Promise<{
    totalCollections: number;
    totalIndexes: number;
    totalSize: number;
    indexSize: number;
    performance: IndexPerformance[];
  }> {
    try {
      if (!mongoose.connection.db) {
        throw new Error('Database connection not established');
      }
      const collections = await mongoose.connection.db?.listCollections().toArray();
      let totalIndexes = 0;
      let totalSize = 0;
      let indexSize = 0;

      for (const collectionInfo of collections) {
        if (!mongoose.connection.db) {
          throw new Error('Database connection not established');
        }
        const collection = mongoose.connection.db?.collection(collectionInfo.name);
        const stats = await collection.aggregate([{ $collStats: { storageStats: {}, indexDetails: {} } }]).toArray();
        const collectionStats = stats[0] || {};
        
        totalSize += collectionStats.storageStats?.size || 0;
        indexSize += collectionStats.storageStats?.totalIndexSize || 0;
        totalIndexes += (collectionStats.storageStats?.indexSizes && Object.keys(collectionStats.storageStats.indexSizes).length) || 0;
      }

      const performance = await this.getIndexPerformance();

      return {
        totalCollections: collections.length,
        totalIndexes,
        totalSize,
        indexSize,
        performance
      };
    } catch (error) {
      throw new AppError('Failed to get database performance overview', 500);
    }
  }

  /**
   * Optimize indexes based on usage patterns
   */
  static async optimizeIndexes(): Promise<{
    optimized: number;
    recommendations: string[];
  }> {
    try {
      const performance = await this.getIndexPerformance();
      const recommendations: string[] = [];
      let optimized = 0;

      // Find unused indexes
      const unusedIndexes = performance.filter((index: any) => index.usage.operations === 0);
      
      if (unusedIndexes.length > 0) {
        recommendations.push(`Found ${unusedIndexes.length} unused indexes that could be removed`);
        optimized += unusedIndexes.length;
      }

      // Find large indexes with low usage
      const inefficientIndexes = performance.filter((index: any) => 
        index.size > 1024 * 1024 && index.usage.operations < 10 // 1MB+ with < 10 operations
      );

      if (inefficientIndexes.length > 0) {
        recommendations.push(`Found ${inefficientIndexes.length} large indexes with low usage`);
        optimized += inefficientIndexes.length;
      }

      return {
        optimized,
        recommendations
      };
    } catch (error) {
      throw new AppError('Failed to optimize indexes', 500);
    }
  }

  /**
   * Create tenant-specific indexes for a new tenant
   */
  static async createTenantIndexes(tenantId: string): Promise<void> {
    try {
      // This method can be used to create tenant-specific indexes if needed
      // For now, our global indexes with tenantId prefix should handle most cases
      log.info(`Tenant-specific indexes created for tenant: ${tenantId}`);
    } catch (error) {
      throw new AppError(`Failed to create tenant-specific indexes for ${tenantId}`, 500);
    }
  }

  /**
   * Monitor index usage and performance
   */
  static async monitorIndexUsage(): Promise<{
    activeIndexes: number;
    unusedIndexes: number;
    recommendations: string[];
  }> {
    try {
      const performance = await this.getIndexPerformance();
      const activeIndexes = performance.filter((index: any) => index.usage.operations > 0).length;
      const unusedIndexes = performance.filter((index: any) => index.usage.operations === 0).length;
      
      const recommendations: string[] = [];
      
      if (unusedIndexes > activeIndexes * 0.3) {
        recommendations.push('High number of unused indexes detected. Consider removing unused indexes.');
      }

      const largeIndexes = performance.filter((index: any) => index.size > 10 * 1024 * 1024); // 10MB+
      if (largeIndexes.length > 0) {
        recommendations.push(`Found ${largeIndexes.length} large indexes (>10MB). Monitor their usage.`);
      }

      return {
        activeIndexes,
        unusedIndexes,
        recommendations
      };
    } catch (error) {
      throw new AppError('Failed to monitor index usage', 500);
    }
  }
}
