// frontend/src/App.tsx
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ToastProvider } from '@/contexts/ToastContext';
import { TenantProvider } from '@/contexts/TenantContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { DarkModeProvider } from '@/contexts/DarkModeContext';
import { LogoProvider } from '@/contexts/LogoContext';
import { CSSInjectionProvider } from '@/contexts/CSSInjectionContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import SessionSecurity from '@/components/security/SessionSecurity';

// Lazy-loaded auth routes (minimal - needed immediately)
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const TenantSelection = lazy(() => import('@/pages/tenant/TenantSelection'));
const AuthCallback = lazy(() => import('@/pages/auth/AuthCallback'));

// Lazy-load TenantRouter (contains all authenticated routes)
const TenantRouter = lazy(() => import('@/components/tenant/TenantRouter').then(module => ({
  default: module.TenantRouter
})));

// Lightweight loading spinner component (inline to avoid extra import)
const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
  </div>
);

// Custom redirect component that preserves the port
const TenantSelectionRedirect: React.FC = () => {
  const navigate = useNavigate();
  
  React.useEffect(() => {
    console.log('🔄 Redirecting to tenant-selection');
    navigate('/tenant-selection', { replace: true });
  }, [navigate]);
  
  return <div className="p-4 text-sm text-gray-500">Redirecting to tenant selection...</div>;
};

function App() {
  const { isAuthenticated, user, tenant } = useAuthStore();
  const [isRehydrated, setIsRehydrated] = React.useState(false);
  
  // CRITICAL: Wait for Zustand to rehydrate from sessionStorage
  React.useEffect(() => {
    const checkRehydration = () => {
      try {
        const authData = sessionStorage.getItem('auth-storage');
        if (!authData) {
          setIsRehydrated(true);
          console.log('✅ No auth data in sessionStorage');
          return;
        }
        
        const parsed = JSON.parse(authData);
        const hasAuthInStorage = parsed?.state?.isAuthenticated === true;
        
        if (hasAuthInStorage && isAuthenticated) {
          console.log('✅ Zustand store hydrated');
          setIsRehydrated(true);
        } else if (hasAuthInStorage && !isAuthenticated) {
          console.log('⏳ Waiting for Zustand hydration...');
          setTimeout(checkRehydration, 50);
        } else {
          setIsRehydrated(true);
        }
      } catch (error) {
        console.error('❌ Error checking rehydration:', error);
        setIsRehydrated(true);
      }
    };
    
    checkRehydration();
  }, [isAuthenticated]);
  
  // Show loading while rehydrating (very brief)
  if (!isRehydrated) {
    return <LoadingSpinner />;
  }

  return (
    <ErrorBoundary>
      <DarkModeProvider>
        <ToastProvider>
          <TenantProvider>
            <ThemeProvider>
              <CSSInjectionProvider>
                <SessionSecurity>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                      {!isAuthenticated ? (
                        <>
                          <Route path="/login" element={<Login />} />
                          <Route path="/register" element={<Register />} />
                          <Route path="/auth-callback" element={<AuthCallback />} />
                          <Route path="*" element={<Navigate to="/login" replace />} />
                        </>
                      ) : !tenant && user?.role !== 'super_admin' ? (
                        <>
                          <Route path="/tenant-selection" element={<TenantSelection />} />
                          <Route path="*" element={<TenantSelectionRedirect />} />
                        </>
                      ) : (
                        <>
                          {/* Redirect /login to appropriate dashboard if already authenticated */}
                          <Route path="/login" element={
                            <Navigate 
                              to={
                                user?.role === 'super_admin' 
                                  ? '/super-admin' 
                                  : (user?.role as string) === 'tenant_admin' || user?.role === 'admin'
                                    ? '/tenant/dashboard'
                                    : '/dashboard'
                              } 
                              replace 
                            />
                          } />
                          <Route path="*" element={
                            <LogoProvider>
                              <TenantRouter />
                            </LogoProvider>
                          } />
                        </>
                      )}
                    </Routes>
                  </Suspense>
                </SessionSecurity>
              </CSSInjectionProvider>
            </ThemeProvider>
          </TenantProvider>
        </ToastProvider>
      </DarkModeProvider>
    </ErrorBoundary>
  );
}

export default App;