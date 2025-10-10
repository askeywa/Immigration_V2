// frontend/src/pages/super-admin/SuperAdminDashboard.tsx
import React from 'react';
import '../../styles/animations.css';
import { 
  UsersIcon, 
  BuildingOfficeIcon, 
  ChartBarIcon, 
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  ServerIcon,
  GlobeAltIcon,
  DocumentChartBarIcon,
  EyeIcon,
  UserGroupIcon,
  BanknotesIcon,
  ArrowPathIcon
} from '@/components/icons/IconBundle';
import { useTenant } from '@/contexts/TenantContext';
import { useAuthStore } from '@/store/authStore';
import { useSuperAdminDashboardProgressive } from '@/hooks/useSuperAdminData';
import { useSuperAdminDashboardCombined } from '@/hooks/useSuperAdminDashboardCombined';
import { log } from '@/utils/logger';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardHeader } from '@/components/common';
import { 
  MetricCardSkeleton,
  ActivityListSkeleton,
  AlertListSkeleton,
  TableSkeleton,
  QuickActionsSkeleton
} from '@/components/skeletons/DashboardSkeletons';

interface SystemStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  systemUptime: number;
  lastBackup: string;
  newTenantsThisMonth: number;
  newUsersThisMonth: number;
  revenueGrowth: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  subtitle?: string;
  isLoading?: boolean;
}

interface TenantStats {
  _id: string;
  name: string;
  domain: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  userCount: number;
  subscription: {
    planName: string;
    status: string;
    expiresAt: string;
  };
  lastActivity: string;
  revenue: number;
}

interface RecentActivity {
  _id: string;
  type: 'tenant_created' | 'tenant_suspended' | 'user_registered' | 'payment_received' | 'system_alert';
  description: string;
  timestamp: string;
  tenantId?: string;
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface SystemAlert {
  _id: string;
  type: 'performance' | 'security' | 'billing' | 'system';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  resolved: boolean;
}

// Enhanced Metric Card Component
const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  trend, 
  icon: Icon, 
  color, 
  subtitle,
  isLoading = false
}) => {
  const colorClasses = {
    blue: 'bg-blue-500 text-white',
    green: 'bg-green-500 text-white',
    purple: 'bg-purple-500 text-white',
    orange: 'bg-orange-500 text-white',
    red: 'bg-red-500 text-white'
  };

  const trendColors = {
    up: 'text-green-600 bg-green-100',
    down: 'text-red-600 bg-red-100',
    neutral: 'text-gray-600 bg-gray-100'
  };

  if (isLoading) {
    return <MetricCardSkeleton />;
  }

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow duration-300 border-0 shadow-md w-full bg-white dark:bg-gray-800" style={{ height: '160px' }}>
      <div className="flex flex-col justify-between h-full">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <div className={`p-2 rounded-full ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        
        <div className="flex-1 flex flex-col justify-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 leading-tight">{value}</h3>
        </div>
        
        <div className="space-y-1">
          {change && trend && (
            <div>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${trendColors[trend]} dark:bg-opacity-20`}>
                {trend === 'up' && <ArrowTrendingUpIcon className="w-3 h-3 mr-1" />}
                {trend === 'down' && <ArrowTrendingDownIcon className="w-3 h-3 mr-1" />}
                {change}
              </span>
            </div>
          )}
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
          )}
        </div>
      </div>
    </Card>
  );
};

