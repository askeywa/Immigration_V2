// backend/src/models/MFASettings.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IMFASettings extends Document {
  userId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  
  // TOTP (Time-based One-Time Password) settings
  totp: {
    enabled: boolean;
    secret?: string;
    backupCodes: string[];
    createdAt?: Date;
    lastUsed?: Date;
  };
  
  // SMS verification settings
  sms: {
    enabled: boolean;
    phoneNumber?: string;
    verified: boolean;
    lastVerification?: Date;
  };
  
  // Email verification settings
  email: {
    enabled: boolean;
    lastVerification?: Date;
  };
  
  // MFA policy settings
  policy: {
    required: boolean;
    methods: ('totp' | 'sms' | 'email')[];
    gracePeriod: number; // Days before MFA becomes mandatory
    maxAttempts: number;
    lockoutDuration: number; // Minutes
  };
  
  // Security settings
  lastLogin?: Date;
  failedAttempts: number;
  lockedUntil?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  isLocked(): boolean;
  generateBackupCodes(count: number): string[];
  verifyBackupCode(code: string): boolean;
  resetFailedAttempts(): void;
  incrementFailedAttempts(): void;
  isMFARequired(): boolean;
  getAvailableMethods(): string[];
  hasMFAMethodEnabled(): boolean;
  getFullSettings(): any;
}

export interface IMFASettingsModel extends mongoose.Model<IMFASettings> {
  findByUserAndTenant(userId: string, tenantId: string): Promise<IMFASettings | null>;
  createDefault(userId: string, tenantId: string, role: string): Promise<IMFASettings>;
}

const mfaSettingsSchema = new Schema<IMFASettings>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  
  totp: {
    enabled: {
      type: Boolean,
      default: false
    },
    secret: {
      type: String,
      select: false // Don't include in JSON by default for security
    },
    backupCodes: [{
      type: String,
      select: false
    }],
    createdAt: {
      type: Date
    },
    lastUsed: {
      type: Date
    }
  },
  
  sms: {
    enabled: {
      type: Boolean,
      default: false
    },
    phoneNumber: {
      type: String,
      select: false
    },
    verified: {
      type: Boolean,
      default: false
    },
    lastVerification: {
      type: Date
    }
  },
  
  email: {
    enabled: {
      type: Boolean,
      default: false
    },
    lastVerification: {
      type: Date
    }
  },
  
  policy: {
    required: {
      type: Boolean,
      default: false
    },
    methods: [{
      type: String,
      enum: ['totp', 'sms', 'email'],
      default: ['totp']
    }],
    gracePeriod: {
      type: Number,
      default: 7 // 7 days grace period
    },
    maxAttempts: {
      type: Number,
      default: 5
    },
    lockoutDuration: {
      type: Number,
      default: 30 // 30 minutes
    }
  },
  
  lastLogin: {
    type: Date
  },
  
  failedAttempts: {
    type: Number,
    default: 0
  },
  
  lockedUntil: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
mfaSettingsSchema.index({ userId: 1, tenantId: 1 }, { unique: true });

// Instance method to check if account is locked
mfaSettingsSchema.methods.isLocked = function(): boolean {
  return !!(this.lockedUntil && this.lockedUntil > Date.now());
};

// Static method to find MFA settings by user and tenant
mfaSettingsSchema.statics.findByUserAndTenant = function(userId: string, tenantId: string) {
  return this.findOne({ userId, tenantId });
};

// Static method to create default MFA settings
mfaSettingsSchema.statics.createDefault = function(userId: string, tenantId: string, role: string) {
  const isAdmin = role === 'admin' || role === 'super_admin';
  
  return this.create({
    userId,
    tenantId,
    policy: {
      required: isAdmin, // MFA required for admins by default
      methods: ['totp'],
      gracePeriod: isAdmin ? 0 : 7, // No grace period for admins
      maxAttempts: 5,
      lockoutDuration: 30
    }
  });
};

// Pre-save middleware to update timestamps
mfaSettingsSchema.pre('save', function(next) {
  if (this.isModified('totp.enabled') && this.totp.enabled) {
    this.totp.createdAt = new Date();
  }
  next();
});

// Transform function to exclude sensitive data by default
mfaSettingsSchema.methods.toJSON = function() {
  const obj = this.toObject();
  
  // Remove sensitive data unless specifically requested
  if (obj.totp) {
    delete obj.totp.secret;
    delete obj.totp.backupCodes;
  }
  if (obj.sms) {
    delete obj.sms.phoneNumber;
  }
  
  return obj;
};

// Method to get full MFA settings (including sensitive data)
mfaSettingsSchema.methods.getFullSettings = function() {
  return this.toObject();
};

// Method to generate backup codes
mfaSettingsSchema.methods.generateBackupCodes = function(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }
  this.totp.backupCodes = codes;
  return codes;
};

// Method to verify and consume backup code
mfaSettingsSchema.methods.verifyBackupCode = function(code: string): boolean {
  const index = this.totp.backupCodes.indexOf(code);
  if (index > -1) {
    this.totp.backupCodes.splice(index, 1);
    return true;
  }
  return false;
};

// Method to reset failed attempts
mfaSettingsSchema.methods.resetFailedAttempts = function() {
  this.failedAttempts = 0;
  this.lockedUntil = undefined;
};

// Method to increment failed attempts
mfaSettingsSchema.methods.incrementFailedAttempts = function() {
  this.failedAttempts += 1;
  
  if (this.failedAttempts >= this.policy.maxAttempts) {
    this.lockedUntil = new Date(Date.now() + this.policy.lockoutDuration * 60 * 1000);
  }
};

// Method to check if MFA is required for user
mfaSettingsSchema.methods.isMFARequired = function(): boolean {
  if (this.policy.required) {
    return true;
  }
  
  // Check if grace period has expired
  if (this.policy.gracePeriod > 0 && this.createdAt) {
    const gracePeriodExpiry = new Date(this.createdAt.getTime() + this.policy.gracePeriod * 24 * 60 * 60 * 1000);
    return new Date() > gracePeriodExpiry;
  }
  
  return false;
};

// Method to get available MFA methods
mfaSettingsSchema.methods.getAvailableMethods = function(): string[] {
  const methods: string[] = [];
  
  if (this.totp.enabled) {
    methods.push('totp');
  }
  if (this.sms.enabled && this.sms.verified) {
    methods.push('sms');
  }
  if (this.email.enabled) {
    methods.push('email');
  }
  
  return methods;
};

// Method to check if user has any MFA method enabled
mfaSettingsSchema.methods.hasMFAMethodEnabled = function(): boolean {
  return this.totp.enabled || (this.sms.enabled && this.sms.verified) || this.email.enabled;
};

export const MFASettings = mongoose.model<IMFASettings, IMFASettingsModel>('MFASettings', mfaSettingsSchema);
