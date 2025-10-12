// backend/src/controllers/teamMemberController.ts
import { Response, NextFunction } from 'express';
import { TeamMember, ITeamMember } from '../models/TeamMember';
import { User } from '../models/User';
import { TeamMemberAssignmentService } from '../services/teamMemberAssignmentService';
import { AppError } from '../utils/errors';
import { log } from '../config/logging';
import { TenantRequest } from '../middleware/tenantResolution';
import mongoose from 'mongoose';

export class TeamMemberController {
  /**
   * Create a new team member
   * POST /api/team-members
   */
  static async createTeamMember(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUser = req.user;

      if (!currentUser) {
        throw new AppError('User not authenticated', 401);
      }

      // Only tenant admins can create team members
      if (currentUser.role !== 'admin' && currentUser.role !== 'tenant_admin' && !currentUser.isSuperAdmin()) {
        throw new AppError('Only tenant admins can create team members', 403);
      }

      const {
        email,
        password,
        firstName,
        lastName,
        designation,
        specialization,
        languages,
        permissions,
        maxClientCapacity,
        mustChangePassword,
      } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        throw new AppError('Email, password, first name, and last name are required', 400);
      }

      const tenantId = currentUser.tenantId || req.tenantId;
      if (!tenantId) {
        throw new AppError('Tenant context required', 400);
      }

