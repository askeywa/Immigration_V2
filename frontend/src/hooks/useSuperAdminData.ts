// frontend/src/hooks/useSuperAdminData.ts
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { log } from '@/utils/logger';
import superAdminApi from '@/services/superAdminApi';

// Query keys for Super Admin data
export const SUPER_ADMIN_QUERY_KEYS = {
  tenants: () => ['superAdmin', 'tenants'] as const,
  tenant: (id: string) => ['superAdmin', 'tenants', id] as const,
  users: () => ['superAdmin', 'users'] as const,
  user: (id: string) => ['superAdmin', 'users', id] as const,
  reports: () => ['superAdmin', 'reports'] as const,
  analytics: () => ['superAdmin', 'analytics'] as const,
  dashboard: () => ['superAdmin', 'dashboard'] as const,
  dashboardCritical: () => ['superAdmin', 'dashboard', 'critical'] as const,
  dashboardSecondary: () => ['superAdmin', 'dashboard', 'secondary'] as const,
} as const;

/**
 * Hook to fetch all tenants with caching
 */
export function useSuperAdminTenants() {
  return useQuery({
    queryKey: SUPER_ADMIN_QUERY_KEYS.tenants(),
    queryFn: async () => {
      log.debug('Fetching super admin tenants');
      console.log('🔍 Frontend: Calling /super-admin/tenants');
      const response = await superAdminApi.get('/super-admin/tenants');
      console.log('✅ Frontend: Tenants response:', response.data);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook to fetch single tenant by ID
 */
export function useSuperAdminTenant(tenantId: string | undefined) {
  return useQuery({
    queryKey: SUPER_ADMIN_QUERY_KEYS.tenant(tenantId || ''),
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant ID is required');
      log.debug('Fetching tenant by ID', { tenantId });
      const response = await superAdminApi.get(`/super-admin/tenants/${tenantId}`);
      return response.data;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook to fetch all users with caching
 */
export function useSuperAdminUsers() {
  return useQuery({
    queryKey: SUPER_ADMIN_QUERY_KEYS.users(),
    queryFn: async () => {
      log.debug('Fetching super admin users');
      console.log('🔍 Frontend: Calling /super-admin/users');
      const response = await superAdminApi.get('/super-admin/users');
      console.log('✅ Frontend: Users response:', response.data);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook to fetch system reports with caching
 */
export function useSuperAdminReports() {
  return useQuery({
    queryKey: SUPER_ADMIN_QUERY_KEYS.reports(),
    queryFn: async () => {
      log.debug('Fetching super admin reports');
      console.log('🔍 Frontend: Calling /super-admin/reports');
      const response = await superAdminApi.get('/super-admin/reports');
      console.log('✅ Frontend: Reports response:', response.data);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook to fetch system analytics with caching
 */
export function useSuperAdminAnalytics() {
  return useQuery({
    queryKey: SUPER_ADMIN_QUERY_KEYS.analytics(),
    queryFn: async () => {
      log.debug('Fetching super admin analytics');
      console.log('🔍 Frontend: Calling /super-admin/analytics');
      const response = await superAdminApi.get('/super-admin/analytics');
      console.log('✅ Frontend: Analytics response:', response.data);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * 🚀 OPTIMIZED: Progressive Dashboard Hook
 * Loads data in parallel but renders progressively for better UX
 * 
 * Strategy:
 * 1. All 4 APIs load in parallel (fastest network usage)
 * 2. Critical data (tenants + analytics) renders first with skeletons
 * 3. Secondary data (users + reports) renders as it arrives
 * 4. React Query cache works perfectly on return visits (instant!)
 */
export function useSuperAdminDashboardProgressive() {
  // Stage 1: Critical data (loads first - highest priority)
  const criticalQueries = useQueries({
    queries: [
      {
        queryKey: SUPER_ADMIN_QUERY_KEYS.tenants(),
        queryFn: async () => {
          console.log('🎯 Stage 1: Loading tenants (critical)');
          const response = await superAdminApi.get('/super-admin/tenants');
          return response.data;
        },
        staleTime: 5 * 60 * 1000,
        cacheTime: 15 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
      {
        queryKey: SUPER_ADMIN_QUERY_KEYS.analytics(),
        queryFn: async () => {
          console.log('🎯 Stage 1: Loading analytics (critical)');
          const response = await superAdminApi.get('/super-admin/analytics');
          return response.data;
        },
        staleTime: 5 * 60 * 1000,
        cacheTime: 15 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
    ],
  });

  const [tenantsQuery, analyticsQuery] = criticalQueries;
  const criticalLoaded = tenantsQuery.isSuccess && analyticsQuery.isSuccess;

  // Stage 2: Secondary data (loads in parallel, renders after critical via skeletons)
  const secondaryQueries = useQueries({
    queries: [
      {
        queryKey: SUPER_ADMIN_QUERY_KEYS.users(),
        queryFn: async () => {
          console.log('📊 Loading users (parallel)');
          const response = await superAdminApi.get('/super-admin/users');
          return response.data;
        },
        staleTime: 5 * 60 * 1000,
        cacheTime: 15 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
      {
        queryKey: SUPER_ADMIN_QUERY_KEYS.reports(),
        queryFn: async () => {
          console.log('📊 Loading reports (parallel)');
          const response = await superAdminApi.get('/super-admin/reports');
          return response.data;
        },
        staleTime: 5 * 60 * 1000,
        cacheTime: 15 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
    ],
  });

  const [usersQuery, reportsQuery] = secondaryQueries;

  // Combined loading states
  const isInitialLoading = tenantsQuery.isLoading || analyticsQuery.isLoading;
  const isCriticalLoading = !criticalLoaded;
  const isSecondaryLoading = usersQuery.isLoading || reportsQuery.isLoading;
  const isFullyLoaded = criticalLoaded && usersQuery.isSuccess && reportsQuery.isSuccess;

  // Error handling
  const error = 
    tenantsQuery.error || 
    analyticsQuery.error || 
    usersQuery.error || 
    reportsQuery.error;

  // Refetch all data
  const refetch = async () => {
    console.log('🔄 Refetching all dashboard data');
    await Promise.all([
      tenantsQuery.refetch(),
      analyticsQuery.refetch(),
      usersQuery.refetch(),
      reportsQuery.refetch(),
    ]);
  };

  return {
    // Data
    data: {
      tenants: tenantsQuery.data,
      users: usersQuery.data,
      analytics: analyticsQuery.data,
      reports: reportsQuery.data,
    },
    
    // Loading states (granular)
    isInitialLoading,      // True only on very first load
    isCriticalLoading,     // True while metrics are loading
    isSecondaryLoading,    // True while activity/alerts are loading
    isFullyLoaded,         // True when everything is loaded
    
    // Legacy compatibility
    isLoading: isInitialLoading, // For backward compatibility
    
    // Individual query states (for fine-grained control)
    queryStates: {
      tenants: {
        isLoading: tenantsQuery.isLoading,
        isSuccess: tenantsQuery.isSuccess,
        error: tenantsQuery.error,
      },
      analytics: {
        isLoading: analyticsQuery.isLoading,
        isSuccess: analyticsQuery.isSuccess,
        error: analyticsQuery.error,
      },
      users: {
        isLoading: usersQuery.isLoading,
        isSuccess: usersQuery.isSuccess,
        error: usersQuery.error,
      },
      reports: {
        isLoading: reportsQuery.isLoading,
        isSuccess: reportsQuery.isSuccess,
        error: reportsQuery.error,
      },
    },
    
    // Error
    error,
    
    // Actions
    refetch,
  };
}

/**
 * 🎯 OPTION 2: Parallel Loading (Faster initial load, but all-or-nothing)
 * Use this if your backend is fast and you want all data at once
 */
export function useSuperAdminDashboardParallel() {
  const queries = useQueries({
    queries: [
      {
        queryKey: SUPER_ADMIN_QUERY_KEYS.tenants(),
        queryFn: async () => {
          console.log('⚡ Parallel: Loading tenants');
          const response = await superAdminApi.get('/super-admin/tenants');
          return response.data;
        },
        staleTime: 5 * 60 * 1000,
        cacheTime: 15 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
      {
        queryKey: SUPER_ADMIN_QUERY_KEYS.users(),
        queryFn: async () => {
          console.log('⚡ Parallel: Loading users');
          const response = await superAdminApi.get('/super-admin/users');
          return response.data;
        },
        staleTime: 5 * 60 * 1000,
        cacheTime: 15 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
      {
        queryKey: SUPER_ADMIN_QUERY_KEYS.analytics(),
        queryFn: async () => {
          console.log('⚡ Parallel: Loading analytics');
          const response = await superAdminApi.get('/super-admin/analytics');
          return response.data;
        },
        staleTime: 5 * 60 * 1000,
        cacheTime: 15 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
      {
        queryKey: SUPER_ADMIN_QUERY_KEYS.reports(),
        queryFn: async () => {
          console.log('⚡ Parallel: Loading reports');
          const response = await superAdminApi.get('/super-admin/reports');
          return response.data;
        },
        staleTime: 5 * 60 * 1000,
        cacheTime: 15 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
    ],
  });

  const [tenantsQuery, usersQuery, analyticsQuery, reportsQuery] = queries;

  const isLoading = queries.some(query => query.isLoading);
  const isSuccess = queries.every(query => query.isSuccess);
  const error = queries.find(query => query.error)?.error;

  const refetch = async () => {
    console.log('🔄 Refetching all dashboard data (parallel)');
    await Promise.all(queries.map(query => query.refetch()));
  };

  return {
    data: {
      tenants: tenantsQuery.data,
      users: usersQuery.data,
      analytics: analyticsQuery.data,
      reports: reportsQuery.data,
    },
    isLoading,
    isSuccess,
    error,
    refetch,
  };
}

/**
 * 🔥 LEGACY: Original hook for backward compatibility
 * ⚠️ DEPRECATED - Use useSuperAdminDashboardProgressive() instead
 */
export function useSuperAdminDashboard() {
  return useQuery({
    queryKey: SUPER_ADMIN_QUERY_KEYS.dashboard(),
    queryFn: async () => {
      log.debug('Fetching super admin dashboard');
      console.log('⚠️ Using legacy dashboard hook - consider upgrading to progressive loading');
      
      // Fetch all required data in parallel (OLD WAY)
      const [tenantsRes, usersRes, analyticsRes, reportsRes] = await Promise.all([
        superAdminApi.get('/super-admin/tenants'),
        superAdminApi.get('/super-admin/users'),
        superAdminApi.get('/super-admin/analytics'),
        superAdminApi.get('/super-admin/reports'),
      ]);

      console.log('✅ Frontend: Dashboard responses loaded');

      return {
        tenants: tenantsRes.data,
        users: usersRes.data,
        analytics: analyticsRes.data,
        reports: reportsRes.data,
      };
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook to create a new tenant
 */
export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tenantData: any) => {
      const response = await superAdminApi.post('/super-admin/tenants', tenantData);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch tenants list
      queryClient.invalidateQueries({ queryKey: SUPER_ADMIN_QUERY_KEYS.tenants() });
      queryClient.invalidateQueries({ queryKey: SUPER_ADMIN_QUERY_KEYS.dashboard() });
    },
  });
}

/**
 * Hook to update a tenant
 */
export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await superAdminApi.put(`/super-admin/tenants/${id}`, data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      // Invalidate specific tenant and list
      queryClient.invalidateQueries({ queryKey: SUPER_ADMIN_QUERY_KEYS.tenant(variables.id) });
      queryClient.invalidateQueries({ queryKey: SUPER_ADMIN_QUERY_KEYS.tenants() });
      queryClient.invalidateQueries({ queryKey: SUPER_ADMIN_QUERY_KEYS.dashboard() });
    },
  });
}

/**
 * Hook to delete a tenant
 */
export function useDeleteTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await superAdminApi.delete(`/super-admin/tenants/${tenantId}`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate tenants list
      queryClient.invalidateQueries({ queryKey: SUPER_ADMIN_QUERY_KEYS.tenants() });
      queryClient.invalidateQueries({ queryKey: SUPER_ADMIN_QUERY_KEYS.dashboard() });
    },
  });
}

/**
 * Hook to delete a user
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await superAdminApi.delete(`/super-admin/users/${userId}`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: SUPER_ADMIN_QUERY_KEYS.users() });
      queryClient.invalidateQueries({ queryKey: SUPER_ADMIN_QUERY_KEYS.dashboard() });
    },
  });
}