// backend/src/controllers/subscriptionController.ts
import { Request, Response } from 'express';
import { SubscriptionService } from '../services/subscriptionService';
import { successResponse, errorResponse } from '../utils/response';

export const getAllSubscriptions = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const result = await SubscriptionService.getAllSubscriptions(page, limit);
    res.json(successResponse('Subscriptions retrieved successfully', result));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to retrieve subscriptions', error));
  }
};

export const getSubscriptionById = async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const subscription = await SubscriptionService.getSubscriptionById(subscriptionId);
    
    if (!subscription) {
      return res.status(404).json(errorResponse('Subscription not found'));
    }
    
    res.json(successResponse('Subscription retrieved successfully', subscription));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to retrieve subscription', error));
  }
};

export const getSubscriptionStats = async (req: Request, res: Response) => {
  try {
    const stats = await SubscriptionService.getSubscriptionStats();
    res.json(successResponse('Subscription stats retrieved successfully', stats));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to retrieve subscription stats', error));
  }
};

export const updateSubscription = async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const updateData = req.body;
    
    const subscription = await SubscriptionService.updateSubscription(subscriptionId, updateData);
    
    if (!subscription) {
      return res.status(404).json(errorResponse('Subscription not found'));
    }
    
    res.json(successResponse('Subscription updated successfully', subscription));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to update subscription', error));
  }
};

export const suspendSubscription = async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const success = await SubscriptionService.suspendSubscription(subscriptionId);
    
    if (!success) {
      return res.status(404).json(errorResponse('Subscription not found'));
    }
    
    res.json(successResponse('Subscription suspended successfully'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to suspend subscription', error));
  }
};

export const activateSubscription = async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const success = await SubscriptionService.activateSubscription(subscriptionId);
    
    if (!success) {
      return res.status(404).json(errorResponse('Subscription not found'));
    }
    
    res.json(successResponse('Subscription activated successfully'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to activate subscription', error));
  }
};

export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const success = await SubscriptionService.cancelSubscription(subscriptionId);
    
    if (!success) {
      return res.status(404).json(errorResponse('Subscription not found'));
    }
    
    res.json(successResponse('Subscription cancelled successfully'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to cancel subscription', error));
  }
};

export const getExpiringSubscriptions = async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const subscriptions = await SubscriptionService.getExpiringSubscriptions(days);
    res.json(successResponse('Expiring subscriptions retrieved successfully', subscriptions));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to retrieve expiring subscriptions', error));
  }
};

export const getRevenueAnalytics = async (req: Request, res: Response) => {
  try {
    const analytics = await SubscriptionService.getRevenueAnalytics();
    res.json(successResponse('Revenue analytics retrieved successfully', analytics));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to retrieve revenue analytics', error));
  }
};

export const getAllPlans = async (req: Request, res: Response) => {
  try {
    const plans = await SubscriptionService.getAllPlans();
    res.json(successResponse('Subscription plans retrieved successfully', plans));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to retrieve subscription plans', error));
  }
};

export const createPlan = async (req: Request, res: Response) => {
  try {
    const planData = req.body;
    const plan = await SubscriptionService.createPlan(planData);
    res.json(successResponse('Subscription plan created successfully', plan));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to create subscription plan', error));
  }
};

export const updatePlan = async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    const updateData = req.body;
    
    const plan = await SubscriptionService.updatePlan(planId, updateData);
    
    if (!plan) {
      return res.status(404).json(errorResponse('Subscription plan not found'));
    }
    
    res.json(successResponse('Subscription plan updated successfully', plan));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to update subscription plan', error));
  }
};

export const deletePlan = async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    const success = await SubscriptionService.deletePlan(planId);
    
    if (!success) {
      return res.status(404).json(errorResponse('Subscription plan not found'));
    }
    
    res.json(successResponse('Subscription plan deleted successfully'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to delete subscription plan', error));
  }
};
