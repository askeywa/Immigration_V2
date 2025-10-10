// backend/src/models/Subdomain.ts
import mongoose, { Document, Schema } from 'mongoose';
import { ITenant } from './Tenant';

export interface ISubdomain extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  tenant?: ITenant;
  subdomain: string;
  fullDomain: string;
  type: 'tenant' | 'admin' | 'api' | 'custom';
  status: 'active' | 'pending' | 'suspended' | 'deleted';
  isPrimary: boolean;
  isCustomDomain: boolean;
  dnsRecordId?: string;
  sslCertificateId?: string;
  cnameTarget?: string;
  ipAddress?: string;
  sslStatus: 'none' | 'pending' | 'active' | 'expired' | 'failed';
  lastHealthCheck?: Date;
  healthStatus: 'healthy' | 'warning' | 'critical' | 'unknown';
  provisioningLog: Array<{
    timestamp: Date;
    action: string;
    status: 'success' | 'error' | 'warning';
    message: string;
    details?: any;
  }>;
  configuration: {
    nginxConfig?: string;
    cloudflareConfig?: any;
    customHeaders?: Record<string, string>;
    rateLimits?: {
      requestsPerMinute: number;
      burstSize: number;
    };
    caching?: {
      enabled: boolean;
      ttl: number;
    };
    security?: {
      corsOrigins: string[];
      allowedMethods: string[];
      securityHeaders: Record<string, string>;
    };
  };
  metadata: {
    createdBy: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    tags: string[];
    description?: string;
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SubdomainSchema = new Schema<ISubdomain>({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  subdomain: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 63,
    match: /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
    index: true
  },
  fullDomain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  type: {
    type: String,
    enum: ['tenant', 'admin', 'api', 'custom'],
    default: 'tenant',
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'suspended', 'deleted'],
    default: 'pending',
    index: true
  },
  isPrimary: {
    type: Boolean,
    default: false,
    index: true
  },
  isCustomDomain: {
    type: Boolean,
    default: false,
    index: true
  },
  dnsRecordId: {
    type: String,
    sparse: true
  },
  sslCertificateId: {
    type: String,
    sparse: true
  },
  cnameTarget: {
    type: String,
    sparse: true
  },
  ipAddress: {
    type: String,
    sparse: true
  },
  sslStatus: {
    type: String,
    enum: ['none', 'pending', 'active', 'expired', 'failed'],
    default: 'none',
    index: true
  },
  lastHealthCheck: {
    type: Date
  },
  healthStatus: {
    type: String,
    enum: ['healthy', 'warning', 'critical', 'unknown'],
    default: 'unknown',
    index: true
  },
  provisioningLog: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    action: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['success', 'error', 'warning'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    details: {
      type: Schema.Types.Mixed
    }
  }],
  configuration: {
    nginxConfig: {
      type: String
    },
    cloudflareConfig: {
      type: Schema.Types.Mixed
    },
    customHeaders: {
      type: Map,
      of: String
    },
    rateLimits: {
      requestsPerMinute: {
        type: Number,
        default: 100
      },
      burstSize: {
        type: Number,
        default: 20
      }
    },
    caching: {
      enabled: {
        type: Boolean,
        default: true
      },
      ttl: {
        type: Number,
        default: 3600
      }
    },
    security: {
      corsOrigins: [{
        type: String
      }],
      allowedMethods: [{
        type: String,
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
      }],
      securityHeaders: {
        type: Map,
        of: String
      }
    }
  },
  metadata: {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    tags: [{
      type: String,
      trim: true
    }],
    description: {
      type: String,
      maxlength: 500
    },
    notes: {
      type: String,
      maxlength: 1000
    }
  }
}, {
  timestamps: true,
  collection: 'subdomains'
});

