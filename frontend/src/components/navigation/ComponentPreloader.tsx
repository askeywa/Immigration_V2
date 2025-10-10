// Component preloader for faster navigation
import React, { useEffect } from 'react';

// Preload critical components in the background
export const ComponentPreloader: React.FC = () => {
  useEffect(() => {
    // Preload critical Super Admin components
    const preloadSuperAdminComponents = async () => {
      try {
        await Promise.all([
          import('@/pages/super-admin/SuperAdminDashboard'),
          import('@/pages/super-admin/SuperAdminTenants'),
          import('@/pages/super-admin/SuperAdminUsers'),
          import('@/pages/super-admin/SuperAdminReports'),
          import('@/pages/super-admin/SuperAdminAnalytics'),
        ]);
        console.log('✅ Super Admin components preloaded');
      } catch (error) {
        console.warn('⚠️ Failed to preload Super Admin components:', error);
      }
    };

    // Preload critical Tenant components
    const preloadTenantComponents = async () => {
      try {
        await Promise.all([
          import('@/pages/tenant/TenantAdminDashboardFixed'),
          import('@/pages/tenant/TenantUsers'),
          import('@/pages/tenant/TenantProfiles'),
          import('@/pages/tenant/TenantReports'),
          import('@/pages/tenant/TenantSettings'),
        ]);
        console.log('✅ Tenant components preloaded');
      } catch (error) {
        console.warn('⚠️ Failed to preload Tenant components:', error);
      }
    };

    // Preload critical User components
    const preloadUserComponents = async () => {
      try {
        await Promise.all([
          import('@/pages/user/UserDashboard'),
          import('@/pages/user/ProfileAssessment'),
          import('@/pages/user/CrsScore'),
          import('@/pages/user/DocumentsChecklist'),
        ]);
        console.log('✅ User components preloaded');
      } catch (error) {
        console.warn('⚠️ Failed to preload User components:', error);
      }
    };

    // Preload all critical components
    const preloadAllComponents = async () => {
      await Promise.all([
        preloadSuperAdminComponents(),
        preloadTenantComponents(),
        preloadUserComponents(),
      ]);
      console.log('🚀 All critical components preloaded');
    };

    // Start preloading after a short delay to not block initial load
    const timeoutId = setTimeout(preloadAllComponents, 2000);
    
    return () => clearTimeout(timeoutId);
  }, []);

  return null; // This component doesn't render anything
};
