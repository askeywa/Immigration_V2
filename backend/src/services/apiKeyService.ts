// backend/src/services/apiKeyService.ts
import { ApiKey, IApiKey } from '../models/ApiKey';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { AppError } from '../utils/errors';
import mongoose from 'mongoose';

export interface CreateApiKeyData {
  tenantId: string;
  name: string;
  description?: string;
  permissions: {
    read: boolean;
    write: boolean;
    delete: boolean;
    admin: boolean;
  };
  scopes: string[];
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
    burstLimit: number;
  };
  expiresAt?: Date;
  createdBy: string;
  ipWhitelist?: string[];
  userAgentWhitelist?: string[];
}

export interface ApiKeyUsage {
  keyId: string;
  endpoint: string;
  method: string;
  ip: string;
  userAgent?: string;
  timestamp: Date;
  responseTime: number;
  statusCode: number;
}

export class ApiKeyService {
  /**
   * Create a new API key
   */
  static async createApiKey(data: CreateApiKeyData): Promise<{ apiKey: IApiKey; plainKey: string }> {
    try {
      // Validate tenant exists
      const tenant = await Tenant.findById(data.tenantId);
      if (!tenant) {
        throw new AppError('Tenant not found', 404);
      }

      // Validate user exists and has permission
      const user = await User.findById(data.createdBy);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Check if user has permission to create API keys
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        throw new AppError('Insufficient permissions to create API keys', 403);
      }

      // Check if user belongs to the tenant (unless super admin)
      if (user.role !== 'super_admin' && user.tenantId?.toString() !== data.tenantId) {
        throw new AppError('User does not belong to the specified tenant', 403);
      }

      // Validate permissions
      if (!data.permissions.read && !data.permissions.write && !data.permissions.delete && !data.permissions.admin) {
        throw new AppError('At least one permission must be granted', 400);
      }

      // Validate scopes
      if (!data.scopes || data.scopes.length === 0) {
        throw new AppError('At least one scope must be specified', 400);
      }

      // Validate rate limits
      if (data.rateLimit.requestsPerMinute <= 0 || data.rateLimit.requestsPerHour <= 0 || data.rateLimit.requestsPerDay <= 0) {
        throw new AppError('Rate limits must be positive numbers', 400);
      }

      // Generate API key
      const result = await ApiKey.generateApiKey(data);

      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create API key', 500);
    }
  }

  /**
   * Get all API keys for a tenant
   */
  static async getApiKeys(tenantId: string, userId: string, isSuperAdmin: boolean = false): Promise<IApiKey[]> {
    try {
      // Validate user permissions
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Check permissions
      if (!isSuperAdmin && user.tenantId?.toString() !== tenantId) {
        throw new AppError('Access denied to tenant API keys', 403);
      }

      if (user.role !== 'admin' && user.role !== 'super_admin') {
        throw new AppError('Insufficient permissions to view API keys', 403);
      }

      const apiKeys = await ApiKey.findByTenant(tenantId);
      return apiKeys;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get API keys', 500);
    }
  }

  /**
   * Get a specific API key by ID
   */
  static async getApiKeyById(keyId: string, tenantId: string, userId: string, isSuperAdmin: boolean = false): Promise<IApiKey | null> {
    try {
      // Validate user permissions
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Check permissions
      if (!isSuperAdmin && user.tenantId?.toString() !== tenantId) {
        throw new AppError('Access denied to tenant API keys', 403);
      }

      if (user.role !== 'admin' && user.role !== 'super_admin') {
        throw new AppError('Insufficient permissions to view API keys', 403);
      }

      const apiKey = await ApiKey.findOne({ keyId, tenantId });
      return apiKey;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get API key', 500);
    }
  }

  /**
   * Update an API key
   */
  static async updateApiKey(
    keyId: string, 
    tenantId: string, 
    userId: string, 
    updateData: Partial<CreateApiKeyData>,
    isSuperAdmin: boolean = false
  ): Promise<IApiKey> {
    try {
      // Validate user permissions
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Check permissions
      if (!isSuperAdmin && user.tenantId?.toString() !== tenantId) {
        throw new AppError('Access denied to tenant API keys', 403);
      }

      if (user.role !== 'admin' && user.role !== 'super_admin') {
        throw new AppError('Insufficient permissions to update API keys', 403);
      }

      const apiKey = await ApiKey.findOne({ keyId, tenantId });
      if (!apiKey) {
        throw new AppError('API key not found', 404);
      }

      // Update allowed fields
      if (updateData.name !== undefined) apiKey.name = updateData.name;
      if (updateData.description !== undefined) apiKey.description = updateData.description;
      if (updateData.permissions !== undefined) apiKey.permissions = updateData.permissions;
      if (updateData.scopes !== undefined) apiKey.scopes = updateData.scopes;
      if (updateData.rateLimit !== undefined) apiKey.rateLimit = updateData.rateLimit;
      if (updateData.expiresAt !== undefined) apiKey.expiresAt = updateData.expiresAt;
      if (updateData.ipWhitelist !== undefined) apiKey.ipWhitelist = updateData.ipWhitelist;
      if (updateData.userAgentWhitelist !== undefined) apiKey.userAgentWhitelist = updateData.userAgentWhitelist;

      await apiKey.save();
      return apiKey;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update API key', 500);
    }
  }

  /**
   * Revoke an API key
   */
  static async revokeApiKey(keyId: string, tenantId: string, userId: string, isSuperAdmin: boolean = false): Promise<void> {
    try {
      // Validate user permissions
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Check permissions
      if (!isSuperAdmin && user.tenantId?.toString() !== tenantId) {
        throw new AppError('Access denied to tenant API keys', 403);
      }

      if (user.role !== 'admin' && user.role !== 'super_admin') {
        throw new AppError('Insufficient permissions to revoke API keys', 403);
      }

      const apiKey = await ApiKey.findOne({ keyId, tenantId });
      if (!apiKey) {
        throw new AppError('API key not found', 404);
      }

      apiKey.revoke();
      await apiKey.save();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to revoke API key', 500);
    }
  }

  /**
   * Verify API key and return associated data
   */
  static async verifyApiKey(key: string, ip?: string, userAgent?: string): Promise<IApiKey | null> {
    try {
      const apiKey = await ApiKey.verifyApiKey(key);
      
      if (!apiKey) {
        return null;
      }

      // Check IP whitelist
      if (ip && !apiKey.isIpAllowed(ip)) {
        return null;
      }

      // Check user agent whitelist
      if (userAgent && !apiKey.isUserAgentAllowed(userAgent)) {
        return null;
      }

      // Increment usage
      apiKey.incrementUsage();
      await apiKey.save();

      return apiKey;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if API key can access a specific scope
   */
  static async canAccessScope(keyId: string, scope: string): Promise<boolean> {
    try {
      const apiKey = await ApiKey.findByKeyId(keyId);
      
      if (!apiKey || !apiKey.isActive()) {
        return false;
      }

      return apiKey.canAccess(scope);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get API key usage statistics
   */
  static async getApiKeyStats(tenantId: string, userId: string, isSuperAdmin: boolean = false): Promise<{
    totalKeys: number;
    activeKeys: number;
    revokedKeys: number;
    expiredKeys: number;
    totalUsage: number;
    recentUsage: number; // Last 24 hours
  }> {
    try {
      // Validate user permissions
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Check permissions
      if (!isSuperAdmin && user.tenantId?.toString() !== tenantId) {
        throw new AppError('Access denied to tenant API key statistics', 403);
      }

      if (user.role !== 'admin' && user.role !== 'super_admin') {
        throw new AppError('Insufficient permissions to view API key statistics', 403);
      }

      const apiKeys = await ApiKey.findByTenant(tenantId);
      
      const stats = {
        totalKeys: apiKeys.length,
        activeKeys: apiKeys.filter((key: any) => key.isActive()).length,
        revokedKeys: apiKeys.filter((key: any) => key.status === 'revoked').length,
        expiredKeys: apiKeys.filter((key: any) => key.status === 'expired').length,
        totalUsage: apiKeys.reduce((sum: any, key: any) => sum + key.usageCount, 0),
        recentUsage: 0 // This would be calculated from usage logs
      };

      return stats;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get API key statistics', 500);
    }
  }

  /**
   * Rotate an API key (generate new key, keep same permissions)
   */
  static async rotateApiKey(keyId: string, tenantId: string, userId: string, isSuperAdmin: boolean = false): Promise<{ apiKey: IApiKey; plainKey: string }> {
    try {
      // Validate user permissions
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Check permissions
      if (!isSuperAdmin && user.tenantId?.toString() !== tenantId) {
        throw new AppError('Access denied to tenant API keys', 403);
      }

      if (user.role !== 'admin' && user.role !== 'super_admin') {
        throw new AppError('Insufficient permissions to rotate API keys', 403);
      }

      const existingApiKey = await ApiKey.findOne({ keyId, tenantId });
      if (!existingApiKey) {
        throw new AppError('API key not found', 404);
      }

      // Generate new key
      const plainKey = existingApiKey.generateKey();
      const keyHash = require('crypto').createHash('sha256').update(plainKey).digest('hex');
      const keyPrefix = plainKey.substring(0, 8);

      // Update the API key
      existingApiKey.keyHash = keyHash;
      existingApiKey.keyPrefix = keyPrefix;
      existingApiKey.usageCount = 0; // Reset usage count
      existingApiKey.lastUsed = undefined;
      
      await existingApiKey.save();

      return { apiKey: existingApiKey, plainKey };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to rotate API key', 500);
    }
  }

  /**
   * Get API key usage history (placeholder for future implementation)
   */
  static async getApiKeyUsageHistory(keyId: string, tenantId: string, userId: string, isSuperAdmin: boolean = false): Promise<ApiKeyUsage[]> {
    try {
      // Validate user permissions
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Check permissions
      if (!isSuperAdmin && user.tenantId?.toString() !== tenantId) {
        throw new AppError('Access denied to tenant API key usage', 403);
      }

      if (user.role !== 'admin' && user.role !== 'super_admin') {
        throw new AppError('Insufficient permissions to view API key usage', 403);
      }

      // TODO: Implement usage history logging and retrieval
      // For now, return empty array
      return [];
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get API key usage history', 500);
    }
  }

  /**
   * Clean up expired API keys
   */
  static async cleanupExpiredKeys(): Promise<number> {
    try {
      const result = await ApiKey.updateMany(
        { 
          status: 'active',
          expiresAt: { $lt: new Date() }
        },
        { status: 'expired' }
      );
      
      return result.modifiedCount;
    } catch (error) {
      throw new AppError('Failed to cleanup expired API keys', 500);
    }
  }

  /**
   * Get API key by key ID (for internal use)
   */
  static async getApiKeyByKeyId(keyId: string): Promise<IApiKey | null> {
    try {
      return await ApiKey.findByKeyId(keyId);
    } catch (error) {
      return null;
    }
  }
}
