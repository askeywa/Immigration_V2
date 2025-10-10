// Recharts Components Wrapper - Lazy loaded to improve initial load time
import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface RechartsComponentsProps {
  type: 'line' | 'bar' | 'pie' | 'area';
  data: any[];
  config: any;
  height?: number;
  className?: string;
}

const RechartsComponents: React.FC<RechartsComponentsProps> = ({
  type,
  data,
  config,
  height = 300,
  className = ''
}) => {
  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height} className={className}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {config.lines?.map((line: any, index: number) => (
                <Line
                  key={index}
                  type="monotone"
                  dataKey={line.dataKey}
                  stroke={line.stroke}
                  strokeWidth={line.strokeWidth || 2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height} className={className}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {config.bars?.map((bar: any, index: number) => (
                <Bar
                  key={index}
                  dataKey={bar.dataKey}
                  fill={bar.fill}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height} className={className}>
            <PieChart>
              <Pie
                data={data}
                dataKey={config.dataKey}
                nameKey={config.nameKey}
                cx="50%"
                cy="50%"
                outerRadius={config.outerRadius || 80}
                fill={config.fill || '#8884d8'}
                label
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={config.colors?.[index % config.colors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height} className={className}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {config.areas?.map((area: any, index: number) => (
                <Area
                  key={index}
                  type="monotone"
                  dataKey={area.dataKey}
                  stroke={area.stroke}
                  fill={area.fill}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return <>{renderChart()}</>;
};

export default RechartsComponents;
