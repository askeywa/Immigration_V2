// frontend/src/pages/tenant/TeamPerformance.tsx
import React, { useState, useEffect } from 'react';
import { teamMemberService } from '@/services/teamMemberService';
import { PerformanceComparisonResponse } from '@/types/teamMember.types';
import { TrendingUp, Award, Users, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const TeamPerformance: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceComparisonResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const data = await teamMemberService.getPerformanceComparison();
      setPerformanceData(data);
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!performanceData) {
    return (
      <div className="p-6">
        <p className="text-gray-600 dark:text-gray-400">No performance data available</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="h-8 w-8 text-blue-600" />
          Team Performance
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Compare team member performance and track key metrics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          icon={<Users className="h-6 w-6 text-blue-600" />}
          title="Total Team Members"
          value={performanceData.summary.totalTeamMembers}
          bgColor="bg-blue-100 dark:bg-blue-900"
        />
        <SummaryCard
          icon={<Clock className="h-6 w-6 text-yellow-600" />}
          title="Active Assignments"
          value={performanceData.summary.totalActiveAssignments}
          bgColor="bg-yellow-100 dark:bg-yellow-900"
        />
        <SummaryCard
          icon={<CheckCircle className="h-6 w-6 text-green-600" />}
          title="Completed Cases"
          value={performanceData.summary.totalCompletedCases}
          bgColor="bg-green-100 dark:bg-green-900"
        />
        <SummaryCard
          icon={<Award className="h-6 w-6 text-purple-600" />}
          title="Avg Success Rate"
          value={`${Math.round(performanceData.summary.averageSuccessRate || 0)}%`}
          bgColor="bg-purple-100 dark:bg-purple-900"
        />
      </div>

      {/* Rankings Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team Rankings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Team Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Clients Onboarded
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Active Cases
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Completed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Success Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Pending
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {performanceData.rankings.map((ranking) => (
                <tr key={ranking.teamMember.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {ranking.rank === 1 && <Award className="h-5 w-5 text-yellow-500 mr-2" />}
                      {ranking.rank === 2 && <Award className="h-5 w-5 text-gray-400 mr-2" />}
                      {ranking.rank === 3 && <Award className="h-5 w-5 text-orange-600 mr-2" />}
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        #{ranking.rank}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {ranking.teamMember.name}
                      </p>
                      {ranking.teamMember.designation && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {ranking.teamMember.designation}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-white font-semibold">
                      {ranking.metrics.totalClientsOnboarded}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {ranking.metrics.currentWorkload}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                      {ranking.metrics.completedCases}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${
                      (ranking.metrics.caseSuccessRate || 0) >= 80
                        ? 'text-green-600 dark:text-green-400'
                        : (ranking.metrics.caseSuccessRate || 0) >= 60
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {ranking.metrics.caseSuccessRate || 0}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {ranking.metrics.pendingAssignments}
                      </span>
                      {ranking.metrics.overdueAssignments > 0 && (
                        <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                          <AlertCircle className="h-3 w-3" />
                          {ranking.metrics.overdueAssignments}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Summary Card Component
const SummaryCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: number | string;
  bgColor: string;
}> = ({ icon, title, value, bgColor }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${bgColor}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default TeamPerformance;

