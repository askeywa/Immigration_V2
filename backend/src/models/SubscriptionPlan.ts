// backend/src/models/SubscriptionPlan.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscriptionPlan extends Document {
  name: string;
  displayName: string;
  description?: string;
  type: 'trial' | 'monthly' | 'annual' | 'package';
  pricing: {
    amount: number;
    currency: string;
    billingCycle?: 'monthly' | 'annual' | 'one_time';
  };
  limits: {
    maxUsers: number;
    maxAdmins: number;
    storageGB?: number;
    apiCallsPerMonth?: number;
  };
  features: string[];
  trialDays?: number;
  isActive: boolean;
  isPopular?: boolean;
  sortOrder: number;
  stripePriceId?: string; // For Stripe integration
  createdAt: Date;
  updatedAt: Date;
  getMonthlyPrice(): number;
  isWithinLimits(usage: { users: number; admins: number; storage?: number }): boolean;
}

const subscriptionPlanSchema = new Schema<ISubscriptionPlan>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 50,
    validate: {
      validator: function(v: string) {
        return /^[a-z][a-z0-9_]*$/.test(v);
      },
      message: 'Plan name must be lowercase with underscores'
    }
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  type: {
    type: String,
    enum: ['trial', 'monthly', 'annual', 'package'],
    required: true,
    index: true,
  },
  pricing: {
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
      enum: ['USD', 'CAD', 'EUR', 'GBP'],
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'annual', 'one_time'],
      required: function() {
        return this.type !== 'trial';
      }
    },
  },
  limits: {
    maxUsers: {
      type: Number,
      required: true,
      min: 1,
      max: 10000,
    },
    maxAdmins: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    storageGB: {
      type: Number,
      min: 0,
      max: 1000,
    },
    apiCallsPerMonth: {
      type: Number,
      min: 0,
    },
  },
  features: [{
    type: String,
    trim: true,
    enum: [
      'basic_support',
      'priority_support',
      'phone_support',
      'custom_branding',
      'advanced_analytics',
      'api_access',
      'sso_integration',
      'custom_fields',
      'bulk_operations',
      'data_export',
      'audit_logs'
    ]
  }],
  trialDays: {
    type: Number,
    min: 0,
    max: 365,
    default: 7
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isPopular: {
    type: Boolean,
    default: false,
  },
  sortOrder: {
    type: Number,
    default: 0,
    index: true,
  },
  stripePriceId: {
    type: String,
    trim: true,
    sparse: true,
  },
}, {
  timestamps: true,
});

// Indexes
subscriptionPlanSchema.index({ type: 1, isActive: 1 });
subscriptionPlanSchema.index({ 'pricing.amount': 1 });
subscriptionPlanSchema.index({ sortOrder: 1, isActive: 1 });

// Virtual for formatted price
subscriptionPlanSchema.virtual('formattedPrice').get(function() {
  const { amount, currency } = this.pricing;
  return `${currency} ${amount.toFixed(2)}`;
});

// Instance method to get monthly equivalent price
subscriptionPlanSchema.methods.getMonthlyPrice = function(): number {
  const { amount, billingCycle } = this.pricing;
  
  if (billingCycle === 'monthly' || this.type === 'trial') {
    return amount;
  }
  
  if (billingCycle === 'annual') {
    return amount / 12;
  }
  
  // For packages, return 0 as they don't have monthly pricing
  return 0;
};

// Instance method to check if usage is within plan limits
subscriptionPlanSchema.methods.isWithinLimits = function(usage: { 
  users: number; 
  admins: number; 
  storage?: number; 
}): boolean {
  if (usage.users > this.limits.maxUsers) return false;
  if (usage.admins > this.limits.maxAdmins) return false;
  if (this.limits.storageGB && usage.storage && usage.storage > this.limits.storageGB) return false;
  
  return true;
};

// Static method to get default plans
subscriptionPlanSchema.statics.createDefaultPlans = async function() {
  const defaultPlans = [
    {
      name: 'trial',
      displayName: '7-Day Free Trial',
      description: 'Try our platform risk-free for 7 days',
      type: 'trial',
      pricing: { amount: 0, currency: 'USD' },
      limits: { maxUsers: 25, maxAdmins: 2 },
      features: ['basic_support'],
      trialDays: 7,
      sortOrder: 1
    },
    {
      name: 'basic_monthly',
      displayName: 'Basic Plan',
      description: 'Perfect for small RCIC practices',
      type: 'monthly',
      pricing: { amount: 99, currency: 'USD', billingCycle: 'monthly' },
      limits: { maxUsers: 25, maxAdmins: 2, storageGB: 10, apiCallsPerMonth: 1000 },
      features: ['basic_support', 'api_access'],
      sortOrder: 2
    },
    {
      name: 'professional_monthly',
      displayName: 'Professional Plan',
      description: 'For growing immigration practices',
      type: 'monthly',
      pricing: { amount: 199, currency: 'USD', billingCycle: 'monthly' },
      limits: { maxUsers: 100, maxAdmins: 5, storageGB: 50, apiCallsPerMonth: 5000 },
      features: ['priority_support', 'api_access', 'advanced_analytics', 'custom_branding'],
      isPopular: true,
      sortOrder: 3
    },
    {
      name: 'enterprise_monthly',
      displayName: 'Enterprise Plan',
      description: 'For large immigration firms',
      type: 'monthly',
      pricing: { amount: 399, currency: 'USD', billingCycle: 'monthly' },
      limits: { maxUsers: 500, maxAdmins: 10, storageGB: 200, apiCallsPerMonth: 20000 },
      features: [
        'phone_support', 'api_access', 'advanced_analytics', 'custom_branding',
        'sso_integration', 'custom_fields', 'bulk_operations', 'data_export', 'audit_logs'
      ],
      sortOrder: 4
    },
    {
      name: 'starter_package',
      displayName: 'Starter Package',
      description: '6 months access for small practices',
      type: 'package',
      pricing: { amount: 500, currency: 'USD', billingCycle: 'one_time' },
      limits: { maxUsers: 10, maxAdmins: 1, storageGB: 5 },
      features: ['basic_support'],
      sortOrder: 5
    }
  ];

  return await this.insertMany(defaultPlans, { ordered: false });
};

export const SubscriptionPlan = mongoose.model<ISubscriptionPlan>('SubscriptionPlan', subscriptionPlanSchema);
