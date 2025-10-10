// Performance Monitoring Dashboard for Super Admin
// NOTE: This component is already lazy-loaded via React.lazy() in RouteGroups.tsx
// Recharts (350+ KB) will only load when user navigates to this page
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { superAdminApi } from '@/services/superAdminApi';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface PerformanceMetrics {
  system: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
      process: {
        heapUsed: number;
        heapTotal: number;
        external: number;
        rss: number;
      };
    };
    cpu: {
      usage: number;
      user: number;
      system: number;
    };
  };
  cache: {
    redis: {
      connected: boolean;
      hits: number;
      misses: number;
      hitRate: number;
      keys: number;
    };
    local: {
      size: number;
      hits: number;
      misses: number;
      hitRate: number;
    };
  };
  api: {
    totalRequests: number;
    averageResponseTime: number;
    slowestEndpoints: Array<{
      endpoint: string;
      avgTime: number;
      count: number;
    }>;
    errorRate: number;
    recentRequests?: Array<{
      url: string;
      method: string;
      statusCode: number;
      duration: number;
    }>;
  };
  database: {
    connected: boolean;
    avgQueryTime: number;
    activeConnections: number;
    slowQueries: number;
    collections?: number;
    dataSize?: number;
  };
}

export const PerformanceMonitoring: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<'5m' | '15m' | '1h'>('15m');
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'detailed'>('overview');

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await superAdminApi.get('/super-admin/performance/metrics');
      const newMetrics = response.data.data;
      setMetrics(newMetrics);
      setLastUpdated(new Date());
      
      // Add to historical data
      if (newMetrics) {
        setHistoricalData(prev => {
          const newData = [...prev, {
            timestamp: new Date().toLocaleTimeString(),
            memory: newMetrics.system.memory.percentage,
            cpu: newMetrics.system.cpu.usage,
            apiResponseTime: newMetrics.api.averageResponseTime,
            errorRate: newMetrics.api.errorRate,
            cacheHitRate: newMetrics.cache.redis.hitRate,
            localCacheHitRate: newMetrics.cache.local.hitRate
          }];
          
          // Keep only last 20 data points
          return newData.slice(-20);
        });
      }
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  // Computed metrics - MUST be before any conditional returns (React Rules of Hooks)
  const cacheDistribution = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: 'Redis Hits', value: metrics.cache.redis.hits, color: '#10b981' },
      { name: 'Redis Misses', value: metrics.cache.redis.misses, color: '#ef4444' },
      { name: 'Local Hits', value: metrics.cache.local.hits, color: '#3b82f6' },
      { name: 'Local Misses', value: metrics.cache.local.misses, color: '#f59e0b' }
    ];
  }, [metrics]);

  const performanceScore = useMemo(() => {
    if (!metrics) return 0;
    const memoryScore = (100 - metrics.system.memory.percentage) * 0.3;
    const cpuScore = (100 - metrics.system.cpu.usage) * 0.3;
    const cacheScore = (metrics.cache.redis.hitRate + metrics.cache.local.hitRate) / 2 * 0.2;
    const apiScore = Math.max(0, 100 - (metrics.api.averageResponseTime / 10)) * 0.2;
    return Math.round(memoryScore + cpuScore + cacheScore + apiScore);
  }, [metrics]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading performance metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Performance Monitoring
              <span className={`ml-4 text-2xl px-3 py-1 rounded-full ${
                performanceScore >= 80 ? 'bg-green-100 text-green-800' :
                performanceScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                Score: {performanceScore}/100
              </span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Real-time application performance metrics and analytics
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg ${
                autoRefresh
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
              }`}
            >
              {autoRefresh ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
            </Button>
            <Button
              onClick={fetchMetrics}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              {loading ? '⏳ Refreshing...' : '🔄 Refresh Now'}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setActiveTab('charts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'charts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📈 Trends & Charts
            </button>
            <button
              onClick={() => setActiveTab('detailed')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'detailed'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🔍 Detailed Analytics
            </button>
          </nav>
        </div>
      </div>

      {metrics && (
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
          {/* System Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  System Uptime
                </h3>
                <div className="text-3xl">⏱️</div>
              </div>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {formatUptime(metrics.system.uptime)}
              </div>
              <div className="text-sm text-gray-500">
                Server has been running continuously
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Memory Usage
                </h3>
                <div className="text-3xl">🧠</div>
              </div>
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {metrics.system.memory.percentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">
                {formatBytes(metrics.system.memory.used)} / {formatBytes(metrics.system.memory.total)}
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    metrics.system.memory.percentage > 80
                      ? 'bg-red-500'
                      : metrics.system.memory.percentage > 60
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${metrics.system.memory.percentage}%` }}
                ></div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  CPU Usage
                </h3>
                <div className="text-3xl">⚡</div>
              </div>
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {metrics.system.cpu.usage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">
                Current processor utilization
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    metrics.system.cpu.usage > 80
                      ? 'bg-red-500'
                      : metrics.system.cpu.usage > 60
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${metrics.system.cpu.usage}%` }}
                ></div>
              </div>
            </Card>
          </div>

          {/* Cache Performance */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Cache Performance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Redis Cache */}
              <div className="border-r border-gray-200 dark:border-gray-700 pr-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                    Redis Cache
                  </h4>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      metrics.cache.redis.connected
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {metrics.cache.redis.connected ? '✅ Connected' : '❌ Disconnected'}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Hit Rate:</span>
                    <span className="text-lg font-bold text-green-600">
                      {metrics.cache.redis.hitRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Total Hits:</span>
                    <span className="font-medium">{metrics.cache.redis.hits.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Total Misses:</span>
                    <span className="font-medium">{metrics.cache.redis.misses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Cached Keys:</span>
                    <span className="font-medium">{metrics.cache.redis.keys.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Local Cache */}
              <div className="pl-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                    Local Cache
                  </h4>
                  <div className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    ✅ Active
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Hit Rate:</span>
                    <span className="text-lg font-bold text-blue-600">
                      {metrics.cache.local.hitRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Total Hits:</span>
                    <span className="font-medium">{metrics.cache.local.hits.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Total Misses:</span>
                    <span className="font-medium">{metrics.cache.local.misses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Cache Size:</span>
                    <span className="font-medium">{metrics.cache.local.size.toLocaleString()} items</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* API Performance */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              API Performance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Requests</div>
                <div className="text-2xl font-bold text-blue-600">
                  {metrics.api.totalRequests.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Response Time</div>
                <div className="text-2xl font-bold text-green-600">
                  {metrics.api.averageResponseTime.toFixed(0)}ms
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Error Rate</div>
                <div className="text-2xl font-bold text-red-600">
                  {metrics.api.errorRate.toFixed(2)}%
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
                Slowest Endpoints
              </h4>
              <div className="space-y-2">
                {metrics.api.slowestEndpoints.slice(0, 5).map((endpoint, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-mono text-sm text-gray-900 dark:text-white">
                        {endpoint.endpoint}
                      </div>
                      <div className="text-xs text-gray-500">
                        {endpoint.count} requests
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-orange-600">
                        {endpoint.avgTime.toFixed(0)}ms
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Database Performance */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Database Performance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</div>
                <div
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    metrics.database.connected
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {metrics.database.connected ? '✅ Connected' : '❌ Disconnected'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Query Time</div>
                <div className="text-2xl font-bold text-blue-600">
                  {metrics.database.avgQueryTime.toFixed(0)}ms
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Connections</div>
                <div className="text-2xl font-bold text-purple-600">
                  {metrics.database.activeConnections}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Slow Queries</div>
                <div className="text-2xl font-bold text-orange-600">
                  {metrics.database.slowQueries}
                </div>
              </div>
            </div>
          </Card>
            </>
          )}

          {/* Charts Tab */}
          {activeTab === 'charts' && historicalData.length > 0 && (
            <>
              {/* Historical Trends */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Memory & CPU Trend */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Memory & CPU Usage Over Time
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={historicalData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="memory" stroke="#8b5cf6" name="Memory %" />
                      <Line type="monotone" dataKey="cpu" stroke="#f59e0b" name="CPU %" />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>

                {/* API Response Time Trend */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    API Response Time Trend
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={historicalData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="apiResponseTime" 
                        stroke="#3b82f6" 
                        fill="#93c5fd" 
                        name="Response Time (ms)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>

                {/* Cache Hit Rate Trend */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Cache Hit Rate Trend
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={historicalData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="cacheHitRate" stroke="#10b981" name="Redis Hit Rate %" />
                      <Line type="monotone" dataKey="localCacheHitRate" stroke="#3b82f6" name="Local Hit Rate %" />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>

                {/* Error Rate Trend */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Error Rate Trend
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={historicalData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="errorRate" 
                        stroke="#ef4444" 
                        fill="#fca5a5" 
                        name="Error Rate %" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              {/* Cache Distribution Pie Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Cache Distribution
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={cacheDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: any) => `${entry.name}: ${entry.value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {cacheDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>

                {/* Performance Score Gauge */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Performance Score Breakdown
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600">Memory Efficiency</span>
                        <span className="text-sm font-medium">{Math.round((100 - metrics.system.memory.percentage) * 0.3)}/30</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-purple-600 h-3 rounded-full" 
                          style={{ width: `${(100 - metrics.system.memory.percentage)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600">CPU Efficiency</span>
                        <span className="text-sm font-medium">{Math.round((100 - metrics.system.cpu.usage) * 0.3)}/30</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-orange-600 h-3 rounded-full" 
                          style={{ width: `${(100 - metrics.system.cpu.usage)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600">Cache Performance</span>
                        <span className="text-sm font-medium">{Math.round((metrics.cache.redis.hitRate + metrics.cache.local.hitRate) / 2 * 0.2)}/20</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-green-600 h-3 rounded-full" 
                          style={{ width: `${(metrics.cache.redis.hitRate + metrics.cache.local.hitRate) / 2}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600">API Response Time</span>
                        <span className="text-sm font-medium">{Math.round(Math.max(0, 100 - (metrics.api.averageResponseTime / 10)) * 0.2)}/20</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-blue-600 h-3 rounded-full" 
                          style={{ width: `${Math.max(0, 100 - (metrics.api.averageResponseTime / 10))}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          )}

          {/* Detailed Analytics Tab */}
          {activeTab === 'detailed' && (
            <>
              {/* Recent API Requests */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Recent API Requests (Last 20)
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {metrics.api.recentRequests?.map((req: any, idx: number) => (
                        <tr key={idx} className={req.statusCode >= 400 ? 'bg-red-50' : ''}>
                          <td className="px-4 py-3 text-sm font-mono text-gray-900">{req.url}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{req.method}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              req.statusCode < 300 ? 'bg-green-100 text-green-800' :
                              req.statusCode < 400 ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {req.statusCode}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{req.duration}ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* System Health Indicators */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Memory Health
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Heap Used</span>
                      <span className="font-medium">{formatBytes(metrics.system.memory.process.heapUsed)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Heap Total</span>
                      <span className="font-medium">{formatBytes(metrics.system.memory.process.heapTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">RSS</span>
                      <span className="font-medium">{formatBytes(metrics.system.memory.process.rss)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">External</span>
                      <span className="font-medium">{formatBytes(metrics.system.memory.process.external)}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    CPU Health
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Usage</span>
                      <span className="font-medium">{metrics.system.cpu.usage.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">User Time</span>
                      <span className="font-medium">{(metrics.system.cpu.user / 1000000).toFixed(2)}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">System Time</span>
                      <span className="font-medium">{(metrics.system.cpu.system / 1000000).toFixed(2)}s</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Database Health
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Collections</span>
                      <span className="font-medium">{metrics.database.collections || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Data Size</span>
                      <span className="font-medium">{formatBytes(metrics.database.dataSize || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Connections</span>
                      <span className="font-medium">{metrics.database.activeConnections}</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Alerts & Recommendations */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Performance Recommendations
                </h3>
                <div className="space-y-3">
                  {metrics.system.memory.percentage > 80 && (
                    <div className="flex items-start p-3 bg-red-50 border border-red-200 rounded-lg">
                      <span className="text-red-600 mr-3">⚠️</span>
                      <div>
                        <div className="font-medium text-red-900">High Memory Usage</div>
                        <div className="text-sm text-red-700">Memory usage is above 80%. Consider scaling or optimizing memory usage.</div>
                      </div>
                    </div>
                  )}
                  {metrics.system.cpu.usage > 80 && (
                    <div className="flex items-start p-3 bg-red-50 border border-red-200 rounded-lg">
                      <span className="text-red-600 mr-3">⚠️</span>
                      <div>
                        <div className="font-medium text-red-900">High CPU Usage</div>
                        <div className="text-sm text-red-700">CPU usage is above 80%. Consider scaling or optimizing CPU-intensive operations.</div>
                      </div>
                    </div>
                  )}
                  {metrics.cache.redis.hitRate < 50 && (
                    <div className="flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <span className="text-yellow-600 mr-3">⚠️</span>
                      <div>
                        <div className="font-medium text-yellow-900">Low Cache Hit Rate</div>
                        <div className="text-sm text-yellow-700">Redis cache hit rate is below 50%. Consider reviewing cache strategy.</div>
                      </div>
                    </div>
                  )}
                  {metrics.api.averageResponseTime > 500 && (
                    <div className="flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <span className="text-yellow-600 mr-3">⚠️</span>
                      <div>
                        <div className="font-medium text-yellow-900">Slow API Response Time</div>
                        <div className="text-sm text-yellow-700">Average API response time is above 500ms. Consider optimizing slow endpoints.</div>
                      </div>
                    </div>
                  )}
                  {metrics.api.errorRate > 5 && (
                    <div className="flex items-start p-3 bg-red-50 border border-red-200 rounded-lg">
                      <span className="text-red-600 mr-3">⚠️</span>
                      <div>
                        <div className="font-medium text-red-900">High Error Rate</div>
                        <div className="text-sm text-red-700">Error rate is above 5%. Review recent errors and fix critical issues.</div>
                      </div>
                    </div>
                  )}
                  {performanceScore >= 80 && (
                    <div className="flex items-start p-3 bg-green-50 border border-green-200 rounded-lg">
                      <span className="text-green-600 mr-3">✅</span>
                      <div>
                        <div className="font-medium text-green-900">Excellent Performance</div>
                        <div className="text-sm text-green-700">System is performing well across all metrics. Keep monitoring for optimal performance.</div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}

          {/* Empty State for Charts */}
          {activeTab === 'charts' && historicalData.length === 0 && (
            <Card className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Historical Data Yet</h3>
              <p className="text-gray-500 mb-4">
                Historical data will appear here as the system collects metrics over time.
                Keep auto-refresh enabled to see trends.
              </p>
              <Button onClick={fetchMetrics} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                Start Collecting Data
              </Button>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitoring;
