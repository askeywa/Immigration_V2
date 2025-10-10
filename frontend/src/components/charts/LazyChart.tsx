// Lazy-loaded Chart Component - Load Recharts only when needed
import React, { Suspense, lazy } from 'react';

// Lazy load Recharts components
const RechartsComponents = lazy(() => import('./RechartsComponents'));

interface LazyChartProps {
  type: 'line' | 'bar' | 'pie' | 'area';
  data: any[];
  config: any;
  height?: number;
  className?: string;
}

// Loading skeleton for charts
const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 300 }) => (
  <div 
    className="w-full bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" 
    style={{ height: `${height}px` }}
  >
    <div className="flex items-center justify-center h-full">
      <div className="text-gray-400 dark:text-gray-500">Loading chart...</div>
    </div>
  </div>
);

export const LazyChart: React.FC<LazyChartProps> = ({ 
  type, 
  data, 
  config, 
  height = 300,
  className = ''
}) => {
  return (
    <Suspense fallback={<ChartSkeleton height={height} />}>
      <RechartsComponents 
        type={type}
        data={data}
        config={config}
        height={height}
        className={className}
      />
    </Suspense>
  );
};

export default LazyChart;
