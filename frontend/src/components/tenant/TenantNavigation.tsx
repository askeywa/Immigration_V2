import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import { useAuthStore } from '@/store/authStore';
import { UserProfileDropdown } from './UserProfileDropdown';

interface TenantNavigationProps {
  variant?: 'sidebar' | 'top' | 'default';
}

const TenantNavigation: React.FC<TenantNavigationProps> = ({ variant = 'default' }) => {
  const location = useLocation();
  const { tenant, isSuperAdmin, isTenantAdmin, isTenantUser } = useTenant();
  const { user } = useAuthStore();

  const isActive = (path: string) => {
    // Use exact match for most paths, but handle special cases
    if (path === '/documents' && location.pathname === '/documents/checklist') {
      return false; // Don't highlight Documents when on Checklist
    }
    if (path === '/documents/checklist' && location.pathname === '/documents') {
      return false; // Don't highlight Checklist when on Documents
    }
    return location.pathname === path;
  };

  const getNavigationItems = () => {
    const items = [];

    if (isSuperAdmin) {
      items.push(
        { path: '/super-admin', label: 'Dashboard', icon: '🏠' },
        { path: '/super-admin/tenants', label: 'Tenants', icon: '🏢' },
        { path: '/super-admin/users', label: 'Users', icon: '👥' },
        { path: '/super-admin/reports', label: 'Reports', icon: '📊' },
        { path: '/super-admin/analytics', label: 'Analytics', icon: '📈' },
        { path: '/super-admin/md-editor', label: 'Markdown Editor', icon: '📝' }
      );
    } else if (isTenantAdmin) {
      items.push(
        { path: '/tenant/dashboard', label: 'Dashboard', icon: '🏠' },
        { path: '/tenant/users', label: 'Users', icon: '👥' },
        { path: '/tenant/analytics', label: 'Analytics', icon: '📈' },
        { path: '/tenant/reports', label: 'Reports', icon: '📊' }
      );
    } else if (isTenantUser) {
      items.push(
        { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
        { path: '/profile/assessment', label: 'Profile Assessment', icon: '📝' },
        { path: '/crs', label: 'CRS Score', icon: '📊' },
        { path: '/documents', label: 'Documents', icon: '📄' },
        { path: '/documents/checklist', label: 'Checklist', icon: '✅' }
      );
    }

    return items;
  };

  const navigationItems = getNavigationItems();

  if (variant === 'sidebar') {
    return (
      <nav className="w-64 bg-white shadow-lg h-full">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {tenant?.name || 'Navigation'}
          </h2>
          <p className="text-sm text-gray-600">
            {isSuperAdmin ? 'Super Admin' : isTenantAdmin ? 'Tenant Admin' : 'User'}
          </p>
        </div>
        <div className="p-4">
          <ul className="space-y-2">
            {navigationItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    );
  }

  if (variant === 'top') {
    return (
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  {tenant?.name || 'Immigration Portal'}
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigationItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive(item.path)
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {user?.firstName} {user?.lastName}
                </span>
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {user?.firstName?.charAt(0) || 'U'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // Default variant
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-lg font-semibold text-gray-900">
              {tenant?.name || 'Navigation'}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive(item.path)
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-1">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export { TenantNavigation };