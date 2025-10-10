// frontend/src/types/theme.types.ts

export interface TenantTheme {
  // Primary Colors
  primary: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };
  
  // Secondary Colors
  secondary: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };
  
  // Accent Colors
  accent: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };
  
  // Neutral Colors
  neutral: {
    white: string;
    black: string;
    gray50: string;
    gray100: string;
    gray200: string;
    gray300: string;
    gray400: string;
    gray500: string;
    gray600: string;
    gray700: string;
    gray800: string;
    gray900: string;
  };
  
  // Status Colors
  status: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  
  // Background Colors
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    paper: string;
    overlay: string;
  };
  
  // Text Colors
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    disabled: string;
    inverse: string;
  };
  
  // Border Colors
  border: {
    primary: string;
    secondary: string;
    focus: string;
    error: string;
  };
  
  // Shadow Colors
  shadow: {
    light: string;
    medium: string;
    dark: string;
    colored: string;
  };
  
  // Typography
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
      '4xl': string;
    };
    fontWeight: {
      light: number;
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };
  
  // Spacing
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  
  // Border Radius
  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  
  // Animation
  animation: {
    duration: {
      fast: string;
      normal: string;
      slow: string;
    };
    easing: {
      easeIn: string;
      easeOut: string;
      easeInOut: string;
    };
  };
  
  // Logo & Branding
  branding: {
    logoUrl?: string;
    faviconUrl?: string;
    companyName: string;
    tagline?: string;
  };
  
  // Custom CSS
  customCSS?: string;
  
  // Theme Metadata
  metadata: {
    name: string;
    description?: string;
    version: string;
    createdAt: Date;
    updatedAt: Date;
    isDefault: boolean;
    isActive: boolean;
  };
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  category: 'professional' | 'modern' | 'classic' | 'creative' | 'minimal';
  theme: Partial<TenantTheme>;
  preview: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    thumbnail: string;
  };
}

export interface ThemeConfig {
  currentTheme: TenantTheme;
  availablePresets: ThemePreset[];
  customThemes: TenantTheme[];
  isDarkMode: boolean;
  allowCustomCSS: boolean;
  allowLogoUpload: boolean;
  maxLogoSize: number; // in bytes
  supportedLogoFormats: string[];
}

export interface ThemeContextType {
  theme: TenantTheme;
  config: ThemeConfig;
  isDarkMode: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setTheme: (theme: Partial<TenantTheme>) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
  resetToDefault: () => Promise<void>;
  saveCustomTheme: (theme: TenantTheme, name: string) => Promise<void>;
  deleteCustomTheme: (themeId: string) => Promise<void>;
  applyPreset: (presetId: string) => Promise<void>;
  updateBranding: (branding: Partial<TenantTheme['branding']>) => Promise<void>;
  updateCustomCSS: (css: string) => Promise<void>;
  
  // Utilities
  generateThemeFromColors: (primary: string, secondary: string, accent: string) => TenantTheme;
  exportTheme: () => string;
  importTheme: (themeData: string) => Promise<void>;
  validateTheme: (theme: Partial<TenantTheme>) => { isValid: boolean; errors: string[] };
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  tenantId?: string;
  fallbackTheme?: Partial<TenantTheme>;
}

