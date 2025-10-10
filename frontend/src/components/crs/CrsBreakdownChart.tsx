// CRS Breakdown Chart Component
// Path: frontend/src/components/crs/CrsBreakdownChart.tsx

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { CrsBreakdown } from '@/types/crs';
import { motion } from 'framer-motion';

interface CrsBreakdownChartProps {
  breakdown: CrsBreakdown;
  showDetailed?: boolean;
  className?: string;
}

export const CrsBreakdownChart: React.FC<CrsBreakdownChartProps> = ({ 
  breakdown, 
  showDetailed = false,
  className = '' 
}) => {
  // Prepare data for charts
  // Show all positive factor-level items in the pie chart
  const pieData = [
    // Core Human Capital (bright palette)
    { name: 'Age', value: breakdown.coreHumanCapital.age, color: '#ff6b6b' },        // coral red
    { name: 'Education', value: breakdown.coreHumanCapital.education, color: '#f7b500' }, // bright amber
    { name: 'Language (1st)', value: breakdown.coreHumanCapital.firstLanguage, color: '#00c2ff' }, // sky blue
    { name: 'Language (2nd)', value: breakdown.coreHumanCapital.secondLanguage, color: '#845ef7' }, // vivid violet
    { name: 'Canadian Work', value: breakdown.coreHumanCapital.canadianWork, color: '#2ed573' }, // bright green
    // Spouse factors
    { name: 'Spouse Education', value: breakdown.spouseFactors.education, color: '#ffa502' }, // orange
    { name: 'Spouse Language', value: breakdown.spouseFactors.language, color: '#ff5db1' }, // pink
    { name: 'Spouse Canadian Work', value: breakdown.spouseFactors.canadianWork, color: '#1abc9c' }, // turquoise
    // Skill Transferability
    { name: 'Edu + Strong Language', value: breakdown.skillTransferability.educationLanguage, color: '#00d084' },
    { name: 'Edu + Canadian Work', value: breakdown.skillTransferability.educationCanadianWork, color: '#00b894' },
    { name: 'Foreign Work + Language', value: breakdown.skillTransferability.foreignWorkLanguage, color: '#00a8ff' },
    { name: 'Foreign Work + Canadian', value: breakdown.skillTransferability.foreignWorkCanadianWork, color: '#0097e6' },
    // Additional points
    { name: 'Provincial Nomination', value: breakdown.additionalPoints.provincialNomination, color: '#ff4757' },
    { name: 'Canadian Study', value: breakdown.additionalPoints.canadianStudy, color: '#ffd32a' },
    { name: 'Sibling in Canada', value: breakdown.additionalPoints.siblingsInCanada, color: '#ff9f43' },
    { name: 'French-language Skills', value: breakdown.additionalPoints.frenchLanguageSkills, color: '#e84393' }
  ].filter(item => item.value > 0);

  const detailedData = [
    // Core Human Capital breakdown
    { category: 'Age', points: breakdown.coreHumanCapital.age, section: 'Core', color: '#60A5FA' },
    { category: 'Education', points: breakdown.coreHumanCapital.education, section: 'Core', color: '#3B82F6' },
    { category: 'First Language', points: breakdown.coreHumanCapital.firstLanguage, section: 'Core', color: '#1D4ED8' },
    { category: 'Second Language', points: breakdown.coreHumanCapital.secondLanguage, section: 'Core', color: '#1E3A8A' },
    { category: 'Canadian Work', points: breakdown.coreHumanCapital.canadianWork, section: 'Core', color: '#1E40AF' },
    
    // Additional points breakdown
    { category: 'Provincial Nomination', points: breakdown.additionalPoints.provincialNomination, section: 'Additional', color: '#F59E0B' },
    { category: 'Canadian Study', points: breakdown.additionalPoints.canadianStudy, section: 'Additional', color: '#D97706' },
    { category: 'Siblings in Canada', points: breakdown.additionalPoints.siblingsInCanada, section: 'Additional', color: '#B45309' },
    { category: 'French Skills', points: breakdown.additionalPoints.frenchLanguageSkills, section: 'Additional', color: '#92400E' },
    
    // Other sections
    { category: 'Spouse Total', points: breakdown.spouseFactors.total, section: 'Spouse', color: '#8B5CF6' },
    { category: 'Transferability', points: breakdown.skillTransferability.total, section: 'Skills', color: '#10B981' }
  ].filter(item => item.points > 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md">
          <p className="font-medium">{`${label}: ${payload[0].value} points`}</p>
          {payload[0].payload.section && (
            <p className="text-sm text-gray-600">{payload[0].payload.section}</p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md">
          <p className="font-medium">{`${data.name}: ${data.value} points`}</p>
          <p className="text-sm text-gray-600">
            {((data.value / breakdown.grandTotal) * 100).toFixed(1)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-red-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PieChartIcon className="w-5 h-5 text-red-600" />
              Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="value"
                      // Compact labels; keep legend for names
                      label={(d: any) => `${(d.percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend and Summary */}
              <div className="flex flex-col justify-center space-y-4 overflow-hidden">
                <div className="space-y-3 max-h-56 overflow-auto pr-2">
                  {pieData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-sm font-medium truncate max-w-[180px]">{item.name}</span>
                      </div>
                      <Badge variant="outline" className="font-semibold">
                        {item.value}
                      </Badge>
                    </div>
                  ))}
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">Total Score:</span>
                    <Badge className="text-lg bg-red-600 text-white px-3 py-1">
                      {breakdown.grandTotal}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Detailed Breakdown Chart */}
      {showDetailed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border-red-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-red-600" />
                Detailed Points Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={detailedData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <XAxis 
                      dataKey="category" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="points" 
                      fill="#DC2626"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Maximum Points Reference removed per request */}
    </div>
  );
};