// frontend/src/types/cssInjection.types.ts

export interface CustomCSSRule {
  id: string;
  selector: string;
  properties: CSSProperty[];
  mediaQuery?: string;
  pseudoClass?: string;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CSSProperty {
  name: string;
  value: string;
  important?: boolean;
  unit?: string;
}

export interface CSSInjection {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  css: string;
  minifiedCss?: string;
  rules: CustomCSSRule[];
  variables: CSSVariable[];
  mediaQueries: CSSMediaQuery[];
  isActive: boolean;
  isGlobal: boolean;
  scope?: CSSScope;
  priority: number;
  version: number;
  metadata: CSSMetadata;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface CSSVariable {
  name: string;
  value: string;
  defaultValue?: string;
  type: 'color' | 'size' | 'font' | 'spacing' | 'border' | 'shadow' | 'custom';
  description?: string;
  isOverride: boolean;
}

export interface CSSMediaQuery {
  id: string;
  condition: string;
  rules: CustomCSSRule[];
  priority: number;
}

export interface CSSScope {
  type: 'global' | 'page' | 'component' | 'selector';
  value: string;
  pages?: string[];
  components?: string[];
  selectors?: string[];
}

export interface CSSMetadata {
  fileSize: number;
  lineCount: number;
  ruleCount: number;
  variableCount: number;
  mediaQueryCount: number;
  complexity: 'low' | 'medium' | 'high';
  performance: CSSPerformance;
  compatibility: CSSCompatibility;
  security: CSSSecurity;
}

export interface CSSPerformance {
  loadTime: number;
  parseTime: number;
  renderTime: number;
  memoryUsage: number;
  optimizationLevel: 'none' | 'basic' | 'advanced' | 'maximum';
}

export interface CSSCompatibility {
  browsers: BrowserSupport[];
  mobileSupport: boolean;
  accessibilityCompliant: boolean;
  rtlSupport: boolean;
}

export interface BrowserSupport {
  browser: string;
  version: string;
  support: 'full' | 'partial' | 'none';
  notes?: string;
}

export interface CSSSecurity {
  hasUnsafeSelectors: boolean;
  hasUnsafeProperties: boolean;
  hasExternalReferences: boolean;
  hasInlineStyles: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  warnings: string[];
}

export interface CSSInjectionConfig {
  maxFileSize: number;
  maxRules: number;
  maxVariables: number;
  maxMediaQueries: number;
  allowedProperties: string[];
  forbiddenProperties: string[];
  allowedSelectors: string[];
  forbiddenSelectors: string[];
  allowedMediaQueries: string[];
  forbiddenMediaQueries: string[];
  enableMinification: boolean;
  enableValidation: boolean;
  enableSecurityScan: boolean;
  enablePerformanceMonitoring: boolean;
  enableBrowserCompatibility: boolean;
  enableAccessibilityCheck: boolean;
  enableRTLSupport: boolean;
  enableMobileOptimization: boolean;
  enablePrintStyles: boolean;
  enableDarkModeSupport: boolean;
}

export interface CSSInjectionResult {
  success: boolean;
  css?: CSSInjection;
  error?: string;
  warnings: string[];
  suggestions: string[];
  performance: CSSPerformance;
  compatibility: CSSCompatibility;
  security: CSSSecurity;
  validation: CSSValidation;
}

export interface CSSValidation {
  isValid: boolean;
  errors: CSSValidationError[];
  warnings: CSSValidationWarning[];
  suggestions: CSSValidationSuggestion[];
}

export interface CSSValidationError {
  type: 'syntax' | 'property' | 'selector' | 'media-query' | 'security' | 'performance';
  message: string;
  line?: number;
  column?: number;
  selector?: string;
  property?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface CSSValidationWarning {
  type: 'performance' | 'compatibility' | 'accessibility' | 'best-practice';
  message: string;
  line?: number;
  column?: number;
  selector?: string;
  property?: string;
  impact: 'low' | 'medium' | 'high';
}

export interface CSSValidationSuggestion {
  type: 'optimization' | 'compatibility' | 'accessibility' | 'best-practice';
  message: string;
  line?: number;
  column?: number;
  selector?: string;
  property?: string;
  suggestion: string;
  impact: 'low' | 'medium' | 'high';
}

export interface CSSInjectionContextType {
  // Current CSS state
  currentCSS: CSSInjection | null;
  availableCSS: CSSInjection[];
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Configuration
  config: CSSInjectionConfig;
  
  // Actions
  injectCSS: (css: string, options?: CSSInjectionOptions) => Promise<CSSInjectionResult>;
  updateCSS: (id: string, css: string, options?: CSSInjectionOptions) => Promise<CSSInjectionResult>;
  deleteCSS: (id: string) => Promise<void>;
  toggleCSS: (id: string) => Promise<void>;
  validateCSS: (css: string) => Promise<CSSValidation>;
  minifyCSS: (css: string) => Promise<string>;
  prettifyCSS: (css: string) => Promise<string>;
  
