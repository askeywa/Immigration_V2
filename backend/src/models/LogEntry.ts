// backend/src/models/LogEntry.ts
import mongoose, { Document, Schema } from 'mongoose';
import { ITenant } from './Tenant';

export interface ILogEntry extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId?: mongoose.Types.ObjectId;
  tenant?: ITenant;
  userId?: mongoose.Types.ObjectId;
  sessionId?: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  category: 'auth' | 'api' | 'database' | 'security' | 'performance' | 'audit' | 'system' | 'business' | 'integration' | 'custom';
  subcategory?: string;
  source: 'backend' | 'frontend' | 'database' | 'external' | 'system';
  service?: string;
  component?: string;
  action?: string;
  resource?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
    details?: any;
  };
  metadata: {
    [key: string]: any;
  };
  tags: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  environment: string;
  version?: string;
  buildNumber?: string;
  deploymentId?: string;
  hostname?: string;
  processId?: number;
  threadId?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LogEntrySchema = new Schema<ILogEntry>({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Tenant',
    index: true,
    sparse: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    sparse: true
  },
  sessionId: {
    type: String,
    index: true,
    sparse: true
  },
  level: {
    type: String,
    enum: ['error', 'warn', 'info', 'debug'],
    required: true,
    index: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  category: {
    type: String,
    enum: ['auth', 'api', 'database', 'security', 'performance', 'audit', 'system', 'business', 'integration', 'custom'],
    required: true,
    index: true
  },
  subcategory: {
    type: String,
    index: true
  },
  source: {
    type: String,
    enum: ['backend', 'frontend', 'database', 'external', 'system'],
    required: true,
    index: true
  },
  service: {
    type: String,
    index: true
  },
  component: {
    type: String,
    index: true
  },
  action: {
    type: String,
    index: true
  },
  resource: {
    type: String,
    index: true
  },
  endpoint: {
    type: String,
    index: true
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    index: true
  },
  statusCode: {
    type: Number,
    index: true
  },
  responseTime: {
    type: Number,
    index: true
  },
  ipAddress: {
    type: String,
    index: true
  },
  userAgent: {
    type: String,
    maxlength: 500
  },
  requestId: {
    type: String,
    index: true,
    sparse: true
  },
  correlationId: {
    type: String,
    index: true,
    sparse: true
  },
  traceId: {
    type: String,
    index: true,
    sparse: true
  },
  spanId: {
    type: String,
    index: true,
    sparse: true
  },
  error: {
    name: {
      type: String,
      maxlength: 100
    },
    message: {
      type: String,
      maxlength: 1000
    },
    stack: {
      type: String
    },
    code: {
      type: String,
      maxlength: 50
    },
    details: {
      type: Schema.Types.Mixed
    }
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  environment: {
    type: String,
    required: true,
    index: true
  },
  version: {
    type: String,
    maxlength: 20
  },
  buildNumber: {
    type: String,
    maxlength: 20
  },
  deploymentId: {
    type: String,
    maxlength: 50
  },
  hostname: {
    type: String,
    maxlength: 100
  },
  processId: {
    type: Number
  },
  threadId: {
    type: String,
    maxlength: 50
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'log_entries'
});

// Compound indexes for performance and querying
LogEntrySchema.index({ tenantId: 1, timestamp: -1 });
LogEntrySchema.index({ userId: 1, timestamp: -1 });
LogEntrySchema.index({ level: 1, timestamp: -1 });
LogEntrySchema.index({ category: 1, timestamp: -1 });
LogEntrySchema.index({ severity: 1, timestamp: -1 });
LogEntrySchema.index({ source: 1, timestamp: -1 });
LogEntrySchema.index({ environment: 1, timestamp: -1 });
LogEntrySchema.index({ tenantId: 1, level: 1, timestamp: -1 });
LogEntrySchema.index({ tenantId: 1, category: 1, timestamp: -1 });
LogEntrySchema.index({ tenantId: 1, severity: 1, timestamp: -1 });
LogEntrySchema.index({ requestId: 1, timestamp: -1 });
LogEntrySchema.index({ correlationId: 1, timestamp: -1 });
LogEntrySchema.index({ traceId: 1, timestamp: -1 });
LogEntrySchema.index({ endpoint: 1, timestamp: -1 });
LogEntrySchema.index({ statusCode: 1, timestamp: -1 });
LogEntrySchema.index({ tags: 1, timestamp: -1 });

// TTL index for automatic log cleanup (30 days) - Using createdAt instead of timestamp to avoid duplication
LogEntrySchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Text search index
LogEntrySchema.index({
  message: 'text',
  'error instanceof Error ? error.message : String(error)': 'text',
  'error.name': 'text'
});

// Virtual for tenant population
LogEntrySchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

// Virtual for user population
LogEntrySchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Pre-save middleware
LogEntrySchema.pre('save', function(next) {
  // Set default environment if not provided
  if (!this.environment) {
    this.environment = process.env.NODE_ENV || 'development';
  }

  // Set default version if not provided
  if (!this.version) {
    this.version = process.env.npm_package_version || '1.0.0';
  }

  // Set default hostname if not provided
  if (!this.hostname) {
    this.hostname = require('os').hostname();
  }

  // Set default processId if not provided
  if (!this.processId) {
    this.processId = process.pid;
  }

  // Auto-set severity based on level
  if (!this.severity) {
    switch (this.level) {
      case 'error':
        this.severity = 'high';
        break;
      case 'warn':
        this.severity = 'medium';
        break;
      case 'info':
        this.severity = 'low';
        break;
      case 'debug':
        this.severity = 'low';
        break;
      default:
        this.severity = 'medium';
    }
  }

  next();
});

// Instance methods
LogEntrySchema.methods.toLogFormat = function(): any {
  return {
    timestamp: this.timestamp.toISOString(),
    level: this.level,
    message: this.message,
    category: this.category,
    subcategory: this.subcategory,
    source: this.source,
    service: this.service,
    component: this.component,
    action: this.action,
    resource: this.resource,
    tenantId: this.tenantId?.toString(),
    userId: this.userId?.toString(),
    sessionId: this.sessionId,
    requestId: this.requestId,
    correlationId: this.correlationId,
    traceId: this.traceId,
    spanId: this.spanId,
    endpoint: this.endpoint,
    method: this.method,
    statusCode: this.statusCode,
    responseTime: this.responseTime,
    ipAddress: this.ipAddress,
    userAgent: this.userAgent,
    error: this.error,
    metadata: this.metadata,
    tags: this.tags,
    severity: this.severity,
    environment: this.environment,
    version: this.version,
    buildNumber: this.buildNumber,
    deploymentId: this.deploymentId,
    hostname: this.hostname,
    processId: this.processId,
    threadId: this.threadId
  };
};

LogEntrySchema.methods.isError = function(): boolean {
  return this.level === 'error';
};

LogEntrySchema.methods.isWarning = function(): boolean {
  return this.level === 'warn';
};

LogEntrySchema.methods.isCritical = function(): boolean {
  return this.severity === 'critical';
};

// Static methods
LogEntrySchema.statics.findByTenant = function(tenantId: string, limit: number = 100) {
  return this.find({ tenantId })
    .populate('tenant', 'name domain')
    .sort({ timestamp: -1 })
    .limit(limit);
};

LogEntrySchema.statics.findByUser = function(userId: string, limit: number = 100) {
  return this.find({ userId })
    .populate('user', 'username email')
    .sort({ timestamp: -1 })
    .limit(limit);
};

LogEntrySchema.statics.findByLevel = function(level: string, limit: number = 100) {
  return this.find({ level })
    .populate('tenant', 'name domain')
    .populate('user', 'username email')
    .sort({ timestamp: -1 })
    .limit(limit);
};

LogEntrySchema.statics.findByCategory = function(category: string, limit: number = 100) {
  return this.find({ category })
    .populate('tenant', 'name domain')
    .populate('user', 'username email')
    .sort({ timestamp: -1 })
    .limit(limit);
};

LogEntrySchema.statics.findBySeverity = function(severity: string, limit: number = 100) {
  return this.find({ severity })
    .populate('tenant', 'name domain')
    .populate('user', 'username email')
    .sort({ timestamp: -1 })
    .limit(limit);
};

LogEntrySchema.statics.findErrors = function(limit: number = 100) {
  return this.find({ level: 'error' })
    .populate('tenant', 'name domain')
    .populate('user', 'username email')
    .sort({ timestamp: -1 })
    .limit(limit);
};

LogEntrySchema.statics.findCritical = function(limit: number = 100) {
  return this.find({ severity: 'critical' })
    .populate('tenant', 'name domain')
    .populate('user', 'username email')
    .sort({ timestamp: -1 })
    .limit(limit);
};

LogEntrySchema.statics.findByTimeRange = function(startTime: Date, endTime: Date, limit: number = 1000) {
  return this.find({
    timestamp: {
      $gte: startTime,
      $lte: endTime
    }
  })
    .populate('tenant', 'name domain')
    .populate('user', 'username email')
    .sort({ timestamp: -1 })
    .limit(limit);
};

LogEntrySchema.statics.searchLogs = function(query: string, limit: number = 100) {
  return this.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  )
    .populate('tenant', 'name domain')
    .populate('user', 'username email')
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit);
};

