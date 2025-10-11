// Route groups for better code splitting and navigation performance
import React, { lazy } from 'react';

// Super Admin route group - load together for better caching
export const SuperAdminRoutes = {
  Dashboard: lazy(() => import('@/pages/super-admin/SuperAdminDashboard')),
  Tenants: lazy(() => import('@/pages/super-admin/SuperAdminTenants')),
  Users: lazy(() => import('@/pages/super-admin/SuperAdminUsers')),
  Reports: lazy(() => import('@/pages/super-admin/SuperAdminReports')),
  Analytics: lazy(() => import('@/pages/super-admin/SuperAdminAnalytics')),
  Performance: lazy(() => import('@/pages/super-admin/PerformanceMonitoring')),
  MarkdownEditor: lazy(() => import('@/pages/super-admin/MarkdownEditor')),
};

// Tenant Admin route group
export const TenantAdminRoutes = {
  Dashboard: lazy(() => import('@/pages/tenant/TenantAdminDashboardFixed')),
  Users: lazy(() => import('@/pages/tenant/TenantUsers')),
  Profiles: lazy(() => import('@/pages/tenant/TenantProfiles')),
  Reports: lazy(() => import('@/pages/tenant/TenantReports')),
  Settings: lazy(() => import('@/pages/tenant/TenantSettings')),
  Documents: lazy(() => import('@/pages/tenant/TenantDocuments')),
  Branding: lazy(() => import('@/pages/tenant/BrandingCustomization')),
  Analytics: lazy(() => import('@/pages/tenant/TenantAnalytics')),
};

// User route group
export const UserRoutes = {
  Dashboard: lazy(() => import('@/pages/user/UserDashboard')),
  ProfileAssessment: lazy(() => import('@/pages/user/ProfileAssessment')),
  CrsScore: lazy(() => import('@/pages/user/CrsScore')),
  DocumentsChecklist: lazy(() => import('@/pages/user/DocumentsChecklist')),
  AdditionalInfo: lazy(() => import('@/pages/user/AdditionalInfo')),
  DocumentsUpload: lazy(() => import('@/pages/user/DocumentsUpload')),
  ProfileSettings: lazy(() => import('@/pages/user/ProfileSettings')),
  AccountSettings: lazy(() => import('@/pages/user/AccountSettings')),
};

// Preload functions for each route group
export const preloadSuperAdminRoutes = async () => {
  // Preloading lazy components is not directly supported by React.lazy
  // The components will be loaded on first render
  console.log('✅ Super Admin routes registered for lazy loading');
};

export const preloadTenantAdminRoutes = async () => {
  // Preloading lazy components is not directly supported by React.lazy
  // The components will be loaded on first render
  console.log('✅ Tenant Admin routes registered for lazy loading');
};

export const preloadUserRoutes = async () => {
  // Preloading lazy components is not directly supported by React.lazy
  // The components will be loaded on first render
  console.log('✅ User routes registered for lazy loading');
};

// Smart preloader that preloads based on user role
export const preloadRoutesByRole = async (userRole: string) => {
  switch (userRole) {
    case 'super_admin':
      await preloadSuperAdminRoutes();
      break;
    case 'tenant_admin':
    case 'admin':
      await preloadTenantAdminRoutes();
      break;
    case 'user':
    case 'tenant_user':
      await preloadUserRoutes();
      break;
    default:
      // Preload all routes for unknown roles
      await Promise.all([
        preloadSuperAdminRoutes(),
        preloadTenantAdminRoutes(),
        preloadUserRoutes(),
      ]);
  }
};
