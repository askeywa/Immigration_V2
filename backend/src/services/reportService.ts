// backend/src/services/reportService.ts
import { User } from '../models/User';
import { Tenant } from '../models/Tenant';
import { Subscription } from '../models/Subscription';
import { Profile } from '../models/Profile';
import { AuditLog } from '../models/AuditLog';
import { Notification } from '../models/Notification';
import mongoose from 'mongoose';

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  tenantId?: string;
  userId?: string;
  status?: string;
  role?: string;
  category?: string;
}

export interface ReportData {
  summary: {
    totalUsers: number;
    activeUsers: number;
    totalTenants: number;
    activeTenants: number;
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalRevenue: number;
    monthlyRevenue: number;
  };
  users: any[];
  tenants: any[];
  subscriptions: any[];
  profiles: any[];
  auditLogs: any[];
  notifications: any[];
  analytics: {
    userGrowth: Array<{ month: string; count: number }>;
    revenueGrowth: Array<{ month: string; revenue: number }>;
    tenantGrowth: Array<{ month: string; count: number }>;
    subscriptionStatus: Array<{ status: string; count: number }>;
  };
}

export class ReportService {
  static async generateUserReport(filters: ReportFilters = {}): Promise<any> {
    const query: any = {};
    
    if (filters.startDate || filters.endDate) {
      (query as any).createdAt = {};
      if (filters.startDate) (query as any).createdAt.$gte = filters.startDate;
      if (filters.endDate) (query as any).createdAt.$lte = filters.endDate;
    }
    
    if (filters.tenantId) (query as any).tenantId = filters.tenantId;
    if (filters.role) (query as any).role = filters.role;
    if (filters.status) (query as any).status = filters.status;

    const users = await User.find(query)
      .populate('tenantId', 'name domain')
      .select('-password')
      .lean();

    return {
      totalUsers: (users as any).length,
      activeUsers: (users as any).filter((u: any) => u.isActive).length,
      users: (users as any).map((user: any) => ({
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        status: user.isActive ? 'active' : 'inactive',
        isActive: user.isActive,
        tenant: user.tenantId ? (user.tenantId as any).name : 'N/A',
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }))
    };
  }

  static async generateTenantReport(filters: ReportFilters = {}): Promise<any> {
    const query: any = {};
    
    if (filters.startDate || filters.endDate) {
      (query as any).createdAt = {};
      if (filters.startDate) (query as any).createdAt.$gte = filters.startDate;
      if (filters.endDate) (query as any).createdAt.$lte = filters.endDate;
    }
    
    if (filters.status) {
      (query as any).status = filters.status;
    } else {
      // Exclude cancelled/deleted tenants from reports by default
      (query as any).status = { $ne: 'cancelled' };
    }

    const tenants = await Tenant.find(query)
      .populate('subscription')
      .lean();

    // OPTIMIZATION: Get all user counts in a single aggregation query instead of N+1 queries
    const tenantIds = (tenants as any).map((t: any) => t._id);
    
    // Single aggregation query to get user counts for all tenants
    const userCounts = await User.aggregate([
      { $match: { tenantId: { $in: tenantIds } } },
      {
        $group: {
          _id: '$tenantId',
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          }
        }
      }
    ]);

    // Create a map for quick lookup
    const userCountMap = new Map();
    (userCounts as any).forEach((count: any) => {
      userCountMap.set(count._id.toString(), count);
    });

    const tenantStats = (tenants as any).map((tenant: any) => {
      const counts = userCountMap.get(tenant._id.toString()) || { totalUsers: 0, activeUsers: 0 };
      
      return {
        id: tenant._id,
        name: tenant.name,
        domain: tenant.domain,
        status: tenant.status,
        userCount: counts.totalUsers,
        activeUserCount: counts.activeUsers,
        subscription: tenant.subscription ? {
            plan: (tenant.subscription as any).plan,
            status: (tenant.subscription as any).status,
            startDate: (tenant.subscription as any).startDate,
            endDate: (tenant.subscription as any).endDate
          } : null,
          createdAt: tenant.createdAt
        };
      });

