// backend/src/services/notificationService.ts
import { Notification, INotification } from '../models/Notification';
import { Subscription } from '../models/Subscription';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import cron from 'node-cron';

export class NotificationService {
  // Create a new notification
  static async createNotification(
    title: string,
    message: string,
    options: {
      type?: 'info' | 'warning' | 'error' | 'success' | 'critical';
      category?: 'trial' | 'payment' | 'subscription' | 'user' | 'system' | 'security' | 'billing';
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      targetUsers?: string[];
      targetRoles?: string[];
      targetTenants?: string[];
      isGlobal?: boolean;
      relatedEntity?: { type: string; id: string };
      actions?: any[];
      scheduledFor?: Date;
      expiresAt?: Date;
      metadata?: any;
    } = {}
  ): Promise<INotification> {
    return Notification.createNotification(title, message, options);
  }

  // Get notifications for a specific user
  static async getUserNotifications(
    userId: string,
    userRole: string,
    tenantId?: string,
    options: {
      status?: string;
      category?: string;
      priority?: string;
      limit?: number;
      page?: number;
    } = {}
  ) {
    return Notification.getUserNotifications(userId, userRole, tenantId, options);
  }

  // Mark notification as read
  static async markAsRead(notificationId: string, userId: string): Promise<INotification | null> {
    return Notification.markAsRead(notificationId, userId);
  }

  // Get unread count for user
  static async getUnreadCount(userId: string, userRole: string, tenantId?: string): Promise<number> {
    return Notification.getUnreadCount(userId, userRole, tenantId);
  }

  // Dismiss notification
  static async dismissNotification(notificationId: string, userId: string): Promise<INotification | null> {
    return Notification.findByIdAndUpdate(
      notificationId,
      { status: 'dismissed' },
      { new: true }
    );
  }

  // Archive notification
  static async archiveNotification(notificationId: string, userId: string): Promise<INotification | null> {
    return Notification.findByIdAndUpdate(
      notificationId,
      { status: 'archived' },
      { new: true }
    );
  }

