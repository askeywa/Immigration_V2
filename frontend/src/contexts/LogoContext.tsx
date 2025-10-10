// frontend/src/contexts/LogoContext.tsx

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { 
  LogoFile, 
  LogoContextType, 
  LogoUploadConfig, 
  LogoServiceConfig, 
  LogoUploadResult,
  LogoUploadProgress,
  LogoValidationResult,
  ThumbnailSize,
  WatermarkConfig,
  UploadOptions,
  OptimizationOptions,
  LogoUsageContext,
  DEFAULT_LOGO_CONFIG,
  DEFAULT_SERVICE_CONFIG
} from '@/types/logo.types';
import { logoService } from '@/services/logoService';
import { useTenant } from './TenantContext';

const LogoContext = createContext<LogoContextType | undefined>(undefined);

export const useLogo = (): LogoContextType => {
  const context = useContext(LogoContext);
  if (!context) {
    throw new Error('useLogo must be used within a LogoProvider');
  }
  return context;
};

interface LogoProviderProps {
  children: React.ReactNode;
  tenantId?: string;
  config?: Partial<LogoUploadConfig>;
  serviceConfig?: Partial<LogoServiceConfig>;
}

export const LogoProvider: React.FC<LogoProviderProps> = ({ 
  children, 
  tenantId,
  config,
  serviceConfig
}) => {
  const [currentLogo, setCurrentLogo] = useState<LogoFile | null>(null);
  const [availableLogos, setAvailableLogos] = useState<LogoFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<LogoUploadProgress[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [logoConfig, setLogoConfig] = useState<LogoUploadConfig>({
    ...DEFAULT_LOGO_CONFIG,
    ...config,
  });
  
  const [logoServiceConfig, setLogoServiceConfig] = useState<LogoServiceConfig>({
    ...DEFAULT_SERVICE_CONFIG,
    ...serviceConfig,
  });

  const { tenant } = useTenant();
  const { isAuthenticated, token } = useAuthStore();
  const currentTenantId = tenant?._id || tenantId;

  // Load logos on mount and when tenant changes
  // CRITICAL: Only load if authenticated and token is available
  useEffect(() => {
    if (currentTenantId && isAuthenticated && token) {
      loadLogos();
    }
  }, [currentTenantId, isAuthenticated, token]);

  // Update logo service configuration
  useEffect(() => {
    logoService.updateConfig(logoConfig);
    logoService.updateServiceConfig(logoServiceConfig);
  }, [logoConfig, logoServiceConfig]);

  // Load logos
  const loadLogos = async () => {
    if (!currentTenantId) return;

    try {
      setIsLoading(true);
      setError(null);

      const [currentLogoData, availableLogosData] = await Promise.all([
        logoService.getCurrentLogo(currentTenantId),
        logoService.getTenantLogos(currentTenantId),
      ]);

      setCurrentLogo(currentLogoData);
      setAvailableLogos(availableLogosData);
    } catch (err) {
      console.error('Failed to load logos:', err);
      setError('Failed to load logos');
    } finally {
      setIsLoading(false);
    }
  };

  // Upload logo
  const handleUploadLogo = useCallback(async (
    file: File, 
    options: UploadOptions = {}
  ): Promise<LogoUploadResult> => {
    if (!currentTenantId) {
      throw new Error('No tenant ID available');
    }

    try {
      setError(null);
      setIsLoading(true);

      const result = await logoService.uploadLogo(file, currentTenantId, {
        ...options,
        onProgress: (progress) => {
          setUploadProgress(prev => {
            const existing = prev.find(p => p.id === progress.id);
            if (existing) {
              return prev.map(p => p.id === progress.id ? progress : p);
            }
            return [...prev, progress];
          });
        },
      });

      if (result.success && result.logo) {
        setCurrentLogo(result.logo);
        setAvailableLogos(prev => {
          const existing = prev.find(logo => logo.id === result.logo!.id);
          if (existing) {
            return prev.map(logo => logo.id === result.logo!.id ? result.logo! : logo);
          }
          return [...prev, result.logo!];
        });
      }

      // Clean up progress after completion
      setTimeout(() => {
        setUploadProgress(prev => prev.filter(p => p.id !== result.uploadId));
      }, 5000);

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentTenantId]);

  // Delete logo
  const handleDeleteLogo = useCallback(async (logoId: string) => {
    if (!currentTenantId) {
      throw new Error('No tenant ID available');
    }

    try {
      setError(null);
      await logoService.deleteLogo(logoId, currentTenantId);

      setAvailableLogos(prev => prev.filter(logo => logo.id !== logoId));
      
      if (currentLogo?.id === logoId) {
        setCurrentLogo(null);
      }
    } catch (err) {
      console.error('Failed to delete logo:', err);
      setError('Failed to delete logo');
      throw err;
    }
  }, [currentTenantId, currentLogo]);

  // Set active logo
  const handleSetActiveLogo = useCallback(async (logoId: string) => {
    if (!currentTenantId) {
      throw new Error('No tenant ID available');
    }

    try {
      setError(null);
      await logoService.setActiveLogo(logoId, currentTenantId);

      const selectedLogo = availableLogos.find(logo => logo.id === logoId);
      if (selectedLogo) {
        setCurrentLogo(selectedLogo);
      }
    } catch (err) {
      console.error('Failed to set active logo:', err);
      setError('Failed to set active logo');
      throw err;
    }
  }, [currentTenantId, availableLogos]);

  // Update logo metadata
  const handleUpdateLogoMetadata = useCallback(async (
    logoId: string, 
    metadata: Partial<LogoFile['metadata']>
  ) => {
    if (!currentTenantId) {
      throw new Error('No tenant ID available');
    }

    try {
      setError(null);
      // This would typically call an API endpoint to update metadata
      // For now, we'll update the local state
      setAvailableLogos(prev => prev.map(logo => 
        logo.id === logoId 
          ? { ...logo, metadata: { ...logo.metadata, ...metadata } }
          : logo
      ));

      if (currentLogo?.id === logoId) {
        setCurrentLogo(prev => prev ? {
          ...prev,
          metadata: { ...prev.metadata, ...metadata }
        } : null);
      }
    } catch (err) {
      console.error('Failed to update logo metadata:', err);
      setError('Failed to update logo metadata');
      throw err;
    }
  }, [currentTenantId, currentLogo]);

  // Generate thumbnails
  const handleGenerateThumbnails = useCallback(async (
    logoId: string, 
    sizes?: ThumbnailSize[]
  ) => {
    if (!currentTenantId) {
      throw new Error('No tenant ID available');
    }

    try {
      setError(null);
      await logoService.generateThumbnails(logoId, currentTenantId, sizes);
      await loadLogos(); // Reload to get updated thumbnails
    } catch (err) {
      console.error('Failed to generate thumbnails:', err);
      setError('Failed to generate thumbnails');
      throw err;
    }
  }, [currentTenantId]);

  // Optimize logo
  const handleOptimizeLogo = useCallback(async (
    logoId: string, 
    options?: OptimizationOptions
  ) => {
    if (!currentTenantId) {
      throw new Error('No tenant ID available');
    }

    try {
      setError(null);
      await logoService.optimizeLogo(logoId, currentTenantId, options);
      await loadLogos(); // Reload to get optimized version
    } catch (err) {
      console.error('Failed to optimize logo:', err);
      setError('Failed to optimize logo');
      throw err;
    }
  }, [currentTenantId]);

  // Download logo
  const handleDownloadLogo = useCallback(async (
    logoId: string, 
    size?: string
  ) => {
    if (!currentTenantId) {
      throw new Error('No tenant ID available');
    }

    try {
      setError(null);
      return await logoService.downloadLogo(logoId, size, currentTenantId);
    } catch (err) {
      console.error('Failed to download logo:', err);
      setError('Failed to download logo');
      throw err;
    }
  }, [currentTenantId]);

  // Get logo URL
  const handleGetLogoUrl = useCallback((logoId: string, size?: string) => {
    return logoService.getLogoUrl(logoId, size, currentTenantId);
  }, [currentTenantId]);

  // Validate logo
  const handleValidateLogo = useCallback(async (file: File): Promise<LogoValidationResult> => {
    try {
      setError(null);
      return await logoService.validateLogo(file);
    } catch (err) {
      console.error('Failed to validate logo:', err);
      setError('Failed to validate logo');
      throw err;
    }
  }, []);

  // Get usage contexts
  const handleGetUsageContexts = useCallback(async (logoId: string): Promise<LogoUsageContext> => {
    if (!currentTenantId) {
      throw new Error('No tenant ID available');
    }

    try {
      setError(null);
      // This would typically call an API endpoint to get usage contexts
      // For now, return a default response
      return {
        header: true,
        footer: true,
        favicon: true,
        email: true,
        documents: true,
        social: true,
        print: true,
      };
    } catch (err) {
      console.error('Failed to get usage contexts:', err);
      setError('Failed to get usage contexts');
      throw err;
    }
  }, [currentTenantId]);

  // Get logo dimensions
  const handleGetLogoDimensions = useCallback(async (file: File) => {
    try {
      setError(null);
      return await logoService.getImageDimensions(file);
    } catch (err) {
      console.error('Failed to get logo dimensions:', err);
      setError('Failed to get logo dimensions');
      throw err;
    }
  }, []);

  // Convert format
  const handleConvertFormat = useCallback(async (file: File, targetFormat: string) => {
    try {
      setError(null);
      return await logoService.convertImageFormat(file, targetFormat);
    } catch (err) {
      console.error('Failed to convert format:', err);
      setError('Failed to convert format');
      throw err;
    }
  }, []);

  // Resize logo
  const handleResizeLogo = useCallback(async (file: File, width: number, height: number) => {
    try {
      setError(null);
      return await logoService.resizeImage(file, width, height);
    } catch (err) {
      console.error('Failed to resize logo:', err);
      setError('Failed to resize logo');
      throw err;
    }
  }, []);

  // Compress logo
  const handleCompressLogo = useCallback(async (file: File, quality: number) => {
    try {
      setError(null);
      return await logoService.compressImage(file, quality);
    } catch (err) {
      console.error('Failed to compress logo:', err);
      setError('Failed to compress logo');
      throw err;
    }
  }, []);

  const contextValue: LogoContextType = {
    // Current logo state
    currentLogo,
    availableLogos,
    uploadProgress,
    isLoading,
    error,
    
    // Configuration
    config: logoConfig,
    serviceConfig: logoServiceConfig,
    
    // Actions
    uploadLogo: handleUploadLogo,
    deleteLogo: handleDeleteLogo,
    setActiveLogo: handleSetActiveLogo,
    updateLogoMetadata: handleUpdateLogoMetadata,
    generateThumbnails: handleGenerateThumbnails,
    optimizeLogo: handleOptimizeLogo,
    downloadLogo: handleDownloadLogo,
    getLogoUrl: handleGetLogoUrl,
    validateLogo: handleValidateLogo,
    getUsageContexts: handleGetUsageContexts,
    
    // Utilities
    getLogoDimensions: handleGetLogoDimensions,
    convertFormat: handleConvertFormat,
    resizeLogo: handleResizeLogo,
    compressLogo: handleCompressLogo,
  };

  return (
    <LogoContext.Provider value={contextValue}>
      {children}
    </LogoContext.Provider>
  );
};

// HOC for components that need logo context
export const withLogo = <P extends object>(Component: React.ComponentType<P>) => {
  return React.forwardRef<any, P>((props, ref) => {
    const logoContext = useLogo();
    
    return (
      <Component
        {...(props as any)}
        {...props}
        ref={ref}
        currentLogo={logoContext.currentLogo}
        availableLogos={logoContext.availableLogos}
        uploadLogo={logoContext.uploadLogo}
        deleteLogo={logoContext.deleteLogo}
        setActiveLogo={logoContext.setActiveLogo}
        validateLogo={logoContext.validateLogo}
        getLogoUrl={logoContext.getLogoUrl}
        isLoading={logoContext.isLoading}
        error={logoContext.error}
      />
    );
  });
};

// Hook for logo utilities
export const useLogoUtils = () => {
  const { 
    currentLogo, 
    getLogoUrl, 
    getLogoDimensions,
    convertFormat,
    resizeLogo,
    compressLogo 
  } = useLogo();

  const getCurrentLogoUrl = useCallback((size?: string) => {
    if (!currentLogo) return null;
    return getLogoUrl(currentLogo.id, size);
  }, [currentLogo, getLogoUrl]);

  const getLogoSizePreset = useCallback((preset: keyof typeof import('@/types/logo.types').LOGO_SIZE_PRESETS) => {
    return logoService.getSizePreset(preset);
  }, []);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const getImageAspectRatio = useCallback((width: number, height: number): number => {
    return width / height;
  }, []);

  const isLandscape = useCallback((width: number, height: number): boolean => {
    return width > height;
  }, []);

  const isPortrait = useCallback((width: number, height: number): boolean => {
    return height > width;
  }, []);

  const isSquare = useCallback((width: number, height: number): boolean => {
    return Math.abs(width - height) < 10; // Allow small difference for rounding
  }, []);

  return {
    getCurrentLogoUrl,
    getLogoSizePreset,
    formatFileSize,
    getImageAspectRatio,
    isLandscape,
    isPortrait,
    isSquare,
    getLogoDimensions,
    convertFormat,
    resizeLogo,
    compressLogo,
  };
};

export default LogoProvider;
