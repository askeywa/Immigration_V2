// backend/src/models/TeamMember.ts
import mongoose, { Document, Schema } from 'mongoose';

/**
 * Team Member Model
 * 
 * Represents a team member (sub-tenant) who works under a main RCIC tenant.
 * Team members can manage clients, track performance, and collaborate with other team members.
 * 
 * Key Features:
 * - Same database access as main tenant
 * - Performance tracking
 * - Client assignment with auto-reassignment
 * - Configurable financial data visibility
 */

export interface ITeamMember extends Document {
  userId: mongoose.Types.ObjectId; // Reference to User document
  tenantId: mongoose.Types.ObjectId; // Reference to parent tenant (RCIC company)
  
  // Team member details
  displayName: string; // How they appear in the system
  designation?: string; // e.g., "Junior Consultant", "Senior Consultant"
  specialization?: string[]; // e.g., ["Express Entry", "Family Sponsorship"]
  languages?: string[]; // Languages spoken (for client matching)
  
  // Status
  isActive: boolean;
  joinedDate: Date;
  leftDate?: Date;
  
  // Permissions & Access Control
  permissions: {
    canViewAllClients: boolean; // Default: true
    canEditAllClients: boolean; // Default: false (only their assigned clients)
    canDeleteClients: boolean; // Default: false
    canCreateClients: boolean; // Default: true
    canReassignClients: boolean; // Default: false
    canViewFinancialData: boolean; // Configurable by main RCIC
    canViewTeamPerformance: boolean; // Default: true (limited view)
    canExportData: boolean; // Default: false
    canManageDocuments: boolean; // Default: true
  };
  
  // Client Assignment
  assignedClients: mongoose.Types.ObjectId[]; // Array of user IDs assigned to this team member
  maxClientCapacity?: number; // Optional: Maximum number of clients they can handle
  
  // Performance Metrics
  performanceMetrics: {
    // Client Acquisition
    totalClientsOnboarded: number;
    clientsOnboardedThisMonth: number;
    clientsOnboardedThisYear: number;
    
    // Case Progress
    activeCases: number;
    completedCases: number;
    successfulCases: number; // Approved applications
    rejectedCases: number;
    averageCompletionTimeDays?: number;
    
    // Workload
    currentWorkload: number; // Number of active clients assigned
    pendingTasks: number;
    overdueTasks: number;
    averageResponseTimeHours?: number;
    
    // Revenue Contribution (if financial visibility enabled)
    totalRevenueGenerated?: number;
    paymentsCollected?: number;
    outstandingPayments?: number;
    
    // Quality Metrics
    clientSatisfactionScore?: number; // 1-5 rating
    caseSuccessRate?: number; // Percentage of successful cases
    
    // Last Updated
    lastCalculated: Date;
  };
  
  // Availability & Scheduling
  availability?: {
    isAvailableForNewClients: boolean;
    workingDays: string[]; // e.g., ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    workingHours?: {
      start: string; // e.g., "09:00"
      end: string; // e.g., "17:00"
    };
    timezone?: string;
  };
  
  // Contact Information
  contactInfo?: {
    phone?: string;
    extension?: string;
    email: string; // Same as User email
  };
  
  // Notes & Additional Info
  notes?: string; // Internal notes about this team member
  createdBy: mongoose.Types.ObjectId; // Which admin created this team member
  
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  isAvailableForAssignment(): boolean;
  canAcceptMoreClients(): boolean;
  hasFinancialAccess(): boolean;
  updatePerformanceMetrics(): Promise<void>;
}

