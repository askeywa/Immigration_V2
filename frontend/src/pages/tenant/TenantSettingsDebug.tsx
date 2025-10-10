// frontend/src/pages/tenant/TenantSettingsDebug.tsx
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useAuthStore } from '@/store/authStore';
import { tenantApiService } from '@/services/tenantApiService';

export const TenantSettingsDebug: React.FC = () => {
  const { tenant, isTenantAdmin } = useTenant();
  const { user: currentUser } = useAuthStore();
  
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const loadSettings = async () => {
      console.log('🔧 TenantSettingsDebug: Starting loadSettings');
      console.log('🔧 isTenantAdmin:', isTenantAdmin);
      console.log('🔧 currentUser:', currentUser);
      console.log('🔧 tenant:', tenant);
      
      setDebugInfo({
        isTenantAdmin,
        currentUserRole: currentUser?.role,
        tenant: tenant ? { id: tenant._id, name: tenant.name, domain: tenant.domain } : null,
        timestamp: new Date().toISOString()
      });
      
      if (!isTenantAdmin) {
        console.log('❌ TenantSettingsDebug: Not tenant admin, skipping API call');
        setError('Not authorized - not a tenant admin');
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);

      try {
        console.log('🔧 TenantSettingsDebug: Making API call');
        const response = await tenantApiService.get('/tenant/settings');
        console.log('🔧 TenantSettingsDebug: API response:', response);
        
        if (response.success) {
          setSettings(response.data);
          console.log('✅ TenantSettingsDebug: Settings loaded successfully');
        } else {
          setError('Failed to load tenant settings');
          console.log('❌ TenantSettingsDebug: API returned success: false');
        }
      } catch (err: any) {
        console.log('❌ TenantSettingsDebug: API call failed:', err);
        setError('Failed to load tenant settings: ' + err.message);
      } finally {
        setIsLoading(false);
        console.log('🔧 TenantSettingsDebug: Loading completed');
      }
    };

    loadSettings();
  }, [isTenantAdmin, currentUser, tenant]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tenant settings...</p>
          <div className="mt-4 text-sm text-gray-500">
            <p>Debug Info:</p>
            <pre className="text-left">{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="text-sm text-gray-500">
            <p>Debug Info:</p>
            <pre className="text-left">{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings (Debug Version)</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Settings Data</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(settings, null, 2)}
          </pre>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Raw Settings Response</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(settings, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default TenantSettingsDebug;
