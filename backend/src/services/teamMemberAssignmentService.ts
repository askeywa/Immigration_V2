// backend/src/services/teamMemberAssignmentService.ts
import mongoose from 'mongoose';
import { TeamMember, ITeamMember } from '../models/TeamMember';
import { ClientAssignment, IClientAssignment } from '../models/ClientAssignment';
import { User, IUser } from '../models/User';
import { AppError } from '../utils/errors';
import { log } from '../config/logging';

/**
 * Team Member Assignment Service
 * 
 * Handles smart client assignment to team members with:
 * - 24-hour acceptance window (working days only)
 * - Automatic reassignment if not accepted
 * - Workload-based assignment
 * - Specialization matching
 * - Complete audit trail
 */

export class TeamMemberAssignmentService {
  /**
   * Assign a client to a team member
   */
  static async assignClient(data: {
    clientId: string | mongoose.Types.ObjectId;
    teamMemberId: string | mongoose.Types.ObjectId;
    tenantId: string | mongoose.Types.ObjectId;
    assignedBy: string | mongoose.Types.ObjectId;
    caseType?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    notes?: string;
  }): Promise<IClientAssignment> {
    try {
      // Validate client exists
      const client = await User.findById(data.clientId);
      if (!client || client.role !== 'user') {
        throw new AppError('Client not found', 404);
      }

      // Validate team member exists and is active
      const teamMember = await TeamMember.findById(data.teamMemberId);
      if (!teamMember || !teamMember.isActive) {
        throw new AppError('Team member not found or inactive', 404);
      }

      // Check if client already has an active assignment
      const existingAssignment = await ClientAssignment.findOne({
        clientId: data.clientId,
        tenantId: data.tenantId,
        status: { $in: ['pending', 'accepted', 'active'] },
      });

      if (existingAssignment) {
        throw new AppError('Client already has an active assignment', 400);
      }

      // Calculate acceptance deadline (24 hours, excluding weekends)
      const assignedDate = new Date();
      let hoursToAdd = 24;
      let acceptanceDeadline = new Date(assignedDate);
      
      while (hoursToAdd > 0) {
        acceptanceDeadline.setHours(acceptanceDeadline.getHours() + 1);
        
        // Skip weekends (Saturday = 6, Sunday = 0)
        const dayOfWeek = acceptanceDeadline.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          hoursToAdd--;
        }
      }

      // Create assignment
      const assignmentData = {
        clientId: data.clientId,
        tenantId: data.tenantId,
        currentTeamMemberId: data.teamMemberId,
        onboardedBy: data.teamMemberId,
        onboardingDate: new Date(),
        status: 'pending',
        assignedDate: assignedDate,
        acceptanceDeadline: acceptanceDeadline, // Set explicitly before save
        caseType: data.caseType,
        priority: data.priority || 'medium',
        assignmentNotes: data.notes,
        autoReassignmentEnabled: true,
        autoReassignmentAttempts: 0,
        maxAutoReassignmentAttempts: 3,
        isAutoReassigned: false,
        requiresAttention: false,
        assignmentHistory: [{
          teamMemberId: data.teamMemberId as mongoose.Types.ObjectId,
          assignedDate: new Date(),
          assignedBy: data.assignedBy as mongoose.Types.ObjectId,
        }],
      };

      log.info('Creating client assignment with data', { assignmentData });

      const assignment = new ClientAssignment(assignmentData);

      try {
        await assignment.save();
      } catch (saveError: any) {
        log.error('Assignment save validation error', {
          error: saveError.message,
          validationErrors: saveError.errors,
          assignmentData,
        });
        throw new AppError(`Assignment validation failed: ${saveError.message}`, 400);
      }

      // Update client record
      client.assignedTo = data.teamMemberId as mongoose.Types.ObjectId;
      client.onboardedBy = data.teamMemberId as mongoose.Types.ObjectId;
      client.onboardingDate = new Date();
      if (data.caseType) client.caseType = data.caseType;
      await client.save();

      // Update team member assigned clients array
      teamMember.assignedClients.push(data.clientId as mongoose.Types.ObjectId);
      teamMember.performanceMetrics.currentWorkload++;
      await teamMember.save();

      log.info('Client assigned to team member', {
        clientId: data.clientId,
        teamMemberId: data.teamMemberId,
        assignedBy: data.assignedBy,
      });

      return assignment;
    } catch (error: any) {
      log.error('Error assigning client to team member', { error: error.message });
      throw error;
    }
  }

  /**
   * Accept a client assignment
   */
  static async acceptAssignment(
    assignmentId: string | mongoose.Types.ObjectId,
    teamMemberId: string | mongoose.Types.ObjectId
  ): Promise<IClientAssignment> {
    const assignment = await ClientAssignment.findById(assignmentId);
    
    if (!assignment) {
      throw new AppError('Assignment not found', 404);
    }

    if (assignment.currentTeamMemberId.toString() !== teamMemberId.toString()) {
      throw new AppError('You are not assigned to this client', 403);
    }

    if (assignment.status !== 'pending') {
      throw new AppError('Assignment is not in pending status', 400);
    }

    assignment.status = 'accepted';
    assignment.acceptedDate = new Date();
    
    // Update assignment history
    const historyEntry = assignment.assignmentHistory[assignment.assignmentHistory.length - 1];
    if (historyEntry) {
      historyEntry.acceptedDate = new Date();
    }

    await assignment.save();

    log.info('Assignment accepted', {
      assignmentId,
      teamMemberId,
      clientId: assignment.clientId,
    });

    return assignment;
  }

  /**
   * Find and process overdue assignments (not accepted within 24 hours)
   * This should be run by a cron job
   */
  static async processOverdueAssignments(): Promise<{
    processed: number;
    reassigned: number;
    flagged: number;
  }> {
    const now = new Date();
    const results = { processed: 0, reassigned: 0, flagged: 0 };

    try {
      // Find all pending assignments that are past deadline
      const overdueAssignments = await ClientAssignment.find({
        status: 'pending',
        acceptanceDeadline: { $lt: now },
        autoReassignmentEnabled: true,
      });

      log.info(`Found ${overdueAssignments.length} overdue assignments to process`);

      for (const assignment of overdueAssignments) {
        results.processed++;

        // Check if we've hit max auto-reassignment attempts
        if (assignment.autoReassignmentAttempts >= assignment.maxAutoReassignmentAttempts) {
          // Flag for manual review
          assignment.requiresAttention = true;
          assignment.status = 'reassigned';
          await assignment.save();
          results.flagged++;
          
          log.warn('Assignment flagged for manual review (max reassignment attempts reached)', {
            assignmentId: assignment._id,
            clientId: assignment.clientId,
            attempts: assignment.autoReassignmentAttempts,
          });
          
          continue;
        }

        // Find next available team member
        const nextTeamMemberId = await assignment.getNextAvailableTeamMember();

        if (!nextTeamMemberId) {
          // No available team members, flag for review
          assignment.requiresAttention = true;
          await assignment.save();
          results.flagged++;
          
          log.warn('No available team members for reassignment', {
            assignmentId: assignment._id,
            clientId: assignment.clientId,
          });
          
          continue;
        }

        // Reassign to next team member
        await this.reassignClient({
          assignmentId: assignment._id,
          newTeamMemberId: nextTeamMemberId,
          reassignedBy: assignment.currentTeamMemberId, // System reassignment
          reason: 'Not accepted within 24 hours (auto-reassignment)',
          isAutoReassignment: true,
        });

        results.reassigned++;
      }

      log.info('Overdue assignments processed', results);
      return results;
    } catch (error: any) {
      log.error('Error processing overdue assignments', { error: error.message });
      throw error;
    }
  }

  /**
   * Reassign a client to a different team member
   */
  static async reassignClient(data: {
    assignmentId: string | mongoose.Types.ObjectId;
    newTeamMemberId: string | mongoose.Types.ObjectId;
    reassignedBy: string | mongoose.Types.ObjectId;
    reason: string;
    isAutoReassignment?: boolean;
  }): Promise<IClientAssignment> {
    const assignment = await ClientAssignment.findById(data.assignmentId);
    
    if (!assignment) {
      throw new AppError('Assignment not found', 404);
    }

    const oldTeamMemberId = assignment.currentTeamMemberId;

    // Validate new team member
    const newTeamMember = await TeamMember.findById(data.newTeamMemberId);
    if (!newTeamMember || !newTeamMember.isActive) {
      throw new AppError('New team member not found or inactive', 404);
    }

    // Update assignment
    assignment.currentTeamMemberId = data.newTeamMemberId as mongoose.Types.ObjectId;
    assignment.status = 'pending'; // Reset to pending for new team member
    assignment.assignedDate = new Date();
    assignment.isAutoReassigned = data.isAutoReassignment || false;
    assignment.autoReassignmentAttempts++;

    // Add to assignment history
    assignment.assignmentHistory.push({
      teamMemberId: data.newTeamMemberId as mongoose.Types.ObjectId,
      assignedDate: new Date(),
      assignedBy: data.reassignedBy as mongoose.Types.ObjectId,
      reassignReason: data.reason,
    });

    await assignment.save();

    // Update old team member (remove client)
    const oldTeamMember = await TeamMember.findById(oldTeamMemberId);
    if (oldTeamMember) {
      oldTeamMember.assignedClients = oldTeamMember.assignedClients.filter(
        id => id.toString() !== assignment.clientId.toString()
      );
      oldTeamMember.performanceMetrics.currentWorkload = Math.max(
        0,
        oldTeamMember.performanceMetrics.currentWorkload - 1
      );
      await oldTeamMember.save();
    }

    // Update new team member (add client)
    newTeamMember.assignedClients.push(assignment.clientId);
    newTeamMember.performanceMetrics.currentWorkload++;
    await newTeamMember.save();

    // Update client record
    const client = await User.findById(assignment.clientId);
    if (client) {
      client.assignedTo = data.newTeamMemberId as mongoose.Types.ObjectId;
      await client.save();
    }

    log.info('Client reassigned', {
      assignmentId: data.assignmentId,
      oldTeamMemberId,
      newTeamMemberId: data.newTeamMemberId,
      reason: data.reason,
      isAuto: data.isAutoReassignment,
    });

    return assignment;
  }

  /**
   * Get team member with least workload for auto-assignment
   */
  static async getOptimalTeamMember(data: {
    tenantId: string | mongoose.Types.ObjectId;
    caseType?: string;
    excludeTeamMemberId?: string | mongoose.Types.ObjectId;
  }): Promise<ITeamMember | null> {
    const query: any = {
      tenantId: data.tenantId,
      isActive: true,
      'availability.isAvailableForNewClients': true,
    };

    if (data.excludeTeamMemberId) {
      query._id = { $ne: data.excludeTeamMemberId };
    }

    // If case type is specified, prefer team members with that specialization
    if (data.caseType) {
      const specializedMembers = await TeamMember.find({
        ...query,
        specialization: data.caseType,
      }).sort({ 'performanceMetrics.currentWorkload': 1 });

      if (specializedMembers.length > 0) {
        return specializedMembers[0];
      }
    }

    // Fallback to least busy team member
    const teamMembers = await TeamMember.find(query)
      .sort({ 'performanceMetrics.currentWorkload': 1 });

    return teamMembers.length > 0 ? teamMembers[0] : null;
  }

  /**
   * Get all assignments for a team member
   */
  static async getTeamMemberAssignments(
    teamMemberId: string | mongoose.Types.ObjectId,
    status?: string
  ): Promise<IClientAssignment[]> {
    const query: any = { currentTeamMemberId: teamMemberId };
    if (status) query.status = status;

    return ClientAssignment.find(query)
      .populate('clientId', 'firstName lastName email caseType caseStatus')
      .sort({ assignedDate: -1 });
  }

  /**
   * Get assignment statistics for a team member
   */
  static async getTeamMemberStats(teamMemberId: string | mongoose.Types.ObjectId): Promise<{
    totalAssignments: number;
    pendingAssignments: number;
    acceptedAssignments: number;
    completedAssignments: number;
    averageAcceptanceTime: number;
    overdueAssignments: number;
  }> {
    const allAssignments = await ClientAssignment.find({
      currentTeamMemberId: teamMemberId,
    });

    const pendingAssignments = allAssignments.filter(a => a.status === 'pending');
    const acceptedAssignments = allAssignments.filter(a => a.status === 'accepted' || a.status === 'active');
    const completedAssignments = allAssignments.filter(a => a.status === 'completed');

    // Calculate average acceptance time
    const acceptedWithTimes = allAssignments.filter(a => a.acceptedDate && a.assignedDate);
    const avgAcceptanceTime = acceptedWithTimes.length > 0
      ? acceptedWithTimes.reduce((sum, a) => {
          const diff = a.acceptedDate!.getTime() - a.assignedDate.getTime();
          return sum + diff;
        }, 0) / acceptedWithTimes.length / (1000 * 60 * 60) // Convert to hours
      : 0;

    // Count overdue assignments
    const now = new Date();
    const overdueAssignments = pendingAssignments.filter(
      a => a.acceptanceDeadline < now
    ).length;

    return {
      totalAssignments: allAssignments.length,
      pendingAssignments: pendingAssignments.length,
      acceptedAssignments: acceptedAssignments.length,
      completedAssignments: completedAssignments.length,
      averageAcceptanceTime: Math.round(avgAcceptanceTime * 10) / 10, // Round to 1 decimal
      overdueAssignments,
    };
  }

  /**
   * Get all team members for a tenant with their performance metrics
   */
  static async getTeamMembersWithStats(tenantId: string | mongoose.Types.ObjectId): Promise<Array<{
    teamMember: ITeamMember;
    stats: {
      totalAssignments: number;
      pendingAssignments: number;
      acceptedAssignments: number;
      completedAssignments: number;
      averageAcceptanceTime: number;
      overdueAssignments: number;
    };
  }>> {
    const teamMembers = await TeamMember.find({ tenantId }).populate('userId', 'firstName lastName email');

    const results = [];
    for (const teamMember of teamMembers) {
      const stats = await this.getTeamMemberStats(teamMember._id);
      results.push({ teamMember, stats });
    }

    return results;
  }

  /**
   * Complete a client assignment (case closed)
   */
  static async completeAssignment(
    assignmentId: string | mongoose.Types.ObjectId,
    data: {
      finalStatus: 'Approved' | 'Rejected' | 'Case Closed';
      notes?: string;
    }
  ): Promise<IClientAssignment> {
    const assignment = await ClientAssignment.findById(assignmentId);
    
    if (!assignment) {
      throw new AppError('Assignment not found', 404);
    }

    assignment.status = 'completed';
    assignment.completedDate = new Date();
    assignment.caseStatus = data.finalStatus;
    if (data.notes) {
      assignment.assignmentNotes = (assignment.assignmentNotes || '') + '\n' + data.notes;
    }

    await assignment.save();

    // Update team member metrics
    const teamMember = await TeamMember.findById(assignment.currentTeamMemberId);
    if (teamMember) {
      teamMember.performanceMetrics.completedCases++;
      teamMember.performanceMetrics.currentWorkload = Math.max(
        0,
        teamMember.performanceMetrics.currentWorkload - 1
      );
      
      if (data.finalStatus === 'Approved') {
        teamMember.performanceMetrics.successfulCases++;
      } else if (data.finalStatus === 'Rejected') {
        teamMember.performanceMetrics.rejectedCases++;
      }

      // Calculate success rate
      const totalCompleted = teamMember.performanceMetrics.completedCases;
      if (totalCompleted > 0) {
        teamMember.performanceMetrics.caseSuccessRate = Math.round(
          (teamMember.performanceMetrics.successfulCases / totalCompleted) * 100
        );
      }

      await teamMember.save();
    }

    // Update client status
    const client = await User.findById(assignment.clientId);
    if (client) {
      client.caseStatus = data.finalStatus;
      await client.save();
    }

    log.info('Assignment completed', {
      assignmentId,
      finalStatus: data.finalStatus,
    });

    return assignment;
  }

  /**
   * Manually reassign a client (by RCIC owner)
   */
  static async manualReassignment(data: {
    assignmentId: string | mongoose.Types.ObjectId;
    newTeamMemberId: string | mongoose.Types.ObjectId;
    reassignedBy: string | mongoose.Types.ObjectId;
    reason: string;
  }): Promise<IClientAssignment> {
    return this.reassignClient({
      ...data,
      isAutoReassignment: false,
    });
  }

  /**
   * Bulk reassignment (when team member leaves)
   */
  static async bulkReassignment(data: {
    oldTeamMemberId: string | mongoose.Types.ObjectId;
    newTeamMemberId: string | mongoose.Types.ObjectId;
    reassignedBy: string | mongoose.Types.ObjectId;
    reason: string;
  }): Promise<{ reassigned: number; failed: number }> {
    const results = { reassigned: 0, failed: 0 };

    try {
      // Find all active assignments for the old team member
      const assignments = await ClientAssignment.find({
        currentTeamMemberId: data.oldTeamMemberId,
        status: { $in: ['pending', 'accepted', 'active'] },
      });

      for (const assignment of assignments) {
        try {
          await this.reassignClient({
            assignmentId: assignment._id,
            newTeamMemberId: data.newTeamMemberId,
            reassignedBy: data.reassignedBy,
            reason: data.reason,
            isAutoReassignment: false,
          });
          results.reassigned++;
        } catch (error) {
          log.error('Error in bulk reassignment', {
            assignmentId: assignment._id,
            error: error instanceof Error ? error.message : String(error),
          });
          results.failed++;
        }
      }

      log.info('Bulk reassignment completed', results);
      return results;
    } catch (error: any) {
      log.error('Error in bulk reassignment process', { error: error.message });
      throw error;
    }
  }
}