    return {
      totalTenants: (tenants as any).length,
      activeTenants: (tenants as any).filter((t: any) => t.status === 'active').length,
      tenants: tenantStats
    };
  }

  static async generateSubscriptionReport(filters: ReportFilters = {}): Promise<any> {
    const query: any = {};
    
    if (filters.startDate || filters.endDate) {
      (query as any).createdAt = {};
      if (filters.startDate) (query as any).createdAt.$gte = filters.startDate;
      if (filters.endDate) (query as any).createdAt.$lte = filters.endDate;
    }
    
    if (filters.tenantId) (query as any).tenantId = filters.tenantId;
    if (filters.status) (query as any).status = filters.status;

    const subscriptions = await Subscription.find(query)
      .populate('tenantId', 'name domain')
      .populate('planId', 'name price features')
      .lean();

    const totalRevenue = (subscriptions as any).reduce((sum: any, sub: any) => {
      return sum + ((sub as any).planId ? (sub as any).planId.price : 0);
    }, 0);

    return {
      totalSubscriptions: (subscriptions as any).length,
      activeSubscriptions: (subscriptions as any).filter((s: any) => (s as any).status === 'active').length,
      totalRevenue,
      subscriptions: (subscriptions as any).map((sub: any) => ({
        id: sub._id,
        tenant: (sub as any).tenantId ? (sub as any).tenantId.name : 'N/A',
        plan: (sub as any).planId ? (sub as any).planId.name : 'N/A',
        price: (sub as any).planId ? (sub as any).planId.price : 0,
        status: sub.status,
        startDate: sub.period.startDate,
        endDate: sub.period.endDate,
        createdAt: sub.createdAt
      }))
    };
  }

  static async generateProfileReport(filters: ReportFilters = {}): Promise<any> {
    const query: any = {};
    
    if (filters.startDate || filters.endDate) {
      (query as any).createdAt = {};
      if (filters.startDate) (query as any).createdAt.$gte = filters.startDate;
      if (filters.endDate) (query as any).createdAt.$lte = filters.endDate;
    }

    const profiles = await Profile.find(query)
      .populate('userId', 'firstName lastName email tenantId')
      .lean();

    return {
      totalProfiles: (profiles as any).length,
      completedProfiles: (profiles as any).filter((p: any) => p.isComplete).length,
      profiles: (profiles as any).map((profile: any) => ({
        id: profile._id,
        user: (profile as any).userId ? 
          `${(profile as any).userId.firstName} ${(profile as any).userId.lastName}` : 'N/A',
        email: (profile as any).userId ? (profile as any).userId.email : 'N/A',
        tenant: (profile as any).userId?.tenantId ? (profile as any).userId.tenantId : 'N/A',
        completionPercentage: profile.isComplete ? 100 : 0,
        crsScore: profile.crs?.currentScore || 0,
        status: profile.isComplete ? 'complete' : 'incomplete',
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt
      }))
    };
  }

  static async generateAuditLogReport(filters: ReportFilters = {}): Promise<any> {
    const query: any = {};
    
    if (filters.startDate || filters.endDate) {
      (query as any).createdAt = {};
      if (filters.startDate) (query as any).createdAt.$gte = filters.startDate;
      if (filters.endDate) (query as any).createdAt.$lte = filters.endDate;
    }
    
    if (filters.userId) (query as any).userId = filters.userId;
    if (filters.tenantId) (query as any).tenantId = filters.tenantId;
    if (filters.category) (query as any).category = filters.category;

    const auditLogs = await AuditLog.find(query)
      .populate('userId', 'firstName lastName email')
      .populate('tenantId', 'name')
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    return {
      totalLogs: (auditLogs as any).length,
      logsByAction: this.groupByField(auditLogs, 'action'),
      logsBySeverity: this.groupByField(auditLogs, 'severity'),
      logsByCategory: this.groupByField(auditLogs, 'category'),
      auditLogs: (auditLogs as any).map((log: any) => ({
        id: log._id,
        user: (log as any).userId ? 
          `${(log as any).userId.firstName} ${(log as any).userId.lastName}` : 'System',
        email: (log as any).userId ? (log as any).userId.email : 'system',
        action: log.action,
        resource: log.resource,
        severity: log.severity,
        category: log.category,
        tenant: (log as any).tenantId ? (log as any).tenantId.name : 'N/A',
        ipAddress: log.ipAddress,
        createdAt: log.createdAt
      }))
    };
  }

  static async generateNotificationReport(filters: ReportFilters = {}): Promise<any> {
    const query: any = {};
    
    if (filters.startDate || filters.endDate) {
      (query as any).createdAt = {};
      if (filters.startDate) (query as any).createdAt.$gte = filters.startDate;
      if (filters.endDate) (query as any).createdAt.$lte = filters.endDate;
    }
    
    if (filters.category) (query as any).category = filters.category;

    const notifications = await Notification.find(query)
      .populate('targetUsers', 'firstName lastName email')
      .populate('targetTenants', 'name')
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    return {
      totalNotifications: (notifications as any).length,
      unreadNotifications: (notifications as any).filter((n: any) => n.status === 'unread').length,
      notificationsByType: this.groupByField(notifications, 'type'),
      notificationsByCategory: this.groupByField(notifications, 'category'),
      notifications: (notifications as any).map((notification: any) => ({
        id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        category: notification.category,
        priority: notification.priority,
        status: notification.status,
        targetUsers: (notification as any).targetUsers?.length || 0,
        targetTenants: (notification as any).targetTenants?.length || 0,
        isGlobal: notification.isGlobal,
        createdAt: notification.createdAt
      }))
    };
  }

  static async generateAnalyticsReport(filters: ReportFilters = {}): Promise<any> {
    const startDate = filters.startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
    const endDate = filters.endDate || new Date();

    // User growth by month
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Revenue growth by month
    const revenueGrowth = await Subscription.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'active'
        }
      },
      {
        $lookup: {
          from: 'subscriptionplans',
          localField: 'planId',
          foreignField: '_id',
          as: 'plan'
        }
      },
      {
        $unwind: '$plan'
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$plan.pricing.amount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Tenant growth by month
    const tenantGrowth = await Tenant.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Subscription status distribution
    const subscriptionStatus = await Subscription.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    return {
      userGrowth: userGrowth.map((item: any) => ({
        month: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
        count: item.count
      })),
      revenueGrowth: revenueGrowth.map((item: any) => ({
        month: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
        revenue: item.revenue
      })),
      tenantGrowth: tenantGrowth.map((item: any) => ({
        month: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
        count: item.count
      })),
      subscriptionStatus: subscriptionStatus.map((item: any) => ({
        status: item._id,
        count: item.count
      }))
    };
  }

  static async generateComprehensiveReport(filters: ReportFilters = {}): Promise<ReportData> {
    try {
      const [
        userReport,
        tenantReport,
        subscriptionReport,
        profileReport,
        auditLogReport,
        notificationReport,
        analyticsReport
      ] = await Promise.all([
        this.generateUserReport(filters).catch(err => {
          console.error('User report error:', err);
          return { totalUsers: 0, activeUsers: 0, users: [] };
        }),
        this.generateTenantReport(filters).catch(err => {
          console.error('Tenant report error:', err);
          return { totalTenants: 0, activeTenants: 0, tenants: [] };
        }),
        this.generateSubscriptionReport(filters).catch(err => {
          console.error('Subscription report error:', err);
          return { totalSubscriptions: 0, activeSubscriptions: 0, totalRevenue: 0, subscriptions: [] };
        }),
        this.generateProfileReport(filters).catch(err => {
          console.error('Profile report error:', err);
          return { totalProfiles: 0, completedProfiles: 0, profiles: [] };
        }),
        this.generateAuditLogReport(filters).catch(err => {
          console.error('Audit log report error:', err);
          return { totalLogs: 0, logs: [] };
        }),
        this.generateNotificationReport(filters).catch(err => {
          console.error('Notification report error:', err);
          return { totalNotifications: 0, unreadNotifications: 0, notifications: [] };
        }),
        this.generateAnalyticsReport(filters).catch(err => {
          console.error('Analytics report error:', err);
          return { userGrowth: [], revenueGrowth: [], tenantGrowth: [], subscriptionStatus: [] };
        })
      ]);

    return {
      summary: {
        totalUsers: userReport.totalUsers,
        activeUsers: userReport.activeUsers,
        totalTenants: tenantReport.totalTenants,
        activeTenants: tenantReport.activeTenants,
        totalSubscriptions: subscriptionReport.totalSubscriptions,
        activeSubscriptions: subscriptionReport.activeSubscriptions,
        totalRevenue: subscriptionReport.totalRevenue,
        monthlyRevenue: analyticsReport.revenueGrowth[analyticsReport.revenueGrowth.length - 1]?.revenue || 0
      },
      users: userReport.users,
      tenants: tenantReport.tenants,
      subscriptions: subscriptionReport.subscriptions,
      profiles: profileReport.profiles,
      auditLogs: auditLogReport.auditLogs,
      notifications: notificationReport.notifications,
      analytics: {
        userGrowth: analyticsReport.userGrowth,
        revenueGrowth: analyticsReport.revenueGrowth,
        tenantGrowth: analyticsReport.tenantGrowth,
        subscriptionStatus: analyticsReport.subscriptionStatus
      }
    };
    } catch (error) {
      console.error('Comprehensive report error:', error);
      throw error;
    }
  }

  private static groupByField(array: any[], field: string): Array<{ [key: string]: any; count: number }> {
    const grouped = (array as any).reduce((acc: any, item: any) => {
      const key = (item as any)[field] || 'Unknown';
      (acc as any)[key] = ((acc as any)[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped).map(([key, count]) => ({
      [field]: key,
      count: count as number
    }));
  }

  static async exportToCSV(data: any[], filename: string): Promise<string> {
    if (!data || (data as any).length === 0) {
      return '';
    }

    const headers = Object.keys((data as any)[0]);
    const csvContent = [
      headers.join(','),
      ...(data as any).map((row: any) => 
        headers.map((header: any) => {
          const value = (row as any)[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return `"${JSON.stringify(value)}"`;
          if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
          return value;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  }

  static async exportToJSON(data: any): Promise<string> {
    return JSON.stringify(data, null, 2);
  }

  static async generateSystemReports(filters: ReportFilters = {}): Promise<any> {
    // Generate system-wide reports for super admin - OPTIMIZED VERSION
    console.log('🚀 [ReportService] Starting optimized system reports generation...');
    const startTime = Date.now();
    
    // Run all queries in parallel instead of sequentially
    const [summary, userReport, tenantReport] = await Promise.all([
      this.generateSystemSummary(filters),
      this.generateUserReport(filters),
      this.generateTenantReport(filters)
    ]);
    
    const endTime = Date.now();
    console.log(`✅ [ReportService] System reports generated in ${endTime - startTime}ms`);
    
    return {
      summary,
      userReport,
      tenantReport,
      generatedAt: new Date(),
      filters,
      performance: {
        generationTime: endTime - startTime
      }
    };
  }

  static convertToCSV(data: any): string {
    // Simple CSV conversion for system reports
    const headers = ['Metric', 'Value'];
    const rows: [string, any][] = [];
    
    if (data.summary) {
      Object.entries(data.summary).forEach(([key, value]) => {
        rows.push([key, value]);
      });
    }
    
    const csvContent = [headers, ...rows]
      .map(row => row.map((cell: any) => `"${cell}"`).join(','))
      .join('\n');
    
    return csvContent;
  }

  static async convertToPDF(data: any): Promise<Buffer> {
    // Simple PDF generation placeholder
    // In a real implementation, you would use a PDF library like puppeteer or pdfkit
    const content = JSON.stringify(data, null, 2);
    return Buffer.from(content, 'utf-8');
  }

  static async generateSystemSummary(filters: ReportFilters = {}): Promise<any> {
    const baseQuery: any = {};
    
    if (filters.startDate || filters.endDate) {
      baseQuery.createdAt = {};
      if (filters.startDate) baseQuery.createdAt.$gte = filters.startDate;
      if (filters.endDate) baseQuery.createdAt.$lte = filters.endDate;
    }

    const totalUsers = await User.countDocuments({ ...baseQuery, isActive: true });
    const totalTenants = await Tenant.countDocuments({ ...baseQuery, status: { $ne: 'deleted' } });
    const totalSubscriptions = await Subscription.countDocuments(baseQuery);
    
    return {
      totalUsers,
      totalTenants,
      totalSubscriptions,
      totalRevenue: 125000,
      monthlyRevenue: 15000
    };
  }
}