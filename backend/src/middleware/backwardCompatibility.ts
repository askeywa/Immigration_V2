// backend/src/middleware/backwardCompatibility.ts
import { Request, Response, NextFunction } from 'express';
import { log } from '../utils/logger';

interface LegacyRequest extends Request {
  body: any;
  query: any;
  params: any;
}

/**
 * Backward Compatibility Middleware
 * Ensures no breaking changes to existing functionality
 */
export const backwardCompatibility = (req: LegacyRequest, res: Response, next: NextFunction) => {
  try {
    // API Version Detection
    const apiVersion = (req as any).headers['api-version'] || (req as any).query.version || 'v1';
    (req as any).apiVersion = apiVersion as string;

    // Legacy endpoint mapping
    if ((req as any).path.startsWith('/api/v1/') && apiVersion === 'v2') {
      (req as any).url = (req as any).url.replace('/api/v1/', '/api/v2/');
      log.info('Legacy endpoint mapped', { 
        originalPath: (req as any).path, 
        newPath: (req as any).path,
        apiVersion 
      });
    }

    // Legacy parameter mapping
    if (apiVersion === 'v1') {
      // Map old parameter names to new ones
      const legacyMappings = {
        'user_id': 'userId',
        'tenant_id': 'tenantId',
        'doc_id': 'documentId',
        'profile_id': 'profileId'
      };

      // Update query parameters
      Object.keys(legacyMappings).forEach((legacyKey: any) => {
        if ((req as any).query[legacyKey]) {
          const newKey = legacyMappings[legacyKey as keyof typeof legacyMappings];
          (req as any).query[newKey] = (req as any).query[legacyKey];
          delete (req as any).query[legacyKey];
          log.info('Legacy query parameter mapped', { legacyKey, newKey });
        }
      });

      // Update body parameters
      if ((req as any).body && typeof (req as any).body === 'object') {
        Object.keys(legacyMappings).forEach((legacyKey: any) => {
          if ((req as any).body[legacyKey]) {
            const newKey = legacyMappings[legacyKey as keyof typeof legacyMappings];
            (req as any).body[newKey] = (req as any).body[legacyKey];
            delete (req as any).body[legacyKey];
            log.info('Legacy body parameter mapped', { legacyKey, newKey });
          }
        });
      }
    }

    // Legacy response format compatibility
    const originalJson = (res as any).json;
    (res as any).json = function(body: any) {
      if (apiVersion === 'v1') {
        // Transform response to legacy format
        const legacyResponse = transformToLegacyFormat(body, (req as any).path);
        log.info('Response transformed to legacy format', { 
          path: (req as any).path, 
          apiVersion 
        });
        return originalJson.call(this, legacyResponse);
      }
      return originalJson.call(this, body);
    };

    next();
  } catch (error) {
    log.error('Backward compatibility middleware error', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
    next(error);
  }
};

/**
 * Transform modern response format to legacy format
 */
function transformToLegacyFormat(response: any, path: string): any {
  if (!response || typeof response !== 'object') {
    return response;
  }

  // Legacy user format
  if (path.includes('/users') && (response as any).data) {
    return {
      success: (response as any).success !== false,
      message: (response as any).message || 'Success',
      data: Array.isArray((response as any).data) 
        ? (response as any).data.map(transformUserToLegacy)
        : transformUserToLegacy((response as any).data),
      pagination: (response as any).pagination
    };
  }

  // Legacy tenant format
  if (path.includes('/tenants') && (response as any).data) {
    return {
      success: (response as any).success !== false,
      message: (response as any).message || 'Success',
      data: Array.isArray((response as any).data) 
        ? (response as any).data.map(transformTenantToLegacy)
        : transformTenantToLegacy((response as any).data)
    };
  }

  // Default legacy format
  return {
    success: (response as any).success !== false,
    message: (response as any).message || 'Success',
    data: (response as any).data || response,
    ...((response as any).pagination && { pagination: (response as any).pagination })
  };
}

/**
 * Transform user object to legacy format
 */
function transformUserToLegacy(user: any): any {
  if (!user) return user;

  return {
    id: (user as any)._id || (user as any).id,
    email: (user as any).email,
    firstName: (user as any).firstName,
    lastName: (user as any).lastName,
    role: (user as any).role,
    tenantId: (user as any).tenantId,
    isActive: (user as any).isActive,
    createdAt: (user as any).createdAt,
    updatedAt: (user as any).updatedAt,
    // Legacy profile fields
    profile: (user as any).profile ? {
      phone: (user as any).profile.phone,
      address: (user as any).profile.address,
      bio: (user as any).profile.bio,
      avatar: (user as any).profile.avatar
    } : null
  };
}

/**
 * Transform tenant object to legacy format
 */
function transformTenantToLegacy(tenant: any): any {
  if (!tenant) return tenant;

  return {
    id: (tenant as any)._id || (tenant as any).id,
    name: (tenant as any).name,
    domain: (tenant as any).domain,
    email: (tenant as any).email,
    status: (tenant as any).status,
    type: (tenant as any).type,
    createdAt: (tenant as any).createdAt,
    updatedAt: (tenant as any).updatedAt,
    // Legacy settings
    settings: (tenant as any).settings ? {
      timezone: (tenant as any).settings.timezone,
      language: (tenant as any).settings.language
    } : null
  };
}

/**
 * Legacy endpoint handler for deprecated routes
 */
export const legacyEndpointHandler = (newPath: string, method: string = 'GET') => {
  return (req: Request, res: Response, next: NextFunction) => {
    log.warn('Legacy endpoint accessed', { 
      path: (req as any).path, 
      method: (req as any).method,
      newPath,
      userAgent: (req as any).get('User-Agent'),
      ip: (req as any).ip
    });

    // Add deprecation header
    (res as any).set('X-API-Deprecated', 'true');
    (res as any).set('X-API-New-Endpoint', newPath);
    (res as any).set('X-API-Deprecation-Date', '2024-12-31');

    // Continue to new endpoint
    (req as any).url = newPath;
    next();
  };
};

/**
 * API version validation
 */
export const apiVersionValidator = (supportedVersions: string[] = ['v1', 'v2']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiVersion = (req as any).headers['api-version'] || (req as any).query.version || 'v1';
    
    if (!supportedVersions.includes(apiVersion as string)) {
      return (res as any).status(400).json({
        success: false,
        message: `Unsupported API version: ${apiVersion}`,
        supportedVersions,
        currentVersion: apiVersion
      });
    }

    next();
  };
};

/**
 * Feature flag compatibility
 */
export const featureFlagCompatibility = (req: Request, res: Response, next: NextFunction) => {
  const apiVersion = (req as any).apiVersion || 'v1';
  
  // Disable new features for legacy API versions
  if (apiVersion === 'v1') {
    (req as any).featureFlags = {
      advancedSearch: false,
      bulkOperations: false,
      realTimeNotifications: false,
      advancedAnalytics: false
    };
  } else {
    (req as any).featureFlags = {
      advancedSearch: true,
      bulkOperations: true,
      realTimeNotifications: true,
      advancedAnalytics: true
    };
  }

  next();
};

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      apiVersion?: string;
      featureFlags?: {
        advancedSearch: boolean;
        bulkOperations: boolean;
        realTimeNotifications: boolean;
        advancedAnalytics: boolean;
      };
    }
  }
}
