// frontend/src/pages/super-admin/SuperAdminDashboardOptimized.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  BuildingOfficeIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { useSuperAdminDashboardCombined } from '../../hooks/useSuperAdminDashboardCombined';
import {
  MetricCardSkeleton,
  ActivityListSkeleton,
  AlertListSkeleton,
  TableSkeleton,
  QuickActionsSkeleton
} from '../../components/skeletons/DashboardSkeletons';

const SuperAdminDashboardOptimized: React.FC = () => {
  const { data, isLoading, error } = useSuperAdminDashboardCombined();

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'Failed to load dashboard data'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const analytics = (data as any)?.analytics || {};
  const systemHealth = analytics.systemHealth || {};
  const userActivity = analytics.userActivity || {};
  const tenantActivity = analytics.tenantActivity || {};
  const performance = analytics.performance || {};
  const revenue = analytics.revenue || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">
            System overview and performance metrics
            {data?.loadedAt && (
              <span className="ml-2 text-sm text-gray-500">
                • Last updated: {new Date(data.loadedAt).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>

        {/* Performance Indicator */}
        {data?.performance && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-sm text-green-700">
                🚀 Optimized: {data.performance.totalQueries} queries combined into 1 API call
                • Cache: {data.performance.cacheEnabled ? 'Enabled' : 'Disabled'}
                • Parallel: {data.performance.parallelExecution ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        )}

        {/* System Health Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-lg shadow p-6"
              >
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${
                    systemHealth.status === 'healthy' ? 'bg-green-100' :
                    systemHealth.status === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    <CheckCircleIcon className={`h-6 w-6 ${
                      systemHealth.status === 'healthy' ? 'text-green-600' :
                      systemHealth.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                    }`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">System Health</p>
                    <p className="text-2xl font-bold text-gray-900 capitalize">
                      {systemHealth.status || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {systemHealth.uptime?.toFixed(1 || 0)}% uptime
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="bg-white rounded-lg shadow p-6"
              >
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <UserGroupIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {userActivity.totalUsers?.toLocaleString() || 0}
                    </p>
                    <p className="text-sm text-gray-500">
                      {userActivity.activeUsers || 0} active
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="bg-white rounded-lg shadow p-6"
              >
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <BuildingOfficeIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Tenants</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {tenantActivity.totalTenants?.toLocaleString() || 0}
                    </p>
                    <p className="text-sm text-gray-500">
                      {tenantActivity.activeTenants || 0} active
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="bg-white rounded-lg shadow p-6"
              >
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-green-100">
                    <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${revenue.monthlyRevenue?.toLocaleString() || 0}
                    </p>
                    <p className="text-sm text-gray-500">
                      ${revenue.totalRevenue?.toLocaleString() || 0} total
                    </p>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Response Time</span>
                  <span className="font-medium">{performance.averageResponseTime || 0}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Peak Response Time</span>
                  <span className="font-medium">{performance.peakResponseTime || 0}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Requests</span>
                  <span className="font-medium">{performance.totalRequests?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Success Rate</span>
                  <span className="font-medium text-green-600">
                    {performance.totalRequests > 0 
                      ? ((performance.successfulRequests / performance.totalRequests) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Activity</h3>
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Daily Active</span>
                  <span className="font-medium">{userActivity.dailyActiveUsers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Weekly Active</span>
                  <span className="font-medium">{userActivity.weeklyActiveUsers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Active</span>
                  <span className="font-medium">{userActivity.monthlyActiveUsers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">New This Week</span>
                  <span className="font-medium text-blue-600">{userActivity.newUsersThisWeek || 0}</span>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Recent Tenants Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Tenants</h3>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <TableSkeleton />
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Domain
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Users
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data?.tenants?.slice(0, 5).map((tenant: any, index: number) => (
                    <motion.tr
                      key={tenant._id || index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {tenant.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tenant.domain}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          tenant.status === 'active' ? 'bg-green-100 text-green-800' :
                          tenant.status === 'trial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {tenant.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tenant.userCount || 0}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SuperAdminDashboardOptimized;
