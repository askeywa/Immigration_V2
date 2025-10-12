// backend/src/routes/teamMemberRoutes.ts
import { Router } from 'express';
import {
  createTeamMember,
  getTeamMembers,
  getTeamMemberById,
  updateTeamMember,
  deactivateTeamMember,
  reactivateTeamMember,
  assignClientToTeamMember,
  acceptAssignment,
  getTeamMemberAssignments,
  reassignClient,
  completeAssignment,
  bulkReassignClients,
  updatePermissions,
  getPerformanceComparison,
  getMyAssignments,
  processOverdueAssignments,
} from '../controllers/teamMemberController';
import { authenticate } from '../middleware/auth';
import { resolveTenantEnhanced as resolveTenant } from '../middleware/enhancedTenantResolution';
import { rowLevelSecurity } from '../middleware/rowLevelSecurity';
import { globalRateLimit } from '../middleware/rateLimiting';

const router = Router();

// All routes require authentication and tenant resolution
// Team member routes don't need rowLevelSecurity as they handle their own tenant context

/**
 * Team Member Management Routes
 */

// Create new team member
router.post(
  '/',
  globalRateLimit,
  resolveTenant,
  rowLevelSecurity,
  authenticate,
  createTeamMember
);

// Get all team members for tenant
router.get(
  '/',
  globalRateLimit,
  resolveTenant,
  rowLevelSecurity,
  authenticate,
  getTeamMembers
);

// Get team performance comparison
router.get(
  '/performance/comparison',
  globalRateLimit,
  resolveTenant,
  rowLevelSecurity,
  authenticate,
  getPerformanceComparison
);

// Get my assignments (for logged-in team member)
router.get(
  '/my-assignments',
  globalRateLimit,
  authenticate,
  getMyAssignments
);

// Process overdue assignments (cron job or manual trigger)
router.post(
  '/process-overdue',
  globalRateLimit,
  authenticate,
  processOverdueAssignments
);

// Get specific team member
router.get(
  '/:id',
  globalRateLimit,
  resolveTenant,
  rowLevelSecurity,
  authenticate,
  getTeamMemberById
);

// Update team member
router.put(
  '/:id',
  globalRateLimit,
  resolveTenant,
  rowLevelSecurity,
  authenticate,
  updateTeamMember
);

// Deactivate team member
router.delete(
  '/:id',
  globalRateLimit,
  resolveTenant,
  rowLevelSecurity,
  authenticate,
  deactivateTeamMember
);

// Reactivate team member
router.post(
  '/:id/reactivate',
  globalRateLimit,
  resolveTenant,
  rowLevelSecurity,
  authenticate,
  reactivateTeamMember
);

// Update team member permissions
router.patch(
  '/:id/permissions',
  globalRateLimit,
  resolveTenant,
  rowLevelSecurity,
  authenticate,
  updatePermissions
);

/**
 * Client Assignment Routes
 */

// Assign client to team member
router.post(
  '/:id/assign-client',
  globalRateLimit,
  resolveTenant,
  rowLevelSecurity,
  authenticate,
  assignClientToTeamMember
);

// Get team member assignments
router.get(
  '/:id/assignments',
  globalRateLimit,
  resolveTenant,
  rowLevelSecurity,
  authenticate,
  getTeamMemberAssignments
);

// Bulk reassign clients
router.post(
  '/:id/bulk-reassign',
  globalRateLimit,
  resolveTenant,
  rowLevelSecurity,
  authenticate,
  bulkReassignClients
);

// Accept assignment
router.post(
  '/assignments/:assignmentId/accept',
  globalRateLimit,
  authenticate,
  acceptAssignment
);

// Reassign client
router.post(
  '/assignments/:assignmentId/reassign',
  globalRateLimit,
  resolveTenant,
  rowLevelSecurity,
  authenticate,
  reassignClient
);

// Complete assignment
router.post(
  '/assignments/:assignmentId/complete',
  globalRateLimit,
  resolveTenant,
  rowLevelSecurity,
  authenticate,
  completeAssignment
);

export default router;

