// backend/src/models/Subscription.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscription extends Document {
  tenantId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  status: 'trial' | 'active' | 'suspended' | 'cancelled' | 'expired' | 'past_due';
  billing: {
    amount: number;
    currency: string;
    billingCycle: 'monthly' | 'annual' | 'one_time';
    nextBillingDate?: Date;
    lastBillingDate?: Date;
  };
  period: {
    startDate: Date;
    endDate?: Date;
    trialEndDate?: Date;
  };
  expiresAt?: Date;
  limits?: {
    maxUsers: number;
    maxAdmins: number;
    maxStorageGB: number;
    maxApiCallsPerMonth: number;
    maxSubdomains: number;
    maxCustomDomains: number;
  };
  usage: {
    currentUsers: number;
    currentAdmins: number;
    storageUsedGB?: number;
    apiCallsThisMonth?: number;
    lastUpdated: Date;
  };
  paymentMethod?: {
    type: 'card' | 'bank_transfer' | 'paypal';
    last4?: string;
    brand?: string;
    stripePaymentMethodId?: string;
  };
  metadata?: {
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
    source?: string;
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  isActive(): boolean;
  isTrialExpired(): boolean;
  isExpired(): boolean;
  getDaysRemaining(): number;
  isOverLimit(): boolean;
  canAddUsers(count: number): boolean;
  canAddAdmins(count: number): boolean;
}

const subscriptionSchema = new Schema<ISubscription>({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    unique: true,
    index: true,
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true,
  },
  status: {
    type: String,
    enum: ['trial', 'active', 'suspended', 'cancelled', 'expired', 'past_due'],
    required: true,
    default: 'trial',
    index: true,
  },
  billing: {
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      uppercase: true,
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'annual', 'one_time'],
      required: true,
    },
    nextBillingDate: {
      type: Date,
      index: true,
    },
    lastBillingDate: Date,
  },
  period: {
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      index: true,
    },
    trialEndDate: {
      type: Date,
      index: true,
    },
  },
  expiresAt: {
    type: Date,
  },
  limits: {
    maxUsers: {
      type: Number,
      default: 10,
      min: 1,
    },
    maxAdmins: {
      type: Number,
      default: 2,
      min: 1,
    },
    maxStorageGB: {
      type: Number,
      default: 1,
      min: 0,
    },
    maxApiCallsPerMonth: {
      type: Number,
      default: 10000,
      min: 0,
    },
    maxSubdomains: {
      type: Number,
      default: 3,
      min: 0,
    },
    maxCustomDomains: {
      type: Number,
      default: 1,
      min: 0,
    },
  },
  usage: {
    currentUsers: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentAdmins: {
      type: Number,
      default: 0,
      min: 0,
    },
    storageUsedGB: {
      type: Number,
      default: 0,
      min: 0,
    },
    apiCallsThisMonth: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  paymentMethod: {
    type: {
      type: String,
      enum: ['card', 'bank_transfer', 'paypal'],
    },
    last4: String,
    brand: String,
    stripePaymentMethodId: String,
  },
  metadata: {
    stripeSubscriptionId: String,
    stripeCustomerId: String,
    source: {
      type: String,
      enum: ['website', 'admin', 'api', 'migration'],
      default: 'website',
    },
    notes: String,
  },
}, {
  timestamps: true,
});

// Compound indexes
subscriptionSchema.index({ status: 1, 'period.endDate': 1 });
subscriptionSchema.index({ status: 1, 'billing.nextBillingDate': 1 });
subscriptionSchema.index({ 'metadata.stripeSubscriptionId': 1 }, { sparse: true });

// Virtual for days remaining in current period
subscriptionSchema.virtual('daysRemaining').get(function() {
  const endDate = this.period.endDate || this.period.trialEndDate;
  if (!endDate) return null;
  
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Instance method to check if subscription is active
subscriptionSchema.methods.isActive = function(): boolean {
  if (this.status === 'cancelled' || this.status === 'expired') {
    return false;
  }
  
  if (this.status === 'suspended') {
    return false;
  }
  
  if (this.status === 'trial') {
    return !this.isTrialExpired();
  }
  
  return this.status === 'active' && !this.isExpired();
};

// Instance method to check if trial is expired
subscriptionSchema.methods.isTrialExpired = function(): boolean {
  if (!this.period.trialEndDate) return false;
  return new Date() > this.period.trialEndDate;
};

// Instance method to check if subscription is expired
subscriptionSchema.methods.isExpired = function(): boolean {
  if (!this.period.endDate) return false;
  return new Date() > this.period.endDate;
};

// Instance method to get days remaining
subscriptionSchema.methods.getDaysRemaining = function(): number {
  return this.daysRemaining || 0;
};

// Instance method to check if over usage limits
subscriptionSchema.methods.isOverLimit = async function(): Promise<boolean> {
  await this.populate('planId');
  const plan = this.planId as any;
  
  if (this.usage.currentUsers > plan.limits.maxUsers) return true;
  if (this.usage.currentAdmins > plan.limits.maxAdmins) return true;
  if (plan.limits.storageGB && this.usage.storageUsedGB > plan.limits.storageGB) return true;
  if (plan.limits.apiCallsPerMonth && this.usage.apiCallsThisMonth > plan.limits.apiCallsPerMonth) return true;
  
  return false;
};

// Instance method to check if can add users
subscriptionSchema.methods.canAddUsers = async function(count: number = 1): Promise<boolean> {
  await this.populate('planId');
  const plan = this.planId as any;
  
  return (this.usage.currentUsers + count) <= plan.limits.maxUsers;
};

// Instance method to check if can add admins
subscriptionSchema.methods.canAddAdmins = async function(count: number = 1): Promise<boolean> {
  await this.populate('planId');
  const plan = this.planId as any;
  
  return (this.usage.currentAdmins + count) <= plan.limits.maxAdmins;
};

// Pre-save middleware to set trial end date for new trial subscriptions
subscriptionSchema.pre('save', async function(next) {
  if (this.isNew && this.status === 'trial') {
    await this.populate('planId');
    const plan = this.planId as any;
    
    if (plan.trialDays > 0) {
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + plan.trialDays);
      this.period.trialEndDate = trialEndDate;
    }
  }
  
  next();
});

// Static method to update usage for a tenant
subscriptionSchema.statics.updateUsage = async function(
  tenantId: mongoose.Types.ObjectId,
  usage: {
    users?: number;
    admins?: number;
    storageGB?: number;
    apiCalls?: number;
  }
) {
  const updateFields: any = {
    'usage.lastUpdated': new Date()
  };
  
  if (usage.users !== undefined) updateFields['usage.currentUsers'] = usage.users;
  if (usage.admins !== undefined) updateFields['usage.currentAdmins'] = usage.admins;
  if (usage.storageGB !== undefined) updateFields['usage.storageUsedGB'] = usage.storageGB;
  if (usage.apiCalls !== undefined) updateFields['usage.apiCallsThisMonth'] = usage.apiCalls;
  
  return await this.updateOne({ tenantId }, updateFields);
};

// Static method to find expiring subscriptions
subscriptionSchema.statics.findExpiring = async function(days: number = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return await this.find({
    status: { $in: ['trial', 'active'] },
    $or: [
      { 'period.trialEndDate': { $lte: futureDate, $gte: new Date() } },
      { 'period.endDate': { $lte: futureDate, $gte: new Date() } }
    ]
  }).populate(['tenantId', 'planId']);
};

export const Subscription = mongoose.model<ISubscription>('Subscription', subscriptionSchema);
