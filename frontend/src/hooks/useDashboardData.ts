// frontend/src/hooks/useDashboardData.ts
import { useQuery } from '@tanstack/react-query';
import { tenantApiService } from '@/services/tenantApiService';
import { useTenant } from '@/contexts/TenantContext';
import { log } from '@/utils/logger';

// Query keys for dashboard data
export const DASHBOARD_QUERY_KEYS = {
  stats: (tenantId: string) => ['dashboard', tenantId, 'stats'],
  activity: (tenantId: string) => ['dashboard', tenantId, 'activity'],
} as const;

/**
 * Hook to fetch tenant dashboard stats with caching
 */
export function useTenantStats() {
  const { tenant } = useTenant();
  
  console.log('🔍 useTenantStats hook called, tenant:', tenant?._id);
  
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.stats(tenant?._id || ''),
    queryFn: async () => {
      log.debug('Fetching tenant stats');
      console.log('🔍 Frontend: Calling /tenant/stats');
      const response = await tenantApiService.get('/tenant/stats');
      console.log('🔍 Frontend: Stats response:', response.success ? 'SUCCESS' : 'FAILED');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch tenant stats');
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
 * Hook to fetch tenant recent activity with caching
 */
export function useTenantActivity() {
  const { tenant } = useTenant();
  
  console.log('🔍 useTenantActivity hook called, tenant:', tenant?._id);
  
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.activity(tenant?._id || ''),
    queryFn: async () => {
      log.debug('Fetching tenant activity');
      console.log('🔍 Frontend: Calling /tenant/recent-activity');
      const response = await tenantApiService.get('/tenant/recent-activity');
      console.log('🔍 Frontend: Activity response:', response.success ? 'SUCCESS' : 'FAILED');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch tenant activity');
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
