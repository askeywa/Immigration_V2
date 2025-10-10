// frontend/src/components/common/DarkModeToggle.tsx
import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useDarkMode } from '@/contexts/DarkModeContext';

interface DarkModeToggleProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const DarkModeToggle: React.FC<DarkModeToggleProps> = ({ 
  className = '', 
  showText = false,
  size = 'md'
}) => {
  const { isDarkMode, toggleDarkMode, isLoading } = useDarkMode();

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <button
      onClick={toggleDarkMode}
      disabled={isLoading}
      className={`
        inline-flex items-center justify-center rounded-full transition-all duration-300 ease-in-out
        ${sizeClasses[size]}
        ${isDarkMode 
          ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700 shadow-lg border border-gray-600' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-md border border-gray-200'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${className}
      `}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isLoading ? (
        <div className={`${iconSizes[size]} border-2 border-current border-t-transparent rounded-full animate-spin`} />
      ) : (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Sun Icon */}
          <Sun 
            className={`
              ${iconSizes[size]} transition-all duration-300 ease-in-out absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
              ${isDarkMode ? 'opacity-0 rotate-180 scale-0' : 'opacity-100 rotate-0 scale-100'}
            `}
          />
          {/* Moon Icon */}
          <Moon 
            className={`
              ${iconSizes[size]} transition-all duration-300 ease-in-out absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
              ${isDarkMode ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-180 scale-0'}
            `}
          />
        </div>
      )}
      
      {showText && (
        <span className="ml-2 text-sm font-medium">
          {isDarkMode ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
};

// Compact version for headers
export const CompactDarkModeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <DarkModeToggle 
      size="sm" 
      showText={false} 
      className={className}
    />
  );
};

// Full version with text
export const FullDarkModeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <DarkModeToggle 
      size="md" 
      showText={true} 
      className={className}
    />
  );
};
