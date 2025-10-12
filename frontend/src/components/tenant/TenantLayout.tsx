// frontend/src/components/tenant/TenantLayout.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import { useAuthStore } from '@/store/authStore';
import { domainResolutionService } from '@/services/domainResolutionService';
import { TenantNavigation } from './TenantNavigation';
import { TenantContextIndicator } from './TenantContextIndicator';
import { DarkModeToggle } from '@/components/common/DarkModeToggle';
import { UserProfileDropdown } from '../common/UserProfileDropdown';
import { 
  AlertCircle, 
  Loader2, 
  Wifi, 
  WifiOff,
  Shield,
  Clock,
  AlertTriangle,
  Menu,
  X
} from 'lucide-react';
import { 
  HomeIcon, 
  UsersIcon, 
  UserGroupIcon, 
  ChartBarIcon, 
  ChartPieIcon,
  DocumentTextIcon 
} from '@heroicons/react/24/outline';

interface TenantLayoutProps {
  children: React.ReactNode;
}

export const TenantLayout: React.FC<TenantLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { tenant, isLoading, error, isSuperAdmin, isActive, isTrialExpired } = useTenant();
  const { user } = useAuthStore();
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');
  const [domainResolutionStatus, setDomainResolutionStatus] = useState<'resolving' | 'resolved' | 'error'>('resolved');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Use ref to prevent multiple domain resolutions
  const domainResolved = useRef(false);
  const mounted = useRef(true);

  // Monitor connection status (optimized)
  const handleOnline = useCallback(() => setConnectionStatus('online'), []);
  const handleOffline = useCallback(() => setConnectionStatus('offline'), []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      mounted.current = false;
    };
  }, [handleOnline, handleOffline]);

  // FIXED: Handle domain resolution only once and only when needed
  useEffect(() => {
    const resolveDomain = async () => {
      // Prevent multiple calls
      if (domainResolved.current || !mounted.current) {
        return;
      }

      // Only resolve domain if we don't have tenant info and user is authenticated
      if (!tenant && user && !isSuperAdmin) {
        try {
          domainResolved.current = true;
          setDomainResolutionStatus('resolving');
          
          const result = await domainResolutionService.resolveTenantFromDomain();
          
          if (mounted.current) {
            setDomainResolutionStatus(result.success ? 'resolved' : 'error');
          }
        } catch (error) {
          console.error('Domain resolution failed:', error);
          if (mounted.current) {
            setDomainResolutionStatus('error');
          }
        }
      } else {
        // We have tenant or user is super admin, mark as resolved
        setDomainResolutionStatus('resolved');
        domainResolved.current = true;
      }
    };

    // Only run domain resolution once when component mounts and user is available
    if (user && !domainResolved.current) {
      resolveDomain();
    }
  }, [user, tenant, isSuperAdmin]); // Only depend on these specific values

  // Reset domain resolution when tenant changes
  useEffect(() => {
    if (tenant) {
      domainResolved.current = false;
      setDomainResolutionStatus('resolved');
    }
  }, [tenant?._id]); // Only depend on tenant ID

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Loading Tenant Context</h2>
          <p className="text-sm text-gray-500">Please wait while we resolve your tenant information...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <div className="ml-3">
              <h3 className="text-lg font-medium text-red-800">Tenant Access Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => window.location.reload()}
                  className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show tenant not found state
  if (!tenant && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Tenant Access
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              You don't have access to any tenant. Please contact your administrator.
            </p>
            <button
              onClick={() => window.location.href = '/login'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Special layout for Super Admin - No overlapping headers
  if (isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="flex flex-col lg:flex-row h-screen">
          {/* Proper Vertical Sidebar - Hidden on mobile, visible on desktop */}
          <div className="hidden lg:flex w-64 flex-shrink-0 bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <div className="flex flex-col h-full">
              {/* Sidebar Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Super Admin</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">System Control</p>
                  </div>
                </div>
              </div>

              {/* Navigation Menu */}
              <nav className="flex-1 px-4 py-6 space-y-2">
                <a
                  href="/super-admin"
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname === '/super-admin'
                      ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <HomeIcon className="w-5 h-5 mr-3" />
                  Dashboard
                </a>
                <a
                  href="/super-admin/tenants"
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname === '/super-admin/tenants'
                      ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <UserGroupIcon className="w-5 h-5 mr-3" />
                  Tenants
                </a>
                <a
                  href="/super-admin/users"
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname === '/super-admin/users'
                      ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <UsersIcon className="w-5 h-5 mr-3" />
                  Users
                </a>
                <a
                  href="/super-admin/reports"
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname === '/super-admin/reports'
                      ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <ChartBarIcon className="w-5 h-5 mr-3" />
                  Reports
                </a>
                <a
                  href="/super-admin/analytics"
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname === '/super-admin/analytics'
                      ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <ChartPieIcon className="w-5 h-5 mr-3" />
                  Analytics
                </a>
                <a
                  href="/super-admin/performance"
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname === '/super-admin/performance'
                      ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <ChartPieIcon className="w-5 h-5 mr-3" />
                  Performance
                </a>
                <a
                  href="/super-admin/md-editor"
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname === '/super-admin/md-editor'
                      ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <DocumentTextIcon className="w-5 h-5 mr-3" />
                  Markdown Editor
                </a>
              </nav>

              {/* Sidebar Footer */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Super Admin Panel v1.0
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden w-full">
            {/* Header with User Profile */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 transition-colors duration-300">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Mobile Menu Button */}
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
                    {location.pathname === '/super-admin' && 'Dashboard'}
                    {location.pathname === '/super-admin/tenants' && 'Tenant Management'}
                    {location.pathname === '/super-admin/users' && 'User Management'}
                    {location.pathname === '/super-admin/reports' && 'Reports'}
                    {location.pathname === '/super-admin/analytics' && 'Analytics'}
                    {location.pathname === '/super-admin/performance' && 'Performance Monitoring'}
                    {location.pathname === '/super-admin/md-editor' && 'Markdown Editor'}
                  </h1>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  {/* Connection Status Indicator */}
                  <div className="flex items-center gap-2">
                    {connectionStatus === 'online' ? (
                      <div className="flex items-center text-green-600 dark:text-green-400">
                        <Wifi className="w-4 h-4 mr-1" />
                        <span className="text-sm">Online</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600 dark:text-red-400">
                        <WifiOff className="w-4 h-4 mr-1" />
                        <span className="text-sm">Offline</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Dark Mode Toggle */}
                  <div className="flex items-center justify-center">
                    <DarkModeToggle size="sm" />
                  </div>
                  
                  {/* User Profile Dropdown */}
                  <UserProfileDropdown />
                </div>
              </div>
            </header>

            {/* Mobile Navigation Menu */}
            {mobileMenuOpen && (
              <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
                <nav className="space-y-1">
                  <a
                    href="/super-admin"
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      location.pathname === '/super-admin'
                        ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <HomeIcon className="w-5 h-5 mr-3" />
                    Dashboard
                  </a>
                  <a
                    href="/super-admin/tenants"
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      location.pathname === '/super-admin/tenants'
                        ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <UserGroupIcon className="w-5 h-5 mr-3" />
                    Tenants
                  </a>
                  <a
                    href="/super-admin/users"
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      location.pathname === '/super-admin/users'
                        ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <UsersIcon className="w-5 h-5 mr-3" />
                    Users
                  </a>
                  <a
                    href="/super-admin/reports"
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      location.pathname === '/super-admin/reports'
                        ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ChartBarIcon className="w-5 h-5 mr-3" />
                    Reports
                  </a>
                  <a
                    href="/super-admin/analytics"
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      location.pathname === '/super-admin/analytics'
                        ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ChartPieIcon className="w-5 h-5 mr-3" />
                    Analytics
                  </a>
                  <a
                    href="/super-admin/performance"
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      location.pathname === '/super-admin/performance'
                        ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ChartPieIcon className="w-5 h-5 mr-3" />
                    Performance
                  </a>
                  <a
                    href="/super-admin/md-editor"
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      location.pathname === '/super-admin/md-editor'
                        ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <DocumentTextIcon className="w-5 h-5 mr-3" />
                    Markdown Editor
                  </a>
                </nav>
              </div>
            )}

            {/* Page Content */}
            <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
              {children}
            </main>
          </div>
        </div>
      </div>
    );
  }

  // Regular tenant layout
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col lg:flex-row h-screen">
        {/* Sidebar - Hidden on mobile, visible on desktop */}
        <div className="hidden lg:flex w-64 flex-shrink-0">
          <TenantNavigation variant="sidebar" />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default TenantLayout;