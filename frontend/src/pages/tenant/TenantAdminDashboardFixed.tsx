import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  UsersIcon, 
  ChartBarIcon, 
  CogIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowPathIcon as RefreshIcon
} from '@heroicons/react/24/outline';
import { useTenant } from '@/contexts/TenantContext';
import { useAuthStore } from '@/store/authStore';
import { Card } from '@/components/ui/card';
import { DashboardHeader } from '@/components/common';
import { useTenantStats, useTenantActivity, useRefreshTenantDashboard } from '@/hooks/useTenantDashboard';

interface TenantStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  totalDocuments: number;
  pendingDocuments: number;
  monthlyRevenue: number;
}

interface RecentActivity {
  _id: string;
  type: string;
  description: string;
  timestamp: string;
  severity: string;
}

const TenantAdminDashboard: React.FC = () => {
  const { tenant, isTenantAdmin } = useTenant();
  const { user } = useAuthStore();
  
  // Use React Query hooks for real data
  const { data: tenantStats, isLoading: statsLoading, error: statsError } = useTenantStats();
  const { data: recentActivity, isLoading: activityLoading, error: activityError } = useTenantActivity();
  const { refreshAll, isLoading: refreshLoading } = useRefreshTenantDashboard();
  
  // Combined loading state
  const isLoading = statsLoading || activityLoading;
  const error = statsError || activityError;
  
  // Fallback to mock data if API calls fail
  const safeTenantStats = tenantStats || {
    totalUsers: 16,
    activeUsers: 14,
    newUsersThisMonth: 3,
    totalDocuments: 45,
    pendingDocuments: 8,
    monthlyRevenue: 12500,
    systemUptime: 99.8
  };
  
  const safeRecentActivity = recentActivity || [
    {
      _id: '1',
      type: 'user_registration',
      description: 'New user registered: john.doe@example.com',
      timestamp: new Date().toISOString(),
      severity: 'info'
    },
    {
      _id: '2',
      type: 'document_upload',
      description: 'Document uploaded: passport.pdf',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      severity: 'success'
    },
    {
      _id: '3',
      type: 'system_alert',
      description: 'High storage usage detected',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      severity: 'warning'
    }
  ];
  

  // Data is now automatically loaded by React Query hooks
  // No manual loading needed!

  // Access denied check
  if (!isTenantAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Tenant admin access required for this page.</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tenant dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h1>
          <p className="text-gray-600 mb-4">{error?.message || 'An error occurred'}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Dashboard Header */}
      <DashboardHeader
        title="Tenant Dashboard"
        subtitle={`Welcome back, ${tenant?.name || 'Tenant'}`}
        showRefresh={false}
        showLogout={false}
        showProfile={true}
        showNotifications={false}
        showSettings={false}
        showTenantContext={false}
        isLoading={isLoading}
      />

      <div className="max-w-7xl mx-auto px-6 pb-6">
        {/* Quick Actions Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8 mt-6"
        >
          <div className="bg-white p-3 rounded-lg shadow-md border-0 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
              <div className="flex flex-wrap items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  onClick={() => window.location.href = '/tenant/users'}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors duration-200 shadow-sm"
                >
                  <UsersIcon className="w-3 h-3 mr-1.5" />
                  Manage Users
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  onClick={() => window.location.href = '/tenant/reports'}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 transition-colors duration-200 shadow-sm"
                >
                  <ChartBarIcon className="w-3 h-3 mr-1.5" />
                  View Reports
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>


        {/* Dashboard Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Users Card */}
              <Card className="p-6 border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600">
                    <UsersIcon className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {isLoading ? (
                    <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                  ) : (
                    safeTenantStats.totalUsers
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {isLoading ? (
                    <div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div>
                  ) : (
                    `${safeTenantStats.activeUsers} active users`
                  )}
                </div>
              </Card>

              {/* Documents Card */}
              <Card className="p-6 border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-500">Documents</h3>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600">
                    <DocumentTextIcon className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {isLoading ? (
                    <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                  ) : (
                    safeTenantStats.totalDocuments
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {isLoading ? (
                    <div className="h-4 w-20 bg-gray-200 animate-pulse rounded"></div>
                  ) : (
                    `${safeTenantStats.pendingDocuments} pending`
                  )}
                </div>
              </Card>

              {/* Revenue Card */}
              <Card className="p-6 border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-500">Monthly Revenue</h3>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100 text-purple-600">
                    <CurrencyDollarIcon className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {isLoading ? (
                    <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
                  ) : (
                    `$${safeTenantStats.monthlyRevenue.toLocaleString()}`
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  This month
                </div>
              </Card>

              {/* Performance Card */}
              <Card className="p-6 border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-500">Performance</h3>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-100 text-orange-600">
                    <ChartBarIcon className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {isLoading ? (
                    <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                  ) : (
                    `${safeTenantStats.systemUptime}%`
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  System uptime
                </div>
              </Card>
            </div>
          </motion.div>

        {/* Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 border-0 shadow-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Recent Activity</h3>
              <ChartBarIcon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {safeRecentActivity && safeRecentActivity.length > 0 ? safeRecentActivity.map((activity, index) => (
                <div key={activity._id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-medium">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      {activity.timestamp ? new Date(activity.timestamp).toLocaleString() : 'Unknown time'}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    activity.severity === 'success' ? 'bg-green-100 text-green-800' :
                    activity.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {activity.severity}
                  </span>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No recent activity available</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default TenantAdminDashboard;
