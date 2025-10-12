import React, { useState, useEffect } from 'react';
import { teamMemberService } from '@/services/teamMemberService';
import { TeamMember, CASE_TYPES, AssignClientRequest } from '@/types/teamMember.types';

interface AssignClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  onAssignmentComplete: () => void;
}

export const AssignClientModal: React.FC<AssignClientModalProps> = ({
  isOpen,
  onClose,
  clientId,
  clientName,
  onAssignmentComplete,
}) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<AssignClientRequest & { teamMemberId: string }>({
    clientId,
    teamMemberId: '',
    caseType: undefined,
    priority: 'medium',
    notes: '',
  });

  // Fetch team members when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTeamMembers();
      setFormData(prev => ({ ...prev, clientId }));
    }
  }, [isOpen, clientId]);

  const fetchTeamMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const members = await teamMemberService.getTeamMembers(false, false) as TeamMember[];
      // Filter only active team members
      const activeMembers = members.filter(m => m.isActive);
      setTeamMembers(activeMembers);
      
      if (activeMembers.length === 0) {
        setError('No active team members available for assignment');
      }
    } catch (err: any) {
      console.error('Error fetching team members:', err);
      setError(err.response?.data?.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.teamMemberId) {
      setError('Please select a team member');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { teamMemberId, ...assignmentData } = formData;
      await teamMemberService.assignClient(teamMemberId, assignmentData);
      
      setSuccess(`Client "${clientName}" successfully assigned!`);
      setTimeout(() => {
        onAssignmentComplete();
        handleClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error assigning client:', err);
      setError(err.response?.data?.message || 'Failed to assign client');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      clientId,
      teamMemberId: '',
      caseType: undefined,
      priority: 'medium',
      notes: '',
    });
    setError(null);
    setSuccess(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleClose} />
      
      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Assign Client to Team Member</h2>
              <p className="text-sm text-gray-600 mt-1">Client: <span className="font-semibold">{clientName}</span></p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={submitting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading team members...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Team Member Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Team Member <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.teamMemberId}
                  onChange={(e) => setFormData({ ...formData, teamMemberId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={submitting}
                >
                  <option value="">-- Choose a team member --</option>
                  {teamMembers.map((member) => {
                    const workload = member.assignedClients?.length || 0;
                    const capacity = member.maxClientCapacity || 10;
                    const utilizationPercent = Math.round((workload / capacity) * 100);
                    const isNearCapacity = utilizationPercent >= 80;
                    
                    return (
                      <option key={member._id} value={member._id}>
                        {member.displayName}
                        {member.designation ? ` - ${member.designation}` : ''}
                        {member.specialization && member.specialization.length > 0 ? ` (${member.specialization.join(', ')})` : ''}
                        {` - ${workload}/${capacity} clients (${utilizationPercent}%)`}
                        {isNearCapacity ? ' ⚠️ Near Capacity' : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Team members are listed with their current workload and specializations
                </p>
              </div>

              {/* Case Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Case Type
                </label>
                <select
                  value={formData.caseType || ''}
                  onChange={(e) => setFormData({ ...formData, caseType: e.target.value || undefined })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={submitting}
                >
                  <option value="">-- Select case type (optional) --</option>
                  {CASE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority Level
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['low', 'medium', 'high', 'urgent'] as const).map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority })}
                      disabled={submitting}
                      className={`px-4 py-2 rounded-lg border-2 transition-all ${
                        formData.priority === priority
                          ? priority === 'urgent'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : priority === 'high'
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : priority === 'medium'
                            ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                            : 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignment Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Add any special instructions or notes for this assignment..."
                  disabled={submitting}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.teamMemberId || teamMembers.length === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Assigning...
                    </>
                  ) : (
                    'Assign Client'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