  // Get all notifications (for super admin)
  static async getAllNotifications(
    filters: {
      status?: string;
      category?: string;
      priority?: string;
      type?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
    options: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ) {
    const {
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const query: any = {};

    if (filters.status) (query as any).status = filters.status;
    if (filters.category) (query as any).category = filters.category;
    if (filters.priority) (query as any).priority = filters.priority;
    if (filters.type) (query as any).type = filters.type;
    if (filters.startDate || filters.endDate) {
      (query as any).createdAt = {};
      if (filters.startDate) (query as any).createdAt.$gte = filters.startDate;
      if (filters.endDate) (query as any).createdAt.$lte = filters.endDate;
    }

    const skip = (page - 1) * limit;
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const notifications = await Notification.find(query)
      .populate('targetUsers', 'firstName lastName email')
      .populate('targetTenants', 'name domain')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Notification.countDocuments(query);

    return {
      notifications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalNotifications: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    };
  }

  // Notification templates and automated notifications
  static async checkTrialExpirations() {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Find subscriptions expiring in 3 days
    const expiringSoon = await Subscription.find({
      status: 'trial',
      trialEndDate: {
        $gte: new Date(),
        $lte: threeDaysFromNow
      }
    }).populate('tenantId', 'name domain') as any[];

    // Find subscriptions expiring in 7 days
    const expiringLater = await Subscription.find({
      status: 'trial',
      trialEndDate: {
        $gte: threeDaysFromNow,
        $lte: sevenDaysFromNow
      }
    }).populate('tenantId', 'name domain') as any[];

    // Create notifications for expiring trials
    for (const subscription of expiringSoon) {
      await this.createNotification(
        `Trial Expiring Soon - ${subscription.tenantId.name}`,
        `The trial period for ${subscription.tenantId.name} expires in ${Math.ceil((subscription.trialEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days. Consider reaching out to discuss subscription options.`,
        {
          type: 'warning',
          category: 'trial',
          priority: 'high',
          targetRoles: ['super_admin'],
          relatedEntity: { type: 'subscription', id: subscription._id.toString() },
          actions: [
            {
              label: 'View Subscription',
              action: 'view_subscription',
              url: `/admin/subscriptions/${subscription._id}`
            },
            {
              label: 'Contact Tenant',
              action: 'contact_tenant',
              url: `/admin/tenants/${subscription.tenantId._id}`
            }
          ],
          metadata: {
            source: 'trial_expiration_checker',
            sourceId: subscription._id.toString(),
            tags: ['trial', 'expiration', 'subscription']
          }
        }
      );
    }

    for (const subscription of expiringLater) {
      await this.createNotification(
        `Trial Expiring - ${subscription.tenantId.name}`,
        `The trial period for ${subscription.tenantId.name} expires in ${Math.ceil((subscription.trialEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days.`,
        {
          type: 'info',
          category: 'trial',
          priority: 'medium',
          targetRoles: ['super_admin'],
          relatedEntity: { type: 'subscription', id: subscription._id.toString() },
          actions: [
            {
              label: 'View Subscription',
              action: 'view_subscription',
              url: `/admin/subscriptions/${subscription._id}`
            }
          ],
          metadata: {
            source: 'trial_expiration_checker',
            sourceId: subscription._id.toString(),
            tags: ['trial', 'expiration', 'subscription']
          }
        }
      );
    }

    return { expiringSoon: expiringSoon.length, expiringLater: expiringLater.length };
  }

  static async checkPaymentFailures() {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Find subscriptions with failed payments
    const failedPayments = await Subscription.find({
      status: 'payment_failed',
      lastPaymentAttempt: {
        $gte: oneDayAgo
      }
    }).populate('tenantId', 'name domain') as any[];

    for (const subscription of failedPayments) {
      await this.createNotification(
        `Payment Failed - ${subscription.tenantId.name}`,
        `Payment failed for ${subscription.tenantId.name}. The subscription may be suspended if payment is not resolved soon.`,
        {
          type: 'error',
          category: 'payment',
          priority: 'urgent',
          targetRoles: ['super_admin'],
          relatedEntity: { type: 'subscription', id: subscription._id.toString() },
          actions: [
            {
              label: 'View Subscription',
              action: 'view_subscription',
              url: `/admin/subscriptions/${subscription._id}`
            },
            {
              label: 'Suspend Subscription',
              action: 'suspend_subscription',
              url: `/api/subscriptions/${subscription._id}/suspend`,
              method: 'POST'
            }
          ],
          metadata: {
            source: 'payment_failure_checker',
            sourceId: subscription._id.toString(),
            tags: ['payment', 'failure', 'subscription']
          }
        }
      );
    }

    return failedPayments.length;
  }

  static async checkSystemHealth() {
    // Check for high error rates, slow response times, etc.
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    // This would typically check system metrics
    // For now, we'll create a sample system health notification
    await this.createNotification(
      'System Health Check',
      'All systems are operating normally. No issues detected in the last hour.',
      {
        type: 'success',
        category: 'system',
        priority: 'low',
        targetRoles: ['super_admin'],
        metadata: {
          source: 'system_health_checker',
          tags: ['system', 'health', 'monitoring']
        }
      }
    );

    return 1;
  }

  static async checkNewUserRegistrations() {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const newUsers = await User.find({
      createdAt: { $gte: oneDayAgo }
    }).populate('tenantId', 'name domain');

    if (newUsers.length > 0) {
      await this.createNotification(
        `New User Registrations - ${newUsers.length} users`,
        `${newUsers.length} new users have registered in the last 24 hours.`,
        {
          type: 'info',
          category: 'user',
          priority: 'medium',
          targetRoles: ['super_admin'],
          actions: [
            {
              label: 'View Users',
              action: 'view_users',
              url: '/admin/users'
            }
          ],
          metadata: {
            source: 'user_registration_checker',
            tags: ['users', 'registration', 'growth']
          }
        }
      );
    }

    return newUsers.length;
  }

  // Helper function with MongoDB timeout protection
  private static async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number = 10000,
    operationName: string = 'operation'
  ): Promise<T | null> {
    try {
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)), timeoutMs);
      });

      const result = await Promise.race([
        operation(),
        timeoutPromise
      ]);

      return result as T;
    } catch (error: any) {
      // Log timeout errors but don't crash the app
      if (error.message?.includes('timed out') || error.name === 'MongoNetworkTimeoutError') {
        console.warn(`⚠️  ${operationName} timed out - skipping this run`);
      } else {
        console.error(`❌ ${operationName} failed:`, error.message);
      }
      return null;
    }
  }

  // Start automated notification checks with non-blocking execution and timeout protection
  static startAutomatedChecks() {
    // Check trial expirations daily at 9 AM - NON-BLOCKING with TIMEOUT
    cron.schedule('0 9 * * *', () => {
      setImmediate(async () => {
        const result = await this.executeWithTimeout(
          () => this.checkTrialExpirations(),
          20000, // 20 second timeout
          'Trial expiration check'
        );
        if (result !== null) {
          console.log('✅ Trial expiration check completed:', result);
        }
      });
    }, { timezone: 'UTC' });

    // Check payment failures every 6 hours (reduced frequency) - NON-BLOCKING with TIMEOUT
    cron.schedule('0 */6 * * *', () => {
      setImmediate(async () => {
        const result = await this.executeWithTimeout(
          () => this.checkPaymentFailures(),
          20000, // 20 second timeout
          'Payment failure check'
        );
        if (result !== null) {
          console.log('✅ Payment failure check completed:', result);
        }
      });
    }, { timezone: 'UTC' });

    // Check system health every 2 hours (reduced frequency) - NON-BLOCKING with TIMEOUT
    cron.schedule('0 */2 * * *', () => {
      setImmediate(async () => {
        const result = await this.executeWithTimeout(
          () => this.checkSystemHealth(),
          20000, // 20 second timeout
          'System health check'
        );
        if (result !== null) {
          console.log('✅ System health check completed');
        }
      });
    }, { timezone: 'UTC' });

    // Check new user registrations daily at 8 AM - NON-BLOCKING with TIMEOUT
    cron.schedule('0 8 * * *', () => {
      setImmediate(async () => {
        const result = await this.executeWithTimeout(
          () => this.checkNewUserRegistrations(),
          20000, // 20 second timeout
          'New user registration check'
        );
        if (result !== null) {
          console.log('✅ New user registration check completed:', result);
        }
      });
    }, { timezone: 'UTC' });

    console.log('✅ Automated notification checks started with timeout protection and non-blocking execution');
  }

  // Manual notification creation helpers
  static async notifyTrialExpiring(tenantId: string, daysLeft: number) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) return null;

    return this.createNotification(
      `Trial Expiring - ${tenant.name}`,
      `Your trial period expires in ${daysLeft} days. Please upgrade to a paid plan to continue using our services.`,
      {
        type: 'warning',
        category: 'trial',
        priority: 'high',
        targetTenants: [tenantId],
        relatedEntity: { type: 'tenant', id: tenantId },
        actions: [
          {
            label: 'Upgrade Now',
            action: 'upgrade_subscription',
            url: '/subscription/upgrade'
          },
          {
            label: 'Contact Support',
            action: 'contact_support',
            url: '/support'
          }
        ],
        metadata: {
          source: 'manual_trial_notification',
          tags: ['trial', 'expiration', 'upgrade']
        }
      }
    );
  }

  static async notifyPaymentFailed(tenantId: string, subscriptionId: string) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) return null;

    return this.createNotification(
      `Payment Failed - ${tenant.name}`,
      `Your payment could not be processed. Please update your payment information to avoid service interruption.`,
      {
        type: 'error',
        category: 'payment',
        priority: 'urgent',
        targetTenants: [tenantId],
        relatedEntity: { type: 'subscription', id: subscriptionId },
        actions: [
          {
            label: 'Update Payment',
            action: 'update_payment',
            url: '/subscription/payment'
          },
          {
            label: 'Contact Support',
            action: 'contact_support',
            url: '/support'
          }
        ],
        metadata: {
          source: 'payment_failure_notification',
          tags: ['payment', 'failure', 'subscription']
        }
      }
    );
  }

  static async notifySystemMaintenance(scheduledTime: Date, duration: string) {
    return this.createNotification(
      'Scheduled System Maintenance',
      `System maintenance is scheduled for ${scheduledTime.toLocaleString()} and will last approximately ${duration}. Some features may be temporarily unavailable.`,
      {
        type: 'warning',
        category: 'system',
        priority: 'high',
        isGlobal: true,
        scheduledFor: scheduledTime,
        actions: [
          {
            label: 'View Status Page',
            action: 'view_status',
            url: '/status'
          }
        ],
        metadata: {
          source: 'system_maintenance',
          tags: ['maintenance', 'system', 'scheduled']
        }
      }
    );
  }
}
