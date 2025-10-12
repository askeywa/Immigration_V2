import { api } from './api';

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

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

class TenantUserService {
  /**
   * Get tenant users with filtering and pagination
   */
  async getUsers(filters: UserFilters = {}): Promise<UsersResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.role) params.append('role', filters.role);
      if (filters.status) params.append('status', filters.status);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const response = await api.get<ApiResponse<UsersResponse>>(`/tenant/users?${params.toString()}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch users:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<UserStats> {
    try {
      const response = await api.get<ApiResponse<UserStats>>('/tenant/users/stats');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
      throw error;
    }
  }

  /**
   * Get user activity logs
   */
  async getUserActivity(userId: string, limit: number = 20): Promise<UserActivity[]> {
    try {
      const response = await api.get<ApiResponse<{ activities: UserActivity[] }>>(
        `/tenant/users/${userId}/activity?limit=${limit}`
      );
      return response.data.data.activities;
    } catch (error) {
      console.error('Failed to fetch user activity:', error);
      throw error;
    }
  }

  /**
   * Get user by ID with detailed information
   */
  async getUserById(userId: string): Promise<TenantUser> {
    try {
      const response = await api.get<ApiResponse<TenantUser>>(`/users/${userId}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Failed to fetch user details');
    } catch (error) {
      console.error('Error fetching user details:', error);
      throw error;
    }
  }

  /**
   * Bulk update users
   */
  async bulkUpdateUsers(request: BulkUpdateRequest): Promise<BulkUpdateResponse> {
    try {
      const response = await api.put<ApiResponse<BulkUpdateResponse>>(
        '/tenant/users/bulk',
        request
      );
      return response.data.data;
    } catch (error) {
      console.error('Failed to bulk update users:', error);
      throw error;
    }
  }

  /**
   * Get available user roles
   */
  getUserRoles() {
    return [
      { value: 'user', label: 'User', description: 'Regular user access' },
      { value: 'admin', label: 'Admin', description: 'Administrative access' },
      { value: 'super_admin', label: 'Super Admin', description: 'Full system access' }
    ];
  }

  /**
   * Get available user statuses
   */
  getUserStatuses() {
    return [
      { value: 'active', label: 'Active', color: 'green' },
      { value: 'inactive', label: 'Inactive', color: 'red' }
    ];
  }

  /**
   * Get available sort options
   */
  getSortOptions() {
    return [
      { value: 'createdAt', label: 'Created Date' },
      { value: 'lastLogin', label: 'Last Login' },
      { value: 'firstName', label: 'First Name' },
      { value: 'lastName', label: 'Last Name' },
      { value: 'email', label: 'Email' },
      { value: 'role', label: 'Role' }
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
   * Format user display name
   */
  formatUserName(user: TenantUser): string {
    return `${user.firstName} ${user.lastName}`.trim() || user.email;
  }

  /**
   * Get user status color
   */
  getUserStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'green';
      case 'inactive':
        return 'red';
      default:
        return 'gray';
    }
  }

  /**
   * Get role display name
   */
  getRoleDisplayName(role: string): string {
    const roleMap: Record<string, string> = {
      user: 'User',
      admin: 'Admin',
      super_admin: 'Super Admin'
    };
    return roleMap[role] || role;
  }

  /**
   * Check if user can be deleted
   */
  canDeleteUser(user: TenantUser): boolean {
    // Don't allow deleting admin users
    return user.role !== 'admin' && user.role !== 'super_admin';
  }

  /**
   * Check if user can change role
   */
  canChangeUserRole(user: TenantUser, newRole: string): boolean {
    // Don't allow changing super admin roles
    if (user.role === 'super_admin') return false;
    
    // Don't allow promoting to super admin
    if (newRole === 'super_admin') return false;
    
    return true;
  }

  /**
   * Get activity type display info
   */
  getActivityTypeInfo(type: string) {
    const activityTypes: Record<string, { label: string; icon: string; color: string }> = {
      login: { label: 'Login', icon: '🔑', color: 'blue' },
      logout: { label: 'Logout', icon: '🚪', color: 'gray' },
      profile_update: { label: 'Profile Update', icon: '✏️', color: 'green' },
      document_upload: { label: 'Document Upload', icon: '📄', color: 'purple' },
      password_change: { label: 'Password Change', icon: '🔒', color: 'orange' }
    };
    
    return activityTypes[type] || { label: type, icon: '📝', color: 'gray' };
  }
}

export const tenantUserService = new TenantUserService();
