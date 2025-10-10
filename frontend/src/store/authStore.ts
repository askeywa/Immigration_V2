// frontend/src/store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthState, User, Tenant, Subscription } from '@/types/auth.types';
import { authService } from '@/services/auth.service';

// Track permission loading to prevent duplicate requests
let permissionLoadingPromise: Promise<string[]> | null = null;
let lastPermissionLoad = 0;
const PERMISSION_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// SECURITY: Session timeout and activity monitoring
export const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes
let sessionTimeoutId: NodeJS.Timeout | null = null;
let lastActivity = Date.now();

// Auto-save service for unsaved changes
interface AutoSaveData {
  type: 'tenant' | 'user' | 'super-admin';
  data: any;
  timestamp: number;
}

const AUTO_SAVE_KEY = 'auto-save-data';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tenant: null,
      subscription: null,
      token: null,
      isAuthenticated: false,

      // FIXED: Simplified login without setTimeout and excessive permission loading
      login: async (email: string, password: string, tenantDomain?: string) => {
        try {
          console.log('🔐 AuthStore: Calling authService.login...');
          const response = await authService.login(email, password, tenantDomain || '');
          console.log('🔐 AuthStore: Response received');
          
          // Set initial state immediately with empty permissions
          set({
            user: { ...response.data.user, permissions: [] },
            tenant: response.data.tenant || null,
            subscription: response.data.subscription || null,
            token: response.data.token,
            isAuthenticated: true,
          });
          console.log('✅ AuthStore: Login successful, state updated');
          
          // Load permissions immediately but don't block login
          loadPermissionsAsync();
          
        } catch (error) {
          console.error('❌ AuthStore: Login failed:', error);
          throw error;
        }
      },

      // FIXED: Simplified register without setTimeout
      register: async (userData: { firstName: string; lastName: string; email: string; password: string; companyName?: string; domain?: string; tenantId?: string }) => {
        try {
          console.log('🔐 AuthStore: Calling authService.register...');
          const response = await authService.register(userData);
          console.log('🔐 AuthStore: Registration response received');
          
          // Set initial state immediately with empty permissions
          set({
            user: { ...response.data.user, permissions: [] },
            tenant: response.data.tenant || null,
            subscription: response.data.subscription || null,
            token: response.data.token,
            isAuthenticated: true,
          });
          console.log('✅ AuthStore: Registration successful, state updated');
          
          // Load permissions immediately but don't block registration
          loadPermissionsAsync();
          
        } catch (error) {
          console.error('❌ AuthStore: Registration failed:', error);
          throw error;
        }
      },

      logout: () => {
        // Clear permission cache
        permissionLoadingPromise = null;
        lastPermissionLoad = 0;
        localStorage.removeItem('user_permissions');
        
        set({
          user: null,
          tenant: null,
          subscription: null,
          token: null,
          isAuthenticated: false,
        });
      },

      setUser: (user: User) => {
        set({ user });
      },

      setTenant: (tenant: Tenant | null) => {
        set({ tenant });
      },

      setSubscription: (subscription: Subscription | null) => {
        set({ subscription });
      },
      
      // CRITICAL: New method to set all auth data at once (for cross-origin auth)
      setAuthData: (user: User, tenant: Tenant | null, subscription: Subscription | null, token: string) => {
        set({
          user,
          tenant,
          subscription,
          token,
          isAuthenticated: true,
        });
      },

      // FIXED: Simplified tenant switching without setTimeout
      switchTenant: async (tenantId: string) => {
        try {
          console.log('🔐 AuthStore: Switching to tenant:', tenantId);
          const response = await authService.switchTenant(tenantId);
          
          // Set initial state immediately with empty permissions
          set({
            user: { ...response.data.user, permissions: [] },
            tenant: response.data.tenant || null,
            subscription: response.data.subscription || null,
            token: response.data.token,
          });
          console.log('✅ AuthStore: Tenant switched successfully');
          
          // Clear permission cache and load new permissions
          permissionLoadingPromise = null;
          lastPermissionLoad = 0;
          localStorage.removeItem('user_permissions');
          loadPermissionsAsync();
          
        } catch (error) {
          console.error('❌ AuthStore: Failed to switch tenant:', error);
          throw error;
        }
      },

      hasPermission: (permission: string): boolean => {
        const { user } = get();
        if (!user || !user.permissions) return false;
        
        // Super admin has all permissions
        if (user.role === 'super_admin') return true;
        
        return user.permissions.includes(permission);
      },

      isSuperAdmin: (): boolean => {
        const { user } = get();
        return user?.role === 'super_admin' || false;
      },

      isTenantAdmin: (): boolean => {
        const { user } = get();
        return user?.role === 'admin' || user?.role === 'super_admin' || false;
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage), // SECURITY: Use sessionStorage instead of localStorage
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        subscription: state.subscription,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => {
        console.log('🔄 Zustand: Starting rehydration from sessionStorage...');
        return (state, error) => {
          if (error) {
            console.error('❌ Zustand: Rehydration failed:', error);
          } else {
            console.log('✅ Zustand: Rehydration complete:', {
              isAuthenticated: state?.isAuthenticated,
              hasUser: !!state?.user,
              hasTenant: !!state?.tenant,
            });
          }
        };
      },
    }
  )
);

