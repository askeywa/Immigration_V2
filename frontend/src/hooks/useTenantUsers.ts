import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { 
  tenantUserService, 
  UserFilters, 
  TenantUser, 
  UserStats, 
  UserActivity,
  BulkUpdateRequest,
  BulkUpdateResponse
} from '@/services/tenantUserService';

// Query keys for caching
export const TENANT_USERS_KEYS = {
  all: ['tenant-users'] as const,
  lists: () => [...TENANT_USERS_KEYS.all, 'list'] as const,
  list: (filters: UserFilters) => [...TENANT_USERS_KEYS.lists(), filters] as const,
  stats: () => [...TENANT_USERS_KEYS.all, 'stats'] as const,
  activity: (userId: string) => [...TENANT_USERS_KEYS.all, 'activity', userId] as const,
};

/**
 * Hook to fetch tenant users with filtering and pagination
 */
export function useTenantUsers(filters: UserFilters = {}): UseQueryResult<{
  users: TenantUser[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}, Error> {
  return useQuery({
    queryKey: TENANT_USERS_KEYS.list(filters),
    queryFn: () => tenantUserService.getUsers(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook to fetch user statistics
 */
export function useUserStats(): UseQueryResult<UserStats, Error> {
  return useQuery({
    queryKey: TENANT_USERS_KEYS.stats(),
    queryFn: () => tenantUserService.getUserStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook to fetch user activity
 */
export function useUserActivity(userId: string, limit: number = 20): UseQueryResult<UserActivity[], Error> {
  return useQuery({
    queryKey: TENANT_USERS_KEYS.activity(userId),
    queryFn: () => tenantUserService.getUserActivity(userId, limit),
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!userId, // Only run query if userId is provided
  });
}

/**
 * Hook for bulk user operations
 */
export function useBulkUpdateUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: BulkUpdateRequest) => tenantUserService.bulkUpdateUsers(request),
    onSuccess: (data: BulkUpdateResponse) => {
      // Invalidate and refetch user lists and stats
      queryClient.invalidateQueries({ queryKey: TENANT_USERS_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: TENANT_USERS_KEYS.stats() });
      
      console.log(`Bulk update successful: ${data.message}`);
    },
    onError: (error) => {
      console.error('Bulk update failed:', error);
    },
  });
}

/**
 * Hook to refresh all user data
 */
export function useRefreshUserData() {
  const queryClient = useQueryClient();

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: TENANT_USERS_KEYS.lists() }),
      queryClient.invalidateQueries({ queryKey: TENANT_USERS_KEYS.stats() })
    ]);
  };

  const refreshUserList = async (filters?: UserFilters) => {
    if (filters) {
      await queryClient.invalidateQueries({ queryKey: TENANT_USERS_KEYS.list(filters) });
    } else {
      await queryClient.invalidateQueries({ queryKey: TENANT_USERS_KEYS.lists() });
    }
  };

  const refreshUserStats = async () => {
    await queryClient.invalidateQueries({ queryKey: TENANT_USERS_KEYS.stats() });
  };

  const refreshUserActivity = async (userId: string) => {
    await queryClient.invalidateQueries({ queryKey: TENANT_USERS_KEYS.activity(userId) });
  };

  return {
    refreshAll,
    refreshUserList,
    refreshUserStats,
    refreshUserActivity
  };
}

/**
 * Hook to prefetch user data
 */
export function usePrefetchUserData() {
  const queryClient = useQueryClient();

  const prefetchUsers = (filters: UserFilters) => {
    queryClient.prefetchQuery({
      queryKey: TENANT_USERS_KEYS.list(filters),
      queryFn: () => tenantUserService.getUsers(filters),
      staleTime: 2 * 60 * 1000,
    });
  };

  const prefetchUserStats = () => {
    queryClient.prefetchQuery({
      queryKey: TENANT_USERS_KEYS.stats(),
      queryFn: () => tenantUserService.getUserStats(),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchUserActivity = (userId: string) => {
    queryClient.prefetchQuery({
      queryKey: TENANT_USERS_KEYS.activity(userId),
      queryFn: () => tenantUserService.getUserActivity(userId),
      staleTime: 1 * 60 * 1000,
    });
  };

  return {
    prefetchUsers,
    prefetchUserStats,
    prefetchUserActivity
  };
}
