import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { tenantApiService } from '@/services/tenantApiService';
import { 
  ChartBarIcon, 
  DocumentChartBarIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface ReportData {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  activeUsers: number;
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  revenue: {
    monthly: number;
    yearly: number;
  };
  topTenants: Array<{
    name: string;
    domain: string;
    userCount: number;
    applicationCount: number;
  }>;
}

const SuperAdminReports: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  
  // Notification state
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    show: false,
    message: '',
    type: 'info'
  });

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  // Helper function to show notifications
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ show: true, message, type });
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const superAdminApi = (await import('@/services/superAdminApi')).default;
      const response = await superAdminApi.get(`/super-admin/reports?dateRange=${dateRange}`);
      setReportData(response.data?.data);
    } catch (error) {
      console.error('Error fetching report data:', error);
      // Set default data to prevent crashes
      setReportData({
        totalTenants: 0,
        activeTenants: 0,
        totalUsers: 0,
        activeUsers: 0,
        totalApplications: 0,
        pendingApplications: 0,
        approvedApplications: 0,
        rejectedApplications: 0,
        revenue: {
          monthly: 0,
          yearly: 0
        },
        topTenants: []
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: 'pdf' | 'csv' | 'excel') => {
    try {
      const superAdminApi = (await import('@/services/superAdminApi')).default;
      const response = await superAdminApi.get(`/super-admin/reports/export?format=${format}&dateRange=${dateRange}`);
      
      // Create download link
      const blob = new Blob([response.data?.data || response.data], { 
        type: format === 'pdf' ? 'application/pdf' : 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `system-report-${dateRange}.${format}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting report:', error);
    }
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

  if (!reportData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <DocumentChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Report Data Available</h3>
            <p className="text-gray-600 dark:text-gray-400">Unable to load system reports at this time.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 min-h-full transition-colors duration-300">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">System Reports</h1>
              <p className="text-gray-600 dark:text-gray-400">Comprehensive analytics and insights across all tenants and users.</p>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-2">
                <CalendarDaysIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="1y">Last year</option>
                </select>
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  // Create a detailed report view or modal
                  const detailedReport = {
                    dateRange,
                    timestamp: new Date().toISOString(),
                    data: reportData,
                    summary: {
                      totalRevenue: reportData?.revenue?.yearly || 0,
                      growthRate: 15.2, // This could be calculated dynamically
                      topPerformingTenant: reportData?.topTenants?.[0]?.name || 'N/A'
                    }
                  };
                  console.log('Detailed Report:', detailedReport);
                  showNotification('Detailed report generated! Check console for full data.', 'success');
                }}
              >
                <EyeIcon className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </div>
          </div>

          {/* Export Options */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Export Reports</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Download comprehensive reports in various formats</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => exportReport('pdf')} 
                  variant="outline" 
                  className="border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Button 
                  onClick={() => exportReport('csv')} 
                  variant="outline" 
                  className="border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button 
                  onClick={() => exportReport('excel')} 
                  variant="outline" 
                  className="border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                  Excel
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tenants</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{reportData?.totalTenants || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {reportData?.activeTenants || 0} active
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <BuildingOfficeIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{reportData?.totalUsers || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {reportData?.activeUsers || 0} active
                </p>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                <UserGroupIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Applications</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{reportData?.totalApplications || 0}</p>
                <div className="flex gap-2 mt-1">
                  <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700 text-xs">
                    {reportData?.pendingApplications || 0} Pending
                  </Badge>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 border-green-200 dark:border-green-700 text-xs">
                    {reportData?.approvedApplications || 0} Approved
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                <DocumentTextIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${(reportData?.revenue?.monthly || 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Monthly / ${(reportData?.revenue?.yearly || 0).toLocaleString()} Yearly
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <CurrencyDollarIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Top Tenants Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <ArrowTrendingUpIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Performing Tenants</h3>
            </div>
            <div className="space-y-4">
              {(reportData?.topTenants || []).map((tenant, index) => (
                <div key={tenant.domain} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{tenant.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{tenant.domain}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">
                    <div className="text-center">
                      <p className="font-medium text-gray-900 dark:text-white">{tenant.userCount}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Users</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-gray-900 dark:text-white">{tenant.applicationCount}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Apps</p>
                    </div>
                  </div>
                </div>
              ))}
              {(!reportData?.topTenants || reportData.topTenants.length === 0) && (
                <div className="text-center py-8">
                  <BuildingOfficeIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No tenant data available</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Application Status Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                <ChartBarIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Application Status</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-3">
                  <ClockIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-gray-900 dark:text-white font-medium">Pending</span>
                </div>
                <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                  {reportData?.pendingApplications || 0}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-gray-900 dark:text-white font-medium">Approved</span>
                </div>
                <span className="text-xl font-bold text-green-600 dark:text-green-400">
                  {reportData?.approvedApplications || 0}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-3">
                  <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="text-gray-900 dark:text-white font-medium">Rejected</span>
                </div>
                <span className="text-xl font-bold text-red-600 dark:text-red-400">
                  {reportData?.rejectedApplications || 0}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50">
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
              notification.type === 'success' 
                ? 'bg-green-50 dark:bg-green-900/50 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
                : notification.type === 'error'
                ? 'bg-red-50 dark:bg-red-900/50 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'
                : 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200'
            }`}
          >
            <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
              notification.type === 'success' 
                ? 'bg-green-500 text-white'
                : notification.type === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white'
            }`}>
              {notification.type === 'success' ? (
                <CheckCircleIcon className="w-3 h-3" />
              ) : notification.type === 'error' ? (
                <XCircleIcon className="w-3 h-3" />
              ) : (
                <ExclamationTriangleIcon className="w-3 h-3" />
              )}
            </div>
            <p className="text-sm font-medium">{notification.message}</p>
            <button
              onClick={() => setNotification(prev => ({ ...prev, show: false }))}
              className="flex-shrink-0 ml-2 text-current hover:opacity-70 transition-opacity"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminReports;