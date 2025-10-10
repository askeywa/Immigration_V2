// backend/src/routes/subscriptionRoutes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getAllSubscriptions,
  getSubscriptionById,
  getSubscriptionStats,
  updateSubscription,
  suspendSubscription,
  activateSubscription,
  cancelSubscription,
  getExpiringSubscriptions,
  getRevenueAnalytics,
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan
} from '../controllers/subscriptionController';

const router = Router();

// All routes require authentication and super admin authorization
router.use(authenticate);
router.use(authorize('super_admin'));

// Subscription management routes
router.get('/', getAllSubscriptions);
router.get('/stats', getSubscriptionStats);
router.get('/analytics/revenue', getRevenueAnalytics);
router.get('/expiring', getExpiringSubscriptions);
router.get('/:subscriptionId', getSubscriptionById);
router.put('/:subscriptionId', updateSubscription);
router.patch('/:subscriptionId/suspend', suspendSubscription);
router.patch('/:subscriptionId/activate', activateSubscription);
router.patch('/:subscriptionId/cancel', cancelSubscription);

// Subscription plan management routes
router.get('/plans/all', getAllPlans);
router.post('/plans', createPlan);
router.put('/plans/:planId', updatePlan);
router.delete('/plans/:planId', deletePlan);

export default router;
