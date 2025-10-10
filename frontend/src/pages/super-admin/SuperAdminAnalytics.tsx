import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { tenantApiService } from '@/services/tenantApiService';
import { 
  ChartBarIcon, 
  CpuChipIcon,
  ServerIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  EyeIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  ChartPieIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

interface AnalyticsData {
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    responseTime: number;
    errorRate: number;
  };
  userActivity: {
    totalUsers: number;
    activeUsers: number;
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
  };
  performance: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
    averageResponseTime: number;
    peakResponseTime: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
  };
  revenue: {
    totalRevenue: number;
    monthlyRevenue: number;
    revenueGrowth: Array<{ date: string; amount: number }>;
  };
  trends: {
    userGrowth: Array<{ date: string; count: number }>;
    applicationGrowth: Array<{ date: string; count: number }>;
    revenueGrowth: Array<{ date: string; amount: number }>;
  };
}

const SuperAdminAnalytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching analytics data from backend...');
      
      // Use superAdminApi to get system analytics
      const superAdminApi = (await import('@/services/superAdminApi')).default;
      const response = await superAdminApi.get(`/super-admin/analytics?range=${timeRange}`);
      console.log('📊 Analytics API response:', response);
      
      if (response.data?.success && response.data?.data) {
        console.log('✅ Setting dynamic analytics data:', response.data.data);
        setAnalyticsData(response.data.data);
      } else {
        console.error('❌ Analytics API returned unsuccessful response:', response);
        // Set minimal default data to prevent crashes - all zeros
        setAnalyticsData({
          systemHealth: {
            status: 'healthy',
            uptime: 0,
            responseTime: 0,
            errorRate: 0
          },
          userActivity: {
            totalUsers: 0,
            activeUsers: 0,
            dailyActiveUsers: 0,
            weeklyActiveUsers: 0,
            monthlyActiveUsers: 0,
            newUsersToday: 0,
            newUsersThisWeek: 0
          },
          performance: {
            cpuUsage: 0,
            memoryUsage: 0,
            diskUsage: 0,
            networkLatency: 0,
            averageResponseTime: 0,
            peakResponseTime: 0,
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0
          },
          revenue: {
            totalRevenue: 0,
            monthlyRevenue: 0,
            revenueGrowth: []
          },
          trends: {
            userGrowth: [],
            applicationGrowth: [],
            revenueGrowth: []
          }
        });
      }
    } catch (error) {
      console.error('❌ Error fetching analytics data:', error);
      // Set minimal default data to prevent crashes - all zeros
      setAnalyticsData({
        systemHealth: {
          status: 'healthy',
          uptime: 0,
          responseTime: 0,
          errorRate: 0
        },
        userActivity: {
          totalUsers: 0,
          activeUsers: 0,
          dailyActiveUsers: 0,
          weeklyActiveUsers: 0,
          monthlyActiveUsers: 0,
          newUsersToday: 0,
          newUsersThisWeek: 0
        },
        performance: {
          cpuUsage: 0,
          memoryUsage: 0,
          diskUsage: 0,
          networkLatency: 0,
          averageResponseTime: 0,
          peakResponseTime: 0,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0
        },
        revenue: {
          totalRevenue: 0,
          monthlyRevenue: 0,
          revenueGrowth: []
        },
        trends: {
          userGrowth: [],
          applicationGrowth: [],
          revenueGrowth: []
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatUptime = (uptime: number) => {
    const days = Math.floor(uptime / (24 * 60 * 60));
    const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
    return `${days}d ${hours}h`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Analytics Data Available</h3>
            <p className="text-gray-600 dark:text-gray-400">Unable to load system analytics at this time.</p>
          </div>
        </div>
      </div>
    );
  }

  // Safe access to nested properties
  const systemHealth = analyticsData.systemHealth || {
    status: 'healthy' as const,
    uptime: 0,
    responseTime: 0,
    errorRate: 0
  };
  const userActivity = analyticsData.userActivity || {
    totalUsers: 0,
    activeUsers: 0,
    dailyActiveUsers: 0,
    weeklyActiveUsers: 0,
    monthlyActiveUsers: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0
  };
  const performance = analyticsData.performance || {
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    networkLatency: 0,
    averageResponseTime: 0,
    peakResponseTime: 0,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0
  };
  const revenue = analyticsData.revenue || {
    totalRevenue: 0,
    monthlyRevenue: 0,
    revenueGrowth: []
  };
  const trends = analyticsData.trends || { userGrowth: [], applicationGrowth: [], revenueGrowth: [] };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 min-h-full transition-colors duration-300">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">System Analytics</h1>
              <p className="text-gray-600 dark:text-gray-400">Real-time insights into system performance, user activity, and business metrics.</p>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-2">
                <CalendarDaysIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="24h">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={fetchAnalyticsData}
                disabled={loading}
              >
                <ArrowPathIcon className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </div>

        {/* System Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8 transition-colors duration-300"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
              <ServerIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">System Health</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Badge className={`${getHealthStatusColor(systemHealth.status || 'healthy')} mb-2`}>
                {(systemHealth.status || 'healthy').toUpperCase()}
              </Badge>
              <p className="text-sm text-gray-600 dark:text-gray-400">Overall Status</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {formatUptime(systemHealth.uptime || 0)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Uptime</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {systemHealth.responseTime || 0}ms
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Response Time</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {systemHealth.errorRate || 0}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Error Rate</p>
            </div>
          </div>
        </motion.div>

        {/* User Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Daily Active</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{userActivity.dailyActiveUsers || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <UserGroupIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Weekly Active</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{userActivity.weeklyActiveUsers || 0}</p>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                <ArrowTrendingUpIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Active</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{userActivity.monthlyActiveUsers || 0}</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                <ChartBarIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">New Today</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{userActivity.newUsersToday || 0}</p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                <ClockIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">New This Week</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{userActivity.newUsersThisWeek || 0}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <ArrowTrendingUpIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.6 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                <BoltIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Performance Metrics</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {performance.averageResponseTime || 0}ms
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Avg Response</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {performance.peakResponseTime || 0}ms
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Peak Response</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {(performance.successfulRequests || 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Successful</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  {(performance.failedRequests || 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Failed</p>
              </div>
            </div>
          </motion.div>

          {/* Revenue Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.7 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <CurrencyDollarIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue Overview</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ${(revenue.totalRevenue || 0).toLocaleString()}
                  </p>
                </div>
                <ArrowTrendingUpIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Revenue</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    ${(revenue.monthlyRevenue || 0).toLocaleString()}
                  </p>
                </div>
                <ChartPieIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Growth Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.8 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <UserGroupIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Growth</h3>
            </div>
            <div className="space-y-3">
              {trends.userGrowth.slice(-5).map((trend, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(trend.date).toLocaleDateString()}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">{trend.count}</span>
                </div>
              ))}
              {trends.userGrowth.length === 0 && (
                <div className="text-center py-4">
                  <UserGroupIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No data available</p>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.9 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                <ChartBarIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Application Growth</h3>
            </div>
            <div className="space-y-3">
              {trends.applicationGrowth.slice(-5).map((trend, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(trend.date).toLocaleDateString()}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">{trend.count}</span>
                </div>
              ))}
              {trends.applicationGrowth.length === 0 && (
                <div className="text-center py-4">
                  <ChartBarIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No data available</p>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 1.0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <CurrencyDollarIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue Growth</h3>
            </div>
            <div className="space-y-3">
              {trends.revenueGrowth?.slice(-5).map((trend, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(trend.date).toLocaleDateString()}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">${trend.amount.toLocaleString()}</span>
                </div>
              ))}
              {(!trends.revenueGrowth || trends.revenueGrowth.length === 0) && (
                <div className="text-center py-4">
                  <CurrencyDollarIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No data available</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminAnalytics;