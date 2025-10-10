// frontend/src/pages/tenant/BrandingCustomization.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  PaintBrushIcon,
  PhotoIcon,
  CodeBracketIcon,
  EyeIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { useTenant } from '@/contexts/TenantContext';
import { useAuthStore } from '@/store/authStore';
import { tenantApiService } from '@/services/tenantApiService';
import { log } from '@/utils/logger';
import { DashboardHeader } from '@/components/common';

interface BrandingSettings {
  // Logo Settings
  logo: {
    url?: string;
    file?: File;
    width: number;
    height: number;
    alt: string;
  };
  
  // Color Scheme
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    link: string;
    success: string;
    warning: string;
    error: string;
  };
  
  // Typography
  typography: {
    fontFamily: string;
    headingFont: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
    };
  };
  
  // Layout
  layout: {
    headerHeight: number;
    sidebarWidth: number;
    borderRadius: number;
    shadow: string;
  };
  
  // Custom CSS
  customCSS: string;
  
  // Favicon
  favicon: {
    url?: string;
    file?: File;
  };
  
  // Meta Tags
  meta: {
    title: string;
    description: string;
    keywords: string;
  };
}

interface ColorPreset {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
}

export const BrandingCustomization: React.FC = () => {
  const { tenant, isTenantAdmin } = useTenant();
  const { user: currentUser } = useAuthStore();
  
  // DEBUG: Log the state
  console.log('🎨 BrandingCustomization: Component rendered');
  console.log('🎨 isTenantAdmin:', isTenantAdmin);
  console.log('🎨 currentUser:', currentUser);
  console.log('🎨 tenant:', tenant);
  
  // State management
  const [branding, setBranding] = useState<BrandingSettings>({
    logo: { width: 200, height: 60, alt: 'Logo' },
    colors: {
      primary: '#3B82F6',
      secondary: '#6B7280',
      accent: '#10B981',
      background: '#FFFFFF',
      text: '#1F2937',
      link: '#3B82F6',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444'
    },
    typography: {
      fontFamily: 'Inter',
      headingFont: 'Inter',
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem'
      }
    },
    layout: {
      headerHeight: 64,
      sidebarWidth: 256,
      borderRadius: 8,
      shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
    },
    customCSS: '',
    favicon: {},
    meta: {
      title: '',
      description: '',
      keywords: ''
    }
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('colors');
  const [showPreview, setShowPreview] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  // Color presets
  const colorPresets: ColorPreset[] = [
    {
      id: 'blue',
      name: 'Blue Theme',
      colors: {
        primary: '#3B82F6',
        secondary: '#6B7280',
        accent: '#10B981',
        background: '#FFFFFF',
        text: '#1F2937'
      }
    },
    {
      id: 'green',
      name: 'Green Theme',
      colors: {
        primary: '#10B981',
        secondary: '#6B7280',
        accent: '#3B82F6',
        background: '#FFFFFF',
        text: '#1F2937'
      }
    },
    {
      id: 'purple',
      name: 'Purple Theme',
      colors: {
        primary: '#8B5CF6',
        secondary: '#6B7280',
        accent: '#F59E0B',
        background: '#FFFFFF',
        text: '#1F2937'
      }
    },
    {
      id: 'dark',
      name: 'Dark Theme',
      colors: {
        primary: '#3B82F6',
        secondary: '#9CA3AF',
        accent: '#10B981',
        background: '#1F2937',
        text: '#F9FAFB'
      }
    }
  ];

  // Load branding settings
  const loadBranding = async () => {
    console.log('🎨 BrandingCustomization: loadBranding called');
    console.log('🎨 isTenantAdmin:', isTenantAdmin);
    
    if (!isTenantAdmin) {
      console.log('❌ BrandingCustomization: Not tenant admin, returning early');
      setError('Not authorized - not a tenant admin');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      console.log('🎨 BrandingCustomization: Making API call to /tenant/branding');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('API call timeout after 10 seconds')), 10000);
      });
      
      const apiCallPromise = tenantApiService.get('/tenant/branding');
      const response = await Promise.race([apiCallPromise, timeoutPromise]) as any;
      
      console.log('🎨 BrandingCustomization: API response:', response);
      
      if (response && response.success) {
        setBranding({ ...branding, ...response.data });
        console.log('✅ BrandingCustomization: Branding loaded successfully');
      } else {
        setError('Failed to load branding settings');
        console.log('❌ BrandingCustomization: API returned success: false or no response');
      }
    } catch (err: any) {
      console.log('❌ BrandingCustomization: API call failed:', err);
      console.log('❌ BrandingCustomization: Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      log.error('Failed to load branding settings', { error: err.message });
      setError('Failed to load branding settings: ' + err.message);
    } finally {
      setIsLoading(false);
      console.log('🎨 BrandingCustomization: Loading completed');
    }
  };

  // Save branding settings
  const saveBranding = async () => {
    if (!isTenantAdmin) return;
    
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Create FormData for file uploads
      const formData = new FormData();
      
      // Add logo file if exists
      if (branding.logo.file) {
        formData.append('logo', branding.logo.file);
      }
      
      // Add favicon file if exists
      if (branding.favicon.file) {
        formData.append('favicon', branding.favicon.file);
      }
      
      // Add other settings as JSON
      const settingsData = {
        logo: {
          width: branding.logo.width,
          height: branding.logo.height,
          alt: branding.logo.alt
        },
        colors: branding.colors,
        typography: branding.typography,
        layout: branding.layout,
        customCSS: branding.customCSS,
        meta: branding.meta
      };
      
      formData.append('settings', JSON.stringify(settingsData));

      const response = await tenantApiService.post('/tenant/branding', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.success) {
        setSuccess('Branding settings saved successfully');
        setBranding({ ...branding, logo: { ...branding.logo, file: undefined }, favicon: { ...branding.favicon, file: undefined } });
      } else {
        setError(response.message || 'Failed to save branding settings');
      }
    } catch (err: any) {
      log.error('Failed to save branding settings', { error: err.message });
      setError('Failed to save branding settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle logo upload
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBranding(prev => ({
        ...prev,
        logo: {
          ...prev.logo,
          file: file
        }
      }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle favicon upload
  const handleFaviconUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBranding(prev => ({
        ...prev,
        favicon: {
          ...prev.favicon,
          file: file
        }
      }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setFaviconPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Apply color preset
  const applyColorPreset = (preset: ColorPreset) => {
    setBranding(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        ...preset.colors
      }
    }));
  };

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setBranding(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as any),
          [child]: value
        }
      }));
    } else {
      setBranding(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Load branding on component mount
  useEffect(() => {
    loadBranding();
  }, [isTenantAdmin]);

  // Tabs configuration
  const tabs = [
    { id: 'colors', name: 'Colors', icon: PaintBrushIcon },
    { id: 'logo', name: 'Logo', icon: PhotoIcon },
    { id: 'typography', name: 'Typography', icon: PaintBrushIcon },
    { id: 'layout', name: 'Layout', icon: PaintBrushIcon },
    { id: 'css', name: 'Custom CSS', icon: CodeBracketIcon },
    { id: 'meta', name: 'Meta Tags', icon: PaintBrushIcon }
  ];

  if (!isTenantAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
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
          <p className="mt-4 text-gray-600">Loading branding settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Dashboard Header */}
      <DashboardHeader
        title="Branding Customization"
        subtitle={`Customize the appearance of ${tenant?.name || 'your organization'}`}
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
                  onClick={saveBranding}
                  disabled={isSaving}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
                >
                  {isSaving ? (
                    <>
                      <ArrowPathIcon className="w-3 h-3 mr-1.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-3 h-3 mr-1.5" />
                      Save Branding
                    </>
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setShowPreview(!showPreview)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-200 shadow-sm"
                >
                  <EyeIcon className="w-3 h-3 mr-1.5" />
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  onClick={() => window.location.href = '/tenant/settings'}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors duration-200 shadow-sm"
                >
                  <CogIcon className="w-3 h-3 mr-1.5" />
                  Settings
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
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
                {activeTab === 'colors' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Color Presets</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {colorPresets.map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => applyColorPreset(preset)}
                            className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <div className="flex space-x-1 mb-2">
                              <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: preset.colors.primary }}
                              ></div>
                              <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: preset.colors.secondary }}
                              ></div>
                              <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: preset.colors.accent }}
                              ></div>
                            </div>
                            <div className="text-sm font-medium text-gray-900">{preset.name}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Colors</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(branding.colors).map(([key, value]) => (
                          <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="color"
                                value={value}
                                onChange={(e) => handleInputChange(`colors.${key}`, e.target.value)}
                                className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                              />
                              <input
                                type="text"
                                value={value}
                                onChange={(e) => handleInputChange(`colors.${key}`, e.target.value)}
                                className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="#000000"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'logo' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Logo Upload</h3>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                        <div className="text-center">
                          <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="mt-4">
                            <label className="cursor-pointer">
                              <span className="mt-2 block text-sm font-medium text-gray-900">
                                Upload logo file
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="sr-only"
                              />
                              <span className="mt-1 block text-sm text-gray-500">
                                PNG, JPG, SVG up to 2MB
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                      
                      {(logoPreview || branding.logo.url) && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Logo Preview</h4>
                          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <img
                              src={logoPreview || branding.logo.url}
                              alt="Logo preview"
                              className="max-h-20 object-contain"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Logo Settings</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Width (px)
                          </label>
                          <input
                            type="number"
                            value={branding.logo.width}
                            onChange={(e) => handleInputChange('logo.width', parseInt(e.target.value))}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Height (px)
                          </label>
                          <input
                            type="number"
                            value={branding.logo.height}
                            onChange={(e) => handleInputChange('logo.height', parseInt(e.target.value))}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Alt Text
                          </label>
                          <input
                            type="text"
                            value={branding.logo.alt}
                            onChange={(e) => handleInputChange('logo.alt', e.target.value)}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Favicon</h3>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                        <div className="text-center">
                          <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="mt-4">
                            <label className="cursor-pointer">
                              <span className="mt-2 block text-sm font-medium text-gray-900">
                                Upload favicon
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFaviconUpload}
                                className="sr-only"
                              />
                              <span className="mt-1 block text-sm text-gray-500">
                                ICO, PNG up to 32x32px
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                      
                      {faviconPreview && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Favicon Preview</h4>
                          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <img
                              src={faviconPreview}
                              alt="Favicon preview"
                              className="w-8 h-8 object-contain"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'typography' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Font Settings</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Font Family
                          </label>
                          <select
                            value={branding.typography.fontFamily}
                            onChange={(e) => handleInputChange('typography.fontFamily', e.target.value)}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="Inter">Inter</option>
                            <option value="Roboto">Roboto</option>
                            <option value="Open Sans">Open Sans</option>
                            <option value="Lato">Lato</option>
                            <option value="Montserrat">Montserrat</option>
                            <option value="Poppins">Poppins</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Heading Font
                          </label>
                          <select
                            value={branding.typography.headingFont}
                            onChange={(e) => handleInputChange('typography.headingFont', e.target.value)}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="Inter">Inter</option>
                            <option value="Roboto">Roboto</option>
                            <option value="Open Sans">Open Sans</option>
                            <option value="Lato">Lato</option>
                            <option value="Montserrat">Montserrat</option>
                            <option value="Poppins">Poppins</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Font Sizes</h3>
                      <div className="space-y-4">
                        {Object.entries(branding.typography.fontSize).map(([size, value]) => (
                          <div key={size}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {size.toUpperCase()} ({value})
                            </label>
                            <input
                              type="range"
                              min="0.5"
                              max="3"
                              step="0.125"
                              value={parseFloat(value)}
                              onChange={(e) => handleInputChange(`typography.fontSize.${size}`, `${e.target.value}rem`)}
                              className="block w-full"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'layout' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Layout Settings</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Header Height (px)
                          </label>
                          <input
                            type="number"
                            value={branding.layout.headerHeight}
                            onChange={(e) => handleInputChange('layout.headerHeight', parseInt(e.target.value))}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sidebar Width (px)
                          </label>
                          <input
                            type="number"
                            value={branding.layout.sidebarWidth}
                            onChange={(e) => handleInputChange('layout.sidebarWidth', parseInt(e.target.value))}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Border Radius (px)
                          </label>
                          <input
                            type="number"
                            value={branding.layout.borderRadius}
                            onChange={(e) => handleInputChange('layout.borderRadius', parseInt(e.target.value))}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Shadow
                          </label>
                          <select
                            value={branding.layout.shadow}
                            onChange={(e) => handleInputChange('layout.shadow', e.target.value)}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="none">None</option>
                            <option value="0 1px 3px 0 rgba(0, 0, 0, 0.1)">Small</option>
                            <option value="0 4px 6px -1px rgba(0, 0, 0, 0.1)">Medium</option>
                            <option value="0 10px 15px -3px rgba(0, 0, 0, 0.1)">Large</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'css' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Custom CSS</h3>
                      <textarea
                        value={branding.customCSS}
                        onChange={(e) => handleInputChange('customCSS', e.target.value)}
                        rows={20}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
                        placeholder="/* Enter your custom CSS here */"
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'meta' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Meta Tags</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Page Title
                          </label>
                          <input
                            type="text"
                            value={branding.meta.title}
                            onChange={(e) => handleInputChange('meta.title', e.target.value)}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Your page title"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Meta Description
                          </label>
                          <textarea
                            value={branding.meta.description}
                            onChange={(e) => handleInputChange('meta.description', e.target.value)}
                            rows={3}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Description for search engines"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Keywords
                          </label>
                          <input
                            type="text"
                            value={branding.meta.keywords}
                            onChange={(e) => handleInputChange('meta.keywords', e.target.value)}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="keyword1, keyword2, keyword3"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="lg:col-span-1">
              <div className="bg-white shadow rounded-lg sticky top-6">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Live Preview</h3>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div 
                      className="bg-white rounded-lg shadow-sm p-4"
                      style={{
                        backgroundColor: branding.colors.background,
                        color: branding.colors.text,
                        fontFamily: branding.typography.fontFamily,
                        borderRadius: `${branding.layout.borderRadius}px`,
                        boxShadow: branding.layout.shadow
                      }}
                    >
                      <div 
                        className="flex items-center mb-4"
                        style={{ height: `${branding.layout.headerHeight}px` }}
                      >
                        {(logoPreview || branding.logo.url) && (
                          <img
                            src={logoPreview || branding.logo.url}
                            alt={branding.logo.alt}
                            style={{
                              width: `${branding.logo.width}px`,
                              height: `${branding.logo.height}px`
                            }}
                            className="object-contain"
                          />
                        )}
                      </div>
                      
                      <h1 
                        className="text-2xl font-bold mb-2"
                        style={{
                          color: branding.colors.primary,
                          fontFamily: branding.typography.headingFont
                        }}
                      >
                        Sample Heading
                      </h1>
                      
                      <p className="mb-4" style={{ fontSize: branding.typography.fontSize.base }}>
                        This is a sample paragraph to show how your text will look with the selected typography settings.
                      </p>
                      
                      <button 
                        className="px-4 py-2 rounded-md text-white font-medium"
                        style={{
                          backgroundColor: branding.colors.primary,
                          borderRadius: `${branding.layout.borderRadius}px`
                        }}
                      >
                        Sample Button
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BrandingCustomization;