      // Check if user with this email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new AppError('User with this email already exists', 400);
      }

      // Create User account for the team member
      const user = new User({
        email,
        password, // Will be hashed by pre-save hook
        firstName,
        lastName,
        role: 'team_member',
        tenantId,
        isActive: true,
        mustChangePassword: mustChangePassword || false,
        passwordChangeRequired: mustChangePassword || false,
        isFirstLogin: true,
        createdBy: currentUser._id,
      });

      await user.save();

      // Create TeamMember profile
      const teamMember = new TeamMember({
        userId: user._id,
        tenantId,
        displayName: `${firstName} ${lastName}`,
        designation,
        specialization: specialization || [],
        languages: languages || [],
        permissions: {
          canViewAllClients: permissions?.canViewAllClients !== undefined ? permissions.canViewAllClients : true,
          canEditAllClients: permissions?.canEditAllClients !== undefined ? permissions.canEditAllClients : true,
          canDeleteClients: permissions?.canDeleteClients !== undefined ? permissions.canDeleteClients : true,
          canCreateClients: permissions?.canCreateClients !== undefined ? permissions.canCreateClients : true,
          canReassignClients: permissions?.canReassignClients || false,
          canViewFinancialData: permissions?.canViewFinancialData || false,
          canViewTeamPerformance: permissions?.canViewTeamPerformance !== undefined ? permissions.canViewTeamPerformance : true,
          canExportData: permissions?.canExportData || false,
          canManageDocuments: permissions?.canManageDocuments !== undefined ? permissions.canManageDocuments : true,
        },
        maxClientCapacity,
        assignedClients: [],
        performanceMetrics: {
          totalClientsOnboarded: 0,
          clientsOnboardedThisMonth: 0,
          clientsOnboardedThisYear: 0,
          activeCases: 0,
          completedCases: 0,
          successfulCases: 0,
          rejectedCases: 0,
          currentWorkload: 0,
          pendingTasks: 0,
          overdueTasks: 0,
          totalRevenueGenerated: 0,
          paymentsCollected: 0,
          outstandingPayments: 0,
          lastCalculated: new Date(),
        },
        availability: {
          isAvailableForNewClients: true,
          workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          workingHours: {
            start: '09:00',
            end: '17:00',
          },
          timezone: 'America/Toronto',
        },
        contactInfo: {
          email,
        },
        createdBy: currentUser._id,
      });

      await teamMember.save();

      log.info('Team member created', {
        teamMemberId: teamMember._id,
        userId: user._id,
        email,
        createdBy: currentUser._id,
        tenantId,
      });

      res.status(201).json({
        success: true,
        message: 'Team member created successfully',
        data: {
          teamMember: teamMember.toJSON(),
          user: user.toJSON(),
        },
      });

    } catch (error: any) {
      log.error('Error creating team member', {
        error: error.message,
        createdBy: req.user?._id,
      });
      next(error);
    }
  }

  /**
   * Get all team members for a tenant
   * GET /api/team-members
   */
  static async getTeamMembers(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUser = req.user;
      const tenantId = currentUser?.tenantId || req.tenantId;

      if (!tenantId) {
        throw new AppError('Tenant context required', 400);
      }

      const { includeInactive, withStats } = req.query;

      const query: any = { tenantId };
      if (!includeInactive) {
        query.isActive = true;
      }

      let teamMembers = await TeamMember.find(query)
        .populate('userId', 'firstName lastName email lastLogin isActive')
        .sort({ createdAt: -1 });

      // Include statistics if requested
      if (withStats === 'true') {
        const teamMembersWithStats = await TeamMemberAssignmentService.getTeamMembersWithStats(tenantId);
        res.status(200).json({
          success: true,
          data: teamMembersWithStats,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: teamMembers,
      });

    } catch (error: any) {
      log.error('Error fetching team members', {
        error: error.message,
        userId: req.user?._id,
      });
      next(error);
    }
  }

  /**
   * Get a single team member by ID
   * GET /api/team-members/:id
   */
  static async getTeamMemberById(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user;
      const tenantId = currentUser?.tenantId || req.tenantId;

      const teamMember = await TeamMember.findById(id)
        .populate('userId', 'firstName lastName email lastLogin isActive');

      if (!teamMember) {
        throw new AppError('Team member not found', 404);
      }

      // Verify team member belongs to same tenant
      if (teamMember.tenantId.toString() !== tenantId?.toString() && !currentUser?.isSuperAdmin()) {
        throw new AppError('Access denied', 403);
      }

      // Get stats
      const stats = await TeamMemberAssignmentService.getTeamMemberStats(teamMember._id);

      res.status(200).json({
        success: true,
        data: {
          teamMember: teamMember.toJSON(),
          stats,
        },
      });

    } catch (error: any) {
      log.error('Error fetching team member', {
        error: error.message,
        teamMemberId: req.params.id,
      });
      next(error);
    }
  }

  /**
   * Update team member
   * PUT /api/team-members/:id
   */
  static async updateTeamMember(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      if (!currentUser) {
        throw new AppError('User not authenticated', 401);
      }

      // Only tenant admins can update team members
      if (currentUser.role !== 'admin' && currentUser.role !== 'tenant_admin' && !currentUser.isSuperAdmin()) {
        throw new AppError('Only tenant admins can update team members', 403);
      }

      const teamMember = await TeamMember.findById(id);

      if (!teamMember) {
        throw new AppError('Team member not found', 404);
      }

      // Verify team member belongs to same tenant
      if (teamMember.tenantId.toString() !== currentUser.tenantId?.toString() && !currentUser.isSuperAdmin()) {
        throw new AppError('Access denied', 403);
      }

      const {
        designation,
        specialization,
        languages,
        permissions,
        maxClientCapacity,
        availability,
        contactInfo,
        notes,
      } = req.body;

      // Update fields
      if (designation !== undefined) teamMember.designation = designation;
      if (specialization !== undefined) teamMember.specialization = specialization;
      if (languages !== undefined) teamMember.languages = languages;
      if (maxClientCapacity !== undefined) teamMember.maxClientCapacity = maxClientCapacity;
      if (notes !== undefined) teamMember.notes = notes;

      // Update permissions (merge with existing)
      if (permissions) {
        teamMember.permissions = {
          ...teamMember.permissions,
          ...permissions,
        };
      }

      // Update availability (merge with existing)
      if (availability) {
        teamMember.availability = {
          ...teamMember.availability,
          ...availability,
        };
      }

      // Update contact info (merge with existing)
      if (contactInfo) {
        teamMember.contactInfo = {
          ...teamMember.contactInfo,
          ...contactInfo,
        };
      }

      await teamMember.save();

      log.info('Team member updated', {
        teamMemberId: id,
        updatedBy: currentUser._id,
      });

      res.status(200).json({
        success: true,
        message: 'Team member updated successfully',
        data: teamMember.toJSON(),
      });

    } catch (error: any) {
      log.error('Error updating team member', {
        error: error.message,
        teamMemberId: req.params.id,
      });
      next(error);
    }
  }

  /**
   * Deactivate team member (soft delete)
   * DELETE /api/team-members/:id
   */
  static async deactivateTeamMember(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      if (!currentUser) {
        throw new AppError('User not authenticated', 401);
      }

      // Only tenant admins can deactivate team members
      if (currentUser.role !== 'admin' && currentUser.role !== 'tenant_admin' && !currentUser.isSuperAdmin()) {
        throw new AppError('Only tenant admins can deactivate team members', 403);
      }

      const teamMember = await TeamMember.findById(id);

      if (!teamMember) {
        throw new AppError('Team member not found', 404);
      }

      // Verify team member belongs to same tenant
      if (teamMember.tenantId.toString() !== currentUser.tenantId?.toString() && !currentUser.isSuperAdmin()) {
        throw new AppError('Access denied', 403);
      }

      // Mark as inactive
      teamMember.isActive = false;
      teamMember.leftDate = new Date();
      teamMember.availability!.isAvailableForNewClients = false;
      await teamMember.save();

      // Also deactivate the associated user account
      const user = await User.findById(teamMember.userId);
      if (user) {
        user.isActive = false;
        await user.save();
      }

      log.info('Team member deactivated', {
        teamMemberId: id,
        deactivatedBy: currentUser._id,
      });

      res.status(200).json({
        success: true,
        message: 'Team member deactivated successfully',
        data: {
          teamMemberId: id,
          activeAssignments: teamMember.assignedClients.length,
        },
      });

    } catch (error: any) {
      log.error('Error deactivating team member', {
        error: error.message,
        teamMemberId: req.params.id,
      });
      next(error);
    }
  }

  /**
   * Reactivate team member
   * POST /api/team-members/:id/reactivate
   */
  static async reactivateTeamMember(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      if (!currentUser || (currentUser.role !== 'admin' && !currentUser.isSuperAdmin())) {
        throw new AppError('Only tenant admins can reactivate team members', 403);
      }

      const teamMember = await TeamMember.findById(id);
      if (!teamMember) {
        throw new AppError('Team member not found', 404);
      }

      teamMember.isActive = true;
      teamMember.leftDate = undefined;
      await teamMember.save();

      // Reactivate user account
      const user = await User.findById(teamMember.userId);
      if (user) {
        user.isActive = true;
        await user.save();
      }

      log.info('Team member reactivated', {
        teamMemberId: id,
        reactivatedBy: currentUser._id,
      });

      res.status(200).json({
        success: true,
        message: 'Team member reactivated successfully',
        data: teamMember.toJSON(),
      });

    } catch (error: any) {
      log.error('Error reactivating team member', { error: error.message });
      next(error);
    }
  }

  /**
   * Assign client to team member
   * POST /api/team-members/:id/assign-client
   */
  static async assignClientToTeamMember(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params; // Team member ID
      const currentUser = req.user;

      if (!currentUser) {
        throw new AppError('User not authenticated', 401);
      }

      const { clientId, caseType, priority, notes } = req.body;

      if (!clientId) {
        throw new AppError('Client ID is required', 400);
      }

      const tenantId = currentUser.tenantId || req.tenantId;

      const assignment = await TeamMemberAssignmentService.assignClient({
        clientId,
        teamMemberId: id,
        tenantId: tenantId!,
        assignedBy: currentUser._id,
        caseType,
        priority,
        notes,
      });

      res.status(201).json({
        success: true,
        message: 'Client assigned successfully',
        data: assignment.toJSON(),
      });

    } catch (error: any) {
      log.error('Error assigning client', { error: error.message });
      next(error);
    }
  }

  /**
   * Accept client assignment
   * POST /api/team-members/assignments/:assignmentId/accept
   */
  static async acceptAssignment(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assignmentId } = req.params;
      const currentUser = req.user;

      if (!currentUser) {
        throw new AppError('User not authenticated', 401);
      }

      // Find team member record for current user
      const teamMember = await TeamMember.findOne({ userId: currentUser._id });
      if (!teamMember) {
        throw new AppError('Team member profile not found', 404);
      }

      const assignment = await TeamMemberAssignmentService.acceptAssignment(assignmentId, teamMember._id);

      res.status(200).json({
        success: true,
        message: 'Assignment accepted successfully',
        data: assignment.toJSON(),
      });

    } catch (error: any) {
      log.error('Error accepting assignment', { error: error.message });
      next(error);
    }
  }

  /**
   * Get team member assignments
   * GET /api/team-members/:id/assignments
   */
  static async getTeamMemberAssignments(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.query;

      const assignments = await TeamMemberAssignmentService.getTeamMemberAssignments(
        id,
        status as string
      );

      res.status(200).json({
        success: true,
        data: assignments,
      });

    } catch (error: any) {
      log.error('Error fetching assignments', { error: error.message });
      next(error);
    }
  }

  /**
   * Reassign client to different team member
   * POST /api/team-members/assignments/:assignmentId/reassign
   */
  static async reassignClient(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assignmentId } = req.params;
      const currentUser = req.user;

      if (!currentUser) {
        throw new AppError('User not authenticated', 401);
      }

      // Only tenant admins can manually reassign
      if (currentUser.role !== 'admin' && currentUser.role !== 'tenant_admin' && !currentUser.isSuperAdmin()) {
        throw new AppError('Only tenant admins can reassign clients', 403);
      }

      const { newTeamMemberId, reason } = req.body;

      if (!newTeamMemberId || !reason) {
        throw new AppError('New team member ID and reason are required', 400);
      }

      const assignment = await TeamMemberAssignmentService.manualReassignment({
        assignmentId,
        newTeamMemberId,
        reassignedBy: currentUser._id,
        reason,
      });

      res.status(200).json({
        success: true,
        message: 'Client reassigned successfully',
        data: assignment.toJSON(),
      });

    } catch (error: any) {
      log.error('Error reassigning client', { error: error.message });
      next(error);
    }
  }

  /**
   * Complete client assignment
   * POST /api/team-members/assignments/:assignmentId/complete
   */
  static async completeAssignment(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assignmentId } = req.params;
      const { finalStatus, notes } = req.body;

      if (!finalStatus) {
        throw new AppError('Final status is required', 400);
      }

      const validStatuses = ['Approved', 'Rejected', 'Case Closed'];
      if (!validStatuses.includes(finalStatus)) {
        throw new AppError('Invalid final status', 400);
      }

      const assignment = await TeamMemberAssignmentService.completeAssignment(assignmentId, {
        finalStatus,
        notes,
      });

      res.status(200).json({
        success: true,
        message: 'Assignment completed successfully',
        data: assignment.toJSON(),
      });

    } catch (error: any) {
      log.error('Error completing assignment', { error: error.message });
      next(error);
    }
  }

  /**
   * Bulk reassign clients (when team member leaves)
   * POST /api/team-members/:id/bulk-reassign
   */
  static async bulkReassignClients(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params; // Old team member ID
      const currentUser = req.user;

      if (!currentUser || (currentUser.role !== 'admin' && !currentUser.isSuperAdmin())) {
        throw new AppError('Only tenant admins can bulk reassign clients', 403);
      }

      const { newTeamMemberId, reason } = req.body;

      if (!newTeamMemberId || !reason) {
        throw new AppError('New team member ID and reason are required', 400);
      }

      const results = await TeamMemberAssignmentService.bulkReassignment({
        oldTeamMemberId: id,
        newTeamMemberId,
        reassignedBy: currentUser._id,
        reason,
      });

      res.status(200).json({
        success: true,
        message: 'Bulk reassignment completed',
        data: results,
      });

    } catch (error: any) {
      log.error('Error in bulk reassignment', { error: error.message });
      next(error);
    }
  }

  /**
   * Update team member permissions
   * PATCH /api/team-members/:id/permissions
   */
  static async updatePermissions(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      if (!currentUser || (currentUser.role !== 'admin' && !currentUser.isSuperAdmin())) {
        throw new AppError('Only tenant admins can update permissions', 403);
      }

      const teamMember = await TeamMember.findById(id);
      if (!teamMember) {
        throw new AppError('Team member not found', 404);
      }

      const { permissions } = req.body;

      if (!permissions) {
        throw new AppError('Permissions object is required', 400);
      }

      // Update permissions
      teamMember.permissions = {
        ...teamMember.permissions,
        ...permissions,
      };

      await teamMember.save();

      log.info('Team member permissions updated', {
        teamMemberId: id,
        updatedBy: currentUser._id,
        newPermissions: permissions,
      });

      res.status(200).json({
        success: true,
        message: 'Permissions updated successfully',
        data: teamMember.toJSON(),
      });

    } catch (error: any) {
      log.error('Error updating permissions', { error: error.message });
      next(error);
    }
  }

  /**
   * Get team performance comparison
   * GET /api/team-members/performance/comparison
   */
  static async getPerformanceComparison(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUser = req.user;
      const tenantId = currentUser?.tenantId || req.tenantId;

      if (!tenantId) {
        throw new AppError('Tenant context required', 400);
      }

      const teamMembersWithStats = await TeamMemberAssignmentService.getTeamMembersWithStats(tenantId);

      // Calculate rankings
      const rankings = teamMembersWithStats.map((tm, index) => ({
        rank: index + 1,
        teamMember: {
          id: tm.teamMember._id,
          name: tm.teamMember.displayName,
          designation: tm.teamMember.designation,
          specialization: tm.teamMember.specialization,
        },
        metrics: {
          ...tm.teamMember.performanceMetrics,
          ...tm.stats,
        },
      })).sort((a, b) => {
        // Sort by total clients onboarded (descending)
        return b.metrics.totalClientsOnboarded - a.metrics.totalClientsOnboarded;
      });

      res.status(200).json({
        success: true,
        data: {
          rankings,
          summary: {
            totalTeamMembers: teamMembersWithStats.length,
            totalActiveAssignments: rankings.reduce((sum, r) => sum + r.metrics.currentWorkload, 0),
            totalCompletedCases: rankings.reduce((sum, r) => sum + r.metrics.completedCases, 0),
            averageSuccessRate: rankings.reduce((sum, r) => sum + (r.metrics.caseSuccessRate || 0), 0) / rankings.length,
          },
        },
      });

    } catch (error: any) {
      log.error('Error fetching performance comparison', { error: error.message });
      next(error);
    }
  }

  /**
   * Get my assignments (for team member viewing their own)
   * GET /api/team-members/my-assignments
   */
  static async getMyAssignments(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUser = req.user;

      if (!currentUser) {
        throw new AppError('User not authenticated', 401);
      }

      // Find team member record for current user
      const teamMember = await TeamMember.findOne({ userId: currentUser._id });
      
      if (!teamMember) {
        throw new AppError('Team member profile not found', 404);
      }

      const { status } = req.query;

      const assignments = await TeamMemberAssignmentService.getTeamMemberAssignments(
        teamMember._id,
        status as string
      );

      res.status(200).json({
        success: true,
        data: assignments,
      });

    } catch (error: any) {
      log.error('Error fetching my assignments', { error: error.message });
      next(error);
    }
  }

  /**
   * Process overdue assignments (cron job endpoint)
   * POST /api/team-members/process-overdue
   */
  static async processOverdueAssignments(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUser = req.user;

      // Only super admins can trigger this (or it should be a cron job)
      if (!currentUser?.isSuperAdmin()) {
        throw new AppError('Only super admins can trigger overdue processing', 403);
      }

      const results = await TeamMemberAssignmentService.processOverdueAssignments();

      res.status(200).json({
        success: true,
        message: 'Overdue assignments processed',
        data: results,
      });

    } catch (error: any) {
      log.error('Error processing overdue assignments', { error: error.message });
      next(error);
    }
  }
}

