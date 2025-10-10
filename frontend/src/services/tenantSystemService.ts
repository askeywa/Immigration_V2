import { api } from './api';

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'down';
  status: 'operational' | 'maintenance' | 'incident';
  lastChecked: string;
  uptime: string;
  responseTime: string;
  errorRate: number;
  services: {
    api: ServiceStatus;
    database: ServiceStatus;
    storage: ServiceStatus;
    email: ServiceStatus;
  };
  metrics: {
    requestsPerMinute: number;
    activeUsers: number;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
  };
  alerts: any[];
  incidents: any[];
}

export interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'down';
  responseTime: string;
  uptime: string;
  connections?: number;
  usedSpace?: string;
  lastIncident?: string | null;
}

export interface SystemPerformance {
  period: string;
  metrics: {
    responseTime: {
      current: number;
      average: number;
      p95: number;
      p99: number;
      trend: string;
    };
    throughput: {
      requestsPerSecond: number;
      requestsPerMinute: number;
      requestsPerHour: number;
      trend: string;
    };
    errorRate: {
      current: number;
      average: number;
      trend: string;
    };
    uptime: {
      current: number;
      last24h: number;
      last7d: number;
      last30d: number;
    };
  };
  charts: {
    responseTime: Array<{ timestamp: string; value: number }>;
    throughput: Array<{ timestamp: string; value: number }>;
    errorRate: Array<{ timestamp: string; value: number }>;
  };
  lastUpdated: string;
}

export interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'critical';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  service: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface SystemIncident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved';
  startedAt: string;
  resolvedAt?: string;
  duration?: string;
  affectedServices: string[];
  impact: string;
}

export interface SystemAlerts {
  active: SystemAlert[];
  resolved: SystemAlert[];
  incidents: SystemIncident[];
  summary: {
    activeAlerts: number;
    resolvedAlerts: number;
    openIncidents: number;
    resolvedIncidents: number;
    avgResolutionTime: string;
  };
  lastUpdated: string;
}

export interface SystemUsage {
  period: string;
  overview: {
    totalRequests: number;
    uniqueUsers: number;
    dataTransferred: string;
    avgSessionDuration: string;
    peakConcurrentUsers: number;
    apiCallsPerUser: number;
  };
  trends: {
    requests: Array<{ date: string; count: number }>;
    users: Array<{ date: string; count: number }>;
  };
  endpoints: Array<{
    path: string;
    requests: number;
    avgResponseTime: number;
  }>;
  userAgents: Array<{
    name: string;
    percentage: number;
    requests: number;
  }>;
  geolocation: Array<{
    country: string;
    percentage: number;
    users: number;
  }>;
  lastUpdated: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

class TenantSystemService {
  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const response = await api.get<ApiResponse<SystemHealth>>('/tenant/system/health');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      throw error;
    }
  }

  /**
   * Get system performance metrics
   */
  async getSystemPerformance(period: string = '24h'): Promise<SystemPerformance> {
    try {
      const response = await api.get<ApiResponse<SystemPerformance>>(`/tenant/system/performance?period=${period}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch system performance:', error);
      throw error;
    }
  }

  /**
   * Get system alerts and incidents
   */
  async getSystemAlerts(status?: 'active' | 'resolved' | 'all'): Promise<SystemAlerts> {
    try {
      const params = status ? `?status=${status}` : '';
      const response = await api.get<ApiResponse<SystemAlerts>>(`/tenant/system/alerts${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch system alerts:', error);
      throw error;
    }
  }

  /**
   * Get system usage statistics
   */
  async getSystemUsage(period: string = '30d'): Promise<SystemUsage> {
    try {
      const response = await api.get<ApiResponse<SystemUsage>>(`/tenant/system/usage?period=${period}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch system usage:', error);
      throw error;
    }
  }

  /**
   * Get system status color
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'healthy':
      case 'operational':
        return 'green';
      case 'degraded':
      case 'maintenance':
        return 'yellow';
      case 'down':
      case 'incident':
        return 'red';
      default:
        return 'gray';
    }
  }

  /**
   * Get alert severity color
   */
  getAlertSeverityColor(severity: string): string {
    switch (severity) {
      case 'low':
        return 'blue';
      case 'medium':
        return 'yellow';
      case 'high':
        return 'orange';
      case 'critical':
        return 'red';
      default:
        return 'gray';
    }
  }

  /**
   * Get alert type icon
   */
  getAlertTypeIcon(type: string): string {
    switch (type) {
      case 'info':
        return 'ℹ️';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'critical':
        return '🚨';
      default:
        return '📢';
    }
  }

  /**
   * Get service status icon
   */
  getServiceStatusIcon(status: string): string {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'degraded':
        return '⚠️';
      case 'down':
        return '❌';
      default:
        return '❓';
    }
  }

  /**
   * Format uptime percentage
   */
  formatUptime(uptime: string): string {
    const num = parseFloat(uptime.replace('%', ''));
    if (num >= 99.9) return `${uptime} 🟢`;
    if (num >= 99.0) return `${uptime} 🟡`;
    return `${uptime} 🔴`;
  }

  /**
   * Format response time
   */
  formatResponseTime(responseTime: string): string {
    const num = parseFloat(responseTime.replace('ms', ''));
    if (num <= 200) return `${responseTime} 🟢`;
    if (num <= 500) return `${responseTime} 🟡`;
    return `${responseTime} 🔴`;
  }

  /**
   * Format error rate
   */
  formatErrorRate(errorRate: number): string {
    const percentage = (errorRate * 100).toFixed(2);
    if (errorRate <= 0.01) return `${percentage}% 🟢`;
    if (errorRate <= 0.05) return `${percentage}% 🟡`;
    return `${percentage}% 🔴`;
  }

  /**
   * Get trend indicator
   */
  getTrendIndicator(trend: string): string {
    if (trend.startsWith('+')) return `↗️ ${trend}`;
    if (trend.startsWith('-')) return `↘️ ${trend}`;
    return `➡️ ${trend}`;
  }

  /**
   * Format large numbers
   */
  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  /**
   * Get period options
   */
  getPeriodOptions() {
    return [
      { value: '1h', label: 'Last Hour' },
      { value: '24h', label: 'Last 24 Hours' },
      { value: '7d', label: 'Last 7 Days' },
      { value: '30d', label: 'Last 30 Days' },
      { value: '90d', label: 'Last 90 Days' }
    ];
  }

  /**
   * Get alert status options
   */
  getAlertStatusOptions() {
    return [
      { value: 'all', label: 'All Alerts' },
      { value: 'active', label: 'Active Only' },
      { value: 'resolved', label: 'Resolved Only' }
    ];
  }

  /**
   * Calculate time since timestamp
   */
  getTimeSince(timestamp: string): string {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  /**
   * Get CPU usage color
   */
  getCpuUsageColor(usage: number): string {
    if (usage <= 50) return 'green';
    if (usage <= 80) return 'yellow';
    return 'red';
  }

  /**
   * Get memory usage color
   */
  getMemoryUsageColor(usage: number): string {
    if (usage <= 60) return 'green';
    if (usage <= 85) return 'yellow';
    return 'red';
  }

  /**
   * Get disk usage color
   */
  getDiskUsageColor(usage: number): string {
    if (usage <= 70) return 'green';
    if (usage <= 90) return 'yellow';
    return 'red';
  }
}

export const tenantSystemService = new TenantSystemService();
