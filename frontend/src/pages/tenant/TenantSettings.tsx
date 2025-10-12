// frontend/src/pages/tenant/TenantSettings.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CogIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  BellIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PaintBrushIcon as PaletteIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { useTenant } from '@/contexts/TenantContext';
import { useAuthStore } from '@/store/authStore';
import { tenantApiService } from '@/services/tenantApiService';
import { log } from '@/utils/logger';
import { DashboardHeader } from '@/components/common';

interface TenantSettings {
  // General Settings
  name: string;
  domain: string;
  email: string;
  phone: string;
  timezone: string;
  language: string;
  
  // Business Information
  businessType: string;
  industry: string;
  companySize: string;
  website: string;
  description: string;
  
  // Security Settings
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    maxAge: number;
  };
  sessionTimeout: number;
  twoFactorRequired: boolean;
  ipWhitelist: string[];
  
  // Notification Settings
  notifications: {
    email: {
      userRegistration: boolean;
      documentUpload: boolean;
      paymentReceived: boolean;
      systemAlerts: boolean;
    };
    sms: {
      userRegistration: boolean;
      documentUpload: boolean;
      paymentReceived: boolean;
      systemAlerts: boolean;
    };
  };
  
  // Feature Settings
  features: {
    userRegistration: boolean;
    documentUpload: boolean;
    customBranding: boolean;
    apiAccess: boolean;
    analytics: boolean;
  };
  
  // Integration Settings
  integrations: {
    googleAnalytics: string;
    facebookPixel: string;
    customScripts: string;
  };
}

