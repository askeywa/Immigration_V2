import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ServerIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  CpuChipIcon,
  CircleStackIcon,
  CloudIcon,
  EnvelopeIcon,
  ComputerDesktopIcon,
  ChartPieIcon,
  UsersIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';
import { useSystemHealth, useSystemPerformance, useSystemAlerts, useSystemUsage } from '@/hooks/useTenantSystem';
import { tenantSystemService } from '@/services/tenantSystemService';
import { Card } from '@/components/ui/card';

interface SystemMonitoringProps {
  className?: string;
}

export const SystemMonitoring: React.FC<SystemMonitoringProps> = ({ className = '' }) => {
  const [performancePeriod, setPerformancePeriod] = useState('24h');
  const [usagePeriod, setUsagePeriod] = useState('30d');
  const [alertStatus, setAlertStatus] = useState<'all' | 'active' | 'resolved'>('all');

  // React Query hooks
  const { data: health, isLoading: healthLoading, error: healthError } = useSystemHealth();
  const { data: performance, isLoading: performanceLoading } = useSystemPerformance(performancePeriod);
  const { data: alerts, isLoading: alertsLoading } = useSystemAlerts(alertStatus);
  const { data: usage, isLoading: usageLoading } = useSystemUsage(usagePeriod);

  const periodOptions = tenantSystemService.getPeriodOptions();
  const alertStatusOptions = tenantSystemService.getAlertStatusOptions();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Monitoring</h2>
          <p className="text-gray-600">Real-time system health and performance metrics</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* System Health Overview */}
      {health && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-4 gap-6"
        >
          {/* Overall Status */}
          <Card className="p-6 border-0 shadow-md bg-white lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                health.overall === 'healthy' ? 'bg-green-100 text-green-800' :
                health.overall === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {health.overall.toUpperCase()}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-gray-900">{health.uptime}</div>
                <div className="text-sm text-gray-500">Uptime</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{health.responseTime}</div>
                <div className="text-sm text-gray-500">Response Time</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{tenantSystemService.formatErrorRate(health.errorRate)}</div>
                <div className="text-sm text-gray-500">Error Rate</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{health.metrics.activeUsers}</div>
                <div className="text-sm text-gray-500">Active Users</div>
              </div>
            </div>
          </Card>

          {/* Resource Usage */}
          <Card className="p-6 border-0 shadow-md bg-white">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resource Usage</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>CPU</span>
                  <span className={`font-medium ${
                    tenantSystemService.getCpuUsageColor(health.metrics.cpuUsage) === 'green' ? 'text-green-600' :
                    tenantSystemService.getCpuUsageColor(health.metrics.cpuUsage) === 'yellow' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {health.metrics.cpuUsage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      tenantSystemService.getCpuUsageColor(health.metrics.cpuUsage) === 'green' ? 'bg-green-500' :
                      tenantSystemService.getCpuUsageColor(health.metrics.cpuUsage) === 'yellow' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${health.metrics.cpuUsage}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Memory</span>
                  <span className={`font-medium ${
                    tenantSystemService.getMemoryUsageColor(health.metrics.memoryUsage) === 'green' ? 'text-green-600' :
                    tenantSystemService.getMemoryUsageColor(health.metrics.memoryUsage) === 'yellow' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {health.metrics.memoryUsage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      tenantSystemService.getMemoryUsageColor(health.metrics.memoryUsage) === 'green' ? 'bg-green-500' :
                      tenantSystemService.getMemoryUsageColor(health.metrics.memoryUsage) === 'yellow' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${health.metrics.memoryUsage}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Disk</span>
                  <span className={`font-medium ${
                    tenantSystemService.getDiskUsageColor(health.metrics.diskUsage) === 'green' ? 'text-green-600' :
                    tenantSystemService.getDiskUsageColor(health.metrics.diskUsage) === 'yellow' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {health.metrics.diskUsage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      tenantSystemService.getDiskUsageColor(health.metrics.diskUsage) === 'green' ? 'bg-green-500' :
                      tenantSystemService.getDiskUsageColor(health.metrics.diskUsage) === 'yellow' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${health.metrics.diskUsage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </Card>

          {/* Requests */}
          <Card className="p-6 border-0 shadow-md bg-white">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic</h3>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {tenantSystemService.formatNumber(health.metrics.requestsPerMinute)}
                </div>
                <div className="text-sm text-gray-500">Requests/min</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">{health.metrics.networkLatency}ms</div>
                <div className="text-sm text-gray-500">Network Latency</div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Services Status */}
      {health && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 border-0 shadow-md bg-white">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Services Status</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(health.services).map(([serviceName, service]) => (
                <div key={serviceName} className="flex items-center p-4 border border-gray-200 rounded-lg">
                  <div className="flex-shrink-0 mr-3">
                    {serviceName === 'api' && <ServerIcon className="w-8 h-8 text-blue-500" />}
                    {serviceName === 'database' && <CircleStackIcon className="w-8 h-8 text-green-500" />}
                    {serviceName === 'storage' && <CloudIcon className="w-8 h-8 text-purple-500" />}
                    {serviceName === 'email' && <EnvelopeIcon className="w-8 h-8 text-orange-500" />}
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900 capitalize">{serviceName}</h4>
                      <span className={`text-xs ${
                        service.status === 'healthy' ? 'text-green-600' :
                        service.status === 'degraded' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {tenantSystemService.getServiceStatusIcon(service.status)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {service.responseTime} • {service.uptime}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Performance Metrics */}
      {performance && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 border-0 shadow-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
              <select
                value={performancePeriod}
                onChange={(e) => setPerformancePeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {periodOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <div className="text-2xl font-bold text-gray-900">{performance.metrics.responseTime.current}ms</div>
                <div className="text-sm text-gray-500">Response Time</div>
                <div className="text-xs text-gray-400 mt-1">
                  {tenantSystemService.getTrendIndicator(performance.metrics.responseTime.trend)}
                </div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-gray-900">{performance.metrics.throughput.requestsPerSecond}</div>
                <div className="text-sm text-gray-500">Requests/sec</div>
                <div className="text-xs text-gray-400 mt-1">
                  {tenantSystemService.getTrendIndicator(performance.metrics.throughput.trend)}
                </div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {tenantSystemService.formatErrorRate(performance.metrics.errorRate.current)}
                </div>
                <div className="text-sm text-gray-500">Error Rate</div>
                <div className="text-xs text-gray-400 mt-1">
                  {tenantSystemService.getTrendIndicator(performance.metrics.errorRate.trend)}
                </div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-gray-900">{performance.metrics.uptime.current}%</div>
                <div className="text-sm text-gray-500">Uptime</div>
                <div className="text-xs text-gray-400 mt-1">Current</div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Alerts and Incidents */}
      {alerts && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 border-0 shadow-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Alerts & Incidents</h3>
              <select
                value={alertStatus}
                onChange={(e) => setAlertStatus(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {alertStatusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Active Alerts */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Active Alerts ({alerts.active.length})</h4>
                <div className="space-y-2">
                  {alerts.active.slice(0, 3).map((alert) => (
                    <div key={alert.id} className="flex items-start p-3 border border-gray-200 rounded-lg">
                      <div className="flex-shrink-0 mr-3 mt-0.5">
                        <span className="text-lg">{tenantSystemService.getAlertTypeIcon(alert.type)}</span>
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{alert.title}</div>
                        <div className="text-xs text-gray-500 mt-1">{alert.description}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {tenantSystemService.getTimeSince(alert.timestamp)} • {alert.service}
                        </div>
                      </div>
                    </div>
                  ))}
                  {alerts.active.length === 0 && (
                    <div className="text-sm text-gray-500 text-center py-4">No active alerts</div>
                  )}
                </div>
              </div>

              {/* Recent Incidents */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Incidents ({alerts.incidents.length})</h4>
                <div className="space-y-2">
                  {alerts.incidents.slice(0, 3).map((incident) => (
                    <div key={incident.id} className="flex items-start p-3 border border-gray-200 rounded-lg">
                      <div className="flex-shrink-0 mr-3 mt-0.5">
                        <ExclamationTriangleIcon className="w-4 h-4 text-orange-500" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{incident.title}</div>
                        <div className="text-xs text-gray-500 mt-1">{incident.description}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {tenantSystemService.getTimeSince(incident.startedAt)} • {incident.status}
                        </div>
                      </div>
                    </div>
                  ))}
                  {alerts.incidents.length === 0 && (
                    <div className="text-sm text-gray-500 text-center py-4">No recent incidents</div>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Summary</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Alerts</span>
                    <span className="text-sm font-medium text-red-600">{alerts.summary.activeAlerts}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Resolved Alerts</span>
                    <span className="text-sm font-medium text-green-600">{alerts.summary.resolvedAlerts}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Open Incidents</span>
                    <span className="text-sm font-medium text-orange-600">{alerts.summary.openIncidents}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Resolution</span>
                    <span className="text-sm font-medium text-gray-900">{alerts.summary.avgResolutionTime}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Usage Statistics */}
      {usage && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 border-0 shadow-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Usage Statistics</h3>
              <select
                value={usagePeriod}
                onChange={(e) => setUsagePeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {periodOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {tenantSystemService.formatNumber(usage.overview.totalRequests)}
                </div>
                <div className="text-sm text-gray-500">Total Requests</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {tenantSystemService.formatNumber(usage.overview.uniqueUsers)}
                </div>
                <div className="text-sm text-gray-500">Unique Users</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-gray-900">{usage.overview.dataTransferred}</div>
                <div className="text-sm text-gray-500">Data Transferred</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-gray-900">{usage.overview.avgSessionDuration}</div>
                <div className="text-sm text-gray-500">Avg Session</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-gray-900">{usage.overview.peakConcurrentUsers}</div>
                <div className="text-sm text-gray-500">Peak Users</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-gray-900">{usage.overview.apiCallsPerUser}</div>
                <div className="text-sm text-gray-500">API Calls/User</div>
              </div>
            </div>

            {/* Top Endpoints */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Top Endpoints</h4>
                <div className="space-y-2">
                  {usage.endpoints.slice(0, 5).map((endpoint, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{endpoint.path}</div>
                        <div className="text-xs text-gray-500">{endpoint.avgResponseTime}ms avg</div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {tenantSystemService.formatNumber(endpoint.requests)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">User Agents</h4>
                <div className="space-y-2">
                  {usage.userAgents.slice(0, 4).map((agent, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                      <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${agent.percentage}%` }}
                          ></div>
                        </div>
                        <div className="text-sm text-gray-600 w-12 text-right">{agent.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
};
