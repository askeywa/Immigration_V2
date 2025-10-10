// Tenant Utility Functions - Extracted from SuperAdminTenants.tsx for better code organization
import React from 'react';

export const getStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700';
    case 'suspended':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700';
    case 'trial':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/50 dark:text-gray-300 dark:border-gray-700';
    case 'expired':
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/50 dark:text-gray-300 dark:border-gray-700';
  }
};

export const getPlanColor = (planName: string): string => {
  const plan = planName?.toLowerCase() || '';
  
  // Premium plans - Gold colors
  if (plan.includes('premium') || plan.includes('pro') || plan.includes('enterprise') || plan.includes('gold')) {
    return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700';
  }
  
  // Standard plans - Silver colors  
  if (plan.includes('standard') || plan.includes('business') || plan.includes('silver') || plan.includes('basic')) {
    return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/50 dark:text-gray-300 dark:border-gray-700';
  }
  
  // Bronze/Budget plans - Bronze colors
  if (plan.includes('bronze') || plan.includes('starter') || plan.includes('budget') || plan.includes('economy')) {
    return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700';
  }
  
  // Trial plans - Blue colors
  if (plan.includes('trial') || plan.includes('demo') || plan.includes('free')) {
    return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700';
  }
  
  // Custom plans - Purple colors
  if (plan.includes('custom') || plan.includes('special') || plan.includes('vip')) {
    return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700';
  }
  
  // Default/N/A - Gray colors
  return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/50 dark:text-gray-300 dark:border-gray-700';
};
