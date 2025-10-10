import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { 
  tenantDocumentService, 
  DocumentFilters, 
  TenantDocument, 
  DocumentStats, 
  DocumentAnalytics,
  DocumentStatusUpdate,
  BulkDocumentUpdate
} from '@/services/tenantDocumentService';

// Query keys for caching
export const TENANT_DOCUMENTS_KEYS = {
  all: ['tenant-documents'] as const,
  lists: () => [...TENANT_DOCUMENTS_KEYS.all, 'list'] as const,
  list: (filters: DocumentFilters) => [...TENANT_DOCUMENTS_KEYS.lists(), filters] as const,
  stats: () => [...TENANT_DOCUMENTS_KEYS.all, 'stats'] as const,
  analytics: (period: string) => [...TENANT_DOCUMENTS_KEYS.all, 'analytics', period] as const,
};

/**
 * Hook to fetch tenant documents with filtering and pagination
 */
export function useTenantDocuments(filters: DocumentFilters = {}): UseQueryResult<{
  documents: TenantDocument[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}, Error> {
  return useQuery({
    queryKey: TENANT_DOCUMENTS_KEYS.list(filters),
    queryFn: () => tenantDocumentService.getDocuments(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook to fetch document statistics
 */
export function useDocumentStats(): UseQueryResult<DocumentStats, Error> {
  return useQuery({
    queryKey: TENANT_DOCUMENTS_KEYS.stats(),
    queryFn: () => tenantDocumentService.getDocumentStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook to fetch document analytics
 */
export function useDocumentAnalytics(period: string = '30d'): UseQueryResult<DocumentAnalytics, Error> {
  return useQuery({
    queryKey: TENANT_DOCUMENTS_KEYS.analytics(period),
    queryFn: () => tenantDocumentService.getDocumentAnalytics(period),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook for updating document status
 */
export function useUpdateDocumentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, update }: { documentId: string; update: DocumentStatusUpdate }) =>
      tenantDocumentService.updateDocumentStatus(documentId, update),
    onSuccess: (data) => {
      // Invalidate and refetch document lists and stats
      queryClient.invalidateQueries({ queryKey: TENANT_DOCUMENTS_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: TENANT_DOCUMENTS_KEYS.stats() });
      queryClient.invalidateQueries({ queryKey: TENANT_DOCUMENTS_KEYS.analytics('30d') });
      
      console.log(`Document status updated: ${data.message}`);
    },
    onError: (error) => {
      console.error('Failed to update document status:', error);
    },
  });
}

/**
 * Hook for bulk document operations
 */
export function useBulkUpdateDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: BulkDocumentUpdate) => tenantDocumentService.bulkUpdateDocuments(request),
    onSuccess: (data) => {
      // Invalidate and refetch document lists and stats
      queryClient.invalidateQueries({ queryKey: TENANT_DOCUMENTS_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: TENANT_DOCUMENTS_KEYS.stats() });
      queryClient.invalidateQueries({ queryKey: TENANT_DOCUMENTS_KEYS.analytics('30d') });
      
      console.log(`Bulk update successful: ${data.message}`);
    },
    onError: (error) => {
      console.error('Bulk update failed:', error);
    },
  });
}

/**
 * Hook to refresh all document data
 */
export function useRefreshDocumentData() {
  const queryClient = useQueryClient();

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: TENANT_DOCUMENTS_KEYS.lists() }),
      queryClient.invalidateQueries({ queryKey: TENANT_DOCUMENTS_KEYS.stats() }),
      queryClient.invalidateQueries({ queryKey: TENANT_DOCUMENTS_KEYS.analytics('30d') })
    ]);
  };

  const refreshDocumentList = async (filters?: DocumentFilters) => {
    if (filters) {
      await queryClient.invalidateQueries({ queryKey: TENANT_DOCUMENTS_KEYS.list(filters) });
    } else {
      await queryClient.invalidateQueries({ queryKey: TENANT_DOCUMENTS_KEYS.lists() });
    }
  };

  const refreshDocumentStats = async () => {
    await queryClient.invalidateQueries({ queryKey: TENANT_DOCUMENTS_KEYS.stats() });
  };

  const refreshDocumentAnalytics = async (period?: string) => {
    const periodKey = period || '30d';
    await queryClient.invalidateQueries({ queryKey: TENANT_DOCUMENTS_KEYS.analytics(periodKey) });
  };

  return {
    refreshAll,
    refreshDocumentList,
    refreshDocumentStats,
    refreshDocumentAnalytics
  };
}

/**
 * Hook to prefetch document data
 */
export function usePrefetchDocumentData() {
  const queryClient = useQueryClient();

  const prefetchDocuments = (filters: DocumentFilters) => {
    queryClient.prefetchQuery({
      queryKey: TENANT_DOCUMENTS_KEYS.list(filters),
      queryFn: () => tenantDocumentService.getDocuments(filters),
      staleTime: 2 * 60 * 1000,
    });
  };

  const prefetchDocumentStats = () => {
    queryClient.prefetchQuery({
      queryKey: TENANT_DOCUMENTS_KEYS.stats(),
      queryFn: () => tenantDocumentService.getDocumentStats(),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchDocumentAnalytics = (period: string = '30d') => {
    queryClient.prefetchQuery({
      queryKey: TENANT_DOCUMENTS_KEYS.analytics(period),
      queryFn: () => tenantDocumentService.getDocumentAnalytics(period),
      staleTime: 10 * 60 * 1000,
    });
  };

  return {
    prefetchDocuments,
    prefetchDocumentStats,
    prefetchDocumentAnalytics
  };
}
