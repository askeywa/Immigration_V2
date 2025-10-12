// frontend/src/pages/tenant/TenantSelection.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BuildingOfficeIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/authStore';
import { tenantApiService } from '@/services/tenantApiService';
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
  subscription?: {
    planName: string;
    status: string;
    expiresAt?: string;
  };
}

export const TenantSelection: React.FC = () => {
  const { user, switchTenant } = useAuthStore();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);

  // Load available tenants
  const loadTenants = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await tenantApiService.get<{ tenants: Tenant[] }>('/tenants/user-tenants');
      
      if (response.success && response.data) {
        
        // Clean the tenant data to prevent object rendering errors
        const cleanedTenants = response.data.tenants.map(tenant => ({
          ...tenant,
          subscription: tenant.subscription ? {
            planName: tenant.subscription?.planName || 'Unknown Plan',
            status: tenant.subscription.status || 'unknown',
            expiresAt: tenant.subscription.expiresAt
          } : null
        }));
        
        setTenants(cleanedTenants);
        
        // If user has only one tenant, auto-select it
        if (response.data.tenants.length === 1) {
          setSelectedTenantId(response.data.tenants[0]._id);
        }
      } else {
        setError(response.message || 'Failed to load tenants');
      }
    } catch (err: any) {
      log.error('Failed to load tenants for selection', { error: err.message });
      setError('Failed to load tenants');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle tenant selection
  const handleTenantSelect = (tenantId: string) => {
    setSelectedTenantId(tenantId);
  };

  // Handle continue with selected tenant
  const handleContinue = async () => {
    if (!selectedTenantId) return;

    setIsSwitching(true);
    setError(null);

    try {
      await switchTenant(selectedTenantId);
      
      // Redirect to appropriate dashboard based on user role
      if (user?.role === 'admin' || user?.role === 'tenant_admin') {
        navigate('/tenant/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      log.error('Failed to switch tenant', { tenantId: selectedTenantId, error: err.message });
      setError('Failed to switch tenant');
    } finally {
      setIsSwitching(false);
    }
  };

  // Load tenants on component mount
  useEffect(() => {
    if (user) {
      loadTenants();
    }
  }, [user]);

  // Get status color and icon
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'active':
        return {
          color: 'text-green-600 bg-green-100',
          icon: CheckCircleIcon,
          text: 'Active'
        };
      case 'inactive':
        return {
          color: 'text-gray-600 bg-gray-100',
          icon: ExclamationTriangleIcon,
          text: 'Inactive'
        };
      case 'pending':
        return {
          color: 'text-yellow-600 bg-yellow-100',
          icon: ExclamationTriangleIcon,
          text: 'Pending'
        };
      case 'suspended':
        return {
          color: 'text-red-600 bg-red-100',
          icon: ExclamationTriangleIcon,
          text: 'Suspended'
        };
      default:
        return {
          color: 'text-gray-600 bg-gray-100',
          icon: ExclamationTriangleIcon,
          text: 'Unknown'
        };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your organizations...</p>
          <p className="mt-2 text-sm text-gray-500">If this takes too long, there might be API connectivity issues</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Organizations</h3>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadTenants}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Select Organization
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Choose which organization you'd like to access
          </p>
        </div>

        {tenants.length === 0 ? (
          <div className="text-center">
            <BuildingOfficeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Organizations Found</h3>
            <p className="text-sm text-gray-600 mb-4">
              You don't have access to any organizations. Please contact your administrator.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {tenants.map((tenant) => {
              const isSelected = selectedTenantId === tenant._id;
              const statusDisplay = getStatusDisplay(tenant.status);
              const StatusIcon = statusDisplay.icon;

              return (
                <div
                  key={tenant._id}
                  className={`
                    relative rounded-lg border-2 p-6 cursor-pointer transition-all duration-200
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }
                    ${tenant.status !== 'active' ? 'opacity-75' : ''}
                  `}
                  onClick={() => tenant.status === 'active' && handleTenantSelect(tenant._id)}
                >
                  <div className="flex items-start space-x-4">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                      {tenant.settings?.branding?.logo ? (
                        <img
                          src={tenant.settings?.branding?.logo}
                          alt={`${tenant.name} logo`}
                          className="h-12 w-12 rounded-lg object-contain border border-gray-200"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
                          <BuildingOfficeIcon className="h-6 w-6 text-gray-600" />
                        </div>
                      )}
                    </div>

                    {/* Tenant Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {tenant.settings?.branding?.companyName || tenant.name}
                        </h3>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusDisplay.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusDisplay.text}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">
                        {tenant.domain}
                      </p>
                      
                      {tenant.subscription && (
                        <p className="text-xs text-gray-500 mt-2">
                          Plan: {typeof tenant.subscription === 'object' && tenant.subscription.planName ? 
                            tenant.subscription.planName : 
                            (typeof tenant.subscription === 'string' ? tenant.subscription : 'Unknown Plan')
                          }
                          {tenant.subscription.expiresAt && (
                            <span className="ml-2">
                              • Expires: {new Date(tenant.subscription.expiresAt).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="flex-shrink-0">
                        <CheckCircleIcon className="h-6 w-6 text-blue-600" />
                      </div>
                    )}
                  </div>

                  {/* Disabled State */}
                  {tenant.status !== 'active' && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-900">
                          {tenant.status === 'suspended' ? 'Organization Suspended' :
                           tenant.status === 'pending' ? 'Organization Pending' :
                           'Organization Inactive'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Continue Button */}
            <div className="pt-6">
              <button
                onClick={handleContinue}
                disabled={!selectedTenantId || isSwitching}
                className={`
                  w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
                  ${selectedTenantId && !isSwitching
                    ? 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    : 'bg-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {isSwitching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Switching...
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantSelection;
