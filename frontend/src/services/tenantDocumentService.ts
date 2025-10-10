import { api } from './api';

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

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

class TenantDocumentService {
  /**
   * Get tenant documents with filtering and pagination
   */
  async getDocuments(filters: DocumentFilters = {}): Promise<DocumentsResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      if (filters.uploadedBy) params.append('uploadedBy', filters.uploadedBy);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const response = await api.get<ApiResponse<DocumentsResponse>>(`/tenant/documents?${params.toString()}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      throw error;
    }
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(): Promise<DocumentStats> {
    try {
      const response = await api.get<ApiResponse<DocumentStats>>('/tenant/documents/stats');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch document stats:', error);
      throw error;
    }
  }

  /**
   * Get document analytics
   */
  async getDocumentAnalytics(period: string = '30d'): Promise<DocumentAnalytics> {
    try {
      const response = await api.get<ApiResponse<DocumentAnalytics>>(`/tenant/documents/analytics?period=${period}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch document analytics:', error);
      throw error;
    }
  }

  /**
   * Update document status
   */
  async updateDocumentStatus(documentId: string, update: DocumentStatusUpdate): Promise<any> {
    try {
      const response = await api.put<ApiResponse<any>>(`/tenant/documents/${documentId}/status`, update);
      return response.data.data;
    } catch (error) {
      console.error('Failed to update document status:', error);
      throw error;
    }
  }

  /**
   * Bulk update documents
   */
  async bulkUpdateDocuments(request: BulkDocumentUpdate): Promise<any> {
    try {
      const response = await api.put<ApiResponse<any>>('/tenant/documents/bulk', request);
      return response.data.data;
    } catch (error) {
      console.error('Failed to bulk update documents:', error);
      throw error;
    }
  }

  /**
   * Get available document types
   */
  getDocumentTypes() {
    return [
      { value: 'passport', label: 'Passport', icon: '📘' },
      { value: 'birth_certificate', label: 'Birth Certificate', icon: '📜' },
      { value: 'educational_document', label: 'Educational Document', icon: '🎓' },
      { value: 'employment_document', label: 'Employment Document', icon: '💼' },
      { value: 'language_test', label: 'Language Test', icon: '🗣️' },
      { value: 'medical_exam', label: 'Medical Exam', icon: '🏥' },
      { value: 'police_clearance', label: 'Police Clearance', icon: '👮' },
      { value: 'financial_document', label: 'Financial Document', icon: '💰' },
      { value: 'other', label: 'Other', icon: '📄' }
    ];
  }

  /**
   * Get available document statuses
   */
  getDocumentStatuses() {
    return [
      { value: 'pending', label: 'Pending', color: 'yellow' },
      { value: 'under_review', label: 'Under Review', color: 'blue' },
      { value: 'approved', label: 'Approved', color: 'green' },
      { value: 'rejected', label: 'Rejected', color: 'red' }
    ];
  }

  /**
   * Get available sort options
   */
  getSortOptions() {
    return [
      { value: 'uploadedAt', label: 'Upload Date' },
      { value: 'processedAt', label: 'Processed Date' },
      { value: 'name', label: 'Document Name' },
      { value: 'type', label: 'Document Type' },
      { value: 'status', label: 'Status' },
      { value: 'fileSize', label: 'File Size' }
    ];
  }

  /**
   * Get pagination options
   */
  getPaginationOptions() {
    return [
      { value: 10, label: '10 per page' },
      { value: 25, label: '25 per page' },
      { value: 50, label: '50 per page' },
      { value: 100, label: '100 per page' }
    ];
  }

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get document type display name
   */
  getDocumentTypeDisplayName(type: string): string {
    const typeMap: Record<string, string> = {
      passport: 'Passport',
      birth_certificate: 'Birth Certificate',
      educational_document: 'Educational Document',
      employment_document: 'Employment Document',
      language_test: 'Language Test',
      medical_exam: 'Medical Exam',
      police_clearance: 'Police Clearance',
      financial_document: 'Financial Document',
      other: 'Other'
    };
    return typeMap[type] || type;
  }

  /**
   * Get status color
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'approved':
        return 'green';
      case 'pending':
        return 'yellow';
      case 'under_review':
        return 'blue';
      case 'rejected':
        return 'red';
      default:
        return 'gray';
    }
  }

  /**
   * Get file type icon
   */
  getFileTypeIcon(fileType: string): string {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('excel')) return '📊';
    return '📄';
  }

  /**
   * Check if document can be updated
   */
  canUpdateDocument(document: TenantDocument): boolean {
    return document.status !== 'approved' && document.status !== 'rejected';
  }

  /**
   * Get processing time display
   */
  getProcessingTimeDisplay(document: TenantDocument): string {
    if (!document.processedAt) return 'Not processed';
    
    const uploaded = new Date(document.uploadedAt);
    const processed = new Date(document.processedAt);
    const diffMs = processed.getTime() - uploaded.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return '< 1 hour';
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  }

  /**
   * Get document type icon
   */
  getDocumentTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      passport: '📘',
      birth_certificate: '📜',
      educational_document: '🎓',
      employment_document: '💼',
      language_test: '🗣️',
      medical_exam: '🏥',
      police_clearance: '👮',
      financial_document: '💰',
      other: '📄'
    };
    return icons[type] || '📄';
  }
}

export const tenantDocumentService = new TenantDocumentService();
