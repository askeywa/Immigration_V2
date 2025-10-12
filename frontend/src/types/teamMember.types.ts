// frontend/src/types/teamMember.types.ts

/**
 * Team Member Type Definitions
 * Frontend types for Team Member (Sub-Tenant) system
 */

export interface TeamMemberPermissions {
  canViewAllClients: boolean;
  canEditAllClients: boolean;
  canDeleteClients: boolean;
  canCreateClients: boolean;
  canReassignClients: boolean;
  canViewFinancialData: boolean;
  canViewTeamPerformance: boolean;
  canExportData: boolean;
  canManageDocuments: boolean;
}

export interface TeamMemberAvailability {
  isAvailableForNewClients: boolean;
  workingDays: string[];
  workingHours: {
    start: string;
    end: string;
  };
  timezone: string;
}

export interface TeamMemberPerformanceMetrics {
  // Client Acquisition
  totalClientsOnboarded: number;
  clientsOnboardedThisMonth: number;
  clientsOnboardedThisYear: number;
  
  // Case Progress
  activeCases: number;
  completedCases: number;
  successfulCases: number;
  rejectedCases: number;
  averageCompletionTimeDays?: number;
  
  // Workload
  currentWorkload: number;
  pendingTasks: number;
  overdueTasks: number;
  averageResponseTimeHours?: number;
  
  // Revenue Contribution
  totalRevenueGenerated?: number;
  paymentsCollected?: number;
  outstandingPayments?: number;
  
  // Quality Metrics
  clientSatisfactionScore?: number;
  caseSuccessRate?: number;
  
  // Last Updated
  lastCalculated: string;
}

export interface TeamMemberContactInfo {
  phone?: string;
  extension?: string;
  email: string;
}

export interface TeamMember {
  _id: string;
  userId: string;
  tenantId: string;
  displayName: string;
  designation?: string;
  specialization?: string[];
  languages?: string[];
  isActive: boolean;
  joinedDate: string;
  leftDate?: string;
  permissions: TeamMemberPermissions;
  assignedClients: string[];
  maxClientCapacity?: number;
  performanceMetrics: TeamMemberPerformanceMetrics;
  availability?: TeamMemberAvailability;
  contactInfo?: TeamMemberContactInfo;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentHistoryEntry {
  teamMemberId: string;
  assignedDate: string;
  acceptedDate?: string;
  reassignedDate?: string;
  reassignReason?: string;
  assignedBy: string;
}

export interface ClientAssignment {
  _id: string;
  clientId: string;
  tenantId: string;
  currentTeamMemberId: string;
  status: 'pending' | 'accepted' | 'active' | 'completed' | 'reassigned' | 'cancelled';
  assignedDate: string;
  acceptedDate?: string;
  acceptanceDeadline: string;
  completedDate?: string;
  onboardedBy: string;
  onboardingDate: string;
  onboardingSource?: string;
  caseType?: string;
  caseStatus?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignmentHistory: AssignmentHistoryEntry[];
  autoReassignmentEnabled: boolean;
  autoReassignmentAttempts: number;
  maxAutoReassignmentAttempts: number;
  isAutoReassigned: boolean;
  requiresAttention: boolean;
  assignmentNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMemberStats {
  totalAssignments: number;
  pendingAssignments: number;
  acceptedAssignments: number;
  completedAssignments: number;
  averageAcceptanceTime: number;
  overdueAssignments: number;
}

export interface TeamMemberWithStats {
  teamMember: TeamMember;
  stats: TeamMemberStats;
}

export interface CreateTeamMemberRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  designation?: string;
  specialization?: string[];
  languages?: string[];
  permissions?: Partial<TeamMemberPermissions>;
  maxClientCapacity?: number;
  mustChangePassword?: boolean;
}

export interface UpdateTeamMemberRequest {
  designation?: string;
  specialization?: string[];
  languages?: string[];
  permissions?: Partial<TeamMemberPermissions>;
  maxClientCapacity?: number;
  availability?: Partial<TeamMemberAvailability>;
  contactInfo?: Partial<TeamMemberContactInfo>;
  notes?: string;
}

export interface AssignClientRequest {
  clientId: string;
  caseType?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
}

export interface ReassignClientRequest {
  newTeamMemberId: string;
  reason: string;
}

export interface CompleteAssignmentRequest {
  finalStatus: 'Approved' | 'Rejected' | 'Case Closed';
  notes?: string;
}

export interface BulkReassignRequest {
  newTeamMemberId: string;
  reason: string;
}

export interface PerformanceComparisonRanking {
  rank: number;
  teamMember: {
    id: string;
    name: string;
    designation?: string;
    specialization?: string[];
  };
  metrics: TeamMemberPerformanceMetrics & TeamMemberStats;
}

export interface PerformanceComparisonResponse {
  rankings: PerformanceComparisonRanking[];
  summary: {
    totalTeamMembers: number;
    totalActiveAssignments: number;
    totalCompletedCases: number;
    averageSuccessRate: number;
  };
}

// Case Types (matching backend)
export const CASE_TYPES = [
  'Express Entry',
  'Family Sponsorship',
  'Study Permit',
  'Work Permit',
  'Visitor Visa',
  'Citizenship',
  'Appeal/Refugee',
  'Business Immigration',
  'Provincial Nominee',
  'Other',
] as const;

export type CaseType = typeof CASE_TYPES[number];

// Case Statuses (matching backend)
export const CASE_STATUSES = [
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
  'Case Closed',
] as const;

export type CaseStatus = typeof CASE_STATUSES[number];