// Helper to check if store has been rehydrated
export const hasHydrated = () => {
  // Check if sessionStorage has auth data
  try {
    const authData = sessionStorage.getItem('auth-storage');
    if (!authData) return true; // No data to rehydrate, consider it "hydrated"
    
    const store = useAuthStore.getState();
    // If sessionStorage has data but store doesn't, not hydrated yet
    return store.isAuthenticated !== null; // null means not hydrated yet
  } catch {
    return true; // On error, assume hydrated to prevent blocking
  }
};

// FIXED: Optimized permission loading function to prevent duplicate requests
const loadPermissionsAsync = async () => {
  const store = useAuthStore.getState();
  
  // Don't load if user is not available
  if (!store.user || !store.isAuthenticated) {
    return;
  }
  
  // Check if we already have a permission loading in progress
  if (permissionLoadingPromise) {
    try {
      const permissions = await permissionLoadingPromise;
      updateUserPermissions(permissions);
      return;
    } catch (error) {
      console.warn('⚠️ AuthStore: Permission loading from existing promise failed:', error);
    }
  }
  
  // Check cache first
  const now = Date.now();
  if (now - lastPermissionLoad < PERMISSION_CACHE_DURATION) {
    try {
      const cachedPermissions = localStorage.getItem('user_permissions');
      if (cachedPermissions) {
        const { permissions, timestamp } = JSON.parse(cachedPermissions);
        if (now - timestamp < PERMISSION_CACHE_DURATION) {
          updateUserPermissions(permissions);
          console.log('✅ AuthStore: Permissions loaded from cache');
          return;
        }
      }
    } catch (error) {
      console.warn('⚠️ AuthStore: Cache read failed:', error);
    }
  }
  
  // Create new permission loading promise
  permissionLoadingPromise = authService.getUserPermissions();
  
  try {
    const permissions = await permissionLoadingPromise;
    lastPermissionLoad = now;
    
    // Update user permissions
    updateUserPermissions(permissions);
    
    // Cache permissions
    try {
      localStorage.setItem('user_permissions', JSON.stringify({
        permissions,
        timestamp: now
      }));
    } catch (error) {
      console.warn('⚠️ AuthStore: Cache write failed:', error);
    }
    
    console.log('✅ AuthStore: Permissions loaded and cached');
    
  } catch (error) {
    console.warn('⚠️ AuthStore: Failed to load permissions (non-blocking):', error);
  } finally {
    // Clear the promise so future calls can create a new one
    permissionLoadingPromise = null;
  }
};

// Helper function to update user permissions without triggering re-renders
const updateUserPermissions = (permissions: string[]) => {
  const store = useAuthStore.getState();
  if (store.user) {
    store.setUser({ ...store.user, permissions });
  }
};

// FIXED: Export a function to manually trigger permission refresh if needed
export const refreshPermissions = () => {
  permissionLoadingPromise = null;
  lastPermissionLoad = 0;
  localStorage.removeItem('user_permissions');
  loadPermissionsAsync();
};

// SECURITY: Session timeout and activity monitoring functions
export const startSessionMonitoring = () => {
  // Clear any existing timeout
  if (sessionTimeoutId) {
    clearTimeout(sessionTimeoutId);
  }
  
  // Set new timeout
  sessionTimeoutId = setTimeout(() => {
    console.log('🔒 Session timeout - auto-logging out');
    autoSaveAndLogout();
  }, SESSION_TIMEOUT);
};

export const updateActivity = () => {
  lastActivity = Date.now();
  startSessionMonitoring();
};

export const autoSaveAndLogout = async () => {
  try {
    // Auto-save any unsaved changes
    await saveUnsavedChanges();
    
    // Clear session
    sessionStorage.removeItem('auth-storage');
    localStorage.removeItem(AUTO_SAVE_KEY);
    
    // Redirect to login
    window.location.href = '/login';
  } catch (error) {
    console.error('Error during auto-save and logout:', error);
    // Force logout even if auto-save fails
    sessionStorage.removeItem('auth-storage');
    window.location.href = '/login';
  }
};

export const saveUnsavedChanges = async () => {
  try {
    const autoSaveData = localStorage.getItem(AUTO_SAVE_KEY);
    if (!autoSaveData) return;
    
    const data: AutoSaveData = JSON.parse(autoSaveData);
    
    // Only save if data is recent (within last 30 minutes)
    if (Date.now() - data.timestamp < 30 * 60 * 1000) {
      console.log(`💾 Auto-saving ${data.type} changes before logout`);
      // Here you would implement actual save logic based on the data type
      // For now, we'll just log it
      console.log('Auto-save data:', data);
    }
  } catch (error) {
    console.error('Error auto-saving changes:', error);
  }
};

export const setAutoSaveData = (type: 'tenant' | 'user' | 'super-admin', data: any) => {
  const autoSaveData: AutoSaveData = {
    type,
    data,
    timestamp: Date.now()
  };
  localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(autoSaveData));
};

// Initialize session monitoring on page load
if (typeof window !== 'undefined') {
  // Start monitoring when the page loads
  startSessionMonitoring();
  
  // Monitor user activity
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  activityEvents.forEach(event => {
    document.addEventListener(event, updateActivity, true);
  });
  
  // Monitor page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Page is hidden, pause monitoring
      if (sessionTimeoutId) {
        clearTimeout(sessionTimeoutId);
      }
    } else {
      // Page is visible, resume monitoring
      startSessionMonitoring();
    }
  });
  
  // Note: sessionStorage automatically clears when browser tab is closed
  // No need for beforeunload handler as it interferes with navigation
}