// frontend/src/components/security/SessionSecurity.tsx
import React, { useEffect, useState } from 'react';
import { startSessionMonitoring, updateActivity, SESSION_TIMEOUT } from '@/store/authStore';

interface SessionSecurityProps {
  children: React.ReactNode;
}

const SessionSecurity: React.FC<SessionSecurityProps> = ({ children }) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(SESSION_TIMEOUT);
  const [showWarning, setShowWarning] = useState<boolean>(false);

  useEffect(() => {
    // Start session monitoring
    startSessionMonitoring();

    // Update activity timer every second
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = SESSION_TIMEOUT - (now - (window as any).lastActivity);
      
      if (remaining <= 0) {
        setTimeRemaining(0);
        setShowWarning(false);
      } else if (remaining <= 60000) { // Show warning in last minute
        setTimeRemaining(remaining);
        setShowWarning(true);
      } else {
        setTimeRemaining(remaining);
        setShowWarning(false);
      }
    }, 1000);

    // Track user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      (window as any).lastActivity = Date.now();
      updateActivity();
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      clearInterval(interval);
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, []);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {children}
      
      {/* Session Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Session Timeout Warning
                </h3>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your session will expire in:
              </p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {formatTime(timeRemaining)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Any unsaved changes will be automatically saved before logout.
              </p>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => {
                  updateActivity();
                  setShowWarning(false);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Stay Active
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SessionSecurity;
