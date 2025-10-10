// frontend/src/hooks/useTenantData.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantApiService } from '@/services/tenantApiService';
import { useTenant } from '@/contexts/TenantContext';
import { log } from '@/utils/logger';

// Query keys for consistent caching
export const TENANT_QUERY_KEYS = {
  users: (tenantId: string) => ['tenant', tenantId, 'users'],
  settings: (tenantId: string) => ['tenant', tenantId, 'settings'],
  analytics: (tenantId: string) => ['tenant', tenantId, 'analytics'],
  branding: (tenantId: string) => ['tenant', tenantId, 'branding'],
} as const;

/**
 * Hook to fetch tenant users with caching
 */
export function useTenantUsers() {
  const { tenant } = useTenant();
  
  return useQuery({
    queryKey: TENANT_QUERY_KEYS.users(tenant?._id || ''),
    queryFn: async () => {
      log.debug('Fetching tenant users');
      const response = await tenantApiService.get('/users');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch users');
      }
      return response.data;
    },
    enabled: !!tenant?._id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook to fetch tenant settings with caching
 */
export function useTenantSettings() {
  const { tenant } = useTenant();
  
  return useQuery({
    queryKey: TENANT_QUERY_KEYS.settings(tenant?._id || ''),
    queryFn: async () => {
      log.debug('Fetching tenant settings');
      const response = await tenantApiService.get('/settings');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch settings');
      }
      return response.data;
    },
    enabled: !!tenant?._id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook to fetch tenant analytics with caching
 */
export function useTenantAnalytics() {
  const { tenant } = useTenant();
  
  return useQuery({
    queryKey: TENANT_QUERY_KEYS.analytics(tenant?._id || ''),
    queryFn: async () => {
      log.debug('Fetching tenant analytics');
      const response = await tenantApiService.get('/analytics');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch analytics');
      }
      return response.data;
    },
    enabled: !!tenant?._id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook to fetch tenant branding with caching
 */
export function useTenantBranding() {
  const { tenant } = useTenant();
  
  return useQuery({
    queryKey: TENANT_QUERY_KEYS.branding(tenant?._id || ''),
    queryFn: async () => {
      log.debug('Fetching tenant branding');
      const response = await tenantApiService.get('/branding');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch branding');
      }
      return response.data;
    },
    enabled: !!tenant?._id,
    staleTime: 15 * 60 * 1000, // 15 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook to update tenant settings with cache invalidation
 */
export function useUpdateTenantSettings() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();
  
  return useMutation({
    mutationFn: async (settings: any) => {
      log.debug('Updating tenant settings');
      const response = await tenantApiService.put('/settings', settings);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update settings');
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch settings
      queryClient.invalidateQueries({
        queryKey: TENANT_QUERY_KEYS.settings(tenant?._id || '')
      });
      log.debug('Tenant settings cache invalidated');
    },
  });
}

/**
 * Hook to update tenant branding with cache invalidation
 */
export function useUpdateTenantBranding() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();
  
  return useMutation({
    mutationFn: async (branding: any) => {
      log.debug('Updating tenant branding');
      const response = await tenantApiService.put('/branding', branding);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update branding');
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch branding
      queryClient.invalidateQueries({
        queryKey: TENANT_QUERY_KEYS.branding(tenant?._id || '')
      });
      log.debug('Tenant branding cache invalidated');
    },
  });
}

/**
 * Hook to clear all tenant cache
 */
export function useClearTenantCache() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();
  
  return () => {
    if (tenant?._id) {
      // Clear all tenant-related queries
      queryClient.invalidateQueries({
        queryKey: ['tenant', tenant._id]
      });
      log.debug('All tenant cache cleared');
    }
  };
}
