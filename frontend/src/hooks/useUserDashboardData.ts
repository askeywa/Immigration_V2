// frontend/src/hooks/useUserDashboardData.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { log } from '@/utils/logger';

// Query keys for User Dashboard data
export const USER_DASHBOARD_QUERY_KEYS = {
  progress: () => ['userDashboard', 'progress'] as const,
  profile: () => ['userDashboard', 'profile'] as const,
  dashboard: () => ['userDashboard', 'all'] as const,
} as const;

/**
 * Hook to fetch user progress data with caching
 */
export function useUserProgress() {
  return useQuery({
    queryKey: USER_DASHBOARD_QUERY_KEYS.progress(),
    queryFn: async () => {
      log.debug('Fetching user progress');
      console.log('🔍 Frontend: Calling /api/profiles/progress');
      
      // Get token from sessionStorage
      const authStorage = sessionStorage.getItem('auth-storage');
      let currentToken = null;
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage);
          currentToken = parsed.state?.token;
        } catch (error) {
          console.error('Failed to parse auth storage:', error);
        }
      }
      
      const headers = {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch('/api/profiles/progress', { headers });
      
      if (!response.ok) {
        throw new Error('Failed to fetch progress data');
      }
      
      const result = await response.json();
      console.log('🔍 Frontend: Progress response:', result.success ? 'SUCCESS' : 'FAILED');
      
      return result.data || { completionPercentage: 0, completedSections: 0, totalSections: 10 };
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook to fetch user profile data with caching
 */
export function useUserProfile() {
  return useQuery({
    queryKey: USER_DASHBOARD_QUERY_KEYS.profile(),
    queryFn: async () => {
      log.debug('Fetching user profile');
      console.log('🔍 Frontend: Calling /api/profiles');
      
      // Get token from sessionStorage
      const authStorage = sessionStorage.getItem('auth-storage');
      let currentToken = null;
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage);
          currentToken = parsed.state?.token;
        } catch (error) {
          console.error('Failed to parse auth storage:', error);
        }
      }
      
      const headers = {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch('/api/profiles', { headers });
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile data');
      }
      
      const result = await response.json();
      console.log('🔍 Frontend: Profile response:', result.success ? 'SUCCESS' : 'FAILED');
      
      return result.data || null;
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook to fetch all user dashboard data with caching
 */
export function useUserDashboard() {
  const progressQuery = useUserProgress();
  const profileQuery = useUserProfile();

  return {
    progress: progressQuery.data,
    profile: profileQuery.data,
    isLoading: progressQuery.isLoading || profileQuery.isLoading,
    error: progressQuery.error || profileQuery.error,
    refetch: () => {
      progressQuery.refetch();
      profileQuery.refetch();
    },
  };
}

/**
 * Hook to invalidate user dashboard cache (use after profile updates)
 */
export function useInvalidateUserDashboard() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: USER_DASHBOARD_QUERY_KEYS.dashboard() });
    queryClient.invalidateQueries({ queryKey: USER_DASHBOARD_QUERY_KEYS.progress() });
    queryClient.invalidateQueries({ queryKey: USER_DASHBOARD_QUERY_KEYS.profile() });
  };
}