  // Utilities
  parseCSS: (css: string) => Promise<CustomCSSRule[]>;
  extractVariables: (css: string) => Promise<CSSVariable[]>;
  extractMediaQueries: (css: string) => Promise<CSSMediaQuery[]>;
  analyzePerformance: (css: string) => Promise<CSSPerformance>;
  analyzeCompatibility: (css: string) => Promise<CSSCompatibility>;
  analyzeSecurity: (css: string) => Promise<CSSSecurity>;
  
  // Preview
  previewCSS: (css: string) => void;
  clearPreview: () => void;
  
  // Import/Export
  importCSS: (file: File) => Promise<CSSInjectionResult>;
  exportCSS: (id: string, format?: 'css' | 'scss' | 'less') => Promise<Blob>;
  
  // Templates
  getTemplates: () => Promise<CSSTemplate[]>;
  applyTemplate: (templateId: string) => Promise<CSSInjectionResult>;
}

export interface CSSInjectionOptions {
  name?: string;
  description?: string;
  scope?: CSSScope;
  priority?: number;
  isGlobal?: boolean;
  enableMinification?: boolean;
  enableValidation?: boolean;
  enableSecurityScan?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableBrowserCompatibility?: boolean;
  enableAccessibilityCheck?: boolean;
  enableRTLSupport?: boolean;
  enableMobileOptimization?: boolean;
  enablePrintStyles?: boolean;
  enableDarkModeSupport?: boolean;
  onProgress?: (progress: number) => void;
}

export interface CSSTemplate {
  id: string;
  name: string;
  description: string;
  category: 'layout' | 'typography' | 'colors' | 'animations' | 'responsive' | 'utilities';
  css: string;
  variables: CSSVariable[];
  mediaQueries: CSSMediaQuery[];
  preview: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  compatibility: CSSCompatibility;
  performance: CSSPerformance;
  security: CSSSecurity;
}

export interface CSSInjectionProviderProps {
  children: React.ReactNode;
  tenantId?: string;
  config?: Partial<CSSInjectionConfig>;
}

// Default configurations
export const DEFAULT_CSS_CONFIG: CSSInjectionConfig = {
  maxFileSize: 100 * 1024, // 100KB
  maxRules: 1000,
  maxVariables: 100,
  maxMediaQueries: 50,
  allowedProperties: [
    'color', 'background-color', 'background', 'border', 'border-radius',
    'padding', 'margin', 'width', 'height', 'font-size', 'font-family',
    'font-weight', 'text-align', 'line-height', 'opacity', 'transform',
    'transition', 'animation', 'box-shadow', 'text-shadow', 'display',
    'position', 'top', 'right', 'bottom', 'left', 'z-index', 'overflow',
    'flex', 'grid', 'align-items', 'justify-content', 'gap'
  ],
  forbiddenProperties: [
    'behavior', 'expression', 'javascript:', 'vbscript:', 'data:',
    'url(javascript:)', 'url(vbscript:)', 'url(data:javascript:)',
    'url(data:vbscript:)', 'import', '@import'
  ],
  allowedSelectors: [
    '.', '#', ':', '::', '[', ']', '>', '+', '~', '*', 'html', 'body',
    'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img',
    'button', 'input', 'form', 'table', 'tr', 'td', 'th', 'ul', 'ol', 'li'
  ],
  forbiddenSelectors: [
    'javascript:', 'vbscript:', 'data:', 'expression', 'behavior'
  ],
  allowedMediaQueries: [
    'screen', 'print', 'all', 'max-width', 'min-width', 'max-height',
    'min-height', 'orientation', 'aspect-ratio', 'resolution'
  ],
  forbiddenMediaQueries: [
    'javascript:', 'vbscript:', 'data:', 'expression', 'behavior'
  ],
  enableMinification: true,
  enableValidation: true,
  enableSecurityScan: true,
  enablePerformanceMonitoring: true,
  enableBrowserCompatibility: true,
  enableAccessibilityCheck: true,
  enableRTLSupport: true,
  enableMobileOptimization: true,
  enablePrintStyles: true,
  enableDarkModeSupport: true,
};

// CSS Template categories
export const CSS_TEMPLATE_CATEGORIES = {
  layout: 'Layout & Structure',
  typography: 'Typography & Text',
  colors: 'Colors & Themes',
  animations: 'Animations & Transitions',
  responsive: 'Responsive Design',
  utilities: 'Utility Classes',
} as const;

export type CSSTemplateCategory = keyof typeof CSS_TEMPLATE_CATEGORIES;

// Common CSS patterns
export const CSS_PATTERNS = {
  button: 'button',
  card: 'card',
  form: 'form',
  navigation: 'navigation',
  grid: 'grid',
  flexbox: 'flexbox',
  typography: 'typography',
  colors: 'colors',
  spacing: 'spacing',
  borders: 'borders',
  shadows: 'shadows',
  animations: 'animations',
  responsive: 'responsive',
  darkMode: 'dark-mode',
  rtl: 'rtl',
  print: 'print',
} as const;

export type CSSPattern = keyof typeof CSS_PATTERNS;