LogEntrySchema.statics.getLogStatistics = function(tenantId?: string, timeRange?: { start: Date; end: Date }) {
  const match: any = {};
  
  if (tenantId) {
    (match as any).tenantId = new mongoose.Types.ObjectId(tenantId);
  }
  
  if (timeRange) {
    (match as any).timestamp = {
      $gte: timeRange.start,
      $lte: timeRange.end
    };
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        errors: { $sum: { $cond: [{ $eq: ['$level', 'error'] }, 1, 0] } },
        warnings: { $sum: { $cond: [{ $eq: ['$level', 'warn'] }, 1, 0] } },
        info: { $sum: { $cond: [{ $eq: ['$level', 'info'] }, 1, 0] } },
        debug: { $sum: { $cond: [{ $eq: ['$level', 'debug'] }, 1, 0] } },
        critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
        medium: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
        low: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } },
        avgResponseTime: { $avg: '$responseTime' },
        maxResponseTime: { $max: '$responseTime' },
        minResponseTime: { $min: '$responseTime' }
      }
    }
  ]);
};

LogEntrySchema.statics.getLogsByCategory = function(tenantId?: string, timeRange?: { start: Date; end: Date }) {
  const match: any = {};
  
  if (tenantId) {
    (match as any).tenantId = new mongoose.Types.ObjectId(tenantId);
  }
  
  if (timeRange) {
    (match as any).timestamp = {
      $gte: timeRange.start,
      $lte: timeRange.end
    };
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        errors: { $sum: { $cond: [{ $eq: ['$level', 'error'] }, 1, 0] } },
        warnings: { $sum: { $cond: [{ $eq: ['$level', 'warn'] }, 1, 0] } },
        avgResponseTime: { $avg: '$responseTime' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

LogEntrySchema.statics.getLogsByHour = function(tenantId?: string, days: number = 7) {
  const match: any = {};
  
  if (tenantId) {
    (match as any).tenantId = new mongoose.Types.ObjectId(tenantId);
  }
  
  const startTime = new Date();
  startTime.setDate(startTime.getDate() - days);
  (match as any).timestamp = { $gte: startTime };

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
          hour: { $hour: '$timestamp' }
        },
        count: { $sum: 1 },
        errors: { $sum: { $cond: [{ $eq: ['$level', 'error'] }, 1, 0] } },
        warnings: { $sum: { $cond: [{ $eq: ['$level', 'warn'] }, 1, 0] } },
        avgResponseTime: { $avg: '$responseTime' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
  ]);
};

export default mongoose.model<ILogEntry>('LogEntry', LogEntrySchema);
