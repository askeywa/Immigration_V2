// frontend/src/components/common/DashboardHeaderExample.tsx
import React from 'react';
import { DashboardHeader } from './DashboardHeader';
import { Button } from '@/components/ui/button';

/**
 * Example component showing different ways to use the unified DashboardHeader
 */
export const DashboardHeaderExample: React.FC = () => {
  const handleRefresh = () => {
    console.log('Refresh clicked');
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  const handleProfileClick = () => {
    console.log('Profile clicked');
  };

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-bold">DashboardHeader Examples</h1>
      
      {/* Example 1: Super Admin Header */}
      <div className="border rounded-lg">
        <h2 className="text-lg font-semibold p-4 border-b">Super Admin Header</h2>
        <DashboardHeader
          title="Super Admin Dashboard"
          subtitle="System overview and management controls"
          showRefresh={true}
          showLogout={true}
          showProfile={true}
          showNotifications={false}
          showSettings={false}
          onRefresh={handleRefresh}
          onLogout={handleLogout}
          onProfileClick={handleProfileClick}
          isLoading={false}
        />
      </div>

      {/* Example 2: Tenant Admin Header */}
      <div className="border rounded-lg">
        <h2 className="text-lg font-semibold p-4 border-b">Tenant Admin Header</h2>
        <DashboardHeader
          title="Tenant Dashboard"
          subtitle="Welcome back, Admin User"
          showRefresh={true}
          showLogout={false}
          showProfile={true}
          showNotifications={false}
          showSettings={true}
          onRefresh={handleRefresh}
          onSettingsClick={() => console.log('Settings clicked')}
          isLoading={false}
          customActions={
            <div className="text-sm text-gray-500">
              Managing: Acme Corporation
            </div>
          }
        />
      </div>

      {/* Example 3: User Header (Compact) */}
      <div className="border rounded-lg">
        <h2 className="text-lg font-semibold p-4 border-b">User Header (Compact)</h2>
        <DashboardHeader
          title="Welcome back, John Doe! 👋"
          subtitle="Your immigration journey continues here"
          showRefresh={false}
          showLogout={false}
          showProfile={true}
          showNotifications={false}
          showSettings={false}
          variant="compact"
          customActions={
            <Button variant="outline" size="sm">
              View Profile
            </Button>
          }
        />
      </div>

      {/* Example 4: Minimal Header */}
      <div className="border rounded-lg">
        <h2 className="text-lg font-semibold p-4 border-b">Minimal Header</h2>
        <DashboardHeader
          title="Simple Page"
          subtitle="A minimal header example"
          variant="minimal"
          customActions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Action 1
              </Button>
              <Button variant="outline" size="sm">
                Action 2
              </Button>
            </div>
          }
        />
      </div>
    </div>
  );
};

export default DashboardHeaderExample;