export const SuperAdminDashboard: React.FC = () => {
  const { isSuperAdmin } = useTenant();
  const { user, logout } = useAuthStore();
  
  // 🎛️ Toggle between old progressive loading and new combined endpoint
  const [useOptimizedEndpoint, setUseOptimizedEndpoint] = React.useState(true);
  
  // 🚀 Use the new progressive loading hook (fallback)
  const progressiveData = useSuperAdminDashboardProgressive();
  
  // 🚀 Use the new combined endpoint hook (optimized)
  const combinedData = useSuperAdminDashboardCombined();
  
  // Choose which data to use based on toggle
  const data = useOptimizedEndpoint ? combinedData : {
    data: progressiveData.data,
    isLoading: progressiveData.isCriticalLoading || progressiveData.isSecondaryLoading,
    error: progressiveData.error,
    refetch: progressiveData.refetch
  };
  
  // Extract data with fallbacks (compatible with both approaches)
  const rawData = data?.data as any;
  
  // Handle both progressive and combined endpoint data structures
  let systemStats = null;
  let tenantStats = [];
  let recentActivity = [];
  let systemAlerts = [];
  
  if (useOptimizedEndpoint && rawData) {
    // Combined endpoint structure
    systemStats = rawData.analytics || {};
    tenantStats = rawData.tenants || [];
    recentActivity = rawData.analytics?.recentActivity || [];
    systemAlerts = rawData.reports?.systemAlerts || [];
  } else if (rawData) {
    // Progressive endpoint structure
    systemStats = rawData.analytics?.systemStats || rawData.analytics || null;
    tenantStats = rawData.tenants?.tenants || rawData.tenants || [];
    recentActivity = rawData.analytics?.recentActivity || [];
    systemAlerts = rawData.reports?.systemAlerts || [];
  }
  
  // For backward compatibility with loading states
  const isCriticalLoading = data?.isLoading || false;
  const isSecondaryLoading = false; // Combined endpoint loads everything at once
  const isFullyLoaded = !data?.isLoading && !!data?.data;
  const queryStates = {}; // Not applicable for combined endpoint
  const error = data?.error;
  const refetch = data?.refetch;

  // Handle manual refresh
  const handleRefresh = () => {
    console.log('🔄 SuperAdminDashboard: Manual refresh triggered');
    refetch();
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
      case 'high': return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
      case 'low': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      case 'inactive': return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700';
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
      case 'suspended': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700';
    }
  };

  // Get activity icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'tenant_created': return BuildingOfficeIcon;
      case 'tenant_suspended': return XCircleIcon;
      case 'user_registered': return UsersIcon;
      case 'payment_received': return ArrowTrendingUpIcon;
      case 'system_alert': return ExclamationTriangleIcon;
      default: return BellIcon;
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShieldCheckIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Super admin access required for this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Dashboard Header - Clean and Simple */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 mb-6">
        <div className="max-w-7xl mx-auto py-6 px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white animate-fade-in-left">
                Super Admin Dashboard
              </h1>
              <p className="mt-1 text-lg text-gray-600 dark:text-gray-400 animate-fade-in-left animate-delay-100">
                Welcome back, {user?.firstName} {user?.lastName}
                {useOptimizedEndpoint && (
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    🚀 Optimized
                  </span>
                )}
              </p>
            </div>
            
            {/* Performance Toggle */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Performance Mode:</span>
                <button
                  onClick={() => setUseOptimizedEndpoint(!useOptimizedEndpoint)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    useOptimizedEndpoint ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useOptimizedEndpoint ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${
                  useOptimizedEndpoint ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {useOptimizedEndpoint ? 'Combined API' : 'Progressive'}
                </span>
              </div>
            </div>
            <div className="animate-fade-in-right animate-delay-100">
              <Button
                onClick={handleRefresh}
                disabled={isCriticalLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                {isCriticalLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <ArrowPathIcon className="h-4 w-4" />
                    Refresh Data
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-6">
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 dark:text-red-500 mr-2" />
              <div className="text-sm text-red-700 dark:text-red-400">
                {error instanceof Error ? error.message : 'Failed to load dashboard data'}
              </div>
            </div>
          </div>
        )}

        {/* 🚀 PROGRESSIVE LOADING: Metrics Cards - Show immediately when critical data loads */}
        <div className="animate-fade-in-up animate-delay-200 mb-8"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" style={{ gridTemplateRows: 'minmax(160px, 1fr)' }}>
            <div className="flex">
              <MetricCard
                title="Total Tenants"
                value={systemStats?.totalTenants || 0}
                change={systemStats ? `+${systemStats.newTenantsThisMonth} this month` : undefined}
                trend="up"
                icon={BuildingOfficeIcon}
                color="blue"
                subtitle={systemStats ? `${systemStats.activeTenants} active tenants` : undefined}
                isLoading={isCriticalLoading}
              />
            </div>
            
            <div className="flex">
              <MetricCard
                title="Total Users"
                value={systemStats?.totalUsers?.toLocaleString() || 0}
                change={systemStats ? `+${systemStats.newUsersThisMonth} this month` : undefined}
                trend="up"
                icon={UserGroupIcon}
                color="green"
                subtitle={systemStats ? `${systemStats.activeUsers?.toLocaleString()} active users` : undefined}
                isLoading={isCriticalLoading}
              />
            </div>
            
            <div className="flex">
              <MetricCard
                title="Monthly Revenue"
                value={systemStats ? `$${systemStats.monthlyRevenue?.toLocaleString()}` : '$0'}
                change={systemStats ? `+${systemStats.revenueGrowth}%` : undefined}
                trend="up"
                icon={BanknotesIcon}
                color="purple"
                subtitle={systemStats ? `$${systemStats.totalRevenue?.toLocaleString()} total` : undefined}
                isLoading={isCriticalLoading}
              />
            </div>
            
            <div className="flex">
              <MetricCard
                title="System Health"
                value={systemStats ? `${systemStats.systemUptime}%` : '0%'}
                change="Excellent"
                trend="up"
                icon={ServerIcon}
                color="green"
                subtitle="Last backup completed"
                isLoading={isCriticalLoading}
              />
            </div>
          </div>
        </div>

        {/* Quick Actions Bar - Show after metrics */}
        {!isCriticalLoading && (
          <div className="animate-fade-in-up animate-delay-300 mb-8"
          >
            <Card className="p-4 border-0 shadow-md bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 sm:space-x-0">
                  <button
                    onClick={() => window.location.href = '/super-admin/tenants'}
                    className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors duration-200 min-w-0 flex-shrink-0 hover-scale"
                  >
                    <BuildingOfficeIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Manage Tenants</span>
                  </button>
                  <button
                    className="hover-scale inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors duration-200 min-w-0 flex-shrink-0"
                    onClick={() => window.location.href = '/super-admin/users'}
                  >
                    <UserGroupIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Manage Users</span>
                  </button>
                  <button
                    className="hover-scale inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 transition-colors duration-200 min-w-0 flex-shrink-0"
                    onClick={() => window.location.href = '/super-admin/reports'}
                  >
                    <DocumentChartBarIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">View Reports</span>
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* 🚀 PROGRESSIVE LOADING: Activity & Alerts - Load in Stage 2 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          {/* Enhanced Recent Activity */}
          <div className="animate-fade-in-left animate-delay-400">
            <Card className="h-full shadow-lg border-0 bg-white dark:bg-gray-800">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
                  <div className="flex items-center space-x-2">
                    {isSecondaryLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-green-400 dark:bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Live</span>
                      </>
                    )}
                  </div>
                </div>
                
                {isCriticalLoading ? (
                  <ActivityListSkeleton items={4} />
                ) : (
                  <div className="flow-root">
                    <ul className="-mb-8">
                      {recentActivity.map((activity, activityIdx) => {
                        const ActivityIcon = getActivityIcon(activity.type);
                        return (
                          <li 
                            key={activity._id}
                            className={`animate-fade-in-up ${activityIdx > 0 ? `animate-delay-${Math.min(activityIdx * 100, 500)}` : ''}`}
                          >
                            <div className="relative pb-8">
                              {activityIdx !== recentActivity.length - 1 ? (
                                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" />
                              ) : null}
                              <div className="relative flex space-x-4">
                                <div>
                                  <span className={`h-10 w-10 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-gray-800 shadow-sm ${getSeverityColor(activity.severity)}`}>
                                    <ActivityIcon className="h-5 w-5" />
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1 pt-1.5">
                                  <div className="flex justify-between space-x-4">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.description}</p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {activity.timestamp ? new Date(activity.timestamp).toLocaleString() : 'Unknown time'}
                                      </p>
                                    </div>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(activity.severity)}`}>
                                      {activity.severity}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Enhanced System Alerts */}
          <div className="animate-fade-in-right animate-delay-500">
            <Card className="h-full shadow-lg border-0 bg-white dark:bg-gray-800">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">System Alerts</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                    {systemAlerts?.filter(alert => !alert.resolved).length || 0} Active
                  </span>
                </div>
                
                {isSecondaryLoading ? (
                  <AlertListSkeleton items={3} />
                ) : (
                  <div className="space-y-4">
                    {systemAlerts.map((alert, index) => (
                      <div 
                        key={alert._id}
                        className={`animate-fade-in-up ${index > 0 ? `animate-delay-${Math.min(index * 100, 500)}` : ''} p-4 rounded-lg border-l-4 ${
                          alert.resolved 
                            ? 'bg-green-50 border-green-400 dark:bg-green-900/20 dark:border-green-500' 
                            : alert.severity === 'high' 
                              ? 'bg-red-50 border-red-400 dark:bg-red-900/20 dark:border-red-500'
                              : alert.severity === 'medium'
                                ? 'bg-yellow-50 border-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-500'
                                : 'bg-blue-50 border-blue-400 dark:bg-blue-900/20 dark:border-blue-500'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`flex-shrink-0 ${alert.resolved ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                            {alert.resolved ? (
                              <CheckCircleIcon className="h-5 w-5" />
                            ) : (
                              <ExclamationTriangleIcon className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{alert.message}</p>
                            <div className="mt-2 flex items-center space-x-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                                {alert.type} • {alert.severity}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : 'Unknown time'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* 🚀 PROGRESSIVE LOADING: Tenant Table - Shows after critical data */}
        <div className="animate-fade-in-up animate-delay-500">
          <Card className="shadow-lg border-0 bg-white dark:bg-gray-800">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Tenant Overview</h3>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {tenantStats.length} active tenants
                  </span>
                  <button
                    className="hover-scale transition-fast inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-w-0 flex-shrink-0"
                  >
                    <EyeIcon className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="truncate">View All</span>
                  </button>
                </div>
              </div>

              {isCriticalLoading ? (
                <TableSkeleton rows={5} />
              ) : (
                <div className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Tenant
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Users
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Plan
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Revenue
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Last Activity
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {tenantStats.map((tenant, index) => (
                          <tr 
                            key={tenant._id}
                            className={`animate-fade-in-left ${index > 0 ? `animate-delay-${Math.min(index * 100, 500)}` : ''} hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center">
                                    <BuildingOfficeIcon className="h-5 w-5 text-white" />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">{tenant.name}</div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">{tenant.domain}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tenant.status)}`}>
                                {tenant.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white font-medium">{tenant.userCount}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">users</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                {tenant?.subscription?.planName || 'No Plan'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                ${tenant.revenue?.toLocaleString() || '0'}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">monthly</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {new Date(tenant.lastActivity).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;