// CSS Variable names mapping
export const CSS_VARIABLE_MAP = {
  // Primary Colors
  '--color-primary-main': 'primary.main',
  '--color-primary-light': 'primary.light',
  '--color-primary-dark': 'primary.dark',
  '--color-primary-contrast': 'primary.contrast',
  
  // Secondary Colors
  '--color-secondary-main': 'secondary.main',
  '--color-secondary-light': 'secondary.light',
  '--color-secondary-dark': 'secondary.dark',
  '--color-secondary-contrast': 'secondary.contrast',
  
  // Accent Colors
  '--color-accent-main': 'accent.main',
  '--color-accent-light': 'accent.light',
  '--color-accent-dark': 'accent.dark',
  '--color-accent-contrast': 'accent.contrast',
  
  // Neutral Colors
  '--color-white': 'neutral.white',
  '--color-black': 'neutral.black',
  '--color-gray-50': 'neutral.gray50',
  '--color-gray-100': 'neutral.gray100',
  '--color-gray-200': 'neutral.gray200',
  '--color-gray-300': 'neutral.gray300',
  '--color-gray-400': 'neutral.gray400',
  '--color-gray-500': 'neutral.gray500',
  '--color-gray-600': 'neutral.gray600',
  '--color-gray-700': 'neutral.gray700',
  '--color-gray-800': 'neutral.gray800',
  '--color-gray-900': 'neutral.gray900',
  
  // Status Colors
  '--color-success': 'status.success',
  '--color-warning': 'status.warning',
  '--color-error': 'status.error',
  '--color-info': 'status.info',
  
  // Background Colors
  '--color-background-primary': 'background.primary',
  '--color-background-secondary': 'background.secondary',
  '--color-background-tertiary': 'background.tertiary',
  '--color-background-paper': 'background.paper',
  '--color-background-overlay': 'background.overlay',
  
  // Text Colors
  '--color-text-primary': 'text.primary',
  '--color-text-secondary': 'text.secondary',
  '--color-text-tertiary': 'text.tertiary',
  '--color-text-disabled': 'text.disabled',
  '--color-text-inverse': 'text.inverse',
  
  // Border Colors
  '--color-border-primary': 'border.primary',
  '--color-border-secondary': 'border.secondary',
  '--color-border-focus': 'border.focus',
  '--color-border-error': 'border.error',
  
  // Shadow Colors
  '--color-shadow-light': 'shadow.light',
  '--color-shadow-medium': 'shadow.medium',
  '--color-shadow-dark': 'shadow.dark',
  '--color-shadow-colored': 'shadow.colored',
  
  // Typography
  '--font-family': 'typography.fontFamily',
  '--font-size-xs': 'typography.fontSize.xs',
  '--font-size-sm': 'typography.fontSize.sm',
  '--font-size-base': 'typography.fontSize.base',
  '--font-size-lg': 'typography.fontSize.lg',
  '--font-size-xl': 'typography.fontSize.xl',
  '--font-size-2xl': 'typography.fontSize.2xl',
  '--font-size-3xl': 'typography.fontSize.3xl',
  '--font-size-4xl': 'typography.fontSize.4xl',
  '--font-weight-light': 'typography.fontWeight.light',
  '--font-weight-normal': 'typography.fontWeight.normal',
  '--font-weight-medium': 'typography.fontWeight.medium',
  '--font-weight-semibold': 'typography.fontWeight.semibold',
  '--font-weight-bold': 'typography.fontWeight.bold',
  '--line-height-tight': 'typography.lineHeight.tight',
  '--line-height-normal': 'typography.lineHeight.normal',
  '--line-height-relaxed': 'typography.lineHeight.relaxed',
  
  // Spacing
  '--spacing-xs': 'spacing.xs',
  '--spacing-sm': 'spacing.sm',
  '--spacing-md': 'spacing.md',
  '--spacing-lg': 'spacing.lg',
  '--spacing-xl': 'spacing.xl',
  '--spacing-2xl': 'spacing.2xl',
  '--spacing-3xl': 'spacing.3xl',
  
  // Border Radius
  '--border-radius-none': 'borderRadius.none',
  '--border-radius-sm': 'borderRadius.sm',
  '--border-radius-md': 'borderRadius.md',
  '--border-radius-lg': 'borderRadius.lg',
  '--border-radius-xl': 'borderRadius.xl',
  '--border-radius-full': 'borderRadius.full',
  
  // Animation
  '--animation-duration-fast': 'animation.duration.fast',
  '--animation-duration-normal': 'animation.duration.normal',
  '--animation-duration-slow': 'animation.duration.slow',
  '--animation-easing-ease-in': 'animation.easing.easeIn',
  '--animation-easing-ease-out': 'animation.easing.easeOut',
  '--animation-easing-ease-in-out': 'animation.easing.easeInOut',
} as const;

export type CSSVariableName = keyof typeof CSS_VARIABLE_MAP;
export type ThemePropertyPath = typeof CSS_VARIABLE_MAP[CSSVariableName];
