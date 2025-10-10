// frontend/src/contexts/TenantContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Tenant, Subscription } from '@/types/auth.types';
import { api } from '@/services/api';
import { domainResolutionService, TenantDomainInfo, DomainValidationResult } from '@/services/domainResolutionService';
import { tenantApiService } from '@/services/tenantApiService';
import { log } from '@/utils/logger';

// Enhanced tenant context types
export interface TenantContextType {
  // Tenant information
  tenant: Tenant | null;
  subscription: Subscription | null;
  isLoading: boolean;
  error: string | null;
  
  // Domain and routing
  currentDomain: string;
  domainInfo: TenantDomainInfo | null;
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
  isTenantUser: boolean;
  
  // Additional properties
  isActive?: boolean;
  isTrialExpired?: boolean;
  canAccessFeature?: (feature: string) => boolean;
  
  // Domain resolution
  isFromSubdomain: () => boolean;
  isFromCustomDomain: () => boolean;
  
  // Actions
  refreshTenant: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  resolveTenantFromDomain: () => Promise<DomainValidationResult>;
}

const TenantContext = createContext<TenantContextType | null>(null);

export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

// Hook for tenant-aware API calls
export const useTenantApi = () => {
  const { tenant, isSuperAdmin } = useTenant();
  
  const apiCall = useCallback(async <T,>(
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    data?: any,
    config?: any
  ): Promise<T> => {
    // Add tenant context to API calls
    const headers = {
      ...config?.headers,
      'X-Tenant-ID': tenant?._id || '',
      'X-Tenant-Domain': tenant?.domain || '',
      'X-Is-Super-Admin': isSuperAdmin.toString(),
    };
    
    const response = await api.request<T>({
      method,
      url,
      data,
      headers,
      ...config,
    });
    
    return response.data;
  }, [tenant?._id, isSuperAdmin]); // Only depend on stable values
  
  return { apiCall };
};

interface TenantProviderProps {
  children: React.ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const { user, tenant: authTenant, subscription: authSubscription, switchTenant: authSwitchTenant } = useAuthStore();
  
  // Local state
  const [tenant, setTenant] = useState<Tenant | null>(authTenant);
  const [subscription, setSubscription] = useState<Subscription | null>(authSubscription);
  const [domainInfo, setDomainInfo] = useState<TenantDomainInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs to prevent infinite loops
  const mounted = useRef(true);
  const domainResolved = useRef(false);
  const currentTenantId = useRef<string | null>(null);
  const isInitialized = useRef(false);
  
  // Get current domain - memoized to prevent changes
  const currentDomain = useMemo(() => window.location.hostname, []);
  
  // FIXED: Stable role calculations that don't change unless user role actually changes
  const isSuperAdmin = useMemo(() => {
    return user?.role === 'super_admin' || false;
  }, [user?.role]);
  
  const isTenantAdmin = useMemo(() => {
    return user?.role === 'admin' || user?.role === 'tenant_admin' || user?.role === 'super_admin' || false;
  }, [user?.role]);
  
  const isTenantUser = useMemo(() => {
    return user?.role === 'user' || false;
  }, [user?.role]);
  
  // Enhanced cache with proper cleanup
  const tenantCache = useRef<Map<string, { tenant: Tenant; timestamp: number }>>(new Map());
  const domainCache = useRef<Map<string, { result: DomainValidationResult; timestamp: number }>>(new Map());
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  const DOMAIN_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
  
  // FIXED: Stable domain resolution functions
  const isFromSubdomain = useCallback(() => {
    return domainInfo?.isSubdomain || false;
  }, [domainInfo?.isSubdomain]);
  
  const isFromCustomDomain = useCallback(() => {
    return domainInfo?.isCustomDomain || false;
  }, [domainInfo?.isCustomDomain]);
  
