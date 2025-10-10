// backend/src/routes/notificationRoutes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  dismissNotification,
  archiveNotification,
  getAllNotifications,
  createNotification,
  runAutomatedChecks,
  notifyTrialExpiring,
  notifyPaymentFailed,
  notifySystemMaintenance
} from '../controllers/notificationController';

const router = Router();

// User notification routes (require authentication)
router.use(authenticate);
router.use(authorize('super_admin', 'admin', 'user'));

// Get user's notifications
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/:notificationId/read', markAsRead);
router.put('/:notificationId/dismiss', dismissNotification);
router.put('/:notificationId/archive', archiveNotification);

// Super admin only routes
router.use(authorize('super_admin'));

// Get all notifications (super admin)
router.get('/admin/all', getAllNotifications);

// Create notification (super admin)
router.post('/admin/create', createNotification);

// Run automated checks (super admin)
router.post('/admin/run-checks', runAutomatedChecks);

// Manual notification triggers (super admin)
router.post('/admin/trial-expiring', notifyTrialExpiring);
router.post('/admin/payment-failed', notifyPaymentFailed);
router.post('/admin/system-maintenance', notifySystemMaintenance);

export default router;
