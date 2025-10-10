// Default themes placeholder
export const DEFAULT_THEME = {
  name: 'default',
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
    main: '#10B981',
    light: '#34D399',
    dark: '#059669',
    contrast: '#FFFFFF'
  },
  neutral: {
    white: '#FFFFFF',
    black: '#000000',
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827'
  },
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6'
  },
  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
    paper: '#F9FAFB',
    overlay: '#00000080'
  },
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    disabled: '#9CA3AF',
    inverse: '#FFFFFF'
  },
  border: {
    primary: '#E5E7EB',
    secondary: '#D1D5DB',
    focus: '#3B82F6',
    error: '#EF4444'
  },
  shadow: {
    light: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    dark: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    colored: '0 4px 6px -1px rgba(59, 130, 246, 0.1)'
  },
  branding: {
    logo: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#6B7280',
    companyName: 'Default Company'
  },
  metadata: {
    name: 'Default Theme',
    description: 'Default theme for the application',
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true,
    isActive: true
  }
};

export const THEME_PRESETS = [
  {
    id: 'default',
    name: 'Default Theme',
    description: 'Default theme for the application',
    category: 'professional' as const,
    preview: {
      primaryColor: '#3B82F6',
      secondaryColor: '#6B7280',
      accentColor: '#10B981',
      thumbnail: ''
    },
    theme: DEFAULT_THEME
  }
];

export const DEFAULT_THEME_CONFIG = {
  theme: DEFAULT_THEME,
  isDarkMode: false,
  availablePresets: THEME_PRESETS,
  allowCustomCSS: true,
  allowLogoUpload: true,
  maxLogoSize: 5 * 1024 * 1024, // 5MB
  supportedLogoFormats: ['png', 'jpg', 'jpeg', 'svg', 'webp']
};