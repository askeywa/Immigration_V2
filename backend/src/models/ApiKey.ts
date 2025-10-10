// backend/src/models/ApiKey.ts
import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

export interface IApiKey extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  
  // API Key details
  keyId: string; // Public identifier (starts with 'ak_')
  keyHash: string; // Hashed version of the actual key
  keyPrefix: string; // First 8 characters for identification
  
  // Permissions and scopes
  permissions: {
    read: boolean;
    write: boolean;
    delete: boolean;
    admin: boolean;
  };
  
  scopes: string[]; // Specific API endpoints or resources
  
  // Rate limiting
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
    burstLimit: number;
  };
  
  // Status and lifecycle
  status: 'active' | 'inactive' | 'revoked' | 'expired';
  isActive(): boolean;
  
  // Expiration
  expiresAt?: Date;
  isExpired(): boolean;
  
  // Usage tracking
  lastUsed?: Date;
  usageCount: number;
  
  // Security
  ipWhitelist?: string[]; // Allowed IP addresses
  userAgentWhitelist?: string[]; // Allowed user agents
  
  // Metadata
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  generateKey(): string;
  verifyKey(key: string): boolean;
  incrementUsage(): void;
  revoke(): void;
  canAccess(scope: string): boolean;
  isIpAllowed(ip: string): boolean;
  isUserAgentAllowed(userAgent: string): boolean;
}

export interface IApiKeyModel extends mongoose.Model<IApiKey> {
  findByKeyId(keyId: string): Promise<IApiKey | null>;
  findByTenant(tenantId: string): Promise<IApiKey[]>;
  generateApiKey(data: {
    tenantId: string;
    name: string;
    description?: string;
    permissions: any;
    scopes: string[];
    rateLimit: any;
    expiresAt?: Date;
    createdBy: string;
    ipWhitelist?: string[];
    userAgentWhitelist?: string[];
  }): Promise<{ apiKey: IApiKey; plainKey: string }>;
  verifyApiKey(key: string): Promise<IApiKey | null>;
}

