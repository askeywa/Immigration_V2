// frontend/src/services/tenantApiService.ts
import { api } from './api';
import { log } from '@/utils/logger';


// Request deduplication cache
const _requestCache = new Map<string, Promise<any>>();
const CACHE_DURATION = 30000; // 30 seconds

const _getCacheKey = (url: string, options?: any) => {
  return `${url}:${JSON.stringify(options || {})}`;
};

const _isCacheValid = (timestamp: number) => {
  return Date.now() - timestamp < CACHE_DURATION;
};

export interface TenantApiConfig {
  tenantId?: string;
  tenantDomain?: string;
  isSuperAdmin?: boolean;
  includeTenantContext?: boolean;
}

export interface TenantApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  tenant?: {
    _id: string;
    name: string;
    domain: string;
    status: string;
  };
}

class TenantApiService {
  private currentConfig: TenantApiConfig = {};
  
  // API call deduplication
  private ongoingRequests = new Map<string, Promise<any>>();
  private lastRequestTime = new Map<string, number>();
  private cachedResponses = new Map<string, { response: any; timestamp: number }>();
  private readonly COOLDOWN_MS = 2000; // 2 seconds cooldown
  private readonly CACHE_TTL_MS = 5000; // 5 seconds cache TTL

  /**
   * Set current tenant context for API calls
   */
  setTenantContext(config: TenantApiConfig): void {
    this.currentConfig = {
      ...this.currentConfig,
      ...config,
    };
    log.debug('Tenant API context updated', { config: this.currentConfig });
  }

  /**
   * Get current tenant context
   */
  getTenantContext(): TenantApiConfig {
    return { ...this.currentConfig };
  }

  /**
   * Clear tenant context
   */
  clearTenantContext(): void {
    this.currentConfig = {};
    log.debug('Tenant API context cleared');
  }

  /**
   * Create request key for deduplication
   */
  private createRequestKey(method: string, url: string, headers: Record<string, string> = {}): string {
    return `${method}:${url}:${JSON.stringify(headers)}`;
  }

  /**
   * Check if request is in cooldown period
   */
  private isInCooldown(requestKey: string): boolean {
    const lastTime = this.lastRequestTime.get(requestKey);
    if (!lastTime) return false;
    return Date.now() - lastTime < this.COOLDOWN_MS;
  }

  /**
   * Get cached response if available and not expired
   */
  private getCachedResponse(requestKey: string): any | null {
    const cached = this.cachedResponses.get(requestKey);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.CACHE_TTL_MS) {
      this.cachedResponses.delete(requestKey);
      return null;
    }
    
