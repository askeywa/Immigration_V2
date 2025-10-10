// frontend/src/components/common/UserProfileDropdown.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Settings, 
  LogOut, 
  ChevronDown,
  Shield,
  Building2,
  CreditCard,
  HelpCircle
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useTenant } from '@/contexts/TenantContext';

interface UserProfileDropdownProps {
  className?: string;
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { tenant } = useTenant();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout even if API call fails
      localStorage.removeItem('auth-storage');
      sessionStorage.removeItem('auth-storage');
      navigate('/login');
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Administrator';
      case 'admin': return 'Administrator';
      case 'user': return 'User';
      default: return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case 'admin': return <Settings className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      default: return <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  if (!user) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
      >
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {user.firstName?.[0]}{user.lastName?.[0]}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {getRoleDisplayName(user.role)}
            </p>
          </div>
        </div>
        <ChevronDown 
          className={`h-4 w-4 text-gray-400 dark:text-gray-300 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown Content */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20"
            >
              {/* User Info Header */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-medium">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user.email}
                    </p>
                    <div className="flex items-center space-x-1 mt-1">
                      {getRoleIcon(user.role)}
                      <span className="text-xs text-gray-600 dark:text-gray-300">
                        {getRoleDisplayName(user.role)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Tenant Info (if applicable) */}
                {tenant && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                          {tenant.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {tenant.domain}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Menu Items */}
              <div className="py-2">
                {/* Profile Settings */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                >
                  <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span>Profile Settings</span>
                </button>

                {/* Account Settings */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                >
                  <Settings className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span>Account Settings</span>
                </button>

                {/* Tenant Admin specific options */}
                {(user.role === 'admin' || user.role === 'tenant_admin') && (
                  <>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        navigate('/tenant/settings');
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                    >
                      <Settings className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>Tenant Settings</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        navigate('/tenant/branding');
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                    >
                      <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span>Branding</span>
                    </button>
                  </>
                )}

                {/* Super Admin specific options */}
                {user.role === 'super_admin' && (
                  <>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        navigate('/super-admin');
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                    >
                      <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span>Super Admin Dashboard</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        navigate('/super-admin/tenants');
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                    >
                      <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>Manage Tenants</span>
                    </button>
                  </>
                )}

                {/* Help */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/help');
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                >
                  <HelpCircle className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span>Help & Support</span>
                </button>

                {/* Divider */}
                <div className="border-t border-gray-100 dark:border-gray-700 my-2" />

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150"
                >
                  <LogOut className="h-4 w-4 text-red-500 dark:text-red-400" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserProfileDropdown;