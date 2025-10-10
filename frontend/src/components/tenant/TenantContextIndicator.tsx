// frontend/src/components/tenant/TenantContextIndicator.tsx
import React, { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useAuthStore } from '@/store/authStore';
import { ChevronDownIcon, BuildingOfficeIcon, UserIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

interface TenantContextIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

export const TenantContextIndicator: React.FC<TenantContextIndicatorProps> = ({ 
  showDetails = true,
  className = ''
}) => {
  const { 
    tenant, 
    subscription, 
    isSuperAdmin, 
    isTenantAdmin, 
    isTenantUser,
    isActive,
    isTrialExpired,
    canAccessFeature,
    switchTenant 
  } = useTenant();
  
  const { user } = useAuthStore();
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!tenant && !isSuperAdmin) {
    return null;
  }
  
  const getStatusColor = () => {
    if (isSuperAdmin) return 'bg-purple-100 text-purple-800';
    if (!isActive) return 'bg-red-100 text-red-800';
    if (isTrialExpired) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };
  
  const getStatusText = () => {
    if (isSuperAdmin) return 'Super Admin';
    if (!isActive) return 'Inactive';
    if (isTrialExpired) return 'Trial Expired';
    return 'Active';
  };
  
  const getRoleIcon = () => {
    if (isSuperAdmin) return <ShieldCheckIcon className="h-4 w-4" />;
    if (isTenantAdmin) return <BuildingOfficeIcon className="h-4 w-4" />;
    return <UserIcon className="h-4 w-4" />;
  };
  
  const getRoleText = () => {
    if (isSuperAdmin) return 'Super Administrator';
    if (isTenantAdmin) return 'Tenant Administrator';
    return 'Tenant User';
  };
  
  return (
    <div className={`relative ${className}`}>
      {/* Main indicator */}
      <div 
        className="flex items-center space-x-2 p-2 rounded-lg bg-white border border-gray-200 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Tenant logo or icon */}
        <div className="flex-shrink-0">
          {tenant?.settings?.branding?.logo ? (
            <img 
              src={tenant.settings?.branding?.logo} 
              alt={tenant.name}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {isSuperAdmin ? 'SA' : tenant?.name?.charAt(0)?.toUpperCase() || 'T'}
              </span>
            </div>
          )}
        </div>
        
        {/* Tenant info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900 truncate">
              {isSuperAdmin ? 'Super Admin Portal' : tenant?.name || 'Unknown Tenant'}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
          {showDetails && (
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              {getRoleIcon()}
              <span>{getRoleText()}</span>
            </div>
          )}
        </div>
        
        {/* Expand/collapse icon */}
        <ChevronDownIcon 
          className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
        />
      </div>
      
      {/* Expanded details */}
      {isExpanded && showDetails && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4 space-y-3">
            {/* Tenant details */}
            {tenant && (
              <>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Tenant Information</h4>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div><span className="font-medium">Name:</span> {tenant.name}</div>
                    <div><span className="font-medium">Domain:</span> {tenant.domain}</div>
                    <div><span className="font-medium">Status:</span> {tenant.status}</div>
                    {tenant.trialEndDate && (
                      <div><span className="font-medium">Trial Ends:</span> {new Date(tenant.trialEndDate).toLocaleDateString()}</div>
                    )}
                  </div>
                </div>
                
                {/* Subscription details */}
                {subscription && (
                  <div>
                    {/* Debug logs removed for production */}
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Subscription</h4>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div><span className="font-medium">Status:</span> {subscription.status}</div>
                      <div><span className="font-medium">Plan:</span> {typeof subscription.planId === 'object' ? subscription.planId?.displayName || subscription.planId?.name || 'Unknown Plan' : subscription.planId}</div>
                      <div><span className="font-medium">Users:</span> {subscription.usage?.currentUsers || 0}/{tenant.settings?.maxUsers || 0}</div>
                      <div><span className="font-medium">Admins:</span> {subscription.usage?.currentAdmins || 0}/{tenant.settings?.maxAdmins || 0}</div>
                    </div>
                  </div>
                )}
                
                {/* Features */}
                {tenant.settings?.features && tenant.settings.features.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Available Features</h4>
                    <div className="flex flex-wrap gap-1">
                      {tenant.settings.features.map((feature) => (
                        <span 
                          key={feature}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Branding preview */}
                {tenant.settings?.branding && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Branding</h4>
                    <div className="space-y-1 text-xs text-gray-600">
                      {tenant.settings?.branding?.companyName && (
                        <div><span className="font-medium">Company:</span> {tenant.settings?.branding?.companyName}</div>
                      )}
                      {tenant.settings?.branding?.primaryColor && (
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Primary Color:</span>
                          <div 
                            className="w-4 h-4 rounded border border-gray-300"
                            style={{ backgroundColor: tenant.settings?.branding?.primaryColor }}
                          />
                          <span className="text-gray-500">{tenant.settings?.branding?.primaryColor}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            
            {/* Super admin details */}
            {isSuperAdmin && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Super Admin Access</h4>
                <div className="space-y-1 text-xs text-gray-600">
                  <div><span className="font-medium">User:</span> {user?.email}</div>
                  <div><span className="font-medium">Role:</span> Super Administrator</div>
                  <div><span className="font-medium">Access:</span> All tenants and features</div>
                </div>
              </div>
            )}
            
            {/* User details */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Current User</h4>
              <div className="space-y-1 text-xs text-gray-600">
                <div><span className="font-medium">Name:</span> {user?.firstName} {user?.lastName}</div>
                <div><span className="font-medium">Email:</span> {user?.email}</div>
                <div><span className="font-medium">Role:</span> {user?.role}</div>
                <div><span className="font-medium">Status:</span> {user?.status}</div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="pt-2 border-t border-gray-200">
              <div className="flex space-x-2">
                {isSuperAdmin && (
                  <button
                    onClick={() => {
                      // Navigate to super admin dashboard
                      window.location.href = '/super-admin';
                    }}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded hover:bg-purple-700 transition-colors"
                  >
                    Super Admin
                  </button>
                )}
                
                {isTenantAdmin && (
                  <button
                    onClick={() => {
                      // Navigate to tenant settings
                      window.location.href = '/tenant/settings';
                    }}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                  >
                    Tenant Settings
                  </button>
                )}
                
                <button
                  onClick={() => {
                    // Refresh tenant context
                    window.location.reload();
                  }}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Compact version for headers
export const TenantContextCompact: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { tenant, isSuperAdmin } = useTenant();
  
  if (!tenant && !isSuperAdmin) {
    return null;
  }
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Tenant logo or icon */}
      <div className="flex-shrink-0">
        {tenant?.settings?.branding?.logo ? (
          <img 
            src={tenant.settings?.branding?.logo} 
            alt={tenant.name}
            className="h-5 w-5 rounded-full object-cover"
          />
        ) : (
          <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {isSuperAdmin ? 'SA' : tenant?.name?.charAt(0)?.toUpperCase() || 'T'}
            </span>
          </div>
        )}
      </div>
      
      {/* Tenant name */}
      <span className="text-sm font-medium text-gray-900 truncate">
        {isSuperAdmin ? 'Super Admin' : tenant?.name || 'Unknown Tenant'}
      </span>
    </div>
  );
};

export default TenantContextIndicator;