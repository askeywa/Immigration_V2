// frontend/src/services/teamMemberService.ts
import axios from 'axios';
import { api } from './api';
import {
  TeamMember,
  TeamMemberWithStats,
  CreateTeamMemberRequest,
  UpdateTeamMemberRequest,
  AssignClientRequest,
  ReassignClientRequest,
  CompleteAssignmentRequest,
  BulkReassignRequest,
  ClientAssignment,
  PerformanceComparisonResponse,
  TeamMemberPermissions,
} from '@/types/teamMember.types';

// Create a separate API instance for team members that uses the correct base URL
const teamMemberApi = axios.create({
  baseURL: import.meta.env.MODE === 'development' ? 'http://localhost:5000/api' : 'https://ibuyscrap.ca/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add the same interceptors as the main api
teamMemberApi.interceptors.request.use(
  (config: any) => {
    // Try to get token from authStore first
    let token = null;
    let tenantDomain = null;
    
    // Fallback to sessionStorage if authStore token is not available
    if (typeof window !== 'undefined') {
      try {
        const authStorage = sessionStorage.getItem('auth-storage');
        if (authStorage) {
          const authData = JSON.parse(authStorage);
          token = authData?.state?.token;
          tenantDomain = authData?.state?.tenant?.domain;
        }
      } catch (error) {
        console.error('Error parsing auth storage:', error);
      }
    }

    // Add authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add tenant domain header
    if (tenantDomain) {
      config.headers['x-tenant-domain'] = tenantDomain;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

class TeamMemberService {
  /**
   * Create a new team member
   */
  async createTeamMember(data: CreateTeamMemberRequest): Promise<{ teamMember: TeamMember; user: any }> {
    const response = await teamMemberApi.post('/team-members', data);
    return response.data.data;
  }

  /**
   * Get all team members for current tenant
   */
  async getTeamMembers(includeInactive = false, withStats = false): Promise<TeamMember[] | TeamMemberWithStats[]> {
    const response = await teamMemberApi.get('/team-members', {
      params: { includeInactive, withStats },
    });
    return response.data.data;
  }

  /**
   * Get a specific team member by ID
   */
  async getTeamMemberById(id: string): Promise<{ teamMember: TeamMember; stats: any }> {
    const response = await teamMemberApi.get(`/team-members/${id}`);
    return response.data.data;
  }

  /**
   * Update team member
   */
  async updateTeamMember(id: string, data: UpdateTeamMemberRequest): Promise<TeamMember> {
    const response = await teamMemberApi.put(`/team-members/${id}`, data);
    return response.data.data;
  }

  /**
   * Deactivate team member
   */
  async deactivateTeamMember(id: string): Promise<{ teamMemberId: string; activeAssignments: number }> {
    const response = await teamMemberApi.delete(`/team-members/${id}`);
    return response.data.data;
  }

  /**
   * Reactivate team member
   */
  async reactivateTeamMember(id: string): Promise<TeamMember> {
    const response = await teamMemberApi.post(`/team-members/${id}/reactivate`);
    return response.data.data;
  }

  /**
   * Update team member permissions
   */
  async updatePermissions(id: string, permissions: Partial<TeamMemberPermissions>): Promise<TeamMember> {
    const response = await teamMemberApi.patch(`/team-members/${id}/permissions`, { permissions });
    return response.data.data;
  }

  /**
   * Assign client to team member
   */
  async assignClient(teamMemberId: string, data: AssignClientRequest): Promise<ClientAssignment> {
    const response = await teamMemberApi.post(`/team-members/${teamMemberId}/assign-client`, data);
    return response.data.data;
  }

  /**
   * Get team member assignments
   */
  async getAssignments(teamMemberId: string, status?: string): Promise<ClientAssignment[]> {
    const response = await teamMemberApi.get(`/team-members/${teamMemberId}/assignments`, {
      params: { status },
    });
    return response.data.data;
  }

  /**
   * Accept assignment
   */
  async acceptAssignment(assignmentId: string): Promise<ClientAssignment> {
    const response = await teamMemberApi.post(`/team-members/assignments/${assignmentId}/accept`);
    return response.data.data;
  }

  /**
   * Reassign client
   */
  async reassignClient(assignmentId: string, data: ReassignClientRequest): Promise<ClientAssignment> {
    const response = await teamMemberApi.post(`/team-members/assignments/${assignmentId}/reassign`, data);
    return response.data.data;
  }

  /**
   * Complete assignment
   */
  async completeAssignment(assignmentId: string, data: CompleteAssignmentRequest): Promise<ClientAssignment> {
    const response = await teamMemberApi.post(`/team-members/assignments/${assignmentId}/complete`, data);
    return response.data.data;
  }

  /**
   * Bulk reassign clients
   */
  async bulkReassign(oldTeamMemberId: string, data: BulkReassignRequest): Promise<{ reassigned: number; failed: number }> {
    const response = await teamMemberApi.post(`/team-members/${oldTeamMemberId}/bulk-reassign`, data);
    return response.data.data;
  }

  /**
   * Get performance comparison
   */
  async getPerformanceComparison(): Promise<PerformanceComparisonResponse> {
    const response = await teamMemberApi.get('/team-members/performance/comparison');
    return response.data.data;
  }

  /**
   * Get my assignments (for logged-in team member)
   */
  async getMyAssignments(status?: string): Promise<ClientAssignment[]> {
    const response = await teamMemberApi.get('/team-members/my-assignments', {
      params: { status },
    });
    return response.data.data;
  }

  /**
   * Process overdue assignments (admin/cron trigger)
   */
  async processOverdueAssignments(): Promise<{ processed: number; reassigned: number; flagged: number }> {
    const response = await teamMemberApi.post('/team-members/process-overdue');
    return response.data.data;
  }
}

export const teamMemberService = new TeamMemberService();
export default teamMemberService;

