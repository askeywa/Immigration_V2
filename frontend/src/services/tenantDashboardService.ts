import { api } from './api';

export interface TenantStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  totalDocuments: number;
  pendingDocuments: number;
  monthlyRevenue: number;
  systemUptime: number;
  lastUpdated: string;
}

export interface TenantActivity {
  _id: string;
  type: string;
  description: string;
  timestamp: string;
  severity: string;
  user?: {
    name: string;
    email: string;
  };
}

export interface TenantAnalytics {
  userGrowth: {
    chart: Array<{
      date: string;
      users: number;
    }>;
    total: number;
    growth: string;
  };
  documentProcessing: {
    total: number;
    pending: number;
    completed: number;
    avgProcessingTime: string;
  };
  systemPerformance: {
    uptime: number;
    responseTime: string;
    errorRate: number;
  };
  revenue: {
    current: number;
    previous: number;
    growth: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

class TenantDashboardService {
  /**
   * Get tenant dashboard statistics
   */
  async getTenantStats(): Promise<TenantStats> {
    try {
      const response = await api.get<ApiResponse<TenantStats>>('/tenant/dashboard/stats');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch tenant stats:', error);
      throw error;
    }
  }

  /**
   * Get tenant recent activity
   */
  async getTenantActivity(limit: number = 10): Promise<TenantActivity[]> {
    try {
      const response = await api.get<ApiResponse<TenantActivity[]>>('/tenant/dashboard/activity', {
        params: { limit }
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch tenant activity:', error);
      throw error;
    }
  }

  /**
   * Get tenant analytics data
   */
  async getTenantAnalytics(period: string = '30d'): Promise<TenantAnalytics> {
    try {
      const response = await api.get<ApiResponse<TenantAnalytics>>('/tenant/analytics', {
        params: { period }
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch tenant analytics:', error);
      throw error;
    }
  }

  /**
   * Get all tenant dashboard data at once
   */
  async getAllDashboardData() {
    try {
      const [stats, activity, analytics] = await Promise.all([
        this.getTenantStats(),
        this.getTenantActivity(),
        this.getTenantAnalytics()
      ]);

      return {
        stats,
        activity,
        analytics
      };
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      throw error;
    }
  }
}

export const tenantDashboardService = new TenantDashboardService();
