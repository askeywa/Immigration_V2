// frontend/src/components/common/DashboardHeader.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowPathIcon, 
  XCircleIcon,
  UserIcon,
  BellIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { useTenant } from '@/contexts/TenantContext';
import { TenantContextCompact } from '@/components/tenant/TenantContextIndicator';
import { UserProfileDropdown } from './UserProfileDropdown';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  showRefresh?: boolean;
  showLogout?: boolean;
  showProfile?: boolean;
  showNotifications?: boolean;
  showSettings?: boolean;
  showTenantContext?: boolean;
  onRefresh?: () => void;
  onLogout?: () => void;
  onProfileClick?: () => void;
  onNotificationClick?: () => void;
  onSettingsClick?: () => void;
  isLoading?: boolean;
  customActions?: React.ReactNode;
  variant?: 'default' | 'compact' | 'minimal';
  className?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  subtitle,
  showRefresh = true,
  showLogout = true,
  showProfile = true,
  showNotifications = false,
  showSettings = false,
  showTenantContext = true,
  onRefresh,
  onLogout,
  onProfileClick,
  onNotificationClick,
  onSettingsClick,
  isLoading = false,
  customActions,
  variant = 'default',
  className = ''
}) => {
  const { user, logout } = useAuthStore();
  const { isSuperAdmin, isTenantAdmin, isTenantUser } = useTenant();

  // Default handlers
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      logout();
    }
  };

  const handleProfileClick = () => {
    if (onProfileClick) {
      onProfileClick();
    }
  };

  const handleNotificationClick = () => {
    if (onNotificationClick) {
      onNotificationClick();
    }
  };

  const handleSettingsClick = () => {
    if (onSettingsClick) {
      onSettingsClick();
    }
  };

  // Get user role display
  const getUserRoleDisplay = () => {
    if (isSuperAdmin) return 'Super Administrator';
    if (isTenantAdmin) return 'Tenant Administrator';
    if (isTenantUser) return 'User';
    return 'Guest';
  };

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`bg-white border-b border-gray-200 px-4 py-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
              {subtitle && (
                <p className="text-sm text-gray-600">{subtitle}</p>
              )}
            </div>
            <TenantContextCompact />
          </div>
          
          <div className="flex items-center space-x-2">
            {showRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Loading...' : 'Refresh'}
              </Button>
            )}
            
            {showLogout && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <XCircleIcon className="w-4 h-4" />
                Logout
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Minimal variant
  if (variant === 'minimal') {
    return (
      <div className={`bg-white border-b border-gray-200 px-6 py-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
          
          {customActions && (
            <div className="flex items-center space-x-2">
              {customActions}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default variant - Full featured header
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`bg-white shadow-sm border-b border-gray-200 px-6 py-6 ${className}`}
    >
      <div className="flex items-center justify-between">
        {/* Left Section - Title and Context */}
        <div className="flex items-center space-x-6">
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-2xl font-bold text-gray-900"
            >
              {title}
            </motion.h1>
            {subtitle && (
              <motion.p 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-gray-600 mt-1"
              >
                {subtitle}
              </motion.p>
            )}
          </div>
          
          {showTenantContext && <TenantContextCompact />}
        </div>
        
        {/* Right Section - Actions and User Info */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center space-x-4"
        >
          {/* Custom Actions */}
          {customActions && (
            <div className="flex items-center space-x-2">
              {customActions}
            </div>
          )}

          {/* Standard Action Buttons */}
          <div className="flex items-center space-x-3">
            {/* Refresh Button */}
            {showRefresh && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRefresh}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                style={{ display: 'inline-flex' }}
              >
                <ArrowPathIcon className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Loading...' : 'Refresh'}
              </motion.button>
            )}

            {/* Notifications Button */}
            {showNotifications && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNotificationClick}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                <BellIcon className="w-4 h-4 mr-2" />
                Notifications
              </motion.button>
            )}

            {/* Settings Button */}
            {showSettings && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSettingsClick}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                style={{ display: 'inline-flex' }}
              >
                <CogIcon className="w-4 h-4 mr-2" />
                Settings
              </motion.button>
            )}

            {/* Logout Button */}
            {showLogout && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
              >
                <XCircleIcon className="w-4 h-4 mr-2" />
                Logout
              </motion.button>
            )}
          </div>

          {/* User Profile Section */}
          {showProfile && user && (
            <div className="pl-4 border-l border-gray-200">
              <UserProfileDropdown />
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DashboardHeader;
