// frontend/src/pages/tenant/TenantReports.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DocumentChartBarIcon, 
  ArrowDownTrayIcon,
  EyeIcon,
  CalendarIcon,
  FunnelIcon,
  ArrowPathIcon as RefreshIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useTenant } from '@/contexts/TenantContext';
import { tenantReportsService, ReportFilters, ReportData } from '@/services/tenantReportsService';
import { Card } from '@/components/ui/card';

export const TenantReports: React.FC = () => {
  const { tenant, isTenantAdmin } = useTenant();
  const [selectedReportType, setSelectedReportType] = useState<string>('summary');
  const [selectedFormat, setSelectedFormat] = useState<string>('json');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default date range on component mount
  React.useEffect(() => {
    const defaultRange = tenantReportsService.getDefaultDateRange();
    setStartDate(defaultRange.startDate);
    setEndDate(defaultRange.endDate);
  }, []);

  if (!isTenantAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <DocumentChartBarIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Tenant admin access required.</p>
        </div>
      </div>
    );
  }

  const reportTypes = tenantReportsService.getReportTypes();
  const exportFormats = tenantReportsService.getExportFormats();

  const generateReport = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const filters: ReportFilters = {
        type: selectedReportType as any,
        format: selectedFormat as any,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };

      const data = await tenantReportsService.generateReport(filters);
      setReportData(data);
    } catch (err) {
      setError('Failed to generate report. Please try again.');
      console.error('Report generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReport = async (format: 'csv' | 'pdf') => {
    setIsLoading(true);
    setError(null);
    
    try {
      const filters = {
        type: selectedReportType as any,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };

      let blob: Blob;
      let filename: string;

      if (format === 'csv') {
        blob = await tenantReportsService.downloadCSVReport(filters);
        filename = `tenant-${selectedReportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
      } else {
        blob = await tenantReportsService.downloadPDFReport(filters);
        filename = `tenant-${selectedReportType}-report-${new Date().toISOString().split('T')[0]}.pdf`;
      }

      tenantReportsService.downloadFile(blob, filename);
    } catch (err) {
      setError(`Failed to download ${format.toUpperCase()} report. Please try again.`);
      console.error('Download error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderReportData = () => {
    if (!reportData) return null;

    switch (reportData.reportType) {
      case 'summary':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 border-0 shadow-md bg-white">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Users</h3>
                <div className="text-2xl font-bold text-gray-900">{reportData.summary?.totalUsers || 0}</div>
              </Card>
              <Card className="p-6 border-0 shadow-md bg-white">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Active Users</h3>
                <div className="text-2xl font-bold text-gray-900">{reportData.summary?.activeUsers || 0}</div>
              </Card>
              <Card className="p-6 border-0 shadow-md bg-white">
                <h3 className="text-sm font-medium text-gray-500 mb-2">New Users</h3>
                <div className="text-2xl font-bold text-gray-900">{reportData.summary?.newUsers || 0}</div>
              </Card>
              <Card className="p-6 border-0 shadow-md bg-white">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Monthly Revenue</h3>
                <div className="text-2xl font-bold text-gray-900">${reportData.summary?.monthlyRevenue || 0}</div>
              </Card>
            </div>
          </div>
        );

      case 'users':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
              <Card className="p-6 border-0 shadow-md bg-white">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Users</h3>
                <div className="text-2xl font-bold text-gray-900">{reportData.statistics?.total || 0}</div>
              </Card>
              <Card className="p-6 border-0 shadow-md bg-white">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Active</h3>
                <div className="text-2xl font-bold text-green-600">{reportData.statistics?.active || 0}</div>
              </Card>
              <Card className="p-6 border-0 shadow-md bg-white">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Inactive</h3>
                <div className="text-2xl font-bold text-red-600">{reportData.statistics?.inactive || 0}</div>
              </Card>
              <Card className="p-6 border-0 shadow-md bg-white">
                <h3 className="text-sm font-medium text-gray-500 mb-2">New This Period</h3>
                <div className="text-2xl font-bold text-blue-600">{reportData.statistics?.newThisPeriod || 0}</div>
              </Card>
            </div>
            
            <Card className="p-6 border-0 shadow-md bg-white">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">User List</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.users?.map((user: any) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{user.role}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        );

      default:
        return (
          <Card className="p-6 border-0 shadow-md bg-white">
            <pre className="text-sm text-gray-600 overflow-auto">
              {JSON.stringify(reportData, null, 2)}
            </pre>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="bg-white shadow-sm border-b border-gray-200 mb-6">
        <div className="max-w-7xl mx-auto py-6 px-6">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold text-gray-900"
          >
            Reports & Analytics
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-1 text-lg text-gray-600"
          >
            Generate and export reports for {tenant?.name || 'your organization'}
          </motion.p>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 pb-6 space-y-6">
        {/* Report Configuration */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 border-0 shadow-md bg-white">
            <div className="flex items-center gap-2 mb-6">
              <FunnelIcon className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900">Report Configuration</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Report Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                <select
                  value={selectedReportType}
                  onChange={(e) => setSelectedReportType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {reportTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.icon} {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Export Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {exportFormats.map(format => (
                    <option key={format.id} value={format.id} disabled={format.disabled}>
                      {format.icon} {format.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-6">
              <button
                onClick={generateReport}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200"
              >
                <EyeIcon className="w-4 h-4 mr-2" />
                {isLoading ? 'Generating...' : 'Generate Report'}
              </button>

              <button
                onClick={() => downloadReport('csv')}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors duration-200"
              >
                <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                Download CSV
              </button>

              <button
                onClick={() => downloadReport('pdf')}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors duration-200"
              >
                <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                Download PDF
              </button>
            </div>
          </Card>
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-4 border-0 shadow-md bg-red-50 border-l-4 border-red-400">
              <div className="flex items-center">
                <XCircleIcon className="w-5 h-5 text-red-400 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Report Data */}
        {reportData && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6 border-0 shadow-md bg-white">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <DocumentChartBarIcon className="w-5 h-5 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {reportTypes.find(t => t.id === selectedReportType)?.name} Report
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <ClockIcon className="w-4 h-4" />
                  Generated: {new Date(reportData.generatedAt).toLocaleString()}
                </div>
              </div>

              {renderReportData()}
            </Card>
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-6 border-0 shadow-md bg-white">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshIcon className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Generating report...</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TenantReports;
