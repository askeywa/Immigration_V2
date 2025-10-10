// frontend/src/components/tenant/UserProfileDropdown.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Settings, 
  LogOut, 
  Shield, 
  Bell, 
  HelpCircle,
  ChevronDown,
  Edit,
  Key,
  Globe
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useTenant } from '@/contexts/TenantContext';

interface UserProfileDropdownProps {
  className?: string;
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { isSuperAdmin, isTenantAdmin, isTenantUser } = useTenant();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleProfileClick = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsOpen(false);
  };

  const handleProfileSettings = () => {
    navigate('/profile/settings');
    setIsOpen(false);
  };

  const handleAccountSettings = () => {
    navigate('/account/settings');
    setIsOpen(false);
  };

  const handleNotifications = () => {
    navigate('/notifications');
    setIsOpen(false);
  };

  const handleHelp = () => {
    navigate('/help');
    setIsOpen(false);
  };

  const handleChangePassword = () => {
    navigate('/account/change-password');
    setIsOpen(false);
  };

  const handleAdminPanel = () => {
    if (isSuperAdmin) {
      navigate('/super-admin');
    } else if (isTenantAdmin) {
      navigate('/tenant/dashboard');
    }
    setIsOpen(false);
  };

  const getUserRoleDisplay = () => {
    if (isSuperAdmin) return 'Super Administrator';
    if (isTenantAdmin) return 'Tenant Administrator';
    if (isTenantUser) return 'User';
    return 'Guest';
  };

  const getRoleColor = () => {
    if (isSuperAdmin) return 'text-purple-600 bg-purple-100';
    if (isTenantAdmin) return 'text-blue-600 bg-blue-100';
    if (isTenantUser) return 'text-green-600 bg-green-100';
    return 'text-gray-600 bg-gray-100';
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={handleProfileClick}
        className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="User profile menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
        role="button"
        tabIndex={0}
      >
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
          <span className="text-sm font-medium">
            {user?.firstName?.charAt(0) || 'U'}
          </span>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-gray-900 truncate">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {user?.email}
          </p>
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
            role="menu"
            aria-label="User profile menu"
          >
            {/* User Info Header */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                  <span className="text-sm font-medium">
                    {user?.firstName?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor()}`}>
                    {getUserRoleDisplay()}
                  </span>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              {/* Profile Settings */}
              <button
                onClick={handleProfileSettings}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                role="menuitem"
              >
                <User className="w-4 h-4 text-gray-400" />
                Profile Settings
              </button>

              {/* Account Settings */}
              <button
                onClick={handleAccountSettings}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                role="menuitem"
              >
                <Settings className="w-4 h-4 text-gray-400" />
                Account Settings
              </button>

              {/* Change Password */}
              <button
                onClick={handleChangePassword}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                role="menuitem"
              >
                <Key className="w-4 h-4 text-gray-400" />
                Change Password
              </button>

              {/* Notifications */}
              <button
                onClick={handleNotifications}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                role="menuitem"
              >
                <Bell className="w-4 h-4 text-gray-400" />
                Notifications
              </button>

              {/* Admin Panel (if applicable) */}
              {(isSuperAdmin || isTenantAdmin) && (
                <button
                  onClick={handleAdminPanel}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  role="menuitem"
                >
                  <Shield className="w-4 h-4 text-gray-400" />
                  {isSuperAdmin ? 'Super Admin Panel' : 'Tenant Admin Panel'}
                </button>
              )}

              {/* Help */}
              <button
                onClick={handleHelp}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                role="menuitem"
              >
                <HelpCircle className="w-4 h-4 text-gray-400" />
                Help & Support
              </button>

              {/* Divider */}
              <div className="border-t border-gray-100 my-1"></div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                role="menuitem"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserProfileDropdown;