// Indexes for performance and data integrity
SubdomainSchema.index({ tenantId: 1, subdomain: 1 }, { unique: true });
SubdomainSchema.index({ tenantId: 1, isPrimary: 1 });
SubdomainSchema.index({ tenantId: 1, type: 1 });
SubdomainSchema.index({ status: 1, sslStatus: 1 });
SubdomainSchema.index({ healthStatus: 1, lastHealthCheck: 1 });
SubdomainSchema.index({ 'metadata.tags': 1 });
SubdomainSchema.index({ createdAt: -1 });
SubdomainSchema.index({ updatedAt: -1 });

// Virtual for tenant population
SubdomainSchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

// Pre-save middleware
SubdomainSchema.pre('save', function(next) {
  // Ensure only one primary subdomain per tenant
  if (this.isPrimary && this.isNew) {
    (this.constructor as any).updateMany(
      { tenantId: this.tenantId, _id: { $ne: this._id } },
      { $set: { isPrimary: false } }
    ).exec();
  }
  
  // Generate full domain if not provided
  if (!this.fullDomain && this.subdomain) {
    const mainDomain = process.env.MAIN_DOMAIN || 'sehwagimmigration.com';
    this.fullDomain = `${this.subdomain}.${mainDomain}`;
  }
  
  next();
});

// Instance methods
SubdomainSchema.methods.addProvisioningLog = function(action: string, status: 'success' | 'error' | 'warning', message: string, details?: any) {
  this.provisioningLog.push({
    timestamp: new Date(),
    action,
    status,
    message,
    details
  });
  
  // Keep only last 50 log entries
  if (this.provisioningLog.length > 50) {
    this.provisioningLog = this.provisioningLog.slice(-50);
  }
  
  return this.save();
};

SubdomainSchema.methods.updateHealthStatus = function(status: 'healthy' | 'warning' | 'critical' | 'unknown') {
  this.healthStatus = status;
  this.lastHealthCheck = new Date();
  return this.save();
};

SubdomainSchema.methods.isHealthy = function(): boolean {
  return this.healthStatus === 'healthy' && this.status === 'active';
};

SubdomainSchema.methods.canBeDeleted = function(): boolean {
  return this.status === 'active' || this.status === 'suspended';
};

// Static methods
SubdomainSchema.statics.findByTenant = function(tenantId: string) {
  return this.find({ tenantId }).populate('tenant');
};

SubdomainSchema.statics.findByDomain = function(domain: string) {
  return this.findOne({ fullDomain: domain.toLowerCase() }).populate('tenant');
};

SubdomainSchema.statics.findPrimaryByTenant = function(tenantId: string) {
  return this.findOne({ tenantId, isPrimary: true }).populate('tenant');
};

SubdomainSchema.statics.findHealthySubdomains = function() {
  return this.find({ 
    status: 'active', 
    healthStatus: 'healthy' 
  }).populate('tenant');
};

SubdomainSchema.statics.findExpiringSSL = function(daysUntilExpiry: number = 30) {
  // This would need to be implemented based on SSL certificate expiration logic
  return this.find({ 
    status: 'active',
    sslStatus: 'active'
  }).populate('tenant');
};

// Text search index
SubdomainSchema.index({
  subdomain: 'text',
  fullDomain: 'text',
  'metadata.description': 'text',
  'metadata.notes': 'text'
});

  // Instance methods
  SubdomainSchema.methods.addProvisioningLog = function(action: string, status: 'success' | 'error' | 'warning', message: string, details?: any) {
    this.provisioningLog.push({
      timestamp: new Date(),
      action,
      status,
      message,
      details
    });
    return this.save();
  };

  SubdomainSchema.methods.updateHealthStatus = function(status: 'healthy' | 'warning' | 'critical' | 'unknown') {
    this.healthStatus = status;
    this.lastHealthCheck = new Date();
    return this.save();
  };

  SubdomainSchema.methods.canBeDeleted = function() {
    return this.status !== 'active' || 
           (this.status === 'active' && this.healthStatus === 'critical');
  };

export default mongoose.model<ISubdomain>('Subdomain', SubdomainSchema);
