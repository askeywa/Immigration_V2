// backend/src/services/subscriptionService.ts
import { Subscription, ISubscription } from '../models/Subscription';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { Tenant } from '../models/Tenant';

export class SubscriptionService {
  static async getAllSubscriptions(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const subscriptions = await Subscription.find()
      .populate('tenantId')
      .populate('planId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Subscription.countDocuments();
    
    return {
      subscriptions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalSubscriptions: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  static async getSubscriptionById(subscriptionId: string): Promise<ISubscription | null> {
    return Subscription.findById(subscriptionId)
      .populate('tenantId')
      .populate('planId')
      .lean() as unknown as ISubscription | null;
  }

  static async getSubscriptionStats() {
    const totalSubscriptions = await Subscription.countDocuments();
    const activeSubscriptions = await Subscription.countDocuments({ status: 'active' });
    const trialSubscriptions = await Subscription.countDocuments({ status: 'trial' });
    const suspendedSubscriptions = await Subscription.countDocuments({ status: 'suspended' });
    const cancelledSubscriptions = await Subscription.countDocuments({ status: 'cancelled' });

    // Calculate total revenue
    const revenueData = await Subscription.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, totalRevenue: { $sum: '$billing.amount' } } }
    ]);

    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    // Get expiring subscriptions (next 7 days)
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const expiringSubscriptions = await Subscription.countDocuments({
      status: { $in: ['trial', 'active'] },
      $or: [
        { 'period.trialEndDate': { $lte: sevenDaysFromNow, $gte: new Date() } },
        { 'period.endDate': { $lte: sevenDaysFromNow, $gte: new Date() } }
      ]
    });

    return {
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      suspendedSubscriptions,
      cancelledSubscriptions,
      totalRevenue,
      expiringSubscriptions
    };
  }

  static async updateSubscription(subscriptionId: string, updateData: Partial<ISubscription>): Promise<ISubscription | null> {
    return Subscription.findByIdAndUpdate(
      subscriptionId,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
  }

  static async suspendSubscription(subscriptionId: string): Promise<boolean> {
    const result = await Subscription.findByIdAndUpdate(
      subscriptionId,
      { status: 'suspended', updatedAt: new Date() }
    );
    return !!result;
  }

  static async activateSubscription(subscriptionId: string): Promise<boolean> {
    const result = await Subscription.findByIdAndUpdate(
      subscriptionId,
      { status: 'active', updatedAt: new Date() }
    );
    return !!result;
  }

  static async cancelSubscription(subscriptionId: string): Promise<boolean> {
    const result = await Subscription.findByIdAndUpdate(
      subscriptionId,
      { status: 'cancelled', updatedAt: new Date() }
    );
    return !!result;
  }

  static async getExpiringSubscriptions(days: number = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return await Subscription.find({
      status: { $in: ['trial', 'active'] },
      $or: [
        { 'period.trialEndDate': { $lte: futureDate, $gte: new Date() } },
        { 'period.endDate': { $lte: futureDate, $gte: new Date() } }
      ]
    }).populate(['tenantId', 'planId']);
  }

  static async getRevenueAnalytics() {
    // Monthly revenue for last 12 months
    const monthlyRevenue = await Subscription.aggregate([
      {
        $match: {
          status: 'active',
          createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$billing.amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Plan distribution
    const planDistribution = await Subscription.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$planId', count: { $sum: 1 } } },
      { $lookup: { from: 'subscriptionplans', localField: '_id', foreignField: '_id', as: 'plan' } },
      { $unwind: '$plan' },
      { $project: { planName: '$plan.displayName', count: 1 } }
    ]);

    return {
      monthlyRevenue,
      planDistribution
    };
  }

  static async getAllPlans() {
    return SubscriptionPlan.find({ isActive: true }).sort({ sortOrder: 1 });
  }

  static async createPlan(planData: any) {
    const plan = new SubscriptionPlan(planData);
    return await plan.save();
  }

  static async updatePlan(planId: string, updateData: any) {
    return SubscriptionPlan.findByIdAndUpdate(
      planId,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
  }

  static async deletePlan(planId: string) {
    return SubscriptionPlan.findByIdAndUpdate(
      planId,
      { isActive: false, updatedAt: new Date() }
    );
  }
}