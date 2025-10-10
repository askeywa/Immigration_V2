// backend/src/models/AuditLog.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId | string; // Allow 'system' string for automated actions
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: {
    before?: any;
    after?: any;
    changes?: any;
  };
  ipAddress?: string;
  userAgent?: string;
  tenantId?: mongoose.Types.ObjectId;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'user' | 'tenant' | 'subscription' | 'system' | 'security' | 'billing';
  metadata?: {
    sessionId?: string;
    requestId?: string;
    duration?: number;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  userId: {
    type: Schema.Types.Mixed, // Allow both ObjectId and string ('system')
    required: true,
    index: true,
    validate: {
      validator: function(v: any) {
        // Accept 'system' string or valid ObjectId
        return v === 'system' || mongoose.Types.ObjectId.isValid(v);
      },
      message: 'userId must be a valid ObjectId or "system"'
    }
  },
  userEmail: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'create', 'read', 'update', 'delete',
      'login', 'logout', 'password_change', 'password_reset',
      'suspend', 'activate', 'cancel', 'renew',
      'export', 'import', 'backup', 'restore',
      'configure', 'deploy', 'maintenance',
      'performance_alert', 'health_check', 'cron_job', 'system_event' // Added for system monitoring
    ],
    index: true
  },
  resource: {
    type: String,
    required: true,
    enum: [
      'user', 'tenant', 'subscription', 'profile',
      'role', 'permission', 'system', 'billing',
      'audit_log', 'file', 'report',
      'performance', 'monitoring', 'alert', 'notification' // Added for monitoring resources
    ],
    index: true
  },
  resourceId: {
    type: String,
    index: true
  },
  details: {
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    changes: Schema.Types.Mixed
  },
  ipAddress: {
    type: String,
    index: true
  },
  userAgent: String,
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Tenant',
    index: true
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low',
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: ['user', 'tenant', 'subscription', 'system', 'security', 'billing'],
    default: 'system',
    index: true
  },
  metadata: {
    sessionId: String,
    requestId: String,
    duration: Number,
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, resource: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, category: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

// Static methods
auditLogSchema.statics.logAction = async function(
  userId: string,
  userEmail: string,
  action: string,
  resource: string,
  options: {
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    tenantId?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    category?: 'user' | 'tenant' | 'subscription' | 'system' | 'security' | 'billing';
    metadata?: any;
  } = {}
) {
  const log = new this({
    userId,
    userEmail,
    action,
    resource,
    resourceId: options.resourceId,
    details: options.details || {},
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    tenantId: options.tenantId,
    severity: options.severity || 'low',
    category: options.category || 'system',
    metadata: options.metadata || {}
  });

  return await log.save();
};

auditLogSchema.statics.getLogs = async function(
  filters: {
    userId?: string;
    tenantId?: string;
    action?: string;
    resource?: string;
    severity?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
  } = {},
  options: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}
) {
  const {
    page = 1,
    limit = 50,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = options;

  const query: any = {};

  if (filters.userId) (query as any).userId = filters.userId;
  if (filters.tenantId) (query as any).tenantId = filters.tenantId;
  if (filters.action) (query as any).action = filters.action;
  if (filters.resource) (query as any).resource = filters.resource;
  if (filters.severity) (query as any).severity = filters.severity;
  if (filters.category) (query as any).category = filters.category;
  if (filters.startDate || filters.endDate) {
    (query as any).createdAt = {};
    if (filters.startDate) (query as any).createdAt.$gte = filters.startDate;
    if (filters.endDate) (query as any).createdAt.$lte = filters.endDate;
  }

  const skip = (page - 1) * limit;
  const sort: any = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const logs = await this.find(query)
    .populate('userId', 'firstName lastName email')
    .populate('tenantId', 'name domain')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await this.countDocuments(query);

  return {
    logs,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalLogs: total,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    }
  };
};

auditLogSchema.statics.getStats = async function(
  filters: {
    tenantId?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
) {
  const query: any = {};

  if (filters.tenantId) (query as any).tenantId = filters.tenantId;
  if (filters.startDate || filters.endDate) {
    (query as any).createdAt = {};
    if (filters.startDate) (query as any).createdAt.$gte = filters.startDate;
    if (filters.endDate) (query as any).createdAt.$lte = filters.endDate;
  }

  const [
    totalLogs,
    logsByAction,
    logsBySeverity,
    logsByCategory,
    recentLogs
  ] = await Promise.all([
    this.countDocuments(query),
    this.aggregate([
      { $match: query },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    this.aggregate([
      { $match: query },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    this.aggregate([
      { $match: query },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    this.find(query)
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()
  ]);

  return {
    totalLogs,
    logsByAction,
    logsBySeverity,
    logsByCategory,
    recentLogs
  };
};

// Extend the model interface to include static methods
interface IAuditLogModel extends mongoose.Model<IAuditLog> {
  logAction(
    userId: string,
    userEmail: string,
    action: string,
    resource: string,
    options?: {
      resourceId?: string;
      details?: any;
      ipAddress?: string;
      userAgent?: string;
      tenantId?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      category?: 'user' | 'tenant' | 'subscription' | 'system' | 'security' | 'billing';
      metadata?: any;
    }
  ): Promise<IAuditLog>;
  
  getLogs(
    filters?: {
      userId?: string;
      tenantId?: string;
      action?: string;
      resource?: string;
      severity?: string;
      category?: string;
      startDate?: Date;
      endDate?: Date;
    },
    options?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{
    logs: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalLogs: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }>;
  
  getStats(
    filters?: {
      tenantId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{
    totalLogs: number;
    logsByAction: any[];
    logsBySeverity: any[];
    logsByCategory: any[];
    recentLogs: any[];
  }>;
}

export const AuditLog = mongoose.model<IAuditLog, IAuditLogModel>('AuditLog', auditLogSchema);