  // FIXED: Optimized tenant refresh with better caching and error handling
  const refreshTenantById = useCallback(async (tenantId: string): Promise<void> => {
    if (!mounted.current || !tenantId) return;
    
    try {
      // Prevent duplicate calls for same tenant
      if (currentTenantId.current === tenantId && tenant) {
        return;
      }
      
      // Check cache first
      const cached = tenantCache.current.get(tenantId);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        if (mounted.current) {
          setTenant(cached.tenant);
          currentTenantId.current = tenantId;
        }
        return;
      }
      
      // Only set loading if we don't have cached data
      if (!cached && mounted.current) {
        setIsLoading(true);
        setError(null);
      }
      
      const response = await api.get<Tenant>(`/tenants/${tenantId}`);
      
      if (response.data && mounted.current) {
        setTenant(response.data);
        currentTenantId.current = tenantId;
        
        // Cache the result
        tenantCache.current.set(tenantId, {
          tenant: response.data,
          timestamp: Date.now()
        });
        
        // Clean old cache entries
        if (tenantCache.current.size > 5) {
          const entries = Array.from(tenantCache.current.entries());
          const sortedEntries = entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
          tenantCache.current.clear();
          sortedEntries.slice(0, 3).forEach(([key, value]) => {
            tenantCache.current.set(key, value);
          });
        }
      }
    } catch (error) {
      if (mounted.current) {
        log.error('Failed to refresh tenant', { error: error instanceof Error ? error.message : String(error) });
        setError('Failed to refresh tenant');
      }
    } finally {
      if (mounted.current) {
        setIsLoading(false);
      }
    }
  }, [tenant]);
  
  // FIXED: Simplified refresh function
  const refreshTenant = useCallback(async (): Promise<void> => {
    const tenantId = tenant?._id || authTenant?._id;
    if (tenantId) {
      await refreshTenantById(tenantId);
    }
  }, [tenant?._id, authTenant?._id, refreshTenantById]);
  
  // FIXED: Optimized tenant switching
  const switchTenant = useCallback(async (tenantId: string): Promise<void> => {
    if (!mounted.current) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      await authSwitchTenant(tenantId);
      
      // Reset state
      currentTenantId.current = null;
      
      // Refresh tenant data
      await refreshTenantById(tenantId);
      
    } catch (error) {
      if (mounted.current) {
        log.error('Failed to switch tenant', { error: error instanceof Error ? error.message : String(error) });
        setError('Failed to switch tenant');
      }
    } finally {
      if (mounted.current) {
        setIsLoading(false);
      }
    }
  }, [authSwitchTenant, refreshTenantById]);
  
  // FIXED: Completely optimized domain resolution
  const resolveTenantFromDomain = useCallback(async (): Promise<DomainValidationResult> => {
    if (!mounted.current) {
      return { isValid: false, error: 'Component unmounted' };
    }
    
    // Skip domain resolution for super admin pages
    if (window.location.pathname.startsWith('/super-admin')) {
      log.info('Skipping domain resolution for super admin page');
      return { isValid: true, tenantInfo: null };
    }
    
    // Prevent multiple calls
    if (domainResolved.current) {
      return { isValid: true, tenantInfo: domainInfo };
    }
    
    try {
      // Check domain cache first
      const cachedDomain = domainCache.current.get(currentDomain);
      if (cachedDomain && Date.now() - cachedDomain.timestamp < DOMAIN_CACHE_DURATION) {
        log.info('Domain resolution cache hit', { domain: currentDomain });
        domainResolved.current = true;
        if (mounted.current && cachedDomain.result.tenantInfo) {
          setDomainInfo(cachedDomain.result.tenantInfo);
        }
        return cachedDomain.result;
      }
      
      const result = await domainResolutionService.resolveTenantFromDomain();
      
      // Mark as resolved to prevent further calls
      domainResolved.current = true;
      
      // Cache the domain resolution result
      domainCache.current.set(currentDomain, {
        result,
        timestamp: Date.now()
      });
      
      if (result.isValid && result.tenantInfo && mounted.current) {
        setDomainInfo(result.tenantInfo);
        
        // If we have tenant info from domain and it's not super admin, fetch full tenant data
        if (result.tenantInfo.tenantId !== 'super-admin' && result.tenantInfo.tenantId !== currentTenantId.current) {
          await refreshTenantById(result.tenantInfo.tenantId);
        }
      }
      
      return result;
    } catch (error) {
      domainResolved.current = true; // Mark as resolved even on error to prevent retries
      log.error('Domain resolution failed', { error: error instanceof Error ? error.message : String(error) });
      return {
        isValid: false,
        error: 'Domain resolution failed'
      };
    }
  }, [currentDomain, domainInfo, refreshTenantById]);
  
  // FIXED: Completely stable context value
  const contextValue = useMemo(() => ({
    tenant,
    subscription,
    isLoading,
    error,
    currentDomain,
    domainInfo,
    isSuperAdmin,
    isTenantAdmin,
    isTenantUser,
    isFromSubdomain,
    isFromCustomDomain,
    refreshTenant,
    switchTenant,
    resolveTenantFromDomain
  }), [
    tenant?._id, // Only tenant ID to prevent object reference changes
    subscription?._id, // Only subscription ID
    isLoading,
    error,
    currentDomain,
    domainInfo?.tenantId, // Only tenant ID from domain info
    isSuperAdmin,
    isTenantAdmin,
    isTenantUser,
    isFromSubdomain,
    isFromCustomDomain,
    refreshTenant,
    switchTenant,
    resolveTenantFromDomain
  ]);
  
  // Component lifecycle management
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  
  // FIXED: Sync with auth store but prevent loops - only sync when IDs actually change
  useEffect(() => {
    if (authTenant && authTenant._id !== tenant?._id) {
      setTenant(authTenant);
      currentTenantId.current = authTenant._id;
    }
  }, [authTenant?._id]); // Only depend on ID
  
  useEffect(() => {
    if (authSubscription && authSubscription._id !== subscription?._id) {
      setSubscription(authSubscription);
    }
  }, [authSubscription?._id]); // Only depend on ID
  
  // FIXED: Initialize domain resolution ONLY ONCE when user is available and we haven't done it yet
  useEffect(() => {
    const initializeDomain = async () => {
      if (!isInitialized.current && user && !domainResolved.current) {
        isInitialized.current = true;
        try {
          await resolveTenantFromDomain();
        } catch (error) {
          log.error('Initial domain resolution failed', { error: error instanceof Error ? error.message : String(error) });
        }
      }
    };
    
    initializeDomain();
  }, [user?.id]); // Only depend on user ID, not the entire user object
  
  // Set tenant context in tenant API service
  useEffect(() => {
    if (tenant?._id) {
      tenantApiService.setTenantContext({
        tenantId: tenant._id,
        tenantDomain: tenant.domain,
        isSuperAdmin: isSuperAdmin,
        includeTenantContext: true
      });
      log.debug('Tenant API context set', { 
        tenantId: tenant._id, 
        tenantDomain: tenant.domain, 
        isSuperAdmin 
      });
    }
  }, [tenant?._id, tenant?.domain, isSuperAdmin]);
  
  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
};

