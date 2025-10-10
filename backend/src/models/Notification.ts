// backend/src/models/Notification.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'critical';
  category: 'trial' | 'payment' | 'subscription' | 'user' | 'system' | 'security' | 'billing';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'unread' | 'read' | 'dismissed' | 'archived';
  
  // Target audience
  targetUsers?: mongoose.Types.ObjectId[]; // Specific users
  targetRoles?: string[]; // User roles (super_admin, admin, user)
  targetTenants?: mongoose.Types.ObjectId[]; // Specific tenants
  isGlobal: boolean; // Show to all users
  
  // Related entities
  relatedEntity?: {
    type: 'user' | 'tenant' | 'subscription' | 'payment' | 'profile';
    id: string;
  };
  
  // Action data
  actions?: Array<{
    label: string;
    action: string;
    url?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
  }>;
  
  // Scheduling
  scheduledFor?: Date;
  expiresAt?: Date;
  
  // Metadata
  metadata?: {
    source: string;
    sourceId?: string;
    tags?: string[];
    [key: string]: any;
  };
  
  // Tracking
  readBy: Array<{
    userId: mongoose.Types.ObjectId;
    readAt: Date;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>({
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  type: {
    type: String,
    required: true,
    enum: ['info', 'warning', 'error', 'success', 'critical'],
    default: 'info'
  },
  category: {
    type: String,
    required: true,
    enum: ['trial', 'payment', 'subscription', 'user', 'system', 'security', 'billing'],
    default: 'system'
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    required: true,
    enum: ['unread', 'read', 'dismissed', 'archived'],
    default: 'unread'
  },
  
  // Target audience
  targetUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  targetRoles: [String],
  targetTenants: [{
    type: Schema.Types.ObjectId,
    ref: 'Tenant'
  }],
  isGlobal: {
    type: Boolean,
    default: false
  },
  
  // Related entities
  relatedEntity: {
    type: {
      type: String,
      enum: ['user', 'tenant', 'subscription', 'payment', 'profile']
    },
    id: String
  },
  
  // Action data
  actions: [{
    label: String,
    action: String,
    url: String,
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'DELETE'],
      default: 'GET'
    },
    data: Schema.Types.Mixed
  }],
  
  // Scheduling
  scheduledFor: Date,
  expiresAt: Date,
  
  // Metadata
  metadata: {
    source: String,
    sourceId: String,
    tags: [String],
    type: Schema.Types.Mixed
  },
  
  // Tracking
  readBy: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for efficient querying
notificationSchema.index({ status: 1, createdAt: -1 });
notificationSchema.index({ targetUsers: 1, status: 1, createdAt: -1 });
notificationSchema.index({ targetRoles: 1, status: 1, createdAt: -1 });
notificationSchema.index({ targetTenants: 1, status: 1, createdAt: -1 });
notificationSchema.index({ isGlobal: 1, status: 1, createdAt: -1 });
notificationSchema.index({ category: 1, priority: 1, createdAt: -1 });
notificationSchema.index({ scheduledFor: 1, status: 1 });
notificationSchema.index({ expiresAt: 1 });

// Static methods
notificationSchema.statics.createNotification = async function(
  title: string,
  message: string,
  options: {
    type?: 'info' | 'warning' | 'error' | 'success' | 'critical';
    category?: 'trial' | 'payment' | 'subscription' | 'user' | 'system' | 'security' | 'billing';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    targetUsers?: string[];
    targetRoles?: string[];
    targetTenants?: string[];
    isGlobal?: boolean;
    relatedEntity?: { type: string; id: string };
    actions?: any[];
    scheduledFor?: Date;
    expiresAt?: Date;
    metadata?: any;
  } = {}
) {
  const notification = new this({
    title,
    message,
    type: options.type || 'info',
    category: options.category || 'system',
    priority: options.priority || 'medium',
    targetUsers: options.targetUsers,
    targetRoles: options.targetRoles,
    targetTenants: options.targetTenants,
    isGlobal: options.isGlobal || false,
    relatedEntity: options.relatedEntity,
    actions: options.actions,
    scheduledFor: options.scheduledFor,
    expiresAt: options.expiresAt,
    metadata: options.metadata
  });

  return await notification.save();
};

notificationSchema.statics.getUserNotifications = async function(
  userId: string,
  userRole: string,
  tenantId?: string,
  options: {
    status?: string;
    category?: string;
    priority?: string;
    limit?: number;
    page?: number;
  } = {}
) {
  const {
    status = 'unread',
    category,
    priority,
    limit = 20,
    page = 1
  } = options;

  const query: any = {
    $or: [
      { isGlobal: true },
      { targetUsers: userId },
      { targetRoles: userRole },
      ...(tenantId ? [{ targetTenants: tenantId }] : [])
    ],
    $and: [
      { status: { $ne: 'archived' } },
      { $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }] },
      { $or: [{ scheduledFor: { $exists: false } }, { scheduledFor: { $lte: new Date() } }] }
    ]
  };

  if (status !== 'all') {
    (query as any).status = status;
  }
  if (category) {
    (query as any).category = category;
  }
  if (priority) {
    (query as any).priority = priority;
  }

  const skip = (page - 1) * limit;
  const notifications = await this.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await this.countDocuments(query);

  return {
    notifications,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalNotifications: total,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    }
  };
};

notificationSchema.statics.markAsRead = async function(notificationId: string, userId: string) {
  return await this.findByIdAndUpdate(
    notificationId,
    {
      $addToSet: { readBy: { userId, readAt: new Date() } },
      $set: { status: 'read' }
    },
    { new: true }
  );
};

notificationSchema.statics.getUnreadCount = async function(userId: string, userRole: string, tenantId?: string) {
  const query: any = {
    $or: [
      { isGlobal: true },
      { targetUsers: userId },
      { targetRoles: userRole },
      ...(tenantId ? [{ targetTenants: tenantId }] : [])
    ],
    $and: [
      { status: 'unread' },
      { $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }] },
      { $or: [{ scheduledFor: { $exists: false } }, { scheduledFor: { $lte: new Date() } }] }
    ]
  };

  return await this.countDocuments(query);
};

// Extend the model interface to include static methods
interface INotificationModel extends mongoose.Model<INotification> {
  createNotification(
    title: string,
    message: string,
    options?: {
      type?: 'info' | 'warning' | 'error' | 'success' | 'critical';
      category?: 'trial' | 'payment' | 'subscription' | 'user' | 'system' | 'security' | 'billing';
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      targetUsers?: string[];
      targetRoles?: string[];
      targetTenants?: string[];
      isGlobal?: boolean;
      relatedEntity?: { type: string; id: string };
      actions?: any[];
      scheduledFor?: Date;
      expiresAt?: Date;
      metadata?: any;
    }
  ): Promise<INotification>;
  
  getUserNotifications(
    userId: string,
    userRole: string,
    tenantId?: string,
    options?: {
      status?: string;
      category?: string;
      priority?: string;
      limit?: number;
      page?: number;
    }
  ): Promise<{
    notifications: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalNotifications: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }>;
  
  markAsRead(notificationId: string, userId: string): Promise<INotification | null>;
  
  getUnreadCount(userId: string, userRole: string, tenantId?: string): Promise<number>;
}

export const Notification = mongoose.model<INotification, INotificationModel>('Notification', notificationSchema);
