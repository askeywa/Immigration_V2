// backend/src/models/User.ts
import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'super_admin' | 'tenant_admin';
  tenantId?: mongoose.Types.ObjectId;
  isActive: boolean;
  lastLogin?: Date;
  profile?: {
    avatar?: string;
    phoneNumber?: string;
    timezone?: string;
    language?: string;
  };
  permissions?: string[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  isSuperAdmin(): boolean;
  belongsToTenant(tenantId: string | mongoose.Types.ObjectId): boolean;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'super_admin', 'tenant_admin'],
    default: 'user',
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: function() {
      // Super admins don't need a tenant
      return this.role !== 'super_admin';
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  },
  profile: {
    avatar: String,
    phoneNumber: {
      type: String,
      trim: true,
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    language: {
      type: String,
      default: 'en',
    },
  },
  permissions: [{
    type: String,
    trim: true,
  }],
}, {
  timestamps: true,
});

// Compound indexes for multi-tenant queries
userSchema.index({ tenantId: 1, role: 1 });
userSchema.index({ tenantId: 1, isActive: 1 });
userSchema.index({ email: 1, tenantId: 1 });
// CRITICAL: Add email-only index for fast login queries
userSchema.index({ email: 1, isActive: 1 });
// Note: email field already has unique: true in schema definition

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    // Validate password strength
    if (this.password.length < 6) {
      return next(new Error('Password must be at least 6 characters long'));
    }
    
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method with timeout protection
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  try {
    // Add timeout protection to prevent bcrypt from hanging
    return await Promise.race([
      bcrypt.compare(candidatePassword, this.password),
      new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error('Password comparison timeout')), 3000)
      )
    ]);
  } catch (error) {
    // Log timeout or other errors for monitoring
    if (error instanceof Error && error.message.includes('timeout')) {
      console.error('⚠️  Password comparison timeout for user:', this.email);
    } else {
      console.error('❌ Password comparison error:', error instanceof Error ? error.message : String(error));
    }
    return false; // Return false for any comparison failure
  }
};

// Check if user is super admin
userSchema.methods.isSuperAdmin = function (): boolean {
  return this.role === 'super_admin';
};

// Check if user belongs to a specific tenant
userSchema.methods.belongsToTenant = function (tenantId: string | mongoose.Types.ObjectId): boolean {
  if (this.isSuperAdmin()) {
    return true; // Super admins can access any tenant
  }
  if (!this.tenantId) {
    return false;
  }
  return this.tenantId.toString() === tenantId.toString();
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

export const User = mongoose.model<IUser>('User', userSchema);