// FIXED: Simplified theme hook to prevent re-render issues
export const useTenantTheme = () => {
  const { tenant } = useTenant();
  
  // Memoize theme to prevent constant recalculations
  const theme = useMemo(() => {
    if (!tenant?.settings?.branding) {
      return {
        companyName: 'Maple Leaf Immigration Services',
        primaryColor: '#DC2626',
        secondaryColor: '#F3F4F6'
      };
    }
    
    return {
      companyName: tenant.settings?.branding?.companyName || 'Maple Leaf Immigration Services',
      primaryColor: tenant.settings?.branding?.primaryColor || '#DC2626',
      secondaryColor: tenant.settings?.branding?.secondaryColor || '#F3F4F6'
    };
  }, [tenant?.settings?.branding?.companyName, tenant?.settings?.branding?.primaryColor, tenant?.settings?.branding?.secondaryColor]);
  
  const applyTheme = useCallback(() => {
    // Apply theme to document
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--primary-color', theme.primaryColor);
      document.documentElement.style.setProperty('--secondary-color', theme.secondaryColor);
      document.title = `${theme.companyName} - Immigration Portal`;
    }
  }, [theme.primaryColor, theme.secondaryColor, theme.companyName]);
  
  // Apply theme only when theme actually changes
  useEffect(() => {
    applyTheme();
  }, [applyTheme]);
  
  return {
    getTheme: () => theme,
    applyTheme,
  };
};

export default TenantProvider;