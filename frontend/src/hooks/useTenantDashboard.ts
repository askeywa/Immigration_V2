import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { 
  tenantDashboardService, 
  TenantStats, 
  TenantActivity, 
  TenantAnalytics 
} from '@/services/tenantDashboardService';

// Query keys for caching
export const TENANT_DASHBOARD_KEYS = {
  stats: ['tenant-dashboard', 'stats'] as const,
  activity: ['tenant-dashboard', 'activity'] as const,
  analytics: ['tenant-dashboard', 'analytics'] as const,
  all: ['tenant-dashboard', 'all'] as const,
};

/**
 * Hook to fetch tenant dashboard statistics
 */
export function useTenantStats(): UseQueryResult<TenantStats, Error> {
  return useQuery({
    queryKey: TENANT_DASHBOARD_KEYS.stats,
    queryFn: () => tenantDashboardService.getTenantStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook to fetch tenant recent activity
 */
export function useTenantActivity(limit: number = 10): UseQueryResult<TenantActivity[], Error> {
  return useQuery({
    queryKey: [...TENANT_DASHBOARD_KEYS.activity, limit],
    queryFn: () => tenantDashboardService.getTenantActivity(limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook to fetch tenant analytics data
 */
export function useTenantAnalytics(period: string = '30d'): UseQueryResult<TenantAnalytics, Error> {
  return useQuery({
    queryKey: [...TENANT_DASHBOARD_KEYS.analytics, period],
    queryFn: () => tenantDashboardService.getTenantAnalytics(period),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook to fetch all tenant dashboard data
 */
export function useAllTenantDashboardData() {
  return useQuery({
    queryKey: TENANT_DASHBOARD_KEYS.all,
    queryFn: () => tenantDashboardService.getAllDashboardData(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook to refresh all tenant dashboard data
 */
export function useRefreshTenantDashboard() {
  const statsQuery = useTenantStats();
  const activityQuery = useTenantActivity();
  const analyticsQuery = useTenantAnalytics();

  const refreshAll = async () => {
    await Promise.all([
      statsQuery.refetch(),
      activityQuery.refetch(),
      analyticsQuery.refetch()
    ]);
  };

  return {
    refreshAll,
    isLoading: statsQuery.isLoading || activityQuery.isLoading || analyticsQuery.isLoading,
    isError: statsQuery.isError || activityQuery.isError || analyticsQuery.isError,
    error: statsQuery.error || activityQuery.error || analyticsQuery.error
  };
}
