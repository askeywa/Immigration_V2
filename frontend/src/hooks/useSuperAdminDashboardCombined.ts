// frontend/src/hooks/useSuperAdminDashboardCombined.ts
import { useQuery } from '@tanstack/react-query';
import { superAdminApi } from '../services/superAdminApi';

// Combined dashboard data interface
export interface CombinedDashboardData {
  tenants: any[];
  tenantsPagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  analytics: {
    systemHealth: {
      status: string;
      uptime: number;
      responseTime: number;
      errorRate: number;
    };
    userActivity: {
      totalUsers: number;
      activeUsers: number;
      dailyActiveUsers: number;
      weeklyActiveUsers: number;
      monthlyActiveUsers: number;
      newUsersToday: number;
      newUsersThisWeek: number;
    };
    tenantActivity: {
      totalTenants: number;
      activeTenants: number;
      trialTenants: number;
      subscriptionMetrics: {
        totalSubscriptions: number;
        activeSubscriptions: number;
        conversionRate: number;
      };
    };
    performance: {
      averageResponseTime: number;
      peakResponseTime: number;
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
    };
    revenue: {
      totalRevenue: number;
      monthlyRevenue: number;
      revenueGrowth: Array<{
        date: string;
        amount: number;
      }>;
    };
  };
  users: any[];
  usersPagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  reports: {
    reports: any[];
    summary: any;
  };
  loadedAt: string;
  performance: {
    totalQueries: number;
    parallelExecution: boolean;
    cacheEnabled: boolean;
  };
}

/**
 * 🚀 OPTIMIZED: Combined Dashboard Hook
 * Uses single API call instead of 4 separate calls
 * 
 * Benefits:
 * - Single network request instead of 4
 * - Parallel data processing on backend
 * - Better caching (single cache entry)
 * - Faster loading times
 * - Reduced server load
 */
export function useSuperAdminDashboardCombined() {
  return useQuery<CombinedDashboardData>({
    queryKey: ['super-admin', 'dashboard', 'combined'],
    queryFn: async () => {
      console.log('🚀 Loading combined dashboard data...');
      const response = await superAdminApi.get('/super-admin/dashboard/combined');
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to load dashboard data');
      }
      
      console.log('✅ Combined dashboard data loaded successfully');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - matches backend cache
    cacheTime: 15 * 60 * 1000, // 15 minutes - React Query v4 compatible
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * 🎯 OPTIMIZED: Individual Dashboard Sections Hook
 * For components that only need specific data sections
 */
export function useSuperAdminDashboardSection(section: 'tenants' | 'analytics' | 'users' | 'reports') {
  const { data, ...rest } = useSuperAdminDashboardCombined();
  
  const sectionData = data ? {
    tenants: data.tenants,
    analytics: data.analytics,
    users: data.users,
    reports: data.reports,
  }[section] : undefined;
  
  return {
    data: sectionData,
    ...rest
  };
}

/**
 * 🎯 OPTIMIZED: Dashboard Metrics Hook
 * For components that only need analytics metrics
 */
export function useSuperAdminDashboardMetrics() {
  const { data, isLoading, error } = useSuperAdminDashboardCombined();
  
  const metrics = data ? {
    systemHealth: data.analytics.systemHealth,
    userActivity: data.analytics.userActivity,
    tenantActivity: data.analytics.tenantActivity,
    performance: data.analytics.performance,
    revenue: data.analytics.revenue,
    loadedAt: data.loadedAt,
    cacheInfo: data.performance
  } : undefined;
  
  return {
    data: metrics,
    isLoading,
    error,
    isSuccess: !!data
  };
}

/**
 * 🎯 OPTIMIZED: Dashboard Tables Hook
 * For components that only need table data
 */
export function useSuperAdminDashboardTables() {
  const { data, isLoading, error } = useSuperAdminDashboardCombined();
  
  const tables = data ? {
    tenants: {
      data: data.tenants,
      pagination: data.tenantsPagination
    },
    users: {
      data: data.users,
      pagination: data.usersPagination
    },
    reports: data.reports
  } : undefined;
  
  return {
    data: tables,
    isLoading,
    error,
    isSuccess: !!data
  };
}