const apiKeySchema = new Schema<IApiKey>({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  keyId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  keyHash: {
    type: String,
    required: true,
    select: false // Don't include in JSON by default
  },
  
  keyPrefix: {
    type: String,
    required: true,
    length: 8
  },
  
  permissions: {
    read: {
      type: Boolean,
      default: true
    },
    write: {
      type: Boolean,
      default: false
    },
    delete: {
      type: Boolean,
      default: false
    },
    admin: {
      type: Boolean,
      default: false
    }
  },
  
  scopes: [{
    type: String,
    trim: true
  }],
  
  rateLimit: {
    requestsPerMinute: {
      type: Number,
      default: 100
    },
    requestsPerHour: {
      type: Number,
      default: 1000
    },
    requestsPerDay: {
      type: Number,
      default: 10000
    },
    burstLimit: {
      type: Number,
      default: 10
    }
  },
  
  status: {
    type: String,
    enum: ['active', 'inactive', 'revoked', 'expired'],
    default: 'active'
  },
  
  expiresAt: {
    type: Date,
  },
  
  lastUsed: {
    type: Date
  },
  
  usageCount: {
    type: Number,
    default: 0
  },
  
  ipWhitelist: [{
    type: String,
    trim: true
  }],
  
  userAgentWhitelist: [{
    type: String,
    trim: true
  }],
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
apiKeySchema.index({ tenantId: 1, status: 1 });
apiKeySchema.index({ keyId: 1, status: 1 });
apiKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Instance methods
apiKeySchema.methods.isActive = function(): boolean {
  return this.status === 'active' && !this.isExpired();
};

apiKeySchema.methods.isExpired = function(): boolean {
  return this.expiresAt && this.expiresAt < new Date();
};

apiKeySchema.methods.generateKey = function(): string {
  // Generate a secure random key
  const key = crypto.randomBytes(32).toString('hex');
  return `ak_${key}`;
};

apiKeySchema.methods.verifyKey = function(key: string): boolean {
  if (!key || !key.startsWith('ak_')) {
    return false;
  }
  
  // Hash the provided key and compare with stored hash
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return hash === this.keyHash;
};

apiKeySchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
};

apiKeySchema.methods.revoke = function() {
  this.status = 'revoked';
};

apiKeySchema.methods.canAccess = function(scope: string): boolean {
  // If no specific scopes are defined, allow all
  if (!this.scopes || this.scopes.length === 0) {
    return true;
  }
  
  // Check if the requested scope is in the allowed scopes
  return this.scopes.includes(scope) || this.scopes.includes('*');
};

apiKeySchema.methods.isIpAllowed = function(ip: string): boolean {
  // If no IP whitelist is defined, allow all IPs
  if (!this.ipWhitelist || this.ipWhitelist.length === 0) {
    return true;
  }
  
  // Check if the IP is in the whitelist
  return this.ipWhitelist.includes(ip);
};

apiKeySchema.methods.isUserAgentAllowed = function(userAgent: string): boolean {
  // If no user agent whitelist is defined, allow all
  if (!this.userAgentWhitelist || this.userAgentWhitelist.length === 0) {
    return true;
  }
  
  // Check if the user agent matches any in the whitelist
  return this.userAgentWhitelist.some((allowedUA: string) => 
    userAgent.toLowerCase().includes(allowedUA.toLowerCase())
  );
};

// Static methods
apiKeySchema.statics.findByKeyId = function(keyId: string) {
  return this.findOne({ keyId, status: 'active' });
};

apiKeySchema.statics.findByTenant = function(tenantId: string) {
  return this.find({ tenantId }).sort({ createdAt: -1 });
};

apiKeySchema.statics.generateApiKey = async function(data: {
  tenantId: string;
  name: string;
  description?: string;
  permissions: any;
  scopes: string[];
  rateLimit: any;
  expiresAt?: Date;
  createdBy: string;
  ipWhitelist?: string[];
  userAgentWhitelist?: string[];
}) {
  // Generate unique key ID
  const keyId = `ak_${crypto.randomBytes(16).toString('hex')}`;
  
  // Generate the actual API key
  const plainKey = crypto.randomBytes(32).toString('hex');
  const fullKey = `ak_${plainKey}`;
  
  // Hash the key for storage
  const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');
  const keyPrefix = fullKey.substring(0, 8);
  
  // Create the API key document
  const apiKey = new this({
    ...(data as any),
    keyId,
    keyHash,
    keyPrefix
  });
  
  await apiKey.save();
  
  return { apiKey, plainKey: fullKey };
};

apiKeySchema.statics.verifyApiKey = async function(key: string) {
  if (!key || !key.startsWith('ak_')) {
    return null;
  }
  
  // Hash the provided key
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');
  
  // Find the API key by hash
  const apiKey = await this.findOne({ 
    keyHash, 
    status: 'active' 
  }).select('+keyHash'); // Include the hash field
  
  if (!apiKey) {
    return null;
  }
  
  // Check if expired
  if (apiKey.isExpired()) {
    apiKey.status = 'expired';
    await apiKey.save();
    return null;
  }
  
  return apiKey;
};

// Transform function to exclude sensitive data by default
apiKeySchema.methods.toJSON = function() {
  const obj = this.toObject();
  
  // Remove sensitive data unless specifically requested
  delete obj.keyHash;
  
  return obj;
};

// Method to get full API key data (including sensitive data)
apiKeySchema.methods.getFullData = function() {
  return this.toObject();
};

// Pre-save middleware
apiKeySchema.pre('save', function(next) {
  // Update status if expired
  if (this.expiresAt && this.expiresAt < new Date()) {
    this.status = 'expired';
  }
  next();
});

export const ApiKey = mongoose.model<IApiKey, IApiKeyModel>('ApiKey', apiKeySchema);
