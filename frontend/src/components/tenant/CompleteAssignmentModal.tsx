import React, { useState } from 'react';
import { teamMemberService } from '@/services/teamMemberService';
import { CompleteAssignmentRequest } from '@/types/teamMember.types';

interface CompleteAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: string;
  clientName: string;
  onCompletionSuccess: () => void;
}

export const CompleteAssignmentModal: React.FC<CompleteAssignmentModalProps> = ({
  isOpen,
  onClose,
  assignmentId,
  clientName,
  onCompletionSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<CompleteAssignmentRequest>({
    finalStatus: 'Approved',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await teamMemberService.completeAssignment(assignmentId, formData);
      
      setSuccess(`Assignment for "${clientName}" marked as completed!`);
      setTimeout(() => {
        onCompletionSuccess();
        handleClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error completing assignment:', err);
      setError(err.response?.data?.message || 'Failed to complete assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      finalStatus: 'Approved',
      notes: '',
    });
    setError(null);
    setSuccess(null);
    onClose();
  };

  if (!isOpen) return null;

  const statusOptions: Array<{ value: CompleteAssignmentRequest['finalStatus']; label: string; color: string; description: string }> = [
    {
      value: 'Approved',
      label: 'Approved',
      color: 'green',
      description: 'Application was successful and approved by immigration authorities',
    },
    {
      value: 'Rejected',
      label: 'Rejected',
      color: 'red',
      description: 'Application was rejected or denied',
    },
    {
      value: 'Case Closed',
      label: 'Case Closed',
      color: 'gray',
      description: 'Case closed for other reasons (withdrawn, cancelled, etc.)',
    },
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
              <h2 className="text-2xl font-bold text-gray-900">Complete Assignment</h2>
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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Final Status Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Final Case Status <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                {statusOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.finalStatus === option.value
                        ? `border-${option.color}-500 bg-${option.color}-50`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="finalStatus"
                      value={option.value}
                      checked={formData.finalStatus === option.value}
                      onChange={(e) => setFormData({ ...formData, finalStatus: e.target.value as CompleteAssignmentRequest['finalStatus'] })}
                      className="mt-1 mr-3"
                      disabled={submitting}
                    />
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className={`text-base font-semibold ${
                          formData.finalStatus === option.value ? `text-${option.color}-900` : 'text-gray-900'
                        }`}>
                          {option.label}
                        </span>
                        {option.value === 'Approved' && (
                          <svg className="w-5 h-5 ml-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {option.value === 'Rejected' && (
                          <svg className="w-5 h-5 ml-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {option.value === 'Case Closed' && (
                          <svg className="w-5 h-5 ml-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        )}
                      </div>
                      <p className={`text-sm mt-1 ${
                        formData.finalStatus === option.value ? `text-${option.color}-700` : 'text-gray-600'
                      }`}>
                        {option.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Completion Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Completion Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Add any final notes or comments about the case outcome (optional)..."
                disabled={submitting}
              />
              <p className="mt-1 text-xs text-gray-500">
                These notes will be saved in the case history
              </p>
            </div>

            {/* Info Notice */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Note:</span> Completing this assignment will:
                  </p>
                  <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
                    <li>Mark the client's case status as "{formData.finalStatus}"</li>
                    <li>Update team member's performance metrics</li>
                    <li>Free up capacity for new assignments</li>
                    <li>Archive this assignment in the history</li>
                  </ul>
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
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Completing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Complete Assignment
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