// Export async handler wrappers
import { asyncHandler } from '../middleware/errorHandler';

export const createTeamMember = asyncHandler(TeamMemberController.createTeamMember);
export const getTeamMembers = asyncHandler(TeamMemberController.getTeamMembers);
export const getTeamMemberById = asyncHandler(TeamMemberController.getTeamMemberById);
export const updateTeamMember = asyncHandler(TeamMemberController.updateTeamMember);
export const deactivateTeamMember = asyncHandler(TeamMemberController.deactivateTeamMember);
export const reactivateTeamMember = asyncHandler(TeamMemberController.reactivateTeamMember);
export const assignClientToTeamMember = asyncHandler(TeamMemberController.assignClientToTeamMember);
export const acceptAssignment = asyncHandler(TeamMemberController.acceptAssignment);
export const getTeamMemberAssignments = asyncHandler(TeamMemberController.getTeamMemberAssignments);
export const reassignClient = asyncHandler(TeamMemberController.reassignClient);
export const completeAssignment = asyncHandler(TeamMemberController.completeAssignment);
export const bulkReassignClients = asyncHandler(TeamMemberController.bulkReassignClients);
export const updatePermissions = asyncHandler(TeamMemberController.updatePermissions);
export const getPerformanceComparison = asyncHandler(TeamMemberController.getPerformanceComparison);
export const getMyAssignments = asyncHandler(TeamMemberController.getMyAssignments);
export const processOverdueAssignments = asyncHandler(TeamMemberController.processOverdueAssignments);

