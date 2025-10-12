// backend/src/models/ClientAssignment.ts
import mongoose, { Document, Schema } from 'mongoose';

/**
 * Client Assignment Model
 * 
 * Tracks the assignment of clients to team members with smart auto-reassignment.
 * Implements the 24-hour acceptance rule (working days only: Monday-Friday).
 * 
 * Features:
 * - Primary team member assignment
 * - 24-hour acceptance window
 * - Auto-reassignment if not accepted
 * - Complete assignment history
 * - Audit trail for all changes
 */

export interface IClientAssignment extends Document {
  clientId: mongoose.Types.ObjectId; // Reference to User (client)
  tenantId: mongoose.Types.ObjectId; // Reference to Tenant (RCIC company)
  
  // Current Assignment
  currentTeamMemberId: mongoose.Types.ObjectId; // Currently assigned team member
  status: 'pending' | 'accepted' | 'active' | 'completed' | 'reassigned' | 'cancelled';
  
  // Assignment Details
  assignedDate: Date; // When the assignment was made
  acceptedDate?: Date; // When team member accepted
  acceptanceDeadline: Date; // 24 hours from assignment (working days only)
  completedDate?: Date; // When case was closed
  
  // Original Assignment (who first onboarded the client)
  onboardedBy: mongoose.Types.ObjectId; // Team member who brought the client
  onboardingDate: Date;
  onboardingSource?: string; // e.g., "Referral", "Website", "Walk-in"
  
  // Case Information
  caseType?: string; // e.g., "Express Entry", "Family Sponsorship"
  caseStatus?: string; // e.g., "Initial Contact", "Documents Gathering", "Submitted"
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  
  // Assignment History
  assignmentHistory: Array<{
    teamMemberId: mongoose.Types.ObjectId;
    assignedDate: Date;
    acceptedDate?: Date;
    reassignedDate?: Date;
    reassignReason?: string; // e.g., "Not accepted in 24h", "Manual reassignment", "Team member left"
    assignedBy: mongoose.Types.ObjectId; // Who made this assignment
  }>;
  
  // Auto-Reassignment Settings
  autoReassignmentEnabled: boolean;
  autoReassignmentAttempts: number; // How many times it's been auto-reassigned
  maxAutoReassignmentAttempts: number; // Default: 3
  
  // Flags
  isAutoReassigned: boolean; // Was this auto-reassigned?
  requiresAttention: boolean; // Flagged for RCIC review
  
  // Notes
  assignmentNotes?: string; // Notes about this assignment
  
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  isAcceptanceOverdue(): boolean;
  shouldAutoReassign(): boolean;
  getNextAvailableTeamMember(): Promise<mongoose.Types.ObjectId | null>;
}

const clientAssignmentSchema = new Schema<IClientAssignment>({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  
  // Current Assignment
  currentTeamMemberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeamMember',
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'active', 'completed', 'reassigned', 'cancelled'],
    default: 'pending',
    index: true,
  },
  
  // Assignment Details
  assignedDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  acceptedDate: Date,
  acceptanceDeadline: {
    type: Date,
    required: true,
    index: true, // For finding overdue assignments
  },
  completedDate: Date,
  
  // Original Assignment
  onboardedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeamMember',
    required: true,
  },
  onboardingDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  onboardingSource: String,
  
  // Case Information
  caseType: {
    type: String,
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
  },
  caseStatus: {
    type: String,
    enum: [
      'Initial Contact',
      'Contract Signed',
      'Document Collection',
      'Application Preparation',
      'Application Submitted',
      'Additional Documents Requested',
      'Interview Scheduled',
      'Decision Pending',
      'Approved',
      'Rejected',
      'Case Closed'
    ],
    default: 'Initial Contact',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  
  // Assignment History
  assignmentHistory: [{
    teamMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeamMember',
      required: true,
    },
    assignedDate: {
      type: Date,
      required: true,
    },
    acceptedDate: Date,
    reassignedDate: Date,
    reassignReason: String,
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  }],
  
  // Auto-Reassignment Settings
  autoReassignmentEnabled: {
    type: Boolean,
    default: true,
  },
  autoReassignmentAttempts: {
    type: Number,
    default: 0,
    min: 0,
  },
  maxAutoReassignmentAttempts: {
    type: Number,
    default: 3,
    min: 0,
    max: 10,
  },
  
  // Flags
  isAutoReassigned: {
    type: Boolean,
    default: false,
  },
  requiresAttention: {
    type: Boolean,
    default: false,
    index: true,
  },
  
  // Notes
  assignmentNotes: String,
}, {
  timestamps: true,
});

