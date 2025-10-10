// frontend/src/pages/tenant/TenantProfiles.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { useTenant } from '@/contexts/TenantContext';

export const TenantProfiles: React.FC = () => {
  const { tenant, isTenantAdmin } = useTenant();

  if (!isTenantAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ClipboardDocumentListIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Tenant admin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="bg-white shadow-sm border-b border-gray-200 mb-6">
        <div className="max-w-7xl mx-auto py-6 px-6">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold text-gray-900"
          >
            Profile Management
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-1 text-lg text-gray-600"
          >
            Manage user profiles for {tenant?.name || 'your organization'}
          </motion.p>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 pb-6">
        <div className="text-center py-12">
          <ClipboardDocumentListIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Profile Management</h3>
          <p className="text-gray-600">Profile management features coming soon.</p>
        </div>
      </div>
    </div>
  );
};

export default TenantProfiles;
