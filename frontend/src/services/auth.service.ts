// frontend/src/services/auth.service.ts
import { api } from './api';
import { superAdminApi } from './superAdminApi';
import { LoginResponse, RegisterRequest, RegisterResponse, Tenant } from '@/types/auth.types';

export const authService = {
  login: async (email: string, password: string, tenantDomain?: string): Promise<LoginResponse> => {
    console.log('🔍 AuthService: Making API call to /auth/login');
    console.log('🔍 AuthService: Request data:', { email, password: '[HIDDEN]', tenantDomain });
    console.log('🔍 AuthService: Environment check:', {
      mode: import.meta.env.MODE,
      dev: import.meta.env.DEV,
      hostname: window.location.hostname,
      fullUrl: window.location.href
    });
    
    try {
      // Determine if this is a super admin login or tenant login
      const isSuperAdminLogin = !tenantDomain || tenantDomain === '' || email.includes('superadmin');
      
      console.log('🔍 AuthService: Login type:', { 
        isSuperAdminLogin, 
        tenantDomain, 
        email,
        willUseApi: isSuperAdminLogin ? 'superAdminApi (/api)' : 'tenantApi (/api/v1)'
      });
      
      let response;
      
      if (isSuperAdminLogin) {
        // Super admin login - use /api/auth/login
        console.log('🔍 AuthService: Using super admin API:', superAdminApi.defaults.baseURL);
        response = await superAdminApi.post<LoginResponse>('/auth/login', {
          email,
          password,
          tenantDomain: tenantDomain || '',
        });
      } else {
        // Tenant login - use /api/v1/tenant/auth/login
        console.log('🔍 AuthService: Using tenant API:', api.defaults.baseURL);
        response = await api.post<LoginResponse>('/tenant/auth/login', {
          email,
          password,
          tenantDomain: tenantDomain || '',
        });
      }
      
      console.log('🔍 AuthService: API response received:', {
        success: response.data.success,
        user: response.data.data?.user?.email,
        tenant: response.data.data?.tenant?.name,
        subscription: response.data.data?.subscription?.status
      });
      return response.data;
    } catch (error) {
      console.error('❌ AuthService: API call failed:', error);
      throw error;
    }
  },

  register: async (userData: RegisterRequest): Promise<RegisterResponse> => {
    console.log('🔍 AuthService: Making API call to /auth/register');
    console.log('🔍 AuthService: Request data:', { 
      ...userData, 
      password: '[HIDDEN]',
      companyName: userData.companyName,
      domain: userData.domain,
      tenantId: userData.tenantId
    });
    console.log('🔍 AuthService: API base URL:', '/api');
    
    try {
      const response = await api.post<RegisterResponse>('/auth/register', userData);
      console.log('🔍 AuthService: API response received:', {
        success: response.data.success,
        user: response.data.data?.user?.email,
        tenant: response.data.data?.tenant?.name,
        subscription: response.data.data?.subscription?.status
      });
      return response.data;
    } catch (error) {
      console.error('❌ AuthService: API call failed:', error);
      throw error;
    }
  },

  // Get user's tenants (for users who belong to multiple tenants)
  getUserTenants: async (): Promise<Tenant[]> => {
    try {
      const response = await api.get('/auth/tenants');
      return response.data.data?.tenants || [];
    } catch (error) {
      console.error('❌ AuthService: Failed to get user tenants:', error);
      throw error;
    }
  },

  // Switch to a different tenant context
  switchTenant: async (tenantId: string): Promise<LoginResponse> => {
    try {
      const response = await api.post<LoginResponse>('/auth/switch-tenant', { tenantId });
      return response.data;
    } catch (error) {
      console.error('❌ AuthService: Failed to switch tenant:', error);
      throw error;
    }
  },

  // Get current user's permissions
  getUserPermissions: async (): Promise<string[]> => {
    try {
      const response = await api.get('/auth/permissions');
      return response.data.data?.permissions || [];
    } catch (error) {
      console.error('❌ AuthService: Failed to get user permissions:', error);
      return [];
    }
  },

  // Refresh token with current tenant context
  refreshToken: async (): Promise<LoginResponse> => {
    try {
      const response = await api.post<LoginResponse>('/auth/refresh');
      return response.data;
    } catch (error) {
      console.error('❌ AuthService: Failed to refresh token:', error);
      throw error;
    }
  },
};