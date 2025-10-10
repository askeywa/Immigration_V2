// frontend/src/pages/tenant/TenantDocuments.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { useTenant } from '@/contexts/TenantContext';
import { DocumentManagement } from '@/components/tenant/DocumentManagement';
import { DashboardHeader } from '@/components/common';

const TenantDocuments: React.FC = () => {
  const { tenant, isTenantAdmin } = useTenant();

  // Access denied check
  if (!isTenantAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <DocumentTextIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Tenant admin access required for this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Dashboard Header */}
      <DashboardHeader
        title="Document Management"
        subtitle={`Managing documents for ${tenant?.name || 'your organization'}`}
        showRefresh={true}
        showLogout={false}
        showProfile={true}
        showNotifications={false}
        showSettings={true}
        onRefresh={() => window.location.reload()}
        onSettingsClick={() => window.location.href = '/tenant/settings'}
        isLoading={false}
      />

      <div className="max-w-7xl mx-auto px-6 pb-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <DocumentManagement />
        </motion.div>
      </div>
    </div>
  );
};

export default TenantDocuments;