// Optimized chart components with lazy loading
import React, { Suspense, lazy } from 'react';

// Lazy load chart components
const LazyPieChart = lazy(() => import('recharts').then(m => ({ 
  default: m.PieChart,
  Pie: m.Pie,
  Cell: m.Cell,
  ResponsiveContainer: m.ResponsiveContainer
})));

const LazyBarChart = lazy(() => import('recharts').then(m => ({
  default: m.BarChart,
  Bar: m.Bar,
  XAxis: m.XAxis,
  YAxis: m.YAxis,
  Tooltip: m.Tooltip,
  ResponsiveContainer: m.ResponsiveContainer
})));

interface OptimizedPieChartProps {
  data: any[];
  className?: string;
  [key: string]: any;
}

export const OptimizedPieChart: React.FC<OptimizedPieChartProps> = ({ 
  data, 
  className = "w-full h-64",
  ...props 
}) => {
  return (
    <div className={className}>
      <Suspense fallback={
        <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-pulse bg-gray-300 rounded-full h-16 w-16 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading chart...</p>
          </div>
        </div>
      }>
        <LazyPieChart data={data} {...props} />
      </Suspense>
    </div>
  );
};

interface OptimizedBarChartProps {
  data: any[];
  className?: string;
  [key: string]: any;
}

export const OptimizedBarChart: React.FC<OptimizedBarChartProps> = ({ 
  data, 
  className = "w-full h-64",
  ...props 
}) => {
  return (
    <div className={className}>
      <Suspense fallback={
        <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-pulse bg-gray-300 rounded h-16 w-full mx-auto mb-2"></div>
            <p className="text-gray-600">Loading chart...</p>
          </div>
        </div>
      }>
        <LazyBarChart data={data} {...props} />
      </Suspense>
    </div>
  );
};

// Preload charts for critical components
export const preloadCharts = () => {
  import('recharts');
};