const teamMemberSchema = new Schema<ITeamMember>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // One team member record per user
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  
  // Team member details
  displayName: {
    type: String,
    required: true,
    trim: true,
  },
  designation: {
    type: String,
    trim: true,
  },
  specialization: [{
    type: String,
    trim: true,
    enum: [
      'Express Entry',
      'Family Sponsorship',
      'Study Permit',
      'Work Permit',
      'Visitor Visa',
      'Citizenship',
      'Appeal/Refugee',
      'Business Immigration',
      'Provincial Nominee',
      'Other'
    ],
  }],
  languages: [{
    type: String,
    trim: true,
  }],
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  joinedDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  leftDate: Date,
  
  // Permissions & Access Control
  permissions: {
    canViewAllClients: {
      type: Boolean,
      default: true,
    },
    canEditAllClients: {
      type: Boolean,
      default: true, // As per requirement
    },
    canDeleteClients: {
      type: Boolean,
      default: true, // As per requirement
    },
    canCreateClients: {
      type: Boolean,
      default: true,
    },
    canReassignClients: {
      type: Boolean,
      default: false,
    },
    canViewFinancialData: {
      type: Boolean,
      default: false, // Configurable by main RCIC
    },
    canViewTeamPerformance: {
      type: Boolean,
      default: true,
    },
    canExportData: {
      type: Boolean,
      default: false,
    },
    canManageDocuments: {
      type: Boolean,
      default: true,
    },
  },
  
  // Client Assignment
  assignedClients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  maxClientCapacity: {
    type: Number,
    min: 0,
    max: 1000,
  },
  
  // Performance Metrics
  performanceMetrics: {
    // Client Acquisition
    totalClientsOnboarded: {
      type: Number,
      default: 0,
      min: 0,
    },
    clientsOnboardedThisMonth: {
      type: Number,
      default: 0,
      min: 0,
    },
    clientsOnboardedThisYear: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Case Progress
    activeCases: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedCases: {
      type: Number,
      default: 0,
      min: 0,
    },
    successfulCases: {
      type: Number,
      default: 0,
      min: 0,
    },
    rejectedCases: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageCompletionTimeDays: Number,
    
    // Workload
    currentWorkload: {
      type: Number,
      default: 0,
      min: 0,
    },
    pendingTasks: {
      type: Number,
      default: 0,
      min: 0,
    },
    overdueTasks: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageResponseTimeHours: Number,
    
    // Revenue Contribution
    totalRevenueGenerated: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentsCollected: {
      type: Number,
      default: 0,
      min: 0,
    },
    outstandingPayments: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Quality Metrics
    clientSatisfactionScore: {
      type: Number,
      min: 1,
      max: 5,
    },
    caseSuccessRate: {
      type: Number,
      min: 0,
      max: 100,
    },
    
    // Last Updated
    lastCalculated: {
      type: Date,
      default: Date.now,
    },
  },
  
  // Availability & Scheduling
  availability: {
    isAvailableForNewClients: {
      type: Boolean,
      default: true,
    },
    workingDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },
    workingHours: {
      start: {
        type: String,
        default: '09:00',
      },
      end: {
        type: String,
        default: '17:00',
      },
    },
    timezone: {
      type: String,
      default: 'America/Toronto',
    },
  },
  
  // Contact Information
  contactInfo: {
    phone: String,
    extension: String,
    email: {
      type: String,
      required: true,
    },
  },
  
  // Notes & Additional Info
  notes: String,
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes for performance
teamMemberSchema.index({ tenantId: 1, isActive: 1 });
teamMemberSchema.index({ userId: 1 }, { unique: true });
teamMemberSchema.index({ tenantId: 1, 'availability.isAvailableForNewClients': 1 });
teamMemberSchema.index({ 'performanceMetrics.currentWorkload': 1 });
teamMemberSchema.index({ specialization: 1 });

// Methods

/**
 * Check if team member is available for new client assignment
 */
teamMemberSchema.methods.isAvailableForAssignment = function(): boolean {
  if (!this.isActive) return false;
  if (!this.availability?.isAvailableForNewClients) return false;
  
  // Check if at capacity
  if (this.maxClientCapacity && this.performanceMetrics.currentWorkload >= this.maxClientCapacity) {
    return false;
  }
  
  return true;
};

/**
 * Check if team member can accept more clients
 */
teamMemberSchema.methods.canAcceptMoreClients = function(): boolean {
  return this.isAvailableForAssignment();
};

/**
 * Check if team member has financial data access
 */
teamMemberSchema.methods.hasFinancialAccess = function(): boolean {
  return this.permissions?.canViewFinancialData || false;
};

/**
 * Update performance metrics based on current data
 * This should be called periodically or when relevant data changes
 */
teamMemberSchema.methods.updatePerformanceMetrics = async function(): Promise<void> {
  try {
    const User = mongoose.model('User');
    const ClientAssignment = mongoose.model('ClientAssignment');
    
    // Count clients created by this team member
    const totalOnboarded = await User.countDocuments({
      createdBy: this.userId,
      role: 'user', // Only count actual clients, not admins
    });
    
    // Count currently assigned clients
    const currentlyAssigned = await ClientAssignment.countDocuments({
      teamMemberId: this._id,
      status: 'active',
    });
    
    // Update metrics
    this.performanceMetrics.totalClientsOnboarded = totalOnboarded;
    this.performanceMetrics.currentWorkload = currentlyAssigned;
    this.performanceMetrics.lastCalculated = new Date();
    
    await this.save();
  } catch (error) {
    console.error('Error updating team member performance metrics:', error);
    throw error;
  }
};

// Virtual for full name
teamMemberSchema.virtual('fullName').get(function() {
  return this.displayName;
});

// Ensure virtuals are included in JSON
teamMemberSchema.set('toJSON', { virtuals: true });
teamMemberSchema.set('toObject', { virtuals: true });

export const TeamMember = mongoose.model<ITeamMember>('TeamMember', teamMemberSchema);

