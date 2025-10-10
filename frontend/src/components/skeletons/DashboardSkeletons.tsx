// frontend/src/components/skeletons/DashboardSkeletons.tsx
import React from 'react';
import { Card } from '@/components/ui/card';

/**
 * 🎨 METRIC CARD SKELETON
 * Matches the exact layout of MetricCard component
 */
export const MetricCardSkeleton: React.FC = () => (
  <Card 
    className="p-6 border-0 shadow-md w-full bg-white dark:bg-gray-800" 
    style={{ height: '160px' }}
  >
    <div className="flex flex-col justify-between h-full animate-pulse">
      {/* Top Section - Title and Icon */}
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      </div>
      
      {/* Middle Section - Main Value */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
      </div>
      
      {/* Bottom Section - Trend and Subtitle */}
      <div className="space-y-1">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      </div>
    </div>
  </Card>
);

/**
 * 🎨 ACTIVITY ITEM SKELETON
 * For Recent Activity list items
 */
export const ActivityItemSkeleton: React.FC<{ showLine?: boolean }> = ({ showLine = true }) => (
  <div className="relative pb-8">
    {showLine && (
      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" />
    )}
    <div className="relative flex space-x-4 animate-pulse">
      {/* Icon Circle */}
      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0"></div>
      
      {/* Content */}
      <div className="flex-1 pt-1.5">
        <div className="flex justify-between space-x-4">
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
          <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * 🎨 ACTIVITY LIST SKELETON
 * Complete skeleton for Recent Activity section
 */
export const ActivityListSkeleton: React.FC<{ items?: number }> = ({ items = 4 }) => (
  <div className="flow-root">
    <ul className="-mb-8">
      {Array.from({ length: items }).map((_, index) => (
        <li key={index}>
          <ActivityItemSkeleton showLine={index !== items - 1} />
        </li>
      ))}
    </ul>
  </div>
);

/**
 * 🎨 ALERT CARD SKELETON
 * For System Alerts items
 */
export const AlertCardSkeleton: React.FC = () => (
  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/30 border-l-4 border-gray-200 dark:border-gray-600 animate-pulse">
    <div className="flex items-start space-x-3">
      {/* Icon */}
      <div className="w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded flex-shrink-0"></div>
      
      {/* Content */}
      <div className="flex-1 space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
        <div className="flex items-center space-x-3">
          <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded-full w-24"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-32"></div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * 🎨 ALERT LIST SKELETON
 * Complete skeleton for System Alerts section
 */
export const AlertListSkeleton: React.FC<{ items?: number }> = ({ items = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: items }).map((_, index) => (
      <AlertCardSkeleton key={index} />
    ))}
  </div>
);

/**
 * 🎨 TABLE ROW SKELETON
 * For Tenant Overview table rows
 */
export const TableRowSkeleton: React.FC = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        </div>
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="space-y-1">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="space-y-1">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
    </td>
  </tr>
);

/**
 * 🎨 TABLE SKELETON
 * Complete skeleton for Tenant Overview table
 */
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="overflow-hidden">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Tenant
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Users
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Plan
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Revenue
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Last Activity
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {Array.from({ length: rows }).map((_, index) => (
            <TableRowSkeleton key={index} />
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

/**
 * 🎨 QUICK ACTIONS SKELETON
 * For Quick Actions bar
 */
export const QuickActionsSkeleton: React.FC = () => (
  <Card className="p-4 border-0 shadow-md bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 animate-pulse">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-32"></div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <div className="h-10 bg-gray-200 dark:bg-gray-600 rounded-md w-36"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-600 rounded-md w-32"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-600 rounded-md w-32"></div>
      </div>
    </div>
  </Card>
);