    return cached.response;
  }

  /**
   * Cache response
   */
  private cacheResponse(requestKey: string, response: any): void {
    this.cachedResponses.set(requestKey, {
      response,
      timestamp: Date.now()
    });
  }

  /**
   * Build headers with tenant context
   */
  private buildHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    // Add tenant context headers
    if (this.currentConfig.includeTenantContext !== false) {
      if (this.currentConfig.tenantId) {
        headers['X-Tenant-ID'] = this.currentConfig.tenantId;
      }
      
      if (this.currentConfig.tenantDomain) {
        headers['X-Tenant-Domain'] = this.currentConfig.tenantDomain;
      }
      
      if (this.currentConfig.isSuperAdmin !== undefined) {
        headers['X-Is-Super-Admin'] = this.currentConfig.isSuperAdmin.toString();
      }
    }

    return headers;
  }

  /**
   * Build URL with tenant context
   */
  private buildUrl(endpoint: string): string {
    // If it's a super admin call, use the endpoint as-is
    if (this.currentConfig.isSuperAdmin) {
      return endpoint;
    }

    // For tenant users, prefix with tenant context if not already present
    if (this.currentConfig.tenantId && !endpoint.startsWith('/tenant/')) {
      // Check if endpoint is tenant-specific
      const tenantSpecificEndpoints = [
        '/users',
        '/profiles',
        '/reports',
        '/settings',
        '/branding',
        '/analytics',
        '/stats',
        '/recent-activity'
      ];

      const isTenantSpecific = tenantSpecificEndpoints.some((prefix: any) => 
        endpoint.startsWith(prefix)
      );

      if (isTenantSpecific) {
        return `/tenants${endpoint}`;
      }
    }

    return endpoint;
  }

  /**
   * Make a GET request with tenant context (with deduplication)
   */
  async get<T = any>(endpoint: string, config?: any): Promise<TenantApiResponse<T>> {
    try {
      const url = this.buildUrl(endpoint);
      const headers = this.buildHeaders(config?.headers);
      const requestKey = this.createRequestKey('GET', url, headers);

      // Check for cached response first
      const cachedResponse = this.getCachedResponse(requestKey);
      if (cachedResponse) {
        console.log('✅ API: Returning cached response for', endpoint);
        return cachedResponse;
      }

      // Check if request is in cooldown
      if (this.isInCooldown(requestKey)) {
        const lastCached = this.getCachedResponse(requestKey);
        if (lastCached) return lastCached;
      }

      // Check if same request is already ongoing
      if (this.ongoingRequests.has(requestKey)) {
        console.log('🔄 API: Deduplicating request for', endpoint);
        return await this.ongoingRequests.get(requestKey);
      }

      // Create new request
      const requestPromise = this.executeGetRequest<T>(url, headers, config);
      
      // Store ongoing request
      this.ongoingRequests.set(requestKey, requestPromise);
      this.lastRequestTime.set(requestKey, Date.now());

      try {
        const result = await requestPromise;
        
        // Cache successful response
        if (result.success) {
          this.cacheResponse(requestKey, result);
        }
        
        return result;
      } finally {
        // Clean up ongoing request
        this.ongoingRequests.delete(requestKey);
      }

    } catch (error: any) {
      log.error('Tenant API GET request failed', { 
        endpoint, 
        error: error.message,
        tenantId: this.currentConfig.tenantId 
      });

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Request failed',
        message: error.response?.data?.message || error.message || 'Request failed'
      };
    }
  }

  /**
   * Execute the actual GET request
   */
  private async executeGetRequest<T = any>(url: string, headers: Record<string, string>, config?: any): Promise<TenantApiResponse<T>> {
    log.debug('Tenant API GET request', { 
      endpoint: url, 
      tenantId: this.currentConfig.tenantId,
      isSuperAdmin: this.currentConfig.isSuperAdmin 
    });

    const response = await api.get<T>(url, {
      ...config,
      headers,
    });

    return {
      success: true,
      data: (response.data as any)?.data || response.data,
      tenant: this.currentConfig.tenantId ? {
        _id: this.currentConfig.tenantId,
        name: '', // Will be populated by backend
        domain: this.currentConfig.tenantDomain || '',
        status: 'active'
      } : undefined
    };
  }

  /**
   * Make a POST request with tenant context (with deduplication)
   */
  async post<T = any>(endpoint: string, data?: any, config?: any): Promise<TenantApiResponse<T>> {
    try {
      const url = this.buildUrl(endpoint);
      const headers = this.buildHeaders(config?.headers);
      const requestKey = this.createRequestKey('POST', url, headers) + ':' + JSON.stringify(data);

      console.log('🔍 API POST request:', { endpoint: url });

      // Check if same request is already ongoing (no caching for mutations)
      if (this.ongoingRequests.has(requestKey)) {
        console.log('🔄 POST request already in progress, waiting for existing request:', endpoint);
        return await this.ongoingRequests.get(requestKey);
      }

      // Create new request
      const requestPromise = this.executePostRequest<T>(url, data, headers, config);
      
      // Store ongoing request
      this.ongoingRequests.set(requestKey, requestPromise);

      try {
        const result = await requestPromise;
        return result;
      } finally {
        // Clean up ongoing request
        this.ongoingRequests.delete(requestKey);
      }

    } catch (error: any) {
      log.error('Tenant API POST request failed', { 
        endpoint, 
        error: error.message,
        tenantId: this.currentConfig.tenantId 
      });

      // Return the actual error response structure for proper handling
      if (error.response?.data) {
        return {
          success: false,
          error: error.response.data.error || 'REQUEST_FAILED',
          message: error.response.data.message || 'Request failed',
          data: error.response.data // Include the full backend response
        };
      }

      return {
        success: false,
        error: error.message || 'Request failed',
        message: error.message || 'Request failed'
      };
    }
  }

  /**
   * Execute the actual POST request
   */
  private async executePostRequest<T = any>(url: string, data: any, headers: Record<string, string>, config?: any): Promise<TenantApiResponse<T>> {
    log.debug('Tenant API POST request', { 
      endpoint: url, 
      tenantId: this.currentConfig.tenantId,
      isSuperAdmin: this.currentConfig.isSuperAdmin 
    });

    const response = await api.post<T>(url, data, {
      ...config,
      headers,
    });

    return {
      success: true,
      data: response.data,
      message: (response.data as any)?.message || 'Request successful',
      tenant: this.currentConfig.tenantId ? {
        _id: this.currentConfig.tenantId,
        name: '', // Will be populated by backend
        domain: this.currentConfig.tenantDomain || '',
        status: 'active'
      } : undefined
    };
  }

  /**
   * Make a PUT request with tenant context
   */
  async put<T = any>(endpoint: string, data?: any, config?: any): Promise<TenantApiResponse<T>> {
    try {
      const url = this.buildUrl(endpoint);
      const headers = this.buildHeaders(config?.headers);
      const requestKey = this.createRequestKey('PUT', url, headers) + ':' + JSON.stringify(data);

      console.log('🔍 API PUT request:', { endpoint: url });

      // Check if same request is already ongoing (no caching for mutations)
      if (this.ongoingRequests.has(requestKey)) {
        console.log('🔄 PUT request already in progress, waiting for existing request:', endpoint);
        return await this.ongoingRequests.get(requestKey);
      }

      // Create new request
      const requestPromise = this.executePutRequest<T>(url, data, headers, config);
      
      // Store ongoing request
      this.ongoingRequests.set(requestKey, requestPromise);

      try {
        const result = await requestPromise;
        return result;
      } finally {
        // Clean up ongoing request
        this.ongoingRequests.delete(requestKey);
      }

    } catch (error: any) {
      log.error('Tenant API PUT request failed', { 
        endpoint, 
        error: error.message,
        tenantId: this.currentConfig.tenantId 
      });

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Request failed',
        message: error.response?.data?.message || error.message || 'Request failed'
      };
    }
  }

  /**
   * Execute the actual PUT request
   */
  private async executePutRequest<T = any>(url: string, data: any, headers: Record<string, string>, config?: any): Promise<TenantApiResponse<T>> {
    log.debug('Tenant API PUT request', { 
      endpoint: url, 
      tenantId: this.currentConfig.tenantId,
      isSuperAdmin: this.currentConfig.isSuperAdmin 
    });

    const response = await api.put<T>(url, data, {
      ...config,
      headers,
    });

    return {
      success: true,
      data: response.data,
        message: (response.data as any)?.message || 'Update successful',
      tenant: this.currentConfig.tenantId ? {
        _id: this.currentConfig.tenantId,
        name: '', // Will be populated by backend
        domain: this.currentConfig.tenantDomain || '',
        status: 'active'
      } : undefined
    };
  }

  /**
   * Make a DELETE request with tenant context
   */
  async delete<T = any>(endpoint: string, config?: any): Promise<TenantApiResponse<T>> {
    try {
      const url = this.buildUrl(endpoint);
      const headers = this.buildHeaders(config?.headers);

      log.debug('Tenant API DELETE request', { 
        endpoint: url, 
        tenantId: this.currentConfig.tenantId,
        isSuperAdmin: this.currentConfig.isSuperAdmin 
      });

      const response = await api.delete<T>(url, {
        ...config,
        headers,
      });

      return {
        success: true,
        data: response.data,
        message: (response.data as any)?.message || 'Delete successful',
        tenant: this.currentConfig.tenantId ? {
          _id: this.currentConfig.tenantId,
          name: '', // Will be populated by backend
          domain: this.currentConfig.tenantDomain || '',
          status: 'active'
        } : undefined
      };

    } catch (error: any) {
      log.error('Tenant API DELETE request failed', { 
        endpoint, 
        error: error.message,
        tenantId: this.currentConfig.tenantId 
      });

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Delete failed',
        message: error.response?.data?.message || error.message || 'Delete failed'
      };
    }
  }

  /**
   * Make a PATCH request with tenant context
   */
  async patch<T = any>(endpoint: string, data?: any, config?: any): Promise<TenantApiResponse<T>> {
    try {
      const url = this.buildUrl(endpoint);
      const headers = this.buildHeaders(config?.headers);

      log.debug('Tenant API PATCH request', { 
        endpoint: url, 
        tenantId: this.currentConfig.tenantId,
        isSuperAdmin: this.currentConfig.isSuperAdmin 
      });

      const response = await api.patch<T>(url, data, {
        ...config,
        headers,
      });

      return {
        success: true,
        data: response.data,
        message: (response.data as any)?.message || 'Update successful',
        tenant: this.currentConfig.tenantId ? {
          _id: this.currentConfig.tenantId,
          name: '', // Will be populated by backend
          domain: this.currentConfig.tenantDomain || '',
          status: 'active'
        } : undefined
      };

    } catch (error: any) {
      log.error('Tenant API PATCH request failed', { 
        endpoint, 
        error: error.message,
        tenantId: this.currentConfig.tenantId 
      });

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Update failed',
        message: error.response?.data?.message || error.message || 'Update failed'
      };
    }
  }

  /**
   * Upload file with tenant context
   */
  async uploadFile<T = any>(
    endpoint: string, 
    file: File, 
    additionalData?: Record<string, any>,
    config?: any
  ): Promise<TenantApiResponse<T>> {
    try {
      const url = this.buildUrl(endpoint);
      const formData = new FormData();
      
      formData.append('file', file);
      
      // Add additional data
      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      const headers = this.buildHeaders({
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      });

      log.debug('Tenant API file upload', { 
        endpoint: url, 
        fileName: file.name,
        tenantId: this.currentConfig.tenantId 
      });

      const response = await api.post<T>(url, formData, {
        ...config,
        headers,
      });

      return {
        success: true,
        data: response.data,
        message: (response.data as any)?.message || 'File uploaded successfully',
        tenant: this.currentConfig.tenantId ? {
          _id: this.currentConfig.tenantId,
          name: '', // Will be populated by backend
          domain: this.currentConfig.tenantDomain || '',
          status: 'active'
        } : undefined
      };

    } catch (error: any) {
      log.error('Tenant API file upload failed', { 
        endpoint, 
        fileName: file.name,
        error: error.message,
        tenantId: this.currentConfig.tenantId 
      });

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'File upload failed',
        message: error.response?.data?.message || error.message || 'File upload failed'
      };
    }
  }

  /**
   * Get tenant-specific data with automatic isolation
   */
  async getTenantData<T = any>(endpoint: string, config?: any): Promise<TenantApiResponse<T>> {
    // Ensure tenant context is included
    return this.get<T>(endpoint, {
      ...config,
      headers: this.buildHeaders(config?.headers)
    });
  }

  /**
   * Create tenant-specific resource
   */
  async createTenantResource<T = any>(endpoint: string, data: any, config?: any): Promise<TenantApiResponse<T>> {
    // Ensure tenant context is included
    return this.post<T>(endpoint, data, {
      ...config,
      headers: this.buildHeaders(config?.headers)
    });
  }

  /**
   * Update tenant-specific resource
   */
  async updateTenantResource<T = any>(endpoint: string, data: any, config?: any): Promise<TenantApiResponse<T>> {
    // Ensure tenant context is included
    return this.put<T>(endpoint, data, {
      ...config,
      headers: this.buildHeaders(config?.headers)
    });
  }

  // Super Admin Methods
  /**
   * Get all tenants (Super Admin only)
   */
  async getAllTenants(page: number = 1, limit: number = 10, cacheBuster?: number): Promise<TenantApiResponse<{ tenants: any[] }> & { pagination?: any }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    // Add cache-busting parameter if provided
    if (cacheBuster) {
      params.append('_t', cacheBuster.toString());
    }
    
    try {
      const response = await this.get<{ tenants: any[] }>(`/super-admin/tenants?${params.toString()}`);
      
      // The API response includes pagination data, but the get method strips it
      // We need to make a direct API call to get the full response with pagination
      const endpoint = `/super-admin/tenants?${params.toString()}`;
      
      // Get the API base URL from the environment
      const apiBaseUrl = import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://ibuyscrap.ca/api';
      const url = `${apiBaseUrl}${endpoint}`;
      const headers = this.buildHeaders();
      
      // Get the token from sessionStorage (auth store uses sessionStorage)
      const authStorage = sessionStorage.getItem('auth-storage');
      let token = '';
      if (authStorage) {
        try {
          const authData = JSON.parse(authStorage);
          token = authData.state?.token || '';
        } catch (e) {
          console.warn('Failed to parse auth storage');
        }
      }
      
      const fullResponse = await fetch(url, {
        method: 'GET',
        headers: {
          ...headers,
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!fullResponse.ok) {
        throw new Error(`HTTP error! status: ${fullResponse.status}`);
      }
      
      const fullData = await fullResponse.json();
      console.log('🔍 TenantApiService: Full API response with pagination:', fullData);
      
      return {
        ...response,
        pagination: fullData.pagination
      };
    } catch (error) {
      console.error('❌ TenantApiService: Error in getAllTenants:', error);
      throw error;
    }
  }

  /**
   * Delete a user (Super Admin only)
   */
  async deleteUser(userId: string): Promise<TenantApiResponse<any>> {
    const result = await this.delete(`/super-admin/users/${userId}`);
    
    // Clear user-related caches after successful deletion
    if (result.success) {
      this.clearUserCaches();
    }
    
    return result;
  }

  /**
   * Clear user-related caches
   */
  private clearUserCaches(): void {
    const keysToDelete: string[] = [];
    
    // Find all cache keys that contain '/users'
    for (const key of this.cachedResponses.keys()) {
      if (key.includes('/users')) {
        keysToDelete.push(key);
      }
    }
    
    // Delete the cached responses
    keysToDelete.forEach(key => {
      this.cachedResponses.delete(key);
      this.lastRequestTime.delete(key);
    });
    
    console.log(`🗑️ TenantApiService: Cleared ${keysToDelete.length} user-related caches`);
  }

  /**
   * Get all users across all tenants (Super Admin only)
   */
  async getAllUsers(page: number = 1, limit: number = 10, cacheBuster?: number): Promise<TenantApiResponse<{ users: any[] }> & { pagination?: any }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    // Add cache-busting parameter if provided
    if (cacheBuster) {
      params.append('_t', cacheBuster.toString());
    }
    
    try {
      const response = await this.get<{ users: any[] }>(`/super-admin/users?${params.toString()}`);
      
      // The API response includes pagination data, but the get method strips it
      // We need to make a direct API call to get the full response with pagination
      const endpoint = `/super-admin/users?${params.toString()}`;
      
      // Get the API base URL from the environment
      const apiBaseUrl = import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://ibuyscrap.ca/api';
      const url = `${apiBaseUrl}${endpoint}`;
      const headers = this.buildHeaders();
      
      // Get the token from sessionStorage (auth store uses sessionStorage)
      const authStorage = sessionStorage.getItem('auth-storage');
      let token = '';
      if (authStorage) {
        try {
          const authData = JSON.parse(authStorage);
          token = authData.state?.token || '';
        } catch (e) {
          console.warn('Failed to parse auth storage');
        }
      }
      
      const fullResponse = await fetch(url, {
        method: 'GET',
        headers: {
          ...headers,
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!fullResponse.ok) {
        throw new Error(`HTTP error! status: ${fullResponse.status}`);
      }
      
      const fullData = await fullResponse.json();
      console.log('🔍 TenantApiService: Full users API response with pagination:', fullData);
      
      return {
        ...response,
        pagination: fullData.pagination
      };
    } catch (error) {
      console.error('❌ TenantApiService: Error in getAllUsers:', error);
      throw error;
    }
  }

  /**
   * Get system reports (Super Admin only)
   */
  async getSystemReports(params: { dateRange: string }): Promise<TenantApiResponse<any>> {
    return this.get<any>('/super-admin/reports', { params });
  }

  /**
   * Export system report (Super Admin only)
   */
  async exportSystemReport(params: { format: string; dateRange: string }): Promise<any> {
    return this.get('/super-admin/reports/export', { 
      params,
      responseType: 'blob'
    });
  }

  /**
   * Get system analytics (Super Admin only)
   */
  async getSystemAnalytics(params: { range: string }): Promise<TenantApiResponse<any>> {
    return this.get<any>('/super-admin/analytics', { params });
  }

  /**
   * Delete tenant-specific resource
   */
  async deleteTenantResource<T = any>(endpoint: string, config?: any): Promise<TenantApiResponse<T>> {
    // Ensure tenant context is included
    return this.delete<T>(endpoint, {
      ...config,
      headers: this.buildHeaders(config?.headers)
    });
  }

  /**
   * Update tenant (Super Admin only)
   */
  async updateTenant<T = any>(tenantId: string, data: any): Promise<TenantApiResponse<T>> {
    return this.put<T>(`/super-admin/tenants/${tenantId}`, data);
  }

  /**
   * Get tenant by ID (Super Admin only)
   */
  async getTenantById<T = any>(tenantId: string): Promise<TenantApiResponse<T>> {
    return this.get<T>(`/super-admin/tenants/${tenantId}`);
  }

  /**
   * Get tenant users (Super Admin only)
   */
  async getTenantUsers<T = any>(tenantId: string): Promise<TenantApiResponse<T>> {
    return this.get<T>(`/super-admin/tenants/${tenantId}/users`);
  }
}

// Export singleton instance
export const tenantApiService = new TenantApiService();
export default tenantApiService;
