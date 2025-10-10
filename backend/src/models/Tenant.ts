// backend/src/models/Tenant.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  domain: string; // Primary subdomain (e.g., "honeynwild.ibuyscrap.ca")
  customDomains: string[]; // Array of approved custom domains (e.g., ["honeynwild.com"])
  trustedDomains: string[]; // All trusted domains (computed)
  domainApprovals: Array<{
    domain: string;
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: Date;
    approvedAt?: Date;
    approvedBy?: mongoose.Types.ObjectId;
    rejectionReason?: string;
  }>;
  status: 'active' | 'suspended' | 'trial' | 'cancelled' | 'expired';
  settings: {
    maxUsers: number;
    maxAdmins: number;
    features: string[];
    customBranding?: {
      logo?: string;
      primaryColor?: string;
      companyName?: string;
    };
  };
  contactInfo: {
    email: string;
    phone?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  };
  subscription?: {
    planId?: mongoose.Types.ObjectId;
    planName?: string;
    status: 'trial' | 'active' | 'suspended' | 'cancelled' | 'expired';
    startDate?: Date;
    endDate?: Date;
    trialEndDate?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  isActive(): boolean;
  isTrialExpired(): boolean;
  getAllTrustedDomains(): string[];
  hasDomainAccess(domain: string): boolean;
}

const tenantSchema = new Schema<ITenant>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  domain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        // Allow localhost for development
        if (v === 'localhost' || v.startsWith('localhost:')) {
          return process.env.NODE_ENV !== 'production';
        }
        
        // For production: require proper domain format with dots
        if (process.env.NODE_ENV === 'production') {
          return /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/.test(v) && v.includes('.');
        }
        
        // For development: allow any valid format
        return /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]?$/.test(v);
      },
      message: 'Invalid domain format - must be a valid domain with dots in production (e.g., example.com)'
    }
  },
  customDomains: [{
    type: String,
    lowercase: true,
    trim: true,
  }],
  domainApprovals: [{
    domain: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: Date,
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: String,
  }],
  status: {
    type: String,
    enum: ['active', 'suspended', 'trial', 'cancelled', 'expired'],
    default: 'trial',
    index: true,
  },
  settings: {
    maxUsers: {
      type: Number,
      required: true,
      default: 25,
      min: 1,
      max: 10000,
    },
    maxAdmins: {
      type: Number,
      required: true,
      default: 2,
      min: 1,
      max: 100,
    },
    features: [{
      type: String,
      enum: ['basic', 'advanced', 'premium', 'enterprise'],
    }],
    customBranding: {
      logo: String,
      primaryColor: {
        type: String,
        validate: {
          validator: function(v: string) {
            // Hex color validation
            return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
          },
          message: 'Invalid hex color format'
        }
      },
      companyName: {
        type: String,
        maxlength: 100,
      },
    },
  },
  contactInfo: {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function(v: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Invalid email format'
      }
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
  },
  subscription: {
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
    },
    planName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    status: {
      type: String,
      enum: ['trial', 'active', 'suspended', 'cancelled', 'expired'],
      default: 'trial',
    },
    startDate: Date,
    endDate: Date,
    trialEndDate: Date,
  },
}, {
  timestamps: true,
});

// Indexes for performance
tenantSchema.index({ status: 1, createdAt: -1 });
tenantSchema.index({ 'contactInfo.email': 1 });
tenantSchema.index({ 'subscription.status': 1 });
// New indexes for domain lookups
tenantSchema.index({ customDomains: 1 });
tenantSchema.index({ 'domainApprovals.domain': 1 });
tenantSchema.index({ 'domainApprovals.status': 1 });

// Virtual for subscription days remaining
tenantSchema.virtual('daysRemaining').get(function() {
  if (this.subscription?.endDate) {
    const now = new Date();
    const endDate = new Date(this.subscription.endDate);
    const diffTime = endDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Virtual for trial days remaining
tenantSchema.virtual('trialDaysRemaining').get(function() {
  if (this.subscription?.trialEndDate) {
    const now = new Date();
    const trialEndDate = new Date(this.subscription.trialEndDate);
    const diffTime = trialEndDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Virtual for all trusted domains
tenantSchema.virtual('trustedDomains').get(function() {
  return this.getAllTrustedDomains();
});

// Pre-save middleware to set trial end date
tenantSchema.pre('save', function(next) {
  if (this.isNew && this.status === 'trial') {
    // Set 7-day trial period
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);
    
    if (!this.subscription) {
      this.subscription = {
        status: 'trial',
        trialEndDate: trialEndDate,
      };
    } else {
      this.subscription.trialEndDate = trialEndDate;
    }
  }
  next();
});

// Instance method to check if tenant is active
tenantSchema.methods.isActive = function(): boolean {
  return this.status === 'active' || 
         (this.status === 'trial' && this.trialDaysRemaining > 0);
};

// Instance method to check if trial is expired
tenantSchema.methods.isTrialExpired = function(): boolean {
  if (this.status !== 'trial' || !this.subscription?.trialEndDate) {
    return false;
  }
  return new Date() > this.subscription.trialEndDate;
};

// Instance method to get all trusted domains
tenantSchema.methods.getAllTrustedDomains = function(): string[] {
  const domains = [this.domain]; // Primary subdomain
  
  // Add approved custom domains
  const approvedCustomDomains = this.customDomains || [];
  domains.push(...approvedCustomDomains);
  
  return [...new Set(domains)]; // Remove duplicates
};

// Instance method to check domain access
tenantSchema.methods.hasDomainAccess = function(domain: string): boolean {
  const trustedDomains = this.getAllTrustedDomains();
  return trustedDomains.includes(domain.toLowerCase());
};

export const Tenant = mongoose.model<ITenant>('Tenant', tenantSchema);
