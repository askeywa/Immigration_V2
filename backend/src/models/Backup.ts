// backend/src/models/Backup.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IBackup extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  type: 'full' | 'incremental' | 'differential' | 'tenant' | 'database' | 'files' | 'logs';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  tenantId?: mongoose.Types.ObjectId;
  scope: 'all' | 'tenant' | 'database' | 'files' | 'logs' | 'custom';
  source: {
    databases?: string[];
    collections?: string[];
    paths?: string[];
    tenants?: string[];
  };
  destination: {
    type: 'local' | 's3' | 'gcs' | 'azure' | 'ftp' | 'sftp';
    path: string;
    bucket?: string;
    region?: string;
    credentials?: {
      accessKeyId?: string;
      secretAccessKey?: string;
      endpoint?: string;
    };
  };
  schedule?: {
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'manual';
    cronExpression?: string;
    timezone?: string;
    enabled: boolean;
  };
  retention: {
    days: number;
    versions: number;
    cleanupEnabled: boolean;
  };
  encryption: {
    enabled: boolean;
    algorithm?: string;
    key?: string;
  };
  compression: {
    enabled: boolean;
    algorithm: 'gzip' | 'bzip2' | 'zip' | 'tar' | 'tar.gz' | 'tar.bz2';
    level: number;
  };
  verification: {
    enabled: boolean;
    checksum?: string;
    integrity?: boolean;
  };
  metadata: {
    size?: number;
    fileCount?: number;
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    errorMessage?: string;
    createdBy?: mongoose.Types.ObjectId;
    tags?: string[];
    description?: string;
  };
  notifications: {
    enabled: boolean;
    channels: ('email' | 'slack' | 'webhook' | 'sms')[];
    recipients: string[];
    onSuccess: boolean;
    onFailure: boolean;
    onCompletion: boolean;
  };
  health: {
    lastVerification?: Date;
    lastRestore?: Date;
    corruptionDetected?: boolean;
    corruptionCount?: number;
  };
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  toBackupInfo(): any;
  canRestore(): boolean;
  
  // Static methods
  getBackupStatistics(tenantId?: string): Promise<any>;
  getBackupsByType(tenantId?: string): Promise<any>;
  getBackupsByTime(tenantId?: string, days?: number): Promise<any>;
}

const BackupSchema = new Schema<IBackup>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    index: true
  },
  type: {
    type: String,
    enum: ['full', 'incremental', 'differential', 'tenant', 'database', 'files', 'logs'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Tenant',
    index: true,
    sparse: true
  },
  scope: {
    type: String,
    enum: ['all', 'tenant', 'database', 'files', 'logs', 'custom'],
    required: true,
    index: true
  },
  source: {
    databases: [{
      type: String,
      trim: true
    }],
    collections: [{
      type: String,
      trim: true
    }],
    paths: [{
      type: String,
      trim: true
    }],
    tenants: [{
      type: String,
      trim: true
    }]
  },
  destination: {
    type: {
      type: String,
      enum: ['local', 's3', 'gcs', 'azure', 'ftp', 'sftp'],
      required: true
    },
    path: {
      type: String,
      required: true,
      trim: true
    },
    bucket: {
      type: String,
      trim: true
    },
    region: {
      type: String,
      trim: true
    },
    credentials: {
      accessKeyId: {
        type: String,
        trim: true
      },
      secretAccessKey: {
        type: String,
        trim: true
      },
      endpoint: {
        type: String,
        trim: true
      }
    }
  },
  schedule: {
    frequency: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly', 'manual'],
      default: 'manual'
    },
    cronExpression: {
      type: String,
      trim: true
    },
    timezone: {
      type: String,
      default: 'UTC',
      trim: true
    },
    enabled: {
      type: Boolean,
      default: false
    }
  },
  retention: {
    days: {
      type: Number,
      default: 30,
      min: 1,
      max: 3650
    },
    versions: {
      type: Number,
      default: 10,
      min: 1,
      max: 100
    },
    cleanupEnabled: {
      type: Boolean,
      default: true
    }
  },
  encryption: {
    enabled: {
      type: Boolean,
      default: false
    },
    algorithm: {
      type: String,
      enum: ['AES-256-GCM', 'AES-256-CBC', 'ChaCha20-Poly1305'],
      default: 'AES-256-GCM'
    },
    key: {
      type: String,
      trim: true
    }
  },
  compression: {
    enabled: {
      type: Boolean,
      default: true
    },
    algorithm: {
      type: String,
      enum: ['gzip', 'bzip2', 'zip', 'tar', 'tar.gz', 'tar.bz2'],
      default: 'gzip'
    },
    level: {
      type: Number,
      default: 6,
      min: 1,
      max: 9
    }
  },
  verification: {
    enabled: {
      type: Boolean,
      default: true
    },
    checksum: {
      type: String,
      trim: true
    },
    integrity: {
      type: Boolean,
      default: false
    }
  },
  metadata: {
    size: {
      type: Number,
      min: 0
    },
    fileCount: {
      type: Number,
      min: 0
    },
    startTime: {
      type: Date
    },
    endTime: {
      type: Date
    },
    duration: {
      type: Number,
      min: 0
    },
    errorMessage: {
      type: String,
      maxlength: 1000
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: 50
    }],
    description: {
      type: String,
      maxlength: 500
    }
  },
  notifications: {
    enabled: {
      type: Boolean,
      default: true
    },
    channels: [{
      type: String,
      enum: ['email', 'slack', 'webhook', 'sms']
    }],
    recipients: [{
      type: String,
      trim: true
    }],
    onSuccess: {
      type: Boolean,
      default: false
    },
    onFailure: {
      type: Boolean,
      default: true
    },
    onCompletion: {
      type: Boolean,
      default: true
    }
  },
  health: {
    lastVerification: {
      type: Date
    },
    lastRestore: {
      type: Date
    },
    corruptionDetected: {
      type: Boolean,
      default: false
    },
    corruptionCount: {
      type: Number,
      default: 0,
      min: 0
    }
  }
}, {
  timestamps: true,
  collection: 'backups'
});

