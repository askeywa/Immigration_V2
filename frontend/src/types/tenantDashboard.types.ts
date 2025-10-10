// frontend/src/types/tenantDashboard.types.ts

// Dashboard Statistics Types
export interface TenantStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  totalDocuments: number;
  pendingDocuments: number;
  monthlyRevenue: number;
  systemUptime: string;
  lastUpdated: string;
}

export interface RecentActivity {
  _id: string;
  type: 'user_registration' | 'document_upload' | 'system_alert' | 'user_login';
  description: string;
  timestamp: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  metadata?: Record<string, any>;
}

export interface TenantAnalyticsData {
  period: string;
  userGrowth: Array<{
    date: string;
    count: number;
  }>;
  documentProcessing: {
    uploaded: number;
    approved: number;
    rejected: number;
    pending: number;
  };
  systemPerformance: {
    avgResponseTime: number;
    uptime: number;
    errorRate: number;
  };
  revenue: {
    current: number;
    previous: number;
    growth: number;
  };
  lastUpdated: string;
}

// Reports Types
export interface ReportFilters {
  type: 'summary' | 'users' | 'documents' | 'revenue' | 'activity';
  format?: 'json' | 'csv' | 'pdf';
  startDate?: string;
  endDate?: string;
}

export interface ReportData {
  reportType: string;
  generatedAt: string;
  dateRange: {
    start: string;
    end: string;
  };
  summary?: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    userGrowthRate: string;
    monthlyRevenue: number;
  };
  statistics?: {
    total: number;
    active?: number;
    inactive?: number;
    newThisPeriod?: number;
    approved?: number;
    pending?: number;
    rejected?: number;
  };
  users?: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
    lastLogin: string;
  }>;
  documents?: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    uploadedBy: string;
    uploadedAt: string;
    processedAt: string | null;
  }>;
  revenue?: {
    current: number;
    total: number;
    currency: string;
    plan: string;
  };
  totalActivities?: number;
  activities?: Array<{
    type: string;
    description: string;
    timestamp: string;
    user?: string;
  }>;
  message?: string; // For PDF not implemented yet
}

// User Management Types
export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TenantUser {
  _id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin?: string;
  profileComplete: boolean;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  newUsersThisMonth: number;
  usersWithCompleteProfiles: number;
  profileCompletionRate: string;
  usersByRole: Record<string, number>;
  lastUpdated: string;
}

export interface UserActivity {
  _id: string;
  type: string;
  description: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
}

export interface BulkUpdateRequest {
  userIds: string[];
  action: 'activate' | 'deactivate' | 'change_role' | 'delete';
  data?: {
    role?: string;
  };
}

export interface BulkUpdateResponse {
  action: string;
  affectedCount: number;
  message: string;
}

export interface UsersResponse {
  users: TenantUser[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Document Management Types
export interface DocumentFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
  uploadedBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TenantDocument {
  _id: string;
  name: string;
  type: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  uploadedBy: string;
  uploadedByUserId: string;
  uploadedAt: string;
  processedAt?: string;
  fileSize: number;
  fileType: string;
  version: number;
  metadata: {
    pages?: number;
    extractedText?: string;
    rejectionReason?: string;
    score?: number;
    [key: string]: any;
  };
}

export interface DocumentStats {
  totalDocuments: number;
  approved: number;
  pending: number;
  underReview: number;
  rejected: number;
  totalFileSize: number;
  avgProcessingTime: string;
  documentsByType: Record<string, number>;
  documentsByStatus: Record<string, number>;
  processingTrend: Array<{
    date: string;
    processed: number;
    uploaded: number;
  }>;
  lastUpdated: string;
}

export interface DocumentAnalytics {
  period: string;
  uploadTrend: Array<{
    date: string;
    count: number;
  }>;
  processingTimeTrend: Array<{
    date: string;
    avgHours: number;
  }>;
  statusDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
  processingEfficiency: {
    avgProcessingTime: string;
    firstTimeApprovalRate: number;
    rejectionRate: number;
    avgReviewCycles: number;
  };
  topUploaders: Array<{
    userId: string;
    name: string;
    count: number;
  }>;
}

export interface DocumentStatusUpdate {
  status: string;
  reason?: string;
  notes?: string;
}

export interface BulkDocumentUpdate {
  documentIds: string[];
  action: 'approve' | 'reject' | 'mark_under_review' | 'delete';
  data?: {
    reason?: string;
    notes?: string;
  };
}

export interface DocumentsResponse {
  documents: TenantDocument[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// System Monitoring Types
export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'down';
  status: 'operational' | 'maintenance' | 'incident';
  lastChecked: string;
  uptime: string;
  responseTime: string;
  errorRate: number;
  services: {
    api: ServiceStatus;
    database: ServiceStatus;
    storage: ServiceStatus;
    email: ServiceStatus;
  };
  metrics: {
    requestsPerMinute: number;
    activeUsers: number;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
  };
  alerts: any[];
  incidents: any[];
}

export interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'down';
  responseTime: string;
  uptime: string;
  connections?: number;
  usedSpace?: string;
  lastIncident?: string | null;
}

export interface SystemPerformance {
  period: string;
  metrics: {
    responseTime: {
      current: number;
      average: number;
      p95: number;
      p99: number;
      trend: string;
    };
    throughput: {
      requestsPerSecond: number;
      requestsPerMinute: number;
      requestsPerHour: number;
      trend: string;
    };
    errorRate: {
      current: number;
      average: number;
      trend: string;
    };
    uptime: {
      current: number;
      last24h: number;
      last7d: number;
      last30d: number;
    };
  };
  charts: {
    responseTime: Array<{ timestamp: string; value: number }>;
    throughput: Array<{ timestamp: string; value: number }>;
    errorRate: Array<{ timestamp: string; value: number }>;
  };
  lastUpdated: string;
}

export interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'critical';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  service: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface SystemIncident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved';
  startedAt: string;
  resolvedAt?: string;
  duration?: string;
  affectedServices: string[];
  impact: string;
}

export interface SystemAlerts {
  active: SystemAlert[];
  resolved: SystemAlert[];
  incidents: SystemIncident[];
  summary: {
    activeAlerts: number;
    resolvedAlerts: number;
    openIncidents: number;
    resolvedIncidents: number;
    avgResolutionTime: string;
  };
  lastUpdated: string;
}

export interface SystemUsage {
  period: string;
  overview: {
    totalRequests: number;
    uniqueUsers: number;
    dataTransferred: string;
    avgSessionDuration: string;
    peakConcurrentUsers: number;
    apiCallsPerUser: number;
  };
  trends: {
    requests: Array<{ date: string; count: number }>;
    users: Array<{ date: string; count: number }>;
  };
  endpoints: Array<{
    path: string;
    requests: number;
    avgResponseTime: number;
  }>;
  userAgents: Array<{
    name: string;
    percentage: number;
    requests: number;
  }>;
  geolocation: Array<{
    country: string;
    percentage: number;
    users: number;
  }>;
  lastUpdated: string;
}

// Common API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
