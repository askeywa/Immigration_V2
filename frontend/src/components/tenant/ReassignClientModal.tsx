import React, { useState, useEffect } from 'react';
import { teamMemberService } from '@/services/teamMemberService';
import { TeamMember, ReassignClientRequest } from '@/types/teamMember.types';

interface ReassignClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: string;
  clientName: string;
  currentTeamMemberId: string;
  onReassignmentComplete: () => void;
}

export const ReassignClientModal: React.FC<ReassignClientModalProps> = ({
  isOpen,
  onClose,
  assignmentId,
  clientName,
  currentTeamMemberId,
  onReassignmentComplete,
}) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<ReassignClientRequest>({
    newTeamMemberId: '',
    reason: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchTeamMembers();
    }
  }, [isOpen]);

  const fetchTeamMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const members = await teamMemberService.getTeamMembers(false, false) as TeamMember[];
      // Filter out the current team member and only show active members
      const availableMembers = members.filter(m => m.isActive && m._id !== currentTeamMemberId);
      setTeamMembers(availableMembers);
      
      if (availableMembers.length === 0) {
        setError('No other active team members available for reassignment');
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
    
    if (!formData.newTeamMemberId) {
      setError('Please select a new team member');
      return;
    }

    if (!formData.reason.trim()) {
      setError('Please provide a reason for reassignment');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await teamMemberService.reassignClient(assignmentId, formData);
      
      setSuccess(`Client "${clientName}" successfully reassigned!`);
      setTimeout(() => {
        onReassignmentComplete();
        handleClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error reassigning client:', err);
      setError(err.response?.data?.message || 'Failed to reassign client');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      newTeamMemberId: '',
      reason: '',
    });
    setError(null);
    setSuccess(null);
    onClose();
  };

  if (!isOpen) return null;

  // Predefined reassignment reasons
  const commonReasons = [
    'Specialization mismatch',
    'Workload redistribution',
    'Team member unavailable',
    'Client request',
    'Performance concerns',
    'Language preference',
    'Other',
  ];

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
              <h2 className="text-2xl font-bold text-gray-900">Reassign Client</h2>
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
              {/* New Team Member Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Team Member <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.newTeamMemberId}
                  onChange={(e) => setFormData({ ...formData, newTeamMemberId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={submitting}
                >
                  <option value="">-- Choose a new team member --</option>
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
              </div>

              {/* Common Reasons (Quick Select) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Select Reason
                </label>
                <div className="flex flex-wrap gap-2">
                  {commonReasons.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setFormData({ ...formData, reason })}
                      disabled={submitting}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        formData.reason === reason
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reassignment Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Provide a detailed reason for the reassignment (required for audit trail)..."
                  required
                  disabled={submitting}
                />
                <p className="mt-1 text-xs text-gray-500">
                  This reason will be logged in the assignment history for transparency
                </p>
              </div>

              {/* Warning Notice */}
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <span className="font-medium">Notice:</span> The new team member will have 24 business hours to accept this assignment. If not accepted, the system may auto-reassign based on your settings.
                    </p>
                  </div>
                </div>
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
                  disabled={submitting || !formData.newTeamMemberId || !formData.reason.trim() || teamMembers.length === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Reassigning...
                    </>
                  ) : (
                    'Confirm Reassignment'
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

