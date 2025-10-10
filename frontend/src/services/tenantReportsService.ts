import { api } from './api';

export interface ReportFilters {
  type: 'summary' | 'users' | 'documents' | 'revenue' | 'activity';
  format: 'json' | 'csv' | 'pdf';
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
  [key: string]: any;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

class TenantReportsService {
  /**
   * Generate a report
   */
  async generateReport(filters: ReportFilters): Promise<ReportData> {
    try {
      const params = new URLSearchParams({
        type: filters.type,
        format: filters.format
      });

      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }

      const response = await api.get<ApiResponse<ReportData>>(`/tenant/reports?${params.toString()}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to generate report:', error);
      throw error;
    }
  }

  /**
   * Download a report as CSV
   */
  async downloadCSVReport(filters: Omit<ReportFilters, 'format'>): Promise<Blob> {
    try {
      const params = new URLSearchParams({
        type: filters.type,
        format: 'csv'
      });

      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }

      const response = await api.get(`/tenant/reports?${params.toString()}`, {
        responseType: 'blob'
      });

      return response.data;
    } catch (error) {
      console.error('Failed to download CSV report:', error);
      throw error;
    }
  }

  /**
   * Download a report as PDF
   */
  async downloadPDFReport(filters: Omit<ReportFilters, 'format'>): Promise<Blob> {
    try {
      const params = new URLSearchParams({
        type: filters.type,
        format: 'pdf'
      });

      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }

      const response = await api.get(`/tenant/reports?${params.toString()}`, {
        responseType: 'blob'
      });

      return response.data;
    } catch (error) {
      console.error('Failed to download PDF report:', error);
      throw error;
    }
  }

  /**
   * Get available report types
   */
  getReportTypes() {
    return [
      {
        id: 'summary',
        name: 'Summary Report',
        description: 'Overview of key metrics and statistics',
        icon: '📊'
      },
      {
        id: 'users',
        name: 'User Report',
        description: 'Detailed user information and activity',
        icon: '👥'
      },
      {
        id: 'documents',
        name: 'Document Report',
        description: 'Document processing status and metrics',
        icon: '📄'
      },
      {
        id: 'revenue',
        name: 'Revenue Report',
        description: 'Financial data and subscription information',
        icon: '💰'
      },
      {
        id: 'activity',
        name: 'Activity Report',
        description: 'System activity and user actions',
        icon: '📈'
      }
    ];
  }

  /**
   * Get available export formats
   */
  getExportFormats() {
    return [
      {
        id: 'json',
        name: 'JSON',
        description: 'Structured data format',
        icon: '📋'
      },
      {
        id: 'csv',
        name: 'CSV',
        description: 'Spreadsheet format',
        icon: '📊'
      },
      {
        id: 'pdf',
        name: 'PDF',
        description: 'Document format (coming soon)',
        icon: '📄',
        disabled: true
      }
    ];
  }

  /**
   * Helper function to trigger file download
   */
  downloadFile(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Helper function to format date for API
   */
  formatDateForAPI(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Helper function to get default date range
   */
  getDefaultDateRange() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days

    return {
      startDate: this.formatDateForAPI(startDate),
      endDate: this.formatDateForAPI(endDate)
    };
  }
}

export const tenantReportsService = new TenantReportsService();
