import React from 'react';

interface ProgressProps {
  value?: number;
  className?: string;
  indicatorClassName?: string;
}

export const Progress: React.FC<ProgressProps> = ({ 
  value = 0, 
  className = '',
  indicatorClassName = 'bg-blue-600'
}) => {
  return (
    <div className={`w-full bg-gray-200 rounded-full h-2.5 ${className}`}>
      <div 
        className={`h-2.5 rounded-full transition-all duration-300 ${indicatorClassName}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      ></div>
    </div>
  );
};
