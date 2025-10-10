// backend/src/models/Impersonation.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IImpersonation extends Document {
  superAdminId: mongoose.Types.ObjectId;
  superAdminEmail: string;
  targetUserId: mongoose.Types.ObjectId;
  targetUserEmail: string;
  targetTenantId: mongoose.Types.ObjectId;
  targetTenantName: string;
  sessionId: string;
  impersonationToken: string;
  reason: string;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
  actions: Array<{
    action: string;
    endpoint: string;
    timestamp: Date;
    details?: any;
  }>;
  metadata: {
    ipAddress: string;
    userAgent: string;
    deviceId?: string;
    location?: string;
    riskScore: number;
    flags: string[];
  };
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  isExpired(): boolean;
  extendSession(minutes: number): void;
  addAction(action: string, endpoint: string, details?: any): void;
  calculateRiskScore(): number;
  endImpersonation(): void;
}

const impersonationSchema = new Schema<IImpersonation>({
  superAdminId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  superAdminEmail: {
    type: String,
    required: true
  },
  targetUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetUserEmail: {
    type: String,
    required: true
  },
  targetTenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  targetTenantName: {
    type: String,
    required: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  impersonationToken: {
    type: String,
    required: true,
    unique: true
  },
  reason: {
    type: String,
    required: true,
    maxlength: 500
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  actions: [{
    action: {
      type: String,
      required: true
    },
    endpoint: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: Schema.Types.Mixed
  }],
  metadata: {
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: {
      type: String,
      required: true
    },
    deviceId: String,
    location: String,
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    flags: [{
      type: String,
      enum: ['suspicious_activity', 'high_privilege_access', 'cross_tenant_access', 'unusual_hours', 'multiple_sessions']
    }]
  }
}, {
  timestamps: true
});

// Instance methods
impersonationSchema.methods.isExpired = function(): boolean {
  if (!this.isActive) return true;
  
  // Default session timeout of 2 hours
  const maxDuration = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
  return (Date.now() - this.startTime.getTime()) > maxDuration;
};

impersonationSchema.methods.extendSession = function(minutes: number): void {
  const extensionMs = minutes * 60 * 1000;
  const newEndTime = new Date(this.startTime.getTime() + extensionMs);
  this.endTime = newEndTime;
};

impersonationSchema.methods.addAction = function(action: string, endpoint: string, details?: any): void {
  this.actions.push({
    action,
    endpoint,
    timestamp: new Date(),
    details
  });
  
  // Keep only last 100 actions
  if (this.actions.length > 100) {
    this.actions = this.actions.slice(-100);
  }
  
  // Update risk score based on action
  this.metadata.riskScore = this.calculateRiskScore();
};

impersonationSchema.methods.calculateRiskScore = function(): number {
  let score = 0;
  
  // Base score from actions
  this.actions.forEach((action: any) => {
    switch ((action as any).action) {
      case 'user_management':
      case 'tenant_management':
      case 'system_configuration':
        score += 10;
        break;
      case 'data_export':
      case 'bulk_operations':
        score += 15;
        break;
      case 'delete':
      case 'suspension':
        score += 20;
        break;
      default:
        score += 1;
    }
  });
  
  // Risk factors
  if (this.actions.length > 50) score += 10; // High activity
  if (this.metadata.flags.includes('unusual_hours')) score += 15;
  if (this.metadata.flags.includes('suspicious_activity')) score += 25;
  if (this.metadata.flags.includes('high_privilege_access')) score += 20;
  if (this.metadata.flags.includes('cross_tenant_access')) score += 30;
  
  return Math.min(score, 100); // Cap at 100
};

impersonationSchema.methods.endImpersonation = function(): void {
  this.isActive = false;
  this.endTime = new Date();
};

// Static methods
interface IImpersonationModel extends mongoose.Model<IImpersonation> {
  createImpersonation(
    superAdminId: string,
    superAdminEmail: string,
    targetUserId: string,
    targetUserEmail: string,
    targetTenantId: string,
    targetTenantName: string,
    reason: string,
    sessionId: string,
    metadata: {
      ipAddress: string;
      userAgent: string;
      deviceId?: string;
      location?: string;
    }
  ): Promise<IImpersonation>;
  
  getActiveImpersonations(superAdminId?: string): Promise<IImpersonation[]>;
  
  getImpersonationHistory(
    superAdminId?: string,
    targetUserId?: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      isActive?: boolean;
    },
    options?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{
    impersonations: IImpersonation[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalImpersonations: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }>;
  
  getImpersonationStats(
    superAdminId?: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{
    totalImpersonations: number;
    activeImpersonations: number;
    avgDuration: number;
    topTargetUsers: Array<{ userId: string; email: string; count: number }>;
    topSuperAdmins: Array<{ adminId: string; email: string; count: number }>;
    riskDistribution: Array<{ riskLevel: string; count: number }>;
    hourlyDistribution: Array<{ hour: number; count: number }>;
  }>;
  
  cleanupExpiredSessions(): Promise<number>;
  
  validateImpersonationToken(token: string): Promise<IImpersonation | null>;
  
  endAllActiveSessions(superAdminId: string): Promise<number>;
}

impersonationSchema.statics.createImpersonation = async function(
  superAdminId: string,
  superAdminEmail: string,
  targetUserId: string,
  targetUserEmail: string,
  targetTenantId: string,
  targetTenantName: string,
  reason: string,
  sessionId: string,
  metadata: {
    ipAddress: string;
    userAgent: string;
    deviceId?: string;
    location?: string;
  }
): Promise<IImpersonation> {
  const impersonationToken = require('crypto').randomBytes(32).toString('hex');
  
  const impersonation = new this({
    superAdminId,
    superAdminEmail,
    targetUserId,
    targetUserEmail,
    targetTenantId,
    targetTenantName,
    sessionId,
    impersonationToken,
    reason,
    metadata: {
      ...metadata,
      riskScore: 0,
      flags: []
    }
  });
  
  return await impersonation.save();
};

impersonationSchema.statics.getActiveImpersonations = async function(superAdminId?: string): Promise<IImpersonation[]> {
  const query: any = { isActive: true };
  if (superAdminId) {
    (query as any).superAdminId = superAdminId;
  }
  
  return await this.find(query)
    .populate('superAdminId', 'firstName lastName email')
    .populate('targetUserId', 'firstName lastName email')
    .populate('targetTenantId', 'name domain')
    .sort({ startTime: -1 })
    .lean();
};

impersonationSchema.statics.getImpersonationHistory = async function(
  superAdminId?: string,
  targetUserId?: string,
  filters: {
    startDate?: Date;
    endDate?: Date;
    isActive?: boolean;
  } = {},
  options: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<{
  impersonations: IImpersonation[];
  pagination: any;
}> {
  const {
    page = 1,
    limit = 50,
    sortBy = 'startTime',
    sortOrder = 'desc'
  } = options;

  const query: any = {};

  if (superAdminId) (query as any).superAdminId = superAdminId;
  if (targetUserId) (query as any).targetUserId = targetUserId;
  if (filters.isActive !== undefined) (query as any).isActive = filters.isActive;
  
  if (filters.startDate || filters.endDate) {
    (query as any).startTime = {};
    if (filters.startDate) (query as any).startTime.$gte = filters.startDate;
    if (filters.endDate) (query as any).startTime.$lte = filters.endDate;
  }

  const skip = (page - 1) * limit;
  const sort: any = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const impersonations = await this.find(query)
    .populate('superAdminId', 'firstName lastName email')
    .populate('targetUserId', 'firstName lastName email')
    .populate('targetTenantId', 'name domain')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await this.countDocuments(query);

  return {
    impersonations,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalImpersonations: total,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    }
  };
};

impersonationSchema.statics.getImpersonationStats = async function(
  superAdminId?: string,
  filters: {
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<any> {
  const query: any = {};

  if (superAdminId) (query as any).superAdminId = superAdminId;
  if (filters.startDate || filters.endDate) {
    (query as any).startTime = {};
    if (filters.startDate) (query as any).startTime.$gte = filters.startDate;
    if (filters.endDate) (query as any).startTime.$lte = filters.endDate;
  }

  const [
    totalImpersonations,
    activeImpersonations,
    avgDurationResult,
    topTargetUsers,
    topSuperAdmins,
    riskDistribution,
    hourlyDistribution
  ] = await Promise.all([
    this.countDocuments(query),
    this.countDocuments({ ...query, isActive: true }),
    this.aggregate([
      { $match: { ...query, endTime: { $exists: true } } },
      { $addFields: { duration: { $subtract: ['$endTime', '$startTime'] } } },
      { $group: { _id: null, avgDuration: { $avg: '$duration' } } }
    ]),
    this.aggregate([
      { $match: query },
      { $group: { _id: '$targetUserId', email: { $first: '$targetUserEmail' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]),
    this.aggregate([
      { $match: query },
      { $group: { _id: '$superAdminId', email: { $first: '$superAdminEmail' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]),
    this.aggregate([
      { $match: query },
      {
        $bucket: {
          groupBy: '$metadata.riskScore',
          boundaries: [0, 25, 50, 75, 100],
          default: 'Unknown',
          output: { count: { $sum: 1 } }
        }
      }
    ]),
    this.aggregate([
      { $match: query },
      { $addFields: { hour: { $hour: '$startTime' } } },
      { $group: { _id: '$hour', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
  ]);

  return {
    totalImpersonations,
    activeImpersonations,
    avgDuration: avgDurationResult[0]?.avgDuration || 0,
    topTargetUsers,
    topSuperAdmins,
    riskDistribution,
    hourlyDistribution
  };
};

impersonationSchema.statics.cleanupExpiredSessions = async function(): Promise<number> {
  const result = await this.updateMany(
    { 
      isActive: true,
      startTime: { $lt: new Date(Date.now() - 2 * 60 * 60 * 1000) } // 2 hours ago
    },
    { 
      isActive: false,
      endTime: new Date()
    }
  );
  
  return result.modifiedCount;
};

impersonationSchema.statics.validateImpersonationToken = async function(token: string): Promise<IImpersonation | null> {
  return await this.findOne({
    impersonationToken: token,
    isActive: true
  }).populate('superAdminId', 'firstName lastName email')
    .populate('targetUserId', 'firstName lastName email')
    .populate('targetTenantId', 'name domain');
};

impersonationSchema.statics.endAllActiveSessions = async function(superAdminId: string): Promise<number> {
  const result = await this.updateMany(
    { superAdminId, isActive: true },
    { 
      isActive: false,
      endTime: new Date()
    }
  );
  
  return result.modifiedCount;
};

// Compound indexes for efficient querying
impersonationSchema.index({ superAdminId: 1, startTime: -1 });
impersonationSchema.index({ targetUserId: 1, startTime: -1 });
impersonationSchema.index({ targetTenantId: 1, startTime: -1 });
impersonationSchema.index({ isActive: 1, startTime: -1 });
// impersonationToken already has unique: true which creates an index
// sessionId already has unique: true which creates an index
impersonationSchema.index({ 'metadata.riskScore': 1 });

export const Impersonation = mongoose.model<IImpersonation, IImpersonationModel>('Impersonation', impersonationSchema);
