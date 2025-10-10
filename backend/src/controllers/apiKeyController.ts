// backend/src/controllers/apiKeyController.ts
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { TenantRequest } from '../middleware/tenantResolution';
import { ApiKeyService, CreateApiKeyData } from '../services/apiKeyService';
import { ValidationError } from '../utils/errors';

// Create a new API key
export const createApiKey = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    const {
      name,
      description,
      permissions,
      scopes,
      rateLimit,
      expiresAt,
      ipWhitelist,
      userAgentWhitelist
    } = req.body;

    // Validate required fields
    if (!name || !permissions || !scopes || !rateLimit) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, permissions, scopes, rateLimit'
      });
    }

    // Validate permissions object
    if (typeof permissions !== 'object' || 
        typeof permissions.read !== 'boolean' ||
        typeof permissions.write !== 'boolean' ||
        typeof permissions.delete !== 'boolean' ||
        typeof permissions.admin !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Invalid permissions format'
      });
    }

    // Validate scopes array
    if (!Array.isArray(scopes) || scopes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Scopes must be a non-empty array'
      });
    }

    // Validate rate limit object
    if (typeof rateLimit !== 'object' ||
        typeof rateLimit.requestsPerMinute !== 'number' ||
        typeof rateLimit.requestsPerHour !== 'number' ||
        typeof rateLimit.requestsPerDay !== 'number' ||
        typeof rateLimit.burstLimit !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Invalid rate limit format'
      });
    }

    const apiKeyData: CreateApiKeyData = {
      tenantId,
      name,
      description,
      permissions,
      scopes,
      rateLimit,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      createdBy: user._id,
      ipWhitelist,
      userAgentWhitelist
    };

    const result = await ApiKeyService.createApiKey(apiKeyData);
    
    // Set tenant context headers
    res.set('X-Tenant-ID', tenantId);
    
    res.status(201).json({
      success: true,
      message: 'API key created successfully',
      data: {
        apiKey: result.apiKey,
        plainKey: result.plainKey // Only returned once during creation
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to create API key'
    });
  }
});

// Get all API keys for the tenant
export const getApiKeys = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    const isSuperAdmin = req.isSuperAdmin;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    const apiKeys = await ApiKeyService.getApiKeys(tenantId, user._id, isSuperAdmin);
    
    // Set tenant context headers
    res.set('X-Tenant-ID', tenantId);
    
    res.json({
      success: true,
      data: apiKeys
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get API keys'
    });
  }
});

// Get a specific API key by ID
export const getApiKeyById = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    const isSuperAdmin = req.isSuperAdmin;
    const { keyId } = req.params;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    if (!keyId) {
      return res.status(400).json({
        success: false,
        message: 'API key ID is required'
      });
    }

    const apiKey = await ApiKeyService.getApiKeyById(keyId, tenantId, user._id, isSuperAdmin);
    
    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }
    
    // Set tenant context headers
    res.set('X-Tenant-ID', tenantId);
    
    res.json({
      success: true,
      data: apiKey
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get API key'
    });
  }
});

// Update an API key
export const updateApiKey = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    const isSuperAdmin = req.isSuperAdmin;
    const { keyId } = req.params;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    if (!keyId) {
      return res.status(400).json({
        success: false,
        message: 'API key ID is required'
      });
    }

    const updateData = req.body;
    
    // Validate permissions if provided
    if (updateData.permissions && typeof updateData.permissions !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid permissions format'
      });
    }

    // Validate scopes if provided
    if (updateData.scopes && (!Array.isArray(updateData.scopes) || updateData.scopes.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Scopes must be a non-empty array'
      });
    }

    // Validate rate limit if provided
    if (updateData.rateLimit && typeof updateData.rateLimit !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid rate limit format'
      });
    }

    const apiKey = await ApiKeyService.updateApiKey(keyId, tenantId, user._id, updateData, isSuperAdmin);
    
    // Set tenant context headers
    res.set('X-Tenant-ID', tenantId);
    
    res.json({
      success: true,
      message: 'API key updated successfully',
      data: apiKey
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to update API key'
    });
  }
});

// Revoke an API key
export const revokeApiKey = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    const isSuperAdmin = req.isSuperAdmin;
    const { keyId } = req.params;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    if (!keyId) {
      return res.status(400).json({
        success: false,
        message: 'API key ID is required'
      });
    }

    await ApiKeyService.revokeApiKey(keyId, tenantId, user._id, isSuperAdmin);
    
    // Set tenant context headers
    res.set('X-Tenant-ID', tenantId);
    
    res.json({
      success: true,
      message: 'API key revoked successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to revoke API key'
    });
  }
});

// Rotate an API key
export const rotateApiKey = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    const isSuperAdmin = req.isSuperAdmin;
    const { keyId } = req.params;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    if (!keyId) {
      return res.status(400).json({
        success: false,
        message: 'API key ID is required'
      });
    }

    const result = await ApiKeyService.rotateApiKey(keyId, tenantId, user._id, isSuperAdmin);
    
    // Set tenant context headers
    res.set('X-Tenant-ID', tenantId);
    
    res.json({
      success: true,
      message: 'API key rotated successfully',
      data: {
        apiKey: result.apiKey,
        plainKey: result.plainKey // New key returned
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to rotate API key'
    });
  }
});

// Get API key statistics
export const getApiKeyStats = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    const isSuperAdmin = req.isSuperAdmin;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    const stats = await ApiKeyService.getApiKeyStats(tenantId, user._id, isSuperAdmin);
    
    // Set tenant context headers
    res.set('X-Tenant-ID', tenantId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get API key statistics'
    });
  }
});

// Get API key usage history
export const getApiKeyUsageHistory = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = req.tenantId;
    const isSuperAdmin = req.isSuperAdmin;
    const { keyId } = req.params;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    if (!keyId) {
      return res.status(400).json({
        success: false,
        message: 'API key ID is required'
      });
    }

    const usageHistory = await ApiKeyService.getApiKeyUsageHistory(keyId, tenantId, user._id, isSuperAdmin);
    
    // Set tenant context headers
    res.set('X-Tenant-ID', tenantId);
    
    res.json({
      success: true,
      data: usageHistory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get API key usage history'
    });
  }
});

// Verify API key (for internal use)
export const verifyApiKey = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { key } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'API key is required'
      });
    }

    const apiKey = await ApiKeyService.verifyApiKey(key, ip, userAgent);
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key'
      });
    }
    
    res.json({
      success: true,
      data: {
        keyId: apiKey.keyId,
        tenantId: apiKey.tenantId,
        name: apiKey.name,
        permissions: apiKey.permissions,
        scopes: apiKey.scopes,
        rateLimit: apiKey.rateLimit,
        lastUsed: apiKey.lastUsed,
        usageCount: apiKey.usageCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to verify API key'
    });
  }
});
