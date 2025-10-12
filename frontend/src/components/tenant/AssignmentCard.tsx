import React, { useState } from 'react';
import { ClientAssignment } from '@/types/teamMember.types';
import { formatDistanceToNow, format } from 'date-fns';

interface AssignmentCardProps {
  assignment: ClientAssignment;
  clientName?: string;
  teamMemberName?: string;
  showActions?: boolean;
  onAccept?: (assignmentId: string) => void;
  onReassign?: (assignmentId: string) => void;
  onComplete?: (assignmentId: string) => void;
  compact?: boolean;
}

export const AssignmentCard: React.FC<AssignmentCardProps> = ({
  assignment,
  clientName = 'Unknown Client',
  teamMemberName = 'Unknown Team Member',
  showActions = false,
  onAccept,
  onReassign,
  onComplete,
  compact = false,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Calculate time until deadline
  const getDeadlineStatus = () => {
    const now = new Date();
    const deadline = new Date(assignment.acceptanceDeadline);
    const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (assignment.status !== 'pending') {
      return { text: 'N/A', color: 'text-gray-500', urgent: false };
    }

    if (hoursUntilDeadline < 0) {
      return { text: 'Overdue', color: 'text-red-600', urgent: true };
    } else if (hoursUntilDeadline < 4) {
      return { text: `${Math.round(hoursUntilDeadline)}h remaining`, color: 'text-orange-600', urgent: true };
    } else {
      return { text: formatDistanceToNow(deadline, { addSuffix: true }), color: 'text-gray-600', urgent: false };
    }
  };

  const deadlineStatus = getDeadlineStatus();

  // Status badge styling
  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      accepted: 'bg-blue-100 text-blue-800 border-blue-300',
      active: 'bg-green-100 text-green-800 border-green-300',
      completed: 'bg-gray-100 text-gray-800 border-gray-300',
      reassigned: 'bg-purple-100 text-purple-800 border-purple-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // Priority badge styling
  const getPriorityBadge = (priority?: string) => {
    if (!priority) return 'bg-gray-100 text-gray-600';
    
    const styles = {
      low: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700',
    };
    return styles[priority as keyof typeof styles] || 'bg-gray-100 text-gray-600';
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-3">
          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadge(assignment.status)}`}>
            {assignment.status}
          </span>
          <span className="text-sm text-gray-700">{clientName}</span>
          {assignment.caseType && (
            <span className="text-xs text-gray-500">• {assignment.caseType}</span>
          )}
        </div>
        {assignment.status === 'pending' && (
          <span className={`text-xs font-medium ${deadlineStatus.color}`}>
            {deadlineStatus.text}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{clientName}</h3>
              <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusBadge(assignment.status)}`}>
                {assignment.status}
              </span>
              {assignment.priority && (
                <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityBadge(assignment.priority)}`}>
                  {assignment.priority.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {teamMemberName}
              </span>
              {assignment.caseType && (
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {assignment.caseType}
                </span>
              )}
            </div>
          </div>
          
          {/* Deadline Warning */}
          {assignment.status === 'pending' && deadlineStatus.urgent && (
            <div className="ml-4 flex items-center bg-orange-50 px-3 py-2 rounded-lg border border-orange-200">
              <svg className="w-5 h-5 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs">
                <div className="font-medium text-orange-900">Acceptance Due</div>
                <div className={deadlineStatus.color}>{deadlineStatus.text}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Assigned Date:</span>
            <span className="ml-2 font-medium text-gray-900">
              {format(new Date(assignment.assignedDate), 'MMM dd, yyyy')}
            </span>
          </div>
          
          {assignment.acceptedDate && (
            <div>
              <span className="text-gray-500">Accepted Date:</span>
              <span className="ml-2 font-medium text-gray-900">
                {format(new Date(assignment.acceptedDate), 'MMM dd, yyyy')}
              </span>
            </div>
          )}
          
          {assignment.status === 'pending' && (
            <div>
              <span className="text-gray-500">Acceptance Deadline:</span>
              <span className={`ml-2 font-medium ${deadlineStatus.color}`}>
                {format(new Date(assignment.acceptanceDeadline), 'MMM dd, yyyy HH:mm')}
              </span>
            </div>
          )}

          {assignment.caseStatus && (
            <div>
              <span className="text-gray-500">Case Status:</span>
              <span className="ml-2 font-medium text-gray-900">
                {assignment.caseStatus}
              </span>
            </div>
          )}
        </div>

        {/* Assignment Notes */}
        {assignment.assignmentNotes && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="text-xs font-medium text-blue-900 mb-1">Notes:</div>
            <div className="text-sm text-blue-800">{assignment.assignmentNotes}</div>
          </div>
        )}

        {/* Auto-reassignment warning */}
        {assignment.autoReassignmentEnabled && assignment.autoReassignmentAttempts > 0 && (
          <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-xs text-yellow-800">
                <span className="font-medium">Auto-reassignment active:</span> This assignment has been reassigned {assignment.autoReassignmentAttempts} time(s).
              </div>
            </div>
          </div>
        )}

        {/* Assignment History */}
        {assignment.assignmentHistory.length > 1 && (
          <div className="mt-3">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center"
            >
              {showDetails ? 'Hide' : 'Show'} Assignment History ({assignment.assignmentHistory.length} entries)
              <svg className={`w-4 h-4 ml-1 transform ${showDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showDetails && (
              <div className="mt-2 space-y-2">
                {assignment.assignmentHistory.map((entry, index) => (
                  <div key={index} className="flex items-start text-xs text-gray-600 pl-4 border-l-2 border-gray-200">
                    <span className="font-medium mr-2">#{index + 1}</span>
                    <div>
                      <div>Assigned: {format(new Date(entry.assignedDate), 'MMM dd, yyyy HH:mm')}</div>
                      {entry.acceptedDate && <div>Accepted: {format(new Date(entry.acceptedDate), 'MMM dd, yyyy HH:mm')}</div>}
                      {entry.reassignedDate && <div>Reassigned: {format(new Date(entry.reassignedDate), 'MMM dd, yyyy HH:mm')}</div>}
                      {entry.reassignReason && <div className="text-gray-500 italic">Reason: {entry.reassignReason}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-2">
          {assignment.status === 'pending' && onAccept && (
            <button
              onClick={() => onAccept(assignment._id)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Accept Assignment
            </button>
          )}
          
          {(assignment.status === 'pending' || assignment.status === 'accepted') && onReassign && (
            <button
              onClick={() => onReassign(assignment._id)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
            >
              Reassign
            </button>
          )}
          
          {(assignment.status === 'accepted' || assignment.status === 'active') && onComplete && (
            <button
              onClick={() => onComplete(assignment._id)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Complete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

