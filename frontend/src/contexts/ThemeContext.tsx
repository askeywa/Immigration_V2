// frontend/src/contexts/ThemeContext.tsx

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { TenantTheme, ThemeConfig, ThemeContextType } from '@/types/theme.types';
import { themeService } from '@/services/themeService';
import { useTenant } from './TenantContext';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
  tenantId?: string;
  fallbackTheme?: Partial<TenantTheme>;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  tenantId,
  fallbackTheme 
}) => {
  const [theme, setTheme] = useState<TenantTheme>(themeService.getCurrentTheme());
  const [config, setConfig] = useState<ThemeConfig>(themeService.getThemeConfig());
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const { tenant } = useTenant();

  // Load theme from tenant data instead of making API calls
  useEffect(() => {
    const loadTheme = () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Use tenant's branding data to generate theme instead of making API calls
        let currentTheme;
        if (tenant?.settings?.branding) {
          // Generate theme from tenant's branding colors
          currentTheme = themeService.generateThemeFromColors(
            tenant.settings?.branding?.primaryColor || '#3B82F6',
            tenant.settings?.branding?.secondaryColor || '#6B7280',
            '#F59E0B' // Default accent color
          );
        } else {
          currentTheme = themeService.getCurrentTheme();
        }
        
        const currentConfig = themeService.getThemeConfig();
        
        setTheme(currentTheme);
        setConfig(currentConfig);
        setIsDarkMode(currentConfig.isDarkMode);
      } catch (err) {
        console.error('Failed to load theme:', err);
        setError('Failed to load theme');
        
        // Use fallback theme if available
        if (fallbackTheme) {
          const fallbackThemeMerged = themeService.generateThemeFromColors(
            fallbackTheme.primary?.main || '#3B82F6',
            fallbackTheme.secondary?.main || '#6B7280',
            fallbackTheme.accent?.main || '#F59E0B'
          );
          setTheme(fallbackThemeMerged);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, [tenant?.settings?.branding, fallbackTheme]);

  // Set theme
  const handleSetTheme = useCallback(async (newTheme: Partial<TenantTheme>) => {
    try {
      setError(null);
      await themeService.saveTheme(newTheme, tenant?._id || tenantId);
      
      const updatedTheme = themeService.getCurrentTheme();
      const updatedConfig = themeService.getThemeConfig();
      
      setTheme(updatedTheme);
      setConfig(updatedConfig);
    } catch (err) {
      console.error('Failed to set theme:', err);
      setError('Failed to update theme');
      throw err;
    }
  }, [tenant?._id, tenantId]);

  // Toggle dark mode
  const handleToggleDarkMode = useCallback(async () => {
    try {
      setError(null);
      await themeService.toggleDarkMode();
      
      const updatedConfig = themeService.getThemeConfig();
      setConfig(updatedConfig);
      setIsDarkMode(updatedConfig.isDarkMode);
    } catch (err) {
      console.error('Failed to toggle dark mode:', err);
      setError('Failed to toggle dark mode');
      throw err;
    }
  }, []);

  // Reset to default
  const handleResetToDefault = useCallback(async () => {
    try {
      setError(null);
      await themeService.resetToDefault();
      
      const updatedTheme = themeService.getCurrentTheme();
      const updatedConfig = themeService.getThemeConfig();
      
      setTheme(updatedTheme);
      setConfig(updatedConfig);
      setIsDarkMode(updatedConfig.isDarkMode);
    } catch (err) {
      console.error('Failed to reset theme:', err);
      setError('Failed to reset theme');
      throw err;
    }
  }, []);

  // Save custom theme
  const handleSaveCustomTheme = useCallback(async (customTheme: TenantTheme, name: string) => {
    try {
      setError(null);
      await themeService.saveCustomTheme(customTheme, name);
      
      const updatedConfig = themeService.getThemeConfig();
      setConfig(updatedConfig);
    } catch (err) {
      console.error('Failed to save custom theme:', err);
      setError('Failed to save custom theme');
      throw err;
    }
  }, []);

  // Delete custom theme
  const handleDeleteCustomTheme = useCallback(async (themeId: string) => {
    try {
      setError(null);
      await themeService.deleteCustomTheme(themeId);
      
      const updatedConfig = themeService.getThemeConfig();
      setConfig(updatedConfig);
    } catch (err) {
      console.error('Failed to delete custom theme:', err);
      setError('Failed to delete custom theme');
      throw err;
    }
  }, []);

  // Apply preset
  const handleApplyPreset = useCallback(async (presetId: string) => {
    try {
      setError(null);
      await themeService.applyPreset(presetId);
      
      const updatedTheme = themeService.getCurrentTheme();
      const updatedConfig = themeService.getThemeConfig();
      
      setTheme(updatedTheme);
      setConfig(updatedConfig);
    } catch (err) {
      console.error('Failed to apply preset:', err);
      setError('Failed to apply preset');
      throw err;
    }
  }, []);

  // Update branding
  const handleUpdateBranding = useCallback(async (branding: Partial<TenantTheme['branding']>) => {
    try {
      setError(null);
      await themeService.updateBranding(branding);
      
      const updatedTheme = themeService.getCurrentTheme();
      setTheme(updatedTheme);
    } catch (err) {
      console.error('Failed to update branding:', err);
      setError('Failed to update branding');
      throw err;
    }
  }, []);

  // Update custom CSS
  const handleUpdateCustomCSS = useCallback(async (css: string) => {
    try {
      setError(null);
      await themeService.updateCustomCSS(css);
      
      const updatedTheme = themeService.getCurrentTheme();
      setTheme(updatedTheme);
    } catch (err) {
      console.error('Failed to update custom CSS:', err);
      setError('Failed to update custom CSS');
      throw err;
    }
  }, []);

  // Generate theme from colors
  const handleGenerateThemeFromColors = useCallback((primary: string, secondary: string, accent: string) => {
    return themeService.generateThemeFromColors(primary, secondary, accent);
  }, []);

  // Export theme
  const handleExportTheme = useCallback(() => {
    return themeService.exportTheme();
  }, []);

  // Import theme
  const handleImportTheme = useCallback(async (themeData: string) => {
    try {
      setError(null);
      await themeService.importTheme(themeData);
      
      const updatedTheme = themeService.getCurrentTheme();
      const updatedConfig = themeService.getThemeConfig();
      
      setTheme(updatedTheme);
      setConfig(updatedConfig);
    } catch (err) {
      console.error('Failed to import theme:', err);
      setError('Failed to import theme');
      throw err;
    }
  }, []);

  // Validate theme
  const handleValidateTheme = useCallback((themeToValidate: Partial<TenantTheme>) => {
    return themeService.validateTheme(themeToValidate);
  }, []);

  const contextValue: ThemeContextType = {
    theme,
    config,
    isDarkMode,
    isLoading,
    error,
    setTheme: handleSetTheme,
    toggleDarkMode: handleToggleDarkMode,
    resetToDefault: handleResetToDefault,
    saveCustomTheme: handleSaveCustomTheme,
    deleteCustomTheme: handleDeleteCustomTheme,
    applyPreset: handleApplyPreset,
    updateBranding: handleUpdateBranding,
    updateCustomCSS: handleUpdateCustomCSS,
    generateThemeFromColors: handleGenerateThemeFromColors,
    exportTheme: handleExportTheme,
    importTheme: handleImportTheme,
    validateTheme: handleValidateTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// HOC for components that need theme context
export const withTheme = <P extends object>(Component: React.ComponentType<P>) => {
  return React.forwardRef<any, P>((props, ref) => {
    const themeContext = useTheme();
    
    return (
      <Component
        {...(props as any)}
        {...props}
        ref={ref}
        theme={themeContext.theme}
        themeConfig={themeContext.config}
        isDarkMode={themeContext.isDarkMode}
        setTheme={themeContext.setTheme}
        toggleDarkMode={themeContext.toggleDarkMode}
        resetToDefault={themeContext.resetToDefault}
        saveCustomTheme={themeContext.saveCustomTheme}
        deleteCustomTheme={themeContext.deleteCustomTheme}
        applyPreset={themeContext.applyPreset}
        updateBranding={themeContext.updateBranding}
        updateCustomCSS={themeContext.updateCustomCSS}
        generateThemeFromColors={themeContext.generateThemeFromColors}
        exportTheme={themeContext.exportTheme}
        importTheme={themeContext.importTheme}
        validateTheme={themeContext.validateTheme}
      />
    );
  });
};

// Hook for theme utilities
export const useThemeUtils = () => {
  const { theme, isDarkMode } = useTheme();

  const getColor = useCallback((path: string) => {
    const keys = path.split('.');
    let value: any = theme;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return typeof value === 'string' ? value : undefined;
  }, [theme]);

  const getSpacing = useCallback((size: keyof TenantTheme['spacing']) => {
    return theme.spacing[size];
  }, [theme]);

  const getFontSize = useCallback((size: keyof TenantTheme['typography']['fontSize']) => {
    return theme.typography.fontSize[size];
  }, [theme]);

  const getFontWeight = useCallback((weight: keyof TenantTheme['typography']['fontWeight']) => {
    return theme.typography.fontWeight[weight];
  }, [theme]);

  const getBorderRadius = useCallback((radius: keyof TenantTheme['borderRadius']) => {
    return theme.borderRadius[radius];
  }, [theme]);

  const getAnimationDuration = useCallback((duration: keyof TenantTheme['animation']['duration']) => {
    return theme.animation.duration[duration];
  }, [theme]);

  const getAnimationEasing = useCallback((easing: keyof TenantTheme['animation']['easing']) => {
    return theme.animation.easing[easing];
  }, [theme]);

  return {
    getColor,
    getSpacing,
    getFontSize,
    getFontWeight,
    getBorderRadius,
    getAnimationDuration,
    getAnimationEasing,
    isDarkMode,
  };
};

export default ThemeProvider;
