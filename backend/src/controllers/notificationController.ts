// backend/src/controllers/notificationController.ts
import { Request, Response } from 'express';
import { NotificationService } from '../services/notificationService';
import { successResponse, errorResponse } from '../utils/response';

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      status = 'unread',
      category,
      priority,
      limit = 20,
      page = 1
    } = (req as any).query;

    const result = await NotificationService.getUserNotifications(
      user._id,
      user.role,
      user.tenantId,
      {
        status: status as string,
        category: category as string,
        priority: priority as string,
        limit: parseInt(limit as string),
        page: parseInt(page as string)
      }
    );

    (res as any).json(successResponse('Notifications retrieved successfully', result));
  } catch (error) {
    (res as any).status(500).json(errorResponse('Failed to retrieve notifications', error));
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const count = await NotificationService.getUnreadCount(user._id, user.role, user.tenantId);
    (res as any).json(successResponse('Unread count retrieved successfully', { count }));
  } catch (error) {
    (res as any).status(500).json(errorResponse('Failed to retrieve unread count', error));
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { notificationId } = (req as any).params;
    const user = (req as any).user;
    
    const notification = await NotificationService.markAsRead(notificationId, user._id);
    if (!notification) {
      return (res as any).status(404).json(errorResponse('Notification not found'));
    }

    (res as any).json(successResponse('Notification marked as read', notification));
  } catch (error) {
    (res as any).status(500).json(errorResponse('Failed to mark notification as read', error));
  }
};

export const dismissNotification = async (req: Request, res: Response) => {
  try {
    const { notificationId } = (req as any).params;
    const user = (req as any).user;
    
    const notification = await NotificationService.dismissNotification(notificationId, user._id);
    if (!notification) {
      return (res as any).status(404).json(errorResponse('Notification not found'));
    }

    (res as any).json(successResponse('Notification dismissed', notification));
  } catch (error) {
    (res as any).status(500).json(errorResponse('Failed to dismiss notification', error));
  }
};

export const archiveNotification = async (req: Request, res: Response) => {
  try {
    const { notificationId } = (req as any).params;
    const user = (req as any).user;
    
    const notification = await NotificationService.archiveNotification(notificationId, user._id);
    if (!notification) {
      return (res as any).status(404).json(errorResponse('Notification not found'));
    }

    (res as any).json(successResponse('Notification archived', notification));
  } catch (error) {
    (res as any).status(500).json(errorResponse('Failed to archive notification', error));
  }
};

// Super admin only endpoints
export const getAllNotifications = async (req: Request, res: Response) => {
  try {
    const {
      status,
      category,
      priority,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = (req as any).query;

    const filters: any = {};
    if (status) (filters as any).status = status as string;
    if (category) (filters as any).category = category as string;
    if (priority) (filters as any).priority = priority as string;
    if (type) (filters as any).type = type as string;
    if (startDate) (filters as any).startDate = new Date(startDate as string);
    if (endDate) (filters as any).endDate = new Date(endDate as string);

    const options = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    };

    const result = await NotificationService.getAllNotifications(filters, options);
    (res as any).json(successResponse('All notifications retrieved successfully', result));
  } catch (error) {
    (res as any).status(500).json(errorResponse('Failed to retrieve all notifications', error));
  }
};

export const createNotification = async (req: Request, res: Response) => {
  try {
    const {
      title,
      message,
      type = 'info',
      category = 'system',
      priority = 'medium',
      targetUsers,
      targetRoles,
      targetTenants,
      isGlobal = false,
      relatedEntity,
      actions,
      scheduledFor,
      expiresAt,
      metadata
    } = (req as any).body;

    const notification = await NotificationService.createNotification(title, message, {
      type,
      category,
      priority,
      targetUsers,
      targetRoles,
      targetTenants,
      isGlobal,
      relatedEntity,
      actions,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      metadata
    });

    (res as any).status(201).json(successResponse('Notification created successfully', notification));
  } catch (error) {
    (res as any).status(500).json(errorResponse('Failed to create notification', error));
  }
};

export const runAutomatedChecks = async (req: Request, res: Response) => {
  try {
    const [trialResults, paymentResults, systemResults, userResults] = await Promise.all([
      NotificationService.checkTrialExpirations(),
      NotificationService.checkPaymentFailures(),
      NotificationService.checkSystemHealth(),
      NotificationService.checkNewUserRegistrations()
    ]);

    (res as any).json(successResponse('Automated checks completed', {
      trialExpirations: trialResults,
      paymentFailures: paymentResults,
      systemHealth: systemResults,
      newUserRegistrations: userResults
    }));
  } catch (error) {
    (res as any).status(500).json(errorResponse('Failed to run automated checks', error));
  }
};

export const notifyTrialExpiring = async (req: Request, res: Response) => {
  try {
    const { tenantId, daysLeft } = (req as any).body;
    const notification = await NotificationService.notifyTrialExpiring(tenantId, daysLeft);
    (res as any).json(successResponse('Trial expiration notification sent', notification));
  } catch (error) {
    (res as any).status(500).json(errorResponse('Failed to send trial expiration notification', error));
  }
};

export const notifyPaymentFailed = async (req: Request, res: Response) => {
  try {
    const { tenantId, subscriptionId } = (req as any).body;
    const notification = await NotificationService.notifyPaymentFailed(tenantId, subscriptionId);
    (res as any).json(successResponse('Payment failure notification sent', notification));
  } catch (error) {
    (res as any).status(500).json(errorResponse('Failed to send payment failure notification', error));
  }
};

export const notifySystemMaintenance = async (req: Request, res: Response) => {
  try {
    const { scheduledTime, duration } = (req as any).body;
    const notification = await NotificationService.notifySystemMaintenance(
      new Date(scheduledTime),
      duration
    );
    (res as any).json(successResponse('System maintenance notification sent', notification));
  } catch (error) {
    (res as any).status(500).json(errorResponse('Failed to send system maintenance notification', error));
  }
};
