import React from 'react';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive';
}

export const Alert: React.FC<AlertProps> = ({ variant = 'default', className = '', children, ...props }) => {
  const base = 'flex items-start gap-2 p-3 rounded-lg border';
  const styles = variant === 'destructive'
    ? 'border-red-500 bg-red-50'
    : 'border-gray-200 bg-white';
  return (
    <div className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </div>
  );
};

export const AlertDescription: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => (
  <div className={`text-sm ${className}`} {...props}>
    {children}
  </div>
);

export default Alert;

