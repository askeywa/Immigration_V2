import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { 
  tenantSystemService, 
  SystemHealth, 
  SystemPerformance, 
  SystemAlerts,
  SystemUsage
} from '@/services/tenantSystemService';

// Query keys for caching
export const TENANT_SYSTEM_KEYS = {
  all: ['tenant-system'] as const,
  health: () => [...TENANT_SYSTEM_KEYS.all, 'health'] as const,
  performance: (period: string) => [...TENANT_SYSTEM_KEYS.all, 'performance', period] as const,
  alerts: (status?: string) => [...TENANT_SYSTEM_KEYS.all, 'alerts', status || 'all'] as const,
  usage: (period: string) => [...TENANT_SYSTEM_KEYS.all, 'usage', period] as const,
};

/**
 * Hook to fetch system health status
 */
export function useSystemHealth(): UseQueryResult<SystemHealth, Error> {
  return useQuery({
    queryKey: TENANT_SYSTEM_KEYS.health(),
    queryFn: () => tenantSystemService.getSystemHealth(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook to fetch system performance metrics
 */
export function useSystemPerformance(period: string = '24h'): UseQueryResult<SystemPerformance, Error> {
  return useQuery({
    queryKey: TENANT_SYSTEM_KEYS.performance(period),
    queryFn: () => tenantSystemService.getSystemPerformance(period),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook to fetch system alerts and incidents
 */
export function useSystemAlerts(status?: 'active' | 'resolved' | 'all'): UseQueryResult<SystemAlerts, Error> {
  return useQuery({
    queryKey: TENANT_SYSTEM_KEYS.alerts(status),
    queryFn: () => tenantSystemService.getSystemAlerts(status),
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook to fetch system usage statistics
 */
export function useSystemUsage(period: string = '30d'): UseQueryResult<SystemUsage, Error> {
  return useQuery({
    queryKey: TENANT_SYSTEM_KEYS.usage(period),
    queryFn: () => tenantSystemService.getSystemUsage(period),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
