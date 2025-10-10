// frontend/src/components/tenant/TenantSwitcher.tsx
import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, CheckIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { useTenant } from '@/contexts/TenantContext';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import { log } from '@/utils/logger';

interface Tenant {
  _id: string;
  name: string;
  domain: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  settings: {
    branding: {
      companyName: string;
      logo?: string;
      primaryColor?: string;
    };
  };
}

interface TenantSwitcherProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const TenantSwitcher: React.FC<TenantSwitcherProps> = ({ 
  className = '', 
  showLabel = true,
  size = 'md'
}) => {
  const { tenant: currentTenant, isSuperAdmin, switchTenant, isLoading } = useTenant();
  const { user } = useAuthStore();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3'
  };

  // Load tenants list
  const loadTenants = async () => {
    if (!isSuperAdmin) return;
    
    setIsLoadingTenants(true);
    setError(null);
    
    try {
      const response = await api.get('/tenants');
      if (response.data.success) {
        setTenants(response.data.data.tenants || []);
      } else {
        setError('Failed to load tenants');
      }
    } catch (err: any) {
      log.error('Failed to load tenants for switcher', { error: err.message });
      setError('Failed to load tenants');
    } finally {
      setIsLoadingTenants(false);
    }
  };

  // Handle tenant switch
  const handleTenantSwitch = async (tenantId: string) => {
    if (tenantId === currentTenant?._id) {
      setIsOpen(false);
      return;
    }

    try {
      await switchTenant(tenantId);
      setIsOpen(false);
      
      // Reload the page to apply new tenant context
      window.location.reload();
    } catch (err: any) {
      log.error('Failed to switch tenant', { tenantId, error: err.message });
      setError('Failed to switch tenant');
    }
  };

  // Load tenants on mount
  useEffect(() => {
    if (isSuperAdmin) {
      loadTenants();
    }
  }, [isSuperAdmin]);

  // Don't render if not super admin
  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Current Tenant
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          className={`
            relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 
            text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
            ${sizeClasses[size]}
            ${isLoading || isLoadingTenants ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading || isLoadingTenants}
        >
          <div className="flex items-center">
            <BuildingOfficeIcon className="flex-shrink-0 h-5 w-5 text-gray-400 mr-2" />
            <div className="flex-1 min-w-0">
              {currentTenant ? (
                <div>
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {currentTenant.settings?.branding?.companyName || currentTenant.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {currentTenant.domain}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">Select tenant...</div>
              )}
            </div>
          </div>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
          </span>
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <div className="absolute z-20 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
              {error && (
                <div className="px-4 py-2 text-sm text-red-600 bg-red-50 border-b">
                  {error}
                </div>
              )}
              
              {isLoadingTenants ? (
                <div className="px-4 py-2 text-sm text-gray-500">
                  Loading tenants...
                </div>
              ) : tenants.length === 0 ? (
                <div className="px-4 py-2 text-sm text-gray-500">
                  No tenants available
                </div>
              ) : (
                tenants.map((tenant) => (
                  <div
                    key={tenant._id}
                    className={`
                      cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50
                      ${tenant._id === currentTenant?._id ? 'bg-blue-100' : ''}
                      ${tenant.status !== 'active' ? 'opacity-50' : ''}
                    `}
                    onClick={() => handleTenantSwitch(tenant._id)}
                  >
                    <div className="flex items-center">
                      <BuildingOfficeIcon className="flex-shrink-0 h-5 w-5 text-gray-400 mr-2" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {tenant.settings?.branding?.companyName || tenant.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {tenant.domain}
                        </div>
                        {tenant.status !== 'active' && (
                          <div className="text-xs text-red-500">
                            Status: {tenant.status}
                          </div>
                        )}
                      </div>
                      {tenant._id === currentTenant?._id && (
                        <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                          <CheckIcon className="h-5 w-5 text-blue-600" />
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Compact version for headers/navigation
export const TenantSwitcherCompact: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { tenant, isSuperAdmin } = useTenant();
  
  if (!isSuperAdmin || !tenant) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <BuildingOfficeIcon className="h-4 w-4 text-gray-400" />
      <span className="text-sm text-gray-700 truncate max-w-32">
        {tenant.settings?.branding?.companyName || tenant.name}
      </span>
    </div>
  );
};

export default TenantSwitcher;