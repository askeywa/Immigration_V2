// frontend/src/contexts/CSSInjectionContext.tsx

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  CSSInjection,
  CSSInjectionConfig,
  CSSInjectionResult,
  CSSValidation,
  CSSPerformance,
  CSSCompatibility,
  CSSSecurity,
  CustomCSSRule,
  CSSVariable,
  CSSMediaQuery,
  CSSInjectionOptions,
  CSSTemplate,
  CSSInjectionContextType,
  DEFAULT_CSS_CONFIG
} from '@/types/cssInjection.types';
import { cssInjectionService } from '@/services/cssInjectionService';
import { useTenant } from './TenantContext';

const CSSInjectionContext = createContext<CSSInjectionContextType | undefined>(undefined);

export const useCSSInjection = (): CSSInjectionContextType => {
  const context = useContext(CSSInjectionContext);
  if (!context) {
    throw new Error('useCSSInjection must be used within a CSSInjectionProvider');
  }
  return context;
};

interface CSSInjectionProviderProps {
  children: React.ReactNode;
  tenantId?: string;
  config?: Partial<CSSInjectionConfig>;
}

export const CSSInjectionProvider: React.FC<CSSInjectionProviderProps> = ({ 
  children, 
  tenantId,
  config
}) => {
  const [currentCSS, setCurrentCSS] = useState<CSSInjection | null>(null);
  const [availableCSS, setAvailableCSS] = useState<CSSInjection[]>([]);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [cssConfig, setCSSConfig] = useState<CSSInjectionConfig>({
    ...DEFAULT_CSS_CONFIG,
    ...config,
  });

  const { tenant } = useTenant();
  const currentTenantId = tenant?._id || tenantId;

  // Load CSS injections on mount and when tenant changes
  // Temporarily disabled until backend endpoint is implemented
  // useEffect(() => {
  //   if (currentTenantId) {
  //     loadCSSInjections();
  //   }
  // }, [currentTenantId]);

  // Update CSS injection service configuration
  useEffect(() => {
    cssInjectionService.updateConfig(cssConfig);
  }, [cssConfig]);

  // Load CSS injections
  const loadCSSInjections = async () => {
    if (!currentTenantId) return;

    try {
      setIsLoading(true);
      setError(null);

      const cssInjections = await cssInjectionService.getCurrentCSS(currentTenantId);
      setAvailableCSS(cssInjections);
      
      // Set the first active CSS as current
      const activeCSS = cssInjections.find(css => css.isActive);
      if (activeCSS) {
        setCurrentCSS(activeCSS);
        setIsActive(true);
      }
    } catch (err) {
      console.error('Failed to load CSS injections:', err);
      setError('Failed to load CSS injections');
    } finally {
      setIsLoading(false);
    }
  };

  // Inject CSS
  const handleInjectCSS = useCallback(async (
    css: string,
    options: CSSInjectionOptions = {}
  ): Promise<CSSInjectionResult> => {
    if (!currentTenantId) {
      throw new Error('No tenant ID available');
    }

    try {
      setError(null);
      setIsLoading(true);

      const result = await cssInjectionService.injectCSS(css, currentTenantId, {
        ...options,
        onProgress: (progress) => {
          // Handle progress updates if needed
        },
      });

      if (result.success && result.css) {
        setCurrentCSS(result.css);
        setAvailableCSS(prev => {
          const existing = prev.find(css => css.id === result.css!.id);
          if (existing) {
            return prev.map(css => css.id === result.css!.id ? result.css! : css);
          }
          return [...prev, result.css!];
        });
        setIsActive(true);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'CSS injection failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentTenantId]);

  // Update CSS
  const handleUpdateCSS = useCallback(async (
    id: string,
    css: string,
    options: CSSInjectionOptions = {}
  ): Promise<CSSInjectionResult> => {
    if (!currentTenantId) {
      throw new Error('No tenant ID available');
    }

    try {
      setError(null);
      setIsLoading(true);

      const result = await cssInjectionService.updateCSS(id, css, currentTenantId, options);

      if (result.success && result.css) {
        setAvailableCSS(prev => prev.map(css => css.id === id ? result.css! : css));
        
        if (currentCSS?.id === id) {
          setCurrentCSS(result.css);
        }
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'CSS update failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentTenantId, currentCSS]);

  // Delete CSS
  const handleDeleteCSS = useCallback(async (id: string) => {
    if (!currentTenantId) {
      throw new Error('No tenant ID available');
    }

    try {
      setError(null);
      await cssInjectionService.deleteCSS(id, currentTenantId);

      setAvailableCSS(prev => prev.filter(css => css.id !== id));
      
      if (currentCSS?.id === id) {
        setCurrentCSS(null);
        setIsActive(false);
      }
    } catch (err) {
      console.error('Failed to delete CSS:', err);
      setError('Failed to delete CSS');
      throw err;
    }
  }, [currentTenantId, currentCSS]);

  // Toggle CSS
  const handleToggleCSS = useCallback(async (id: string) => {
    if (!currentTenantId) {
      throw new Error('No tenant ID available');
    }

    try {
      setError(null);
      await cssInjectionService.toggleCSS(id, currentTenantId);

      setAvailableCSS(prev => prev.map(css => 
        css.id === id ? { ...css, isActive: !css.isActive } : css
      ));

      if (currentCSS?.id === id) {
        setCurrentCSS(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
        setIsActive(prev => !prev);
      }
    } catch (err) {
      console.error('Failed to toggle CSS:', err);
      setError('Failed to toggle CSS');
      throw err;
    }
  }, [currentTenantId, currentCSS]);

  // Validate CSS
  const handleValidateCSS = useCallback(async (css: string): Promise<CSSValidation> => {
    try {
      setError(null);
      return await cssInjectionService.validateCSS(css);
    } catch (err) {
      console.error('Failed to validate CSS:', err);
      setError('Failed to validate CSS');
      throw err;
    }
  }, []);

  // Minify CSS
  const handleMinifyCSS = useCallback(async (css: string): Promise<string> => {
    try {
      setError(null);
      return await cssInjectionService.minifyCSS(css);
    } catch (err) {
      console.error('Failed to minify CSS:', err);
      setError('Failed to minify CSS');
      throw err;
    }
  }, []);

  // Prettify CSS
  const handlePrettifyCSS = useCallback(async (css: string): Promise<string> => {
    try {
      setError(null);
      return await cssInjectionService.prettifyCSS(css);
    } catch (err) {
      console.error('Failed to prettify CSS:', err);
      setError('Failed to prettify CSS');
      throw err;
    }
  }, []);

  // Parse CSS
  const handleParseCSS = useCallback(async (css: string): Promise<CustomCSSRule[]> => {
    try {
      setError(null);
      return await cssInjectionService.parseCSS(css);
    } catch (err) {
      console.error('Failed to parse CSS:', err);
      setError('Failed to parse CSS');
      throw err;
    }
  }, []);

  // Extract variables
  const handleExtractVariables = useCallback(async (css: string): Promise<CSSVariable[]> => {
    try {
      setError(null);
      return await cssInjectionService.extractVariables(css);
    } catch (err) {
      console.error('Failed to extract variables:', err);
      setError('Failed to extract variables');
      throw err;
    }
  }, []);

  // Extract media queries
  const handleExtractMediaQueries = useCallback(async (css: string): Promise<CSSMediaQuery[]> => {
    try {
      setError(null);
      return await cssInjectionService.extractMediaQueries(css);
    } catch (err) {
      console.error('Failed to extract media queries:', err);
      setError('Failed to extract media queries');
      throw err;
    }
  }, []);

  // Analyze performance
  const handleAnalyzePerformance = useCallback(async (css: string): Promise<CSSPerformance> => {
    try {
      setError(null);
      return await cssInjectionService.analyzePerformance(css);
    } catch (err) {
      console.error('Failed to analyze performance:', err);
      setError('Failed to analyze performance');
      throw err;
    }
  }, []);

  // Analyze compatibility
  const handleAnalyzeCompatibility = useCallback(async (css: string): Promise<CSSCompatibility> => {
    try {
      setError(null);
      return await cssInjectionService.analyzeCompatibility(css);
    } catch (err) {
      console.error('Failed to analyze compatibility:', err);
      setError('Failed to analyze compatibility');
      throw err;
    }
  }, []);

  // Analyze security
  const handleAnalyzeSecurity = useCallback(async (css: string): Promise<CSSSecurity> => {
    try {
      setError(null);
      return await cssInjectionService.analyzeSecurity(css);
    } catch (err) {
      console.error('Failed to analyze security:', err);
      setError('Failed to analyze security');
      throw err;
    }
  }, []);

  // Preview CSS
  const handlePreviewCSS = useCallback((css: string) => {
    // Create a temporary style element for preview
    const previewId = 'css-preview-temp';
    let previewElement = document.getElementById(previewId) as HTMLStyleElement;
    
    if (!previewElement) {
      previewElement = document.createElement('style');
      previewElement.id = previewId;
      previewElement.setAttribute('data-preview', 'true');
      document.head.appendChild(previewElement);
    }
    
    previewElement.textContent = css;
  }, []);

  // Clear preview
  const handleClearPreview = useCallback(() => {
    const previewElement = document.getElementById('css-preview-temp');
    if (previewElement) {
      document.head.removeChild(previewElement);
    }
  }, []);

  // Import CSS
  const handleImportCSS = useCallback(async (file: File): Promise<CSSInjectionResult> => {
    try {
      setError(null);
      const css = await file.text();
      return await handleInjectCSS(css, {
        name: file.name.replace(/\.[^/.]+$/, ''),
        description: `Imported from ${file.name}`,
      });
    } catch (err) {
      console.error('Failed to import CSS:', err);
      setError('Failed to import CSS');
      throw err;
    }
  }, [handleInjectCSS]);

  // Export CSS
  const handleExportCSS = useCallback(async (id: string, format: 'css' | 'scss' | 'less' = 'css'): Promise<Blob> => {
    try {
      setError(null);
      const cssInjection = availableCSS.find(css => css.id === id);
      if (!cssInjection) {
        throw new Error('CSS injection not found');
      }

      let content = cssInjection.css;
      let mimeType = 'text/css';
      let extension = 'css';

      switch (format) {
        case 'scss':
          // Convert CSS to SCSS (basic conversion)
          content = cssInjection.css.replace(/\{/g, ' {\n  ').replace(/;/g, ';\n');
          mimeType = 'text/x-scss';
          extension = 'scss';
          break;
        case 'less':
          // Convert CSS to LESS (basic conversion)
          content = cssInjection.css.replace(/\{/g, ' {\n  ').replace(/;/g, ';\n');
          mimeType = 'text/x-less';
          extension = 'less';
          break;
      }

      return new Blob([content], { type: mimeType });
    } catch (err) {
      console.error('Failed to export CSS:', err);
      setError('Failed to export CSS');
      throw err;
    }
  }, [availableCSS]);

  // Get templates
  const handleGetTemplates = useCallback(async (): Promise<CSSTemplate[]> => {
    try {
      setError(null);
      // Return predefined templates
      return [
        {
          id: 'button-styles',
          name: 'Button Styles',
          description: 'Modern button styles with hover effects',
          category: 'layout',
          css: `
            .btn {
              padding: 0.75rem 1.5rem;
              border: none;
              border-radius: 0.375rem;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s ease-in-out;
            }
            .btn:hover {
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            .btn-primary {
              background-color: #3b82f6;
              color: white;
            }
            .btn-primary:hover {
              background-color: #2563eb;
            }
          `,
          variables: [],
          mediaQueries: [],
          preview: 'Modern button with hover effects',
          tags: ['button', 'hover', 'modern'],
          difficulty: 'beginner',
          compatibility: {
            browsers: [],
            mobileSupport: true,
            accessibilityCompliant: true,
            rtlSupport: true,
          },
          performance: {
            loadTime: 0,
            parseTime: 0,
            renderTime: 0,
            memoryUsage: 0,
            optimizationLevel: 'basic',
          },
          security: {
            hasUnsafeSelectors: false,
            hasUnsafeProperties: false,
            hasExternalReferences: false,
            hasInlineStyles: false,
            riskLevel: 'low',
            warnings: [],
          },
        },
        {
          id: 'card-layout',
          name: 'Card Layout',
          description: 'Responsive card layout with shadows',
          category: 'layout',
          css: `
            .card {
              background: white;
              border-radius: 0.5rem;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              padding: 1.5rem;
              margin: 1rem 0;
              transition: box-shadow 0.2s ease-in-out;
            }
            .card:hover {
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .card-header {
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 1rem;
              margin-bottom: 1rem;
            }
            .card-title {
              font-size: 1.25rem;
              font-weight: 600;
              margin: 0;
            }
          `,
          variables: [],
          mediaQueries: [],
          preview: 'Card layout with hover effects',
          tags: ['card', 'layout', 'shadow'],
          difficulty: 'beginner',
          compatibility: {
            browsers: [],
            mobileSupport: true,
            accessibilityCompliant: true,
            rtlSupport: true,
          },
          performance: {
            loadTime: 0,
            parseTime: 0,
            renderTime: 0,
            memoryUsage: 0,
            optimizationLevel: 'basic',
          },
          security: {
            hasUnsafeSelectors: false,
            hasUnsafeProperties: false,
            hasExternalReferences: false,
            hasInlineStyles: false,
            riskLevel: 'low',
            warnings: [],
          },
        },
      ];
    } catch (err) {
      console.error('Failed to get templates:', err);
      setError('Failed to get templates');
      throw err;
    }
  }, []);

  // Apply template
  const handleApplyTemplate = useCallback(async (templateId: string): Promise<CSSInjectionResult> => {
    try {
      setError(null);
      const templates = await handleGetTemplates();
      const template = templates.find(t => t.id === templateId);
      
      if (!template) {
        throw new Error('Template not found');
      }

      return await handleInjectCSS(template.css, {
        name: template.name,
        description: template.description,
      });
    } catch (err) {
      console.error('Failed to apply template:', err);
      setError('Failed to apply template');
      throw err;
    }
  }, [handleGetTemplates, handleInjectCSS]);

  const contextValue: CSSInjectionContextType = {
    // Current CSS state
    currentCSS,
    availableCSS,
    isActive,
    isLoading,
    error,
    
    // Configuration
    config: cssConfig,
    
    // Actions
    injectCSS: handleInjectCSS,
    updateCSS: handleUpdateCSS,
    deleteCSS: handleDeleteCSS,
    toggleCSS: handleToggleCSS,
    validateCSS: handleValidateCSS,
    minifyCSS: handleMinifyCSS,
    prettifyCSS: handlePrettifyCSS,
    
    // Utilities
    parseCSS: handleParseCSS,
    extractVariables: handleExtractVariables,
    extractMediaQueries: handleExtractMediaQueries,
    analyzePerformance: handleAnalyzePerformance,
    analyzeCompatibility: handleAnalyzeCompatibility,
    analyzeSecurity: handleAnalyzeSecurity,
    
    // Preview
    previewCSS: handlePreviewCSS,
    clearPreview: handleClearPreview,
    
    // Import/Export
    importCSS: handleImportCSS,
    exportCSS: handleExportCSS,
    
    // Templates
    getTemplates: handleGetTemplates,
    applyTemplate: handleApplyTemplate,
  };

  return (
    <CSSInjectionContext.Provider value={contextValue}>
      {children}
    </CSSInjectionContext.Provider>
  );
};

// HOC for components that need CSS injection context
export const withCSSInjection = <P extends object>(Component: React.ComponentType<P>) => {
  return React.forwardRef<any, P>((props, ref) => {
    const cssInjectionContext = useCSSInjection();
    
    return (
      <Component
        {...(props as any)}
        {...props}
        ref={ref}
        currentCSS={cssInjectionContext.currentCSS}
        availableCSS={cssInjectionContext.availableCSS}
        injectCSS={cssInjectionContext.injectCSS}
        validateCSS={cssInjectionContext.validateCSS}
        isActive={cssInjectionContext.isActive}
        isLoading={cssInjectionContext.isLoading}
        error={cssInjectionContext.error}
      />
    );
  });
};

export default CSSInjectionProvider;
