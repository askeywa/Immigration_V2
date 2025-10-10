// backend/src/controllers/themeController.ts
import { Request, Response } from 'express';
import { TenantRequest } from '../middleware/tenantResolution';
import { Theme } from '../models/Theme';
import { asyncHandler } from '../middleware/asyncHandler';
import { log } from '../utils/logger';

// Default theme configuration
const DEFAULT_THEME = {
  primary: {
    main: '#3B82F6',
    light: '#60A5FA',
    dark: '#1D4ED8',
    contrast: '#FFFFFF'
  },
  secondary: {
    main: '#6B7280',
    light: '#9CA3AF',
    dark: '#374151',
    contrast: '#FFFFFF'
  },
  accent: {
    main: '#F59E0B',
    light: '#FBBF24',
    dark: '#D97706',
    contrast: '#FFFFFF'
  },
  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6'
  },
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    tertiary: '#9CA3AF'
  },
  border: {
    primary: '#E5E7EB',
    secondary: '#D1D5DB',
    tertiary: '#9CA3AF'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '3rem'
  },
  typography: {
    fontFamily: {
      primary: 'Inter, system-ui, sans-serif',
      secondary: 'Georgia, serif',
      mono: 'Fira Code, monospace'
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem'
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    }
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px'
  },
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  },
  animation: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms'
    },
    easing: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  },
  branding: {
    companyName: 'Immigration Portal',
    logoUrl: '',
    faviconUrl: '',
    customCSS: ''
  },
  metadata: {
    name: 'Default Theme',
    version: '1.0.0',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

export const getCurrentTheme = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Cast to TenantRequest to access tenant properties if available
    const tenantReq = req as any;
    const tenantId = tenantReq.tenantId;
    const isSuperAdmin = tenantReq.isSuperAdmin;
    
    // For unauthenticated requests or super admin, return default theme
    if (!tenantId || isSuperAdmin) {
      return res.json({
        success: true,
        data: DEFAULT_THEME
      });
    }

    // Try to find tenant-specific theme
    let theme = null;
    if (tenantId) {
      theme = await Theme.findOne({ tenantId }).lean();
    }

    // If no theme found, return default theme
    if (!theme) {
      theme = DEFAULT_THEME;
    }

    res.json({
      success: true,
      data: theme
    });

  } catch (error) {
    log.error('Failed to get current theme', { 
      error: error instanceof Error ? error.message : String(error),
      tenantId: (req as any).tenantId,
      isSuperAdmin: (req as any).isSuperAdmin
    });
    
    // Return default theme on error
    res.json({
      success: true,
      data: DEFAULT_THEME
    });
  }
});

export const saveTheme = asyncHandler(async (req: TenantRequest, res: Response) => {
  try {
    const { theme, tenantId: bodyTenantId } = req.body;
    const tenantId = req.tenantId || bodyTenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID is required'
      });
    }

    if (!theme) {
      return res.status(400).json({
        success: false,
        error: 'Theme data is required'
      });
    }

    // Update or create theme
    const updatedTheme = await Theme.findOneAndUpdate(
      { tenantId },
      {
        ...theme,
        tenantId,
        updatedAt: new Date()
      },
      { 
        upsert: true, 
        new: true,
        runValidators: true
      }
    );

    log.info('Theme saved successfully', { 
      tenantId,
      themeId: updatedTheme._id,
      themeName: theme.metadata?.name || 'Unknown'
    });

    res.json({
      success: true,
      data: updatedTheme
    });

  } catch (error) {
    log.error('Failed to save theme', { 
      error: error instanceof Error ? error.message : String(error),
      tenantId: req.tenantId,
      isSuperAdmin: req.isSuperAdmin
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to save theme'
    });
  }
});
