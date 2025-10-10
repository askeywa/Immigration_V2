// frontend/src/pages/tenant/TenantAnalytics.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon, 
  UsersIcon, 
  DocumentTextIcon, 
  CurrencyDollarIcon,
  ClockIcon,
  ArrowTrendingUpIcon as TrendingUpIcon,
  ArrowTrendingDownIcon as TrendingDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowPathIcon as RefreshIcon
} from '@heroicons/react/24/outline';
import { useTenant } from '@/contexts/TenantContext';
import { useTenantAnalytics } from '@/hooks/useTenantDashboard';
import { Card } from '@/components/ui/card';

export const TenantAnalytics: React.FC = () => {
  const { tenant, isTenantAdmin } = useTenant();
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  
  const { data: analytics, isLoading, error, refetch } = useTenantAnalytics(selectedPeriod);

  if (!isTenantAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ChartBarIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Tenant admin access required.</p>
        </div>
      </div>
    );
  }

  const periodOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ];

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="bg-white shadow-sm border-b border-gray-200 mb-6">
        <div className="max-w-7xl mx-auto py-6 px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-3xl font-bold text-gray-900"
              >
                Analytics Dashboard
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-1 text-lg text-gray-600"
              >
                Analytics and insights for {tenant?.name || 'your organization'}
              </motion.p>
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {periodOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              
              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200"
              >
                <RefreshIcon className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 pb-6">
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="p-6 border-0 shadow-md bg-white">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <ChartBarIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Analytics</h3>
            <p className="text-gray-600 mb-4">Failed to load analytics data. Please try again.</p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
            >
              <RefreshIcon className="w-4 h-4 mr-2" />
              Retry
            </button>
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Key Metrics */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {/* User Growth */}
              <Card className="p-6 border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-500">User Growth</h3>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600">
                    <UsersIcon className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {analytics.userGrowth.total}
                </div>
                <div className="flex items-center text-sm">
                  {analytics.userGrowth.growth.startsWith('+') ? (
                    <ArrowUpIcon className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownIcon className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={analytics.userGrowth.growth.startsWith('+') ? 'text-green-600' : 'text-red-600'}>
                    {analytics.userGrowth.growth}
                  </span>
                  <span className="text-gray-500 ml-1">vs previous period</span>
                </div>
              </Card>

              {/* Document Processing */}
              <Card className="p-6 border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-500">Documents Processed</h3>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600">
                    <DocumentTextIcon className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {analytics.documentProcessing.completed}
                </div>
                <div className="text-sm text-gray-500">
                  {analytics.documentProcessing.pending} pending
                </div>
              </Card>

              {/* Revenue */}
              <Card className="p-6 border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-500">Revenue</h3>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100 text-purple-600">
                    <CurrencyDollarIcon className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  ${analytics.revenue.current.toLocaleString()}
                </div>
                <div className="flex items-center text-sm">
                  {analytics.revenue.growth.startsWith('+') ? (
                    <ArrowUpIcon className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownIcon className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={analytics.revenue.growth.startsWith('+') ? 'text-green-600' : 'text-red-600'}>
                    {analytics.revenue.growth}
                  </span>
                  <span className="text-gray-500 ml-1">vs previous period</span>
                </div>
              </Card>

              {/* System Performance */}
              <Card className="p-6 border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-500">System Performance</h3>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-100 text-orange-600">
                    <ClockIcon className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {analytics.systemPerformance.uptime}%
                </div>
                <div className="text-sm text-gray-500">
                  {analytics.systemPerformance.responseTime} avg response
                </div>
              </Card>
            </motion.div>

            {/* User Growth Chart */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="p-6 border-0 shadow-md bg-white">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">User Growth Trend</h3>
                  <TrendingUpIcon className="h-5 w-5 text-green-500" />
                </div>
                
                <div className="h-64 flex items-end justify-between gap-2">
                  {analytics.userGrowth.chart.slice(-14).map((data, index) => {
                    const maxUsers = Math.max(...analytics.userGrowth.chart.map(d => d.users));
                    const height = (data.users / maxUsers) * 100;
                    
                    return (
                      <div key={data.date} className="flex flex-col items-center flex-1">
                        <div 
                          className="w-full bg-blue-500 rounded-t transition-all duration-500 hover:bg-blue-600"
                          style={{ height: `${height}%`, minHeight: '4px' }}
                          title={`${data.users} users on ${data.date}`}
                        ></div>
                        <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left">
                          {new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>

            {/* Additional Metrics */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Document Processing Details */}
              <Card className="p-6 border-0 shadow-md bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Processing</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Documents</span>
                    <span className="font-medium">{analytics.documentProcessing.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Completed</span>
                    <span className="font-medium text-green-600">{analytics.documentProcessing.completed}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pending</span>
                    <span className="font-medium text-yellow-600">{analytics.documentProcessing.pending}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Processing Time</span>
                    <span className="font-medium">{analytics.documentProcessing.avgProcessingTime}</span>
                  </div>
                </div>
              </Card>

              {/* System Performance Details */}
              <Card className="p-6 border-0 shadow-md bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Performance</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Uptime</span>
                    <span className="font-medium text-green-600">{analytics.systemPerformance.uptime}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Response Time</span>
                    <span className="font-medium">{analytics.systemPerformance.responseTime}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Error Rate</span>
                    <span className="font-medium text-red-600">{(analytics.systemPerformance.errorRate * 100).toFixed(2)}%</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        ) : (
          <div className="text-center py-12">
            <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Analytics Data</h3>
            <p className="text-gray-600">Analytics data is not available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantAnalytics;