// Compound indexes for performance and querying
BackupSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
BackupSchema.index({ type: 1, status: 1, createdAt: -1 });
BackupSchema.index({ scope: 1, status: 1, createdAt: -1 });
BackupSchema.index({ 'schedule.enabled': 1, 'schedule.frequency': 1 });
BackupSchema.index({ 'destination.type': 1, createdAt: -1 });
BackupSchema.index({ status: 1, 'metadata.startTime': -1 });
BackupSchema.index({ 'health.corruptionDetected': 1, 'health.lastVerification': -1 });
BackupSchema.index({ name: 'text', 'metadata.description': 'text' });

// TTL index for automatic cleanup (based on retention policy)
BackupSchema.index({ createdAt: 1 }, { 
  expireAfterSeconds: 0, // Disabled by default, will be set dynamically
  partialFilterExpression: { 'retention.cleanupEnabled': true }
});

// Virtual for backup age
BackupSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Virtual for backup size in human readable format
BackupSchema.virtual('sizeFormatted').get(function() {
  if (!this.metadata.size) return 'Unknown';
  
  const bytes = this.metadata.size;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Virtual for backup duration in human readable format
BackupSchema.virtual('durationFormatted').get(function() {
  if (!this.metadata.duration) return 'Unknown';
  
  const duration = this.metadata.duration;
  const hours = Math.floor(duration / 3600000);
  const minutes = Math.floor((duration % 3600000) / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
});

// Pre-save middleware
BackupSchema.pre('save', function(next) {
  // Set TTL based on retention policy
  if (this.retention.cleanupEnabled && this.retention.days) {
    const ttlSeconds = this.retention.days * 24 * 60 * 60;
    this.collection.createIndex({ createdAt: 1 }, { 
      expireAfterSeconds: ttlSeconds,
      partialFilterExpression: { 'retention.cleanupEnabled': true }
    });
  }

  // Generate checksum if verification is enabled
  if (this.verification.enabled && this.status === 'completed' && !this.verification.checksum) {
    // This would be calculated during backup process
    // For now, we'll leave it empty
  }

  next();
});

// Instance methods
BackupSchema.methods.isExpired = function(): boolean {
  if (!this.retention.cleanupEnabled) return false;
  
  const expirationDate = new Date(this.createdAt.getTime() + (this.retention.days * 24 * 60 * 60 * 1000));
  return Date.now() > expirationDate.getTime();
};

BackupSchema.methods.isHealthy = function(): boolean {
  return !this.health.corruptionDetected && this.status === 'completed';
};

BackupSchema.methods.canRestore = function(): boolean {
  return this.status === 'completed' && this.verification.integrity !== false;
};

BackupSchema.methods.toBackupInfo = function(): any {
  return {
    id: this._id,
    name: this.name,
    type: this.type,
    status: this.status,
    scope: this.scope,
    tenantId: this.tenantId,
    size: this.sizeFormatted,
    duration: this.durationFormatted,
    createdAt: this.createdAt,
    age: this.age,
    isExpired: this.isExpired(),
    isHealthy: this.isHealthy(),
    canRestore: this.canRestore(),
    destination: {
      type: this.destination.type,
      path: this.destination.path
    },
    schedule: this.schedule,
    retention: this.retention
  };
};

// Static methods
BackupSchema.statics.findByTenant = function(tenantId: string, limit: number = 50) {
  return this.find({ tenantId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

BackupSchema.statics.findByType = function(type: string, limit: number = 50) {
  return this.find({ type })
    .sort({ createdAt: -1 })
    .limit(limit);
};

BackupSchema.statics.findByStatus = function(status: string, limit: number = 50) {
  return this.find({ status })
    .sort({ createdAt: -1 })
    .limit(limit);
};

BackupSchema.statics.findScheduled = function() {
  return this.find({ 'schedule.enabled': true });
};

BackupSchema.statics.findExpired = function() {
  return this.find({
    'retention.cleanupEnabled': true,
    createdAt: {
      $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Default 30 days
    }
  });
};

BackupSchema.statics.findCorrupted = function() {
  return this.find({ 'health.corruptionDetected': true });
};

BackupSchema.statics.getBackupStatistics = function(tenantId?: string) {
  const match: any = {};
  
  if (tenantId) {
    (match as any).tenantId = tenantId;
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        running: { $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        totalSize: { $sum: '$metadata.size' },
        avgSize: { $avg: '$metadata.size' },
        totalDuration: { $sum: '$metadata.duration' },
        avgDuration: { $avg: '$metadata.duration' },
        corrupted: { $sum: { $cond: [{ $eq: ['$health.corruptionDetected', true] }, 1, 0] } }
      }
    }
  ]);
};

BackupSchema.statics.getBackupsByType = function(tenantId?: string) {
  const match: any = {};
  
  if (tenantId) {
    (match as any).tenantId = tenantId;
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        totalSize: { $sum: '$metadata.size' },
        avgSize: { $avg: '$metadata.size' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

BackupSchema.statics.getBackupsByTime = function(tenantId?: string, days: number = 30) {
  const match: any = {};
  
  if (tenantId) {
    (match as any).tenantId = tenantId;
  }
  
  const startTime = new Date();
  startTime.setDate(startTime.getDate() - days);
  (match as any).createdAt = { $gte: startTime };

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        count: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        totalSize: { $sum: '$metadata.size' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);
};

// Instance methods
BackupSchema.methods.toBackupInfo = function() {
  return {
    id: this._id,
    name: this.name,
    type: this.type,
    status: this.status,
    tenantId: this.tenantId,
    scope: this.scope,
    destination: {
      type: this.destination.type,
      path: this.destination.path,
      bucket: this.destination.bucket,
      region: this.destination.region
    },
    schedule: this.schedule,
    retention: this.retention,
    encryption: this.encryption,
    compression: this.compression,
    metadata: this.metadata,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

BackupSchema.methods.canRestore = function() {
  return this.status === 'completed' && 
         this.metadata?.size && 
         this.metadata?.size > 0 &&
         !this.verification?.corruptionDetected;
};

// Static methods
BackupSchema.statics.getBackupStatistics = async function(tenantId?: string) {
  const matchQuery = tenantId ? { tenantId: new mongoose.Types.ObjectId(tenantId) } : {};
  
  return await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        running: { $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        totalSize: { $sum: '$metadata.size' }
      }
    }
  ]);
};

BackupSchema.statics.getBackupsByType = async function(tenantId?: string) {
  const matchQuery = tenantId ? { tenantId: new mongoose.Types.ObjectId(tenantId) } : {};
  
  return await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        totalSize: { $sum: '$metadata.size' }
      }
    }
  ]);
};

BackupSchema.statics.getBackupsByTime = async function(tenantId?: string, days: number = 30) {
  const matchQuery = tenantId ? { 
    tenantId: new mongoose.Types.ObjectId(tenantId),
    createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
  } : {
    createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
  };
  
  return await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        count: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        totalSize: { $sum: '$metadata.size' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);
};

export default mongoose.model<IBackup>('Backup', BackupSchema);
