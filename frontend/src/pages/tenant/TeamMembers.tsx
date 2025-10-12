// frontend/src/pages/tenant/TeamMembers.tsx
import React, { useState, useEffect } from 'react';
import { teamMemberService } from '@/services/teamMemberService';
import {
  TeamMember,
  TeamMemberWithStats,
  CreateTeamMemberRequest,
  ClientAssignment,
  CASE_TYPES,
} from '@/types/teamMember.types';
import { Users, Plus, Edit, Trash2, UserCheck, UserX, Settings, TrendingUp, Shield, ListChecks } from 'lucide-react';
import { AssignmentCard } from '@/components/tenant/AssignmentCard';
import { ReassignClientModal } from '@/components/tenant/ReassignClientModal';
import { CompleteAssignmentModal } from '@/components/tenant/CompleteAssignmentModal';

const TeamMembers: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);

  // Assignment management state
  const [showAssignmentsModal, setShowAssignmentsModal] = useState(false);
  const [selectedTeamMemberForAssignments, setSelectedTeamMemberForAssignments] = useState<TeamMember | null>(null);
  const [assignments, setAssignments] = useState<ClientAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  
  // Reassign modal state
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedAssignmentForReassign, setSelectedAssignmentForReassign] = useState<{id: string; clientName: string; currentTeamMemberId: string} | null>(null);
  
  // Complete modal state
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedAssignmentForComplete, setSelectedAssignmentForComplete] = useState<{id: string; clientName: string} | null>(null);

  // Fetch team members (without stats for better performance)
  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      // Don't request stats by default - this causes N+1 query problem
      const data = await teamMemberService.getTeamMembers(includeInactive, false) as TeamMember[];
      // Transform TeamMember[] to TeamMemberWithStats[] format for compatibility
      const transformedData = data.map(tm => ({
        teamMember: tm,
        stats: {
          totalAssignments: 0,
          pendingAssignments: 0,
          acceptedAssignments: 0,
          completedAssignments: 0,
          averageAcceptanceTime: 0,
          overdueAssignments: 0
        }
      }));
      setTeamMembers(transformedData);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, [includeInactive]);

  // Handle deactivate
  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this team member?')) return;

    try {
      await teamMemberService.deactivateTeamMember(id);
      fetchTeamMembers();
    } catch (error) {
      console.error('Error deactivating team member:', error);
    }
  };

  // Handle reactivate
  const handleReactivate = async (id: string) => {
    try {
      await teamMemberService.reactivateTeamMember(id);
      fetchTeamMembers();
    } catch (error) {
      console.error('Error reactivating team member:', error);
    }
  };

  // Handle view assignments
  const handleViewAssignments = async (teamMember: TeamMember) => {
    setSelectedTeamMemberForAssignments(teamMember);
    setShowAssignmentsModal(true);
    setLoadingAssignments(true);
    
    try {
      const assignmentData = await teamMemberService.getAssignments(teamMember._id);
      setAssignments(assignmentData);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoadingAssignments(false);
    }
  };

  // Handle reassign
  const handleReassign = (assignmentId: string, clientName: string, currentTeamMemberId: string) => {
    setSelectedAssignmentForReassign({ id: assignmentId, clientName, currentTeamMemberId });
    setShowReassignModal(true);
  };

  // Handle complete
  const handleComplete = (assignmentId: string, clientName: string) => {
    setSelectedAssignmentForComplete({ id: assignmentId, clientName });
    setShowCompleteModal(true);
  };

  // Refresh assignments after action
  const refreshAssignments = () => {
    if (selectedTeamMemberForAssignments) {
      handleViewAssignments(selectedTeamMemberForAssignments);
    }
    fetchTeamMembers();
  };

  return (
    <div className="p-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="h-8 w-8 text-blue-600" />
              Team Members
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your team members, track performance, and assign clients
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add Team Member
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded"
          />
          <span className="text-gray-700 dark:text-gray-300">Show Inactive</span>
        </label>
      </div>

      {/* Team Members Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : teamMembers.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No team members found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Add your first team member
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((tm) => (
            <TeamMemberCard
              key={tm.teamMember._id}
              teamMember={tm.teamMember}
              stats={tm.stats}
              onViewAssignments={handleViewAssignments}
              onEdit={(member) => {
                setSelectedTeamMember(member);
                setShowEditModal(true);
              }}
              onDeactivate={handleDeactivate}
              onReactivate={handleReactivate}
              onManagePermissions={(member) => {
                setSelectedTeamMember(member);
                setShowPermissionsModal(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Create Team Member Modal */}
      {showCreateModal && (
        <CreateTeamMemberModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchTeamMembers();
          }}
        />
      )}

      {/* Edit Team Member Modal */}
      {showEditModal && selectedTeamMember && (
        <EditTeamMemberModal
          teamMember={selectedTeamMember}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTeamMember(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedTeamMember(null);
            fetchTeamMembers();
          }}
        />
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && selectedTeamMember && (
        <PermissionsModal
          teamMember={selectedTeamMember}
          onClose={() => {
            setShowPermissionsModal(false);
            setSelectedTeamMember(null);
          }}
          onSuccess={() => {
            setShowPermissionsModal(false);
            setSelectedTeamMember(null);
            fetchTeamMembers();
          }}
        />
      )}

      {/* View Assignments Modal */}
      {showAssignmentsModal && selectedTeamMemberForAssignments && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => {
            setShowAssignmentsModal(false);
            setSelectedTeamMemberForAssignments(null);
          }} />
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full p-6 overflow-x-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Assignments - {selectedTeamMemberForAssignments.displayName}
                </h2>
                <button
                  onClick={() => {
                    setShowAssignmentsModal(false);
                    setSelectedTeamMemberForAssignments(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {loadingAssignments ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400">No assignments found for this team member</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {assignments.map((assignment) => (
                    <AssignmentCard
                      key={assignment._id}
                      assignment={assignment}
                      clientName={assignment.clientId}
                      teamMemberName={selectedTeamMemberForAssignments.displayName}
                      showActions={true}
                      onReassign={(assignmentId) => {
                        const clientName = assignment.clientId;
                        handleReassign(assignmentId, clientName, assignment.currentTeamMemberId);
                      }}
                      onComplete={(assignmentId) => {
                        const clientName = assignment.clientId;
                        handleComplete(assignmentId, clientName);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {selectedAssignmentForReassign && (
        <ReassignClientModal
          isOpen={showReassignModal}
          onClose={() => {
            setShowReassignModal(false);
            setSelectedAssignmentForReassign(null);
          }}
          assignmentId={selectedAssignmentForReassign.id}
          clientName={selectedAssignmentForReassign.clientName}
          currentTeamMemberId={selectedAssignmentForReassign.currentTeamMemberId}
          onReassignmentComplete={refreshAssignments}
        />
      )}

      {/* Complete Modal */}
      {selectedAssignmentForComplete && (
        <CompleteAssignmentModal
          isOpen={showCompleteModal}
          onClose={() => {
            setShowCompleteModal(false);
            setSelectedAssignmentForComplete(null);
          }}
          assignmentId={selectedAssignmentForComplete.id}
          clientName={selectedAssignmentForComplete.clientName}
          onCompletionSuccess={refreshAssignments}
        />
      )}
    </div>
  );
};

// Team Member Card Component
const TeamMemberCard: React.FC<{
  teamMember: TeamMember;
  stats: any;
  onViewAssignments: (member: TeamMember) => void;
  onEdit: (member: TeamMember) => void;
  onDeactivate: (id: string) => void;
  onReactivate: (id: string) => void;
  onManagePermissions: (member: TeamMember) => void;
}> = ({ teamMember, stats, onViewAssignments, onEdit, onDeactivate, onReactivate, onManagePermissions }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border ${
      teamMember.isActive ? 'border-gray-200 dark:border-gray-700' : 'border-red-300 dark:border-red-700'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {teamMember.displayName}
          </h3>
          {teamMember.designation && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{teamMember.designation}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {teamMember.isActive ? (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
              Active
            </span>
          ) : (
            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
              Inactive
            </span>
          )}
        </div>
      </div>

      {/* Specialization */}
      {teamMember.specialization && teamMember.specialization.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Specialization:</p>
          <div className="flex flex-wrap gap-1">
            {teamMember.specialization.map((spec, idx) => (
              <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                {spec}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Clients</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {teamMember.performanceMetrics.totalClientsOnboarded}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Active Cases</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {teamMember.performanceMetrics.currentWorkload}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {teamMember.performanceMetrics.completedCases}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Success Rate</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {teamMember.performanceMetrics.caseSuccessRate || 0}%
          </p>
        </div>
      </div>

      {/* Stats from assignments */}
      {stats && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Assignments:</p>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700 dark:text-gray-300">Pending: {stats.pendingAssignments}</span>
            <span className="text-gray-700 dark:text-gray-300">Accepted: {stats.acceptedAssignments}</span>
          </div>
          {stats.overdueAssignments > 0 && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              ⚠️ {stats.overdueAssignments} overdue assignment{stats.overdueAssignments > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onViewAssignments(teamMember)}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800 text-sm"
          title="View Assignments"
        >
          <ListChecks className="h-4 w-4" />
          Assignments
        </button>
        <button
          onClick={() => onEdit(teamMember)}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
        >
          <Edit className="h-4 w-4" />
          Edit
        </button>
        <button
          onClick={() => onManagePermissions(teamMember)}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 text-sm"
        >
          <Shield className="h-4 w-4" />
          Permissions
        </button>
        {teamMember.isActive ? (
          <button
            onClick={() => onDeactivate(teamMember._id)}
            className="flex items-center justify-center gap-1 px-3 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 text-sm"
          >
            <UserX className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => onReactivate(teamMember._id)}
            className="flex items-center justify-center gap-1 px-3 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 text-sm"
          >
            <UserCheck className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// Create Team Member Modal
const CreateTeamMemberModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState<CreateTeamMemberRequest>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    designation: '',
    specialization: [],
    languages: [],
    mustChangePassword: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await teamMemberService.createTeamMember(formData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create team member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Add Team Member
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Designation
              </label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="e.g., Junior Consultant, Senior Consultant"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Specialization
              </label>
              <select
                multiple
                value={formData.specialization}
                onChange={(e) => setFormData({
                  ...formData,
                  specialization: Array.from(e.target.selectedOptions, option => option.value)
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                size={5}
              >
                {CASE_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.mustChangePassword}
                  onChange={(e) => setFormData({ ...formData, mustChangePassword: e.target.checked })}
                  className="rounded"
                />
                <span className="text-gray-700 dark:text-gray-300">Force password change on first login</span>
              </label>
            </div>

            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Team Member'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Edit Team Member Modal (simplified for now)
const EditTeamMemberModal: React.FC<{
  teamMember: TeamMember;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ teamMember, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    designation: teamMember.designation || '',
    specialization: teamMember.specialization || [],
    languages: teamMember.languages || [],
    maxClientCapacity: teamMember.maxClientCapacity,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await teamMemberService.updateTeamMember(teamMember._id, formData);
      onSuccess();
    } catch (error) {
      console.error('Error updating team member:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Edit Team Member: {teamMember.displayName}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Designation
              </label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Client Capacity
              </label>
              <input
                type="number"
                value={formData.maxClientCapacity || ''}
                onChange={(e) => setFormData({ ...formData, maxClientCapacity: e.target.value ? parseInt(e.target.value) : undefined })}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Permissions Modal
const PermissionsModal: React.FC<{
  teamMember: TeamMember;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ teamMember, onClose, onSuccess }) => {
  const [permissions, setPermissions] = useState(teamMember.permissions);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await teamMemberService.updatePermissions(teamMember._id, permissions);
      onSuccess();
    } catch (error) {
      console.error('Error updating permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const permissionsList = [
    { key: 'canViewAllClients', label: 'View All Clients', description: 'Can see all clients in the system' },
    { key: 'canEditAllClients', label: 'Edit All Clients', description: 'Can edit any client, not just assigned ones' },
    { key: 'canDeleteClients', label: 'Delete Clients', description: 'Can delete client records' },
    { key: 'canCreateClients', label: 'Create Clients', description: 'Can onboard new clients' },
    { key: 'canReassignClients', label: 'Reassign Clients', description: 'Can reassign clients to other team members' },
    { key: 'canViewFinancialData', label: 'View Financial Data', description: 'Can see revenue, payments, and financial metrics' },
    { key: 'canViewTeamPerformance', label: 'View Team Performance', description: 'Can see other team members\' performance' },
    { key: 'canExportData', label: 'Export Data', description: 'Can export reports and data' },
    { key: 'canManageDocuments', label: 'Manage Documents', description: 'Can upload and manage client documents' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Manage Permissions
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {teamMember.displayName}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {permissionsList.map((perm) => (
              <div key={perm.key} className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <input
                  type="checkbox"
                  checked={permissions[perm.key as keyof typeof permissions]}
                  onChange={(e) => setPermissions({
                    ...permissions,
                    [perm.key]: e.target.checked,
                  })}
                  className="mt-1 h-4 w-4 text-blue-600 rounded"
                />
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-white">
                    {perm.label}
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {perm.description}
                  </p>
                </div>
              </div>
            ))}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TeamMembers;