// Indexes for efficient queries
clientAssignmentSchema.index({ tenantId: 1, status: 1 });
clientAssignmentSchema.index({ currentTeamMemberId: 1, status: 1 });
clientAssignmentSchema.index({ clientId: 1, tenantId: 1 }, { unique: true }); // One active assignment per client per tenant
clientAssignmentSchema.index({ acceptanceDeadline: 1, status: 1 }); // For finding overdue assignments
clientAssignmentSchema.index({ onboardedBy: 1 }); // For performance tracking
clientAssignmentSchema.index({ assignedDate: 1 });
clientAssignmentSchema.index({ tenantId: 1, requiresAttention: 1 });

// Methods

/**
 * Check if acceptance is overdue (24 hours on working days)
 */
clientAssignmentSchema.methods.isAcceptanceOverdue = function(): boolean {
  if (this.status !== 'pending') return false;
  return new Date() > this.acceptanceDeadline;
};

/**
 * Calculate acceptance deadline (24 hours, excluding weekends)
 * If assigned on Friday at 5pm, deadline is Monday at 5pm
 */
clientAssignmentSchema.methods.calculateAcceptanceDeadline = function(): Date {
  const assignedDate = new Date(this.assignedDate);
  let hoursToAdd = 24;
  let deadline = new Date(assignedDate);
  
  while (hoursToAdd > 0) {
    deadline.setHours(deadline.getHours() + 1);
    
    // Skip weekends (Saturday = 6, Sunday = 0)
    const dayOfWeek = deadline.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      hoursToAdd--;
    }
  }
  
  return deadline;
};

/**
 * Check if this assignment should be auto-reassigned
 */
clientAssignmentSchema.methods.shouldAutoReassign = function(): boolean {
  if (!this.autoReassignmentEnabled) return false;
  if (this.status !== 'pending') return false;
  if (this.autoReassignmentAttempts >= this.maxAutoReassignmentAttempts) return false;
  return this.isAcceptanceOverdue();
};

/**
 * Get next available team member for reassignment
 * Uses round-robin approach, considering workload and availability
 */
clientAssignmentSchema.methods.getNextAvailableTeamMember = async function(): Promise<mongoose.Types.ObjectId | null> {
  const TeamMember = mongoose.model('TeamMember');
  
  // Find available team members in the same tenant
  const availableTeamMembers = await TeamMember.find({
    tenantId: this.tenantId,
    isActive: true,
    'availability.isAvailableForNewClients': true,
    _id: { $ne: this.currentTeamMemberId }, // Exclude current team member
  }).sort({ 'performanceMetrics.currentWorkload': 1 }); // Sort by workload (least busy first)
  
  if (availableTeamMembers.length === 0) {
    return null; // No available team members
  }
  
  // Return the least busy team member
  return availableTeamMembers[0]._id;
};

// Pre-save hook to calculate acceptance deadline
clientAssignmentSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('assignedDate')) {
    // Calculate acceptance deadline (24 hours, excluding weekends)
    const assignedDate = new Date(this.assignedDate);
    let hoursToAdd = 24;
    let deadline = new Date(assignedDate);
    
    while (hoursToAdd > 0) {
      deadline.setHours(deadline.getHours() + 1);
      
      // Skip weekends (Saturday = 6, Sunday = 0)
      const dayOfWeek = deadline.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        hoursToAdd--;
      }
    }
    
    this.acceptanceDeadline = deadline;
  }
  next();
});

export const ClientAssignment = mongoose.model<IClientAssignment>('ClientAssignment', clientAssignmentSchema);

