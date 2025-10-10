// frontend/src/components/tenant/TenantRouter.tsx
import React, { useEffect, useRef, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import { useAuthStore } from '@/store/authStore';
import { TenantLayout } from './TenantLayout';
import { log } from '@/utils/logger';
import { ComponentPreloader } from '@/components/navigation/ComponentPreloader';
import { OptimizedRoute } from '@/components/navigation/OptimizedRoute';
import { 
  SuperAdminRoutes, 
  TenantAdminRoutes, 
  UserRoutes,
  preloadRoutesByRole 
} from '@/components/navigation/RouteGroups';

// Loading component
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
  </div>
);

// Error boundary for tenant context
const TenantErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { error } = useTenant();
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Tenant Access Error
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};

// FIXED: Simplified tenant access guard without complex re-render logic
const TenantAccessGuard: React.FC<{ children: React.ReactNode; requiredRole?: 'admin' | 'user' | 'super_admin' }> = ({ 
  children, 
  requiredRole 
}) => {
  const { tenant, isSuperAdmin, isTenantAdmin, isTenantUser, isLoading } = useTenant();
  const { user } = useAuthStore();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  // FIXED: Simplified access control logic
  const hasAccess = () => {
    if (!user) return false;
    
    if (requiredRole === 'super_admin') {
      return isSuperAdmin;
    }
    
    if (requiredRole === 'admin') {
      return isTenantAdmin && (tenant || isSuperAdmin);
    }
    
    if (requiredRole === 'user') {
      return isTenantUser && tenant;
    }
    
    // Default: any authenticated user with tenant access
    return (tenant || isSuperAdmin);
  };
  
  if (!hasAccess()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-red-900 mb-2">
              Access Denied
            </h3>
            <p className="text-sm text-red-700">
              {!tenant && !isSuperAdmin 
                ? "You don't have access to any tenant. Please contact your administrator."
                : `${requiredRole || 'Required'} access needed for this page.`
              }
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};

// FIXED: Completely removed DomainValidator that was causing loops
// Domain validation is now handled in TenantContext only

// FIXED: Stable route determination
const useRouteRedirect = () => {
  const { isSuperAdmin, isTenantAdmin, isTenantUser } = useTenant();
  
  // Memoize redirect path to prevent changes
  const redirectPath = React.useMemo(() => {
    if (isSuperAdmin) return '/super-admin';
    if (isTenantAdmin) return '/tenant/dashboard';
    if (isTenantUser) return '/dashboard';
    return '/login';
  }, [isSuperAdmin, isTenantAdmin, isTenantUser]);
  
  return redirectPath;
};

// Main tenant router component
export const TenantRouter: React.FC = () => {
  const { tenant, isSuperAdmin, isTenantAdmin, isTenantUser, isLoading } = useTenant();
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const redirectPath = useRouteRedirect();
  
  // Prevent navigation loops
  const lastRedirectPath = useRef<string>('');
  const navigationLock = useRef(false);
  
  // FIXED: Simplified loading state
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  // FIXED: One-time redirect logic without loops
  React.useEffect(() => {
    // Prevent navigation during navigation
    if (navigationLock.current) return;
    
    // Only redirect from root path to prevent loops
    if (location.pathname === '/' && redirectPath !== lastRedirectPath.current) {
      navigationLock.current = true;
      lastRedirectPath.current = redirectPath;
      
      setTimeout(() => {
        navigate(redirectPath, { replace: true });
        navigationLock.current = false;
      }, 0);
    }
  }, [location.pathname, redirectPath, navigate]);

  // Smart preloading based on user role
  React.useEffect(() => {
    if (user?.role) {
      // Preload routes in the background after initial load
      const timeoutId = setTimeout(() => {
        preloadRoutesByRole(user.role as string);
      }, 1000); // Wait 1 second after initial load
      
      return () => clearTimeout(timeoutId);
    }
  }, [user?.role]);
  
  return (
    <TenantLayout>
      <TenantErrorBoundary>
        <Routes>
          {/* Super Admin Routes - Only render if user is super admin */}
          {isSuperAdmin && (
            <>
              <Route path="/super-admin" element={
                <TenantAccessGuard requiredRole="super_admin">
                  <Suspense fallback={<LoadingSpinner />}>
                    <SuperAdminRoutes.Dashboard />
                  </Suspense>
                </TenantAccessGuard>
              } />
              <Route path="/super-admin/tenants" element={
                <TenantAccessGuard requiredRole="super_admin">
                  <Suspense fallback={<LoadingSpinner />}>
                    <SuperAdminRoutes.Tenants />
                  </Suspense>
                </TenantAccessGuard>
              } />
              <Route path="/super-admin/users" element={
                <TenantAccessGuard requiredRole="super_admin">
                  <Suspense fallback={<LoadingSpinner />}>
                    <SuperAdminRoutes.Users />
                  </Suspense>
                </TenantAccessGuard>
              } />
              <Route path="/super-admin/reports" element={
                <TenantAccessGuard requiredRole="super_admin">
                  <Suspense fallback={<LoadingSpinner />}>
                    <SuperAdminRoutes.Reports />
                  </Suspense>
                </TenantAccessGuard>
              } />
              <Route path="/super-admin/analytics" element={
                <TenantAccessGuard requiredRole="super_admin">
                  <Suspense fallback={<LoadingSpinner />}>
                    <SuperAdminRoutes.Analytics />
                  </Suspense>
                </TenantAccessGuard>
              } />
              <Route path="/super-admin/performance" element={
                <TenantAccessGuard requiredRole="super_admin">
                  <Suspense fallback={<LoadingSpinner />}>
                    <SuperAdminRoutes.Performance />
                  </Suspense>
                </TenantAccessGuard>
              } />
            </>
          )}
          
          {/* Tenant Admin Routes - Only render if user is tenant admin and has tenant */}
          {isTenantAdmin && tenant && (
            <>
              <Route path="/tenant/dashboard" element={
                <TenantAccessGuard requiredRole="admin">
                  <Suspense fallback={<LoadingSpinner />}>
                    <TenantAdminRoutes.Dashboard />
                  </Suspense>
                </TenantAccessGuard>
              } />
              <Route path="/tenant/users" element={
                <TenantAccessGuard requiredRole="admin">
                  <TenantAdminRoutes.Users />
                </TenantAccessGuard>
              } />
              <Route path="/tenant/profiles" element={
                <TenantAccessGuard requiredRole="admin">
                  <TenantAdminRoutes.Profiles />
                </TenantAccessGuard>
              } />
              <Route path="/tenant/reports" element={
                <TenantAccessGuard requiredRole="admin">
                  <TenantAdminRoutes.Reports />
                </TenantAccessGuard>
              } />
              <Route path="/tenant/settings" element={
                <TenantAccessGuard requiredRole="admin">
                  <TenantAdminRoutes.Settings />
                </TenantAccessGuard>
              } />
              <Route path="/tenant/documents" element={
                <TenantAccessGuard requiredRole="admin">
                  <TenantAdminRoutes.Documents />
                </TenantAccessGuard>
              } />
              <Route path="/tenant/branding" element={
                <TenantAccessGuard requiredRole="admin">
                  <TenantAdminRoutes.Branding />
                </TenantAccessGuard>
              } />
              <Route path="/tenant/analytics" element={
                <TenantAccessGuard requiredRole="admin">
                  <TenantAdminRoutes.Analytics />
                </TenantAccessGuard>
              } />
            </>
          )}
          
          {/* Regular User Routes - Only render if user is tenant user and has tenant */}
          {isTenantUser && tenant && (
            <>
              <Route path="/dashboard" element={
                <TenantAccessGuard requiredRole="user">
                  <UserRoutes.Dashboard />
                </TenantAccessGuard>
              } />
              <Route path="/profile/assessment" element={
                <TenantAccessGuard requiredRole="user">
                  <UserRoutes.ProfileAssessment />
                </TenantAccessGuard>
              } />
              <Route path="/crs" element={
                <TenantAccessGuard requiredRole="user">
                  <UserRoutes.CrsScore />
                </TenantAccessGuard>
              } />
              <Route path="/documents/checklist" element={
                <TenantAccessGuard requiredRole="user">
                  <UserRoutes.DocumentsChecklist />
                </TenantAccessGuard>
              } />
              <Route path="/additional-info" element={
                <TenantAccessGuard requiredRole="user">
                  <UserRoutes.AdditionalInfo />
                </TenantAccessGuard>
              } />
              <Route path="/documents" element={
                <TenantAccessGuard requiredRole="user">
                  <UserRoutes.DocumentsUpload />
                </TenantAccessGuard>
              } />
              <Route path="/profile/settings" element={
                <TenantAccessGuard requiredRole="user">
                  <UserRoutes.ProfileSettings />
                </TenantAccessGuard>
              } />
              <Route path="/account/settings" element={
                <TenantAccessGuard requiredRole="user">
                  <UserRoutes.AccountSettings />
                </TenantAccessGuard>
              } />
            </>
          )}
          
          {/* FIXED: Simplified default redirect - only from root */}
          <Route path="/" element={<Navigate to={redirectPath} replace />} />
          
          {/* FIXED: Catch-all that doesn't show during auth callback */}
          <Route path="*" element={
            // Don't show 404 during auth callback - AuthCallback component handles its own UI
            location.pathname === '/auth-callback' ? (
              <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Page Not Found</h3>
                  <p className="text-sm text-gray-500 mb-4">The page you're looking for doesn't exist.</p>
                  <button
                    onClick={() => navigate(redirectPath, { replace: true })}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            )
          } />
        </Routes>
      </TenantErrorBoundary>
    </TenantLayout>
  );
};

export default TenantRouter;