export const TenantSettings: React.FC = () => {
  const { tenant, isTenantAdmin } = useTenant();
  const { user: currentUser } = useAuthStore();
  
  // DEBUG: Log the state
  console.log('🔧 TenantSettings: Component rendered');
  console.log('🔧 isTenantAdmin:', isTenantAdmin);
  console.log('🔧 currentUser:', currentUser);
  console.log('🔧 tenant:', tenant);
  
  // State management
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');

  // Load settings
  const loadSettings = async () => {
    if (!isTenantAdmin) {
      setError('Not authorized - not a tenant admin');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('API call timeout after 10 seconds')), 10000);
      });
      
      const apiCallPromise = tenantApiService.get('/tenant/settings');
      const response = await Promise.race([apiCallPromise, timeoutPromise]) as any;
      
      if (response && response.success) {
        setSettings(response.data);
      } else {
        setError('Failed to load tenant settings');
      }
    } catch (err: any) {
      log.error('Failed to load tenant settings', { error: err.message });
      setError('Failed to load tenant settings: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Save settings
  const saveSettings = async (updatedSettings: Partial<TenantSettings>) => {
    if (!isTenantAdmin || !settings) return;
    
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await tenantApiService.put('/tenant/settings', {
        ...settings,
        ...updatedSettings
      });
      
      if (response.success) {
        setSettings({ ...settings, ...updatedSettings });
        setSuccess('Settings saved successfully');
      } else {
        setError(response.message || 'Failed to save settings');
      }
    } catch (err: any) {
      log.error('Failed to save tenant settings', { error: err.message });
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, [isTenantAdmin]);

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    if (!settings) return;
    
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setSettings(prev => ({
        ...prev!,
        [parent]: {
          ...(prev![parent as keyof typeof prev] as any),
          [child]: value
        }
      }));
    } else {
      setSettings(prev => ({
        ...prev!,
        [field]: value
      }));
    }
  };

  // Handle save
  const handleSave = () => {
    if (settings) {
      saveSettings(settings);
    }
  };

  // Tabs configuration
  const tabs = [
    { id: 'general', name: 'General', icon: BuildingOfficeIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'features', name: 'Features', icon: CogIcon },
    { id: 'integrations', name: 'Integrations', icon: GlobeAltIcon }
  ];

  if (!isTenantAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShieldCheckIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Tenant admin access required for this page.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tenant settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Dashboard Header */}
      <DashboardHeader
        title="Tenant Settings"
        subtitle={`Configure your tenant preferences and settings`}
        showRefresh={false}
        showLogout={false}
        showProfile={true}
        showNotifications={false}
        showSettings={false}
        isLoading={false}
      />

      <div className="max-w-7xl mx-auto px-6 pb-6">
        {/* Quick Actions Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8 mt-6"
        >
          <div className="bg-white p-3 rounded-lg shadow-md border-0 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
              <div className="flex flex-wrap items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  onClick={() => window.location.href = '/tenant/branding'}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors duration-200 shadow-sm"
                >
                  <PaletteIcon className="w-3 h-3 mr-1.5" />
                  Branding
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  onClick={() => window.location.href = '/tenant/users'}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors duration-200 shadow-sm"
                >
                  <UsersIcon className="w-3 h-3 mr-1.5" />
                  Manage Users
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
              <div className="text-sm text-red-700">{error}</div>
            </div>
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
              <div className="text-sm text-green-700">{success}</div>
            </div>
          </div>
        )}

        {settings && (
          <div className="bg-white shadow rounded-lg">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                {tabs.map((tab) => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <TabIcon className="h-5 w-5 mr-2" />
                      {tab.name}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">General Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tenant Name
                        </label>
                        <input
                          type="text"
                          value={settings.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Domain
                        </label>
                        <input
                          type="text"
                          value={settings.domain}
                          onChange={(e) => handleInputChange('domain', e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={settings.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={settings.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Timezone
                        </label>
                        <select
                          value={settings.timezone}
                          onChange={(e) => handleInputChange('timezone', e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          <option value="UTC">UTC</option>
                          <option value="America/New_York">Eastern Time</option>
                          <option value="America/Chicago">Central Time</option>
                          <option value="America/Denver">Mountain Time</option>
                          <option value="America/Los_Angeles">Pacific Time</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Language
                        </label>
                        <select
                          value={settings.language}
                          onChange={(e) => handleInputChange('language', e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Password Policy</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Minimum Length
                        </label>
                        <input
                          type="number"
                          min="6"
                          max="32"
                          value={settings.passwordPolicy.minLength}
                          onChange={(e) => handleInputChange('passwordPolicy.minLength', parseInt(e.target.value))}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Maximum Age (days)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={settings.passwordPolicy.maxAge}
                          onChange={(e) => handleInputChange('passwordPolicy.maxAge', parseInt(e.target.value))}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4 space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.passwordPolicy.requireUppercase}
                          onChange={(e) => handleInputChange('passwordPolicy.requireUppercase', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Require uppercase letters</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.passwordPolicy.requireLowercase}
                          onChange={(e) => handleInputChange('passwordPolicy.requireLowercase', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Require lowercase letters</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.passwordPolicy.requireNumbers}
                          onChange={(e) => handleInputChange('passwordPolicy.requireNumbers', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Require numbers</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.passwordPolicy.requireSpecialChars}
                          onChange={(e) => handleInputChange('passwordPolicy.requireSpecialChars', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Require special characters</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Session Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Session Timeout (minutes)
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="1440"
                          value={settings.sessionTimeout}
                          onChange={(e) => handleInputChange('sessionTimeout', parseInt(e.target.value))}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={settings.twoFactorRequired}
                            onChange={(e) => handleInputChange('twoFactorRequired', e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Require Two-Factor Authentication</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Email Notifications</h3>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.notifications.email.userRegistration}
                          onChange={(e) => handleInputChange('notifications.email.userRegistration', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">User Registration</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.notifications.email.documentUpload}
                          onChange={(e) => handleInputChange('notifications.email.documentUpload', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Document Upload</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.notifications.email.paymentReceived}
                          onChange={(e) => handleInputChange('notifications.email.paymentReceived', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Payment Received</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.notifications.email.systemAlerts}
                          onChange={(e) => handleInputChange('notifications.email.systemAlerts', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">System Alerts</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">SMS Notifications</h3>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.notifications.sms.userRegistration}
                          onChange={(e) => handleInputChange('notifications.sms.userRegistration', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">User Registration</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.notifications.sms.documentUpload}
                          onChange={(e) => handleInputChange('notifications.sms.documentUpload', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Document Upload</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.notifications.sms.paymentReceived}
                          onChange={(e) => handleInputChange('notifications.sms.paymentReceived', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Payment Received</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.notifications.sms.systemAlerts}
                          onChange={(e) => handleInputChange('notifications.sms.systemAlerts', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">System Alerts</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'features' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Feature Toggles</h3>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.features.userRegistration}
                          onChange={(e) => handleInputChange('features.userRegistration', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">User Registration</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.features.documentUpload}
                          onChange={(e) => handleInputChange('features.documentUpload', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Document Upload</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.features.customBranding}
                          onChange={(e) => handleInputChange('features.customBranding', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Custom Branding</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.features.apiAccess}
                          onChange={(e) => handleInputChange('features.apiAccess', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">API Access</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.features.analytics}
                          onChange={(e) => handleInputChange('features.analytics', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Analytics</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'integrations' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Third-Party Integrations</h3>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Google Analytics ID
                        </label>
                        <input
                          type="text"
                          value={settings.integrations.googleAnalytics}
                          onChange={(e) => handleInputChange('integrations.googleAnalytics', e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="GA-XXXXXXXXX"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Facebook Pixel ID
                        </label>
                        <input
                          type="text"
                          value={settings.integrations.facebookPixel}
                          onChange={(e) => handleInputChange('integrations.facebookPixel', e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="1234567890123456"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Custom Scripts
                        </label>
                        <textarea
                          value={settings.integrations.customScripts}
                          onChange={(e) => handleInputChange('integrations.customScripts', e.target.value)}
                          rows={6}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="Enter custom JavaScript code here..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
                  ${isSaving 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }
                `}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </button>
            </div>
          </div>
        )}
        </motion.div>
      </div>
    </div>
  );
};

export default TenantSettings;
