// frontend/src/services/themeService.ts

import { TenantTheme, ThemeConfig, CSS_VARIABLE_MAP } from '@/types/theme.types';
import { DEFAULT_THEME, THEME_PRESETS, DEFAULT_THEME_CONFIG } from '@/themes/defaultThemes';
import { api } from './api';

export class ThemeService {
  private static instance: ThemeService;
  private currentTheme: TenantTheme = DEFAULT_THEME as any;
  private themeConfig: ThemeConfig;
  private customThemes: TenantTheme[] = [];
  
  // Global caching to prevent duplicate API calls across all instances
  private static globalThemeCache = new Map<string, { theme: TenantTheme; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static isLoading = false; // Prevent concurrent API calls
  private isDarkMode: boolean = false;

  private constructor() {
    this.themeConfig = {
      currentTheme: this.currentTheme,
      availablePresets: THEME_PRESETS as any,
      customThemes: this.customThemes,
      ...DEFAULT_THEME_CONFIG,
    };
  }

  public static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  /**
   * Get the current theme
   */
  public getCurrentTheme(): TenantTheme {
    return this.currentTheme;
  }

  /**
   * Get the theme configuration
   */
  public getThemeConfig(): ThemeConfig {
    return this.themeConfig;
  }

  /**
   * Load theme from API with global caching and deduplication
   */
  public async loadTheme(tenantId?: string): Promise<TenantTheme> {
    const cacheKey = tenantId || 'default';
    
    // Check global cache first
    const cached = ThemeService.globalThemeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ThemeService.CACHE_DURATION) {
      console.log('✅ ThemeService: Using cached theme for', cacheKey);
      this.currentTheme = cached.theme;
      this.themeConfig.currentTheme = this.currentTheme;
      this.applyThemeToDOM();
      return this.currentTheme;
    }
    
    // Prevent concurrent API calls for the same tenant
    if (ThemeService.isLoading) {
      console.log('⏳ ThemeService: Waiting for ongoing theme load...');
      // Wait a bit and check cache again
      await new Promise(resolve => setTimeout(resolve, 100));
      const retryCached = ThemeService.globalThemeCache.get(cacheKey);
      if (retryCached && Date.now() - retryCached.timestamp < ThemeService.CACHE_DURATION) {
        this.currentTheme = retryCached.theme;
        this.themeConfig.currentTheme = this.currentTheme;
        this.applyThemeToDOM();
        return this.currentTheme;
      }
    }
    
    ThemeService.isLoading = true;
    
    try {
      console.log('🌐 ThemeService: Loading theme from API for', cacheKey);
      const response = await api.get(`/themes/current`, {
        headers: {
          'X-Tenant-ID': tenantId || '',
        },
      });

      if (response.data.success && response.data.data) {
        this.currentTheme = this.mergeWithDefault(response.data.data);
        this.themeConfig.currentTheme = this.currentTheme;
        this.applyThemeToDOM();
        
        // Cache the theme globally
        ThemeService.globalThemeCache.set(cacheKey, {
          theme: this.currentTheme,
          timestamp: Date.now()
        });
        
        console.log('✅ ThemeService: Theme loaded and cached for', cacheKey);
        return this.currentTheme;
      }
    } catch (error) {
      console.warn('Failed to load theme from API, using default theme:', error);
    } finally {
      ThemeService.isLoading = false;
    }

    this.currentTheme = DEFAULT_THEME as any;
    this.themeConfig.currentTheme = this.currentTheme;
    this.applyThemeToDOM();
    
    // Cache the default theme globally
    ThemeService.globalThemeCache.set(cacheKey, {
      theme: this.currentTheme,
      timestamp: Date.now()
    });
    
    console.log('✅ ThemeService: Default theme cached for', cacheKey);
    return this.currentTheme;
  }

  /**
   * Save theme to API
   */
  public async saveTheme(theme: Partial<TenantTheme>, tenantId?: string): Promise<void> {
    try {
      const mergedTheme = this.mergeWithDefault(theme);
      
      await api.post('/themes/save', {
        theme: mergedTheme,
        tenantId: tenantId || '',
      });

      this.currentTheme = mergedTheme;
      this.themeConfig.currentTheme = this.currentTheme;
      this.applyThemeToDOM();
    } catch (error) {
      console.error('Failed to save theme:', error);
      throw new Error('Failed to save theme');
    }
  }

  /**
   * Apply theme to DOM using CSS variables
   */
  public applyThemeToDOM(): void {
    const root = document.documentElement;
    
    // Apply CSS variables
    Object.entries(CSS_VARIABLE_MAP).forEach(([cssVar, themePath]) => {
      const value = this.getThemeValue(themePath);
      if (value !== undefined) {
        root.style.setProperty(cssVar, value);
      }
    });

    // Apply custom CSS if available
    if (this.currentTheme.customCSS) {
      this.applyCustomCSS(this.currentTheme.customCSS);
    }

    // Apply branding
    this.applyBranding();
  }

  /**
   * Apply custom CSS
   */
  private applyCustomCSS(css: string): void {
    const existingStyle = document.getElementById('custom-theme-css');
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = 'custom-theme-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * Apply branding elements
   */
  private applyBranding(): void {
    // Update favicon
    if (this.currentTheme.branding.faviconUrl) {
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon) {
        favicon.href = this.currentTheme.branding.faviconUrl;
      }
    }

    // Update page title
    if (this.currentTheme.branding.companyName) {
      document.title = this.currentTheme.branding.companyName;
    }
  }

  /**
   * Generate theme from colors
   */
  public generateThemeFromColors(primary: string, secondary: string, accent: string): TenantTheme {
    const baseTheme = { ...DEFAULT_THEME };
    
    // Generate color variations
    const primaryVariations = this.generateColorVariations(primary);
    const secondaryVariations = this.generateColorVariations(secondary);
    const accentVariations = this.generateColorVariations(accent);

    return {
      ...baseTheme,
      primary: primaryVariations,
      secondary: secondaryVariations,
      accent: accentVariations,
      branding: {
        ...baseTheme.branding,
        companyName: 'Custom Theme',
      },
      metadata: {
        ...baseTheme.metadata,
        name: 'Custom Theme',
        isDefault: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as any;
  }

  /**
   * Generate color variations (light, dark, contrast)
   */
  private generateColorVariations(color: string): TenantTheme['primary'] {
    const light = this.lightenColor(color, 20);
    const dark = this.darkenColor(color, 20);
    const contrast = this.getContrastColor(color);

    return {
      main: color,
      light,
      dark,
      contrast,
    };
  }

  /**
   * Lighten a color by a percentage
   */
  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  /**
   * Darken a color by a percentage
   */
  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return '#' + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
      (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
      (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
  }

  /**
   * Get contrast color (black or white)
   */
  private getContrastColor(color: string): string {
    const num = parseInt(color.replace('#', ''), 16);
    const r = num >> 16;
    const g = num >> 8 & 0x00FF;
    const b = num & 0x0000FF;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#FFFFFF';
  }

  /**
   * Toggle dark mode
   */
  public async toggleDarkMode(): Promise<void> {
    this.isDarkMode = !this.isDarkMode;
    this.themeConfig.isDarkMode = this.isDarkMode;

    // Apply dark mode adjustments
    if (this.isDarkMode) {
      this.applyDarkModeAdjustments();
    } else {
      this.removeDarkModeAdjustments();
    }

    this.applyThemeToDOM();
  }

  /**
   * Apply dark mode adjustments
   */
  private applyDarkModeAdjustments(): void {
    const root = document.documentElement;
    root.classList.add('dark-mode');
    
    // Adjust colors for dark mode
    const adjustments = {
      '--color-background-primary': '#111827',
      '--color-background-secondary': '#1F2937',
      '--color-background-tertiary': '#374151',
      '--color-text-primary': '#F9FAFB',
      '--color-text-secondary': '#D1D5DB',
      '--color-border-primary': '#374151',
    };

    Object.entries(adjustments).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }

  /**
   * Remove dark mode adjustments
   */
  private removeDarkModeAdjustments(): void {
    const root = document.documentElement;
    root.classList.remove('dark-mode');
    
    // Reset to theme colors
    this.applyThemeToDOM();
  }

  /**
   * Apply theme preset
   */
  public async applyPreset(presetId: string): Promise<void> {
    const preset = THEME_PRESETS.find((p: any) => p.id === presetId);
    if (!preset) {
      throw new Error(`Preset ${presetId} not found`);
    }

    const mergedTheme = this.mergeWithDefault(preset.theme as any);
    await this.saveTheme(mergedTheme);
  }

  /**
   * Save custom theme
   */
  public async saveCustomTheme(theme: TenantTheme, name: string): Promise<void> {
    const customTheme = {
      ...theme,
      metadata: {
        ...theme.metadata,
        name,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    this.customThemes.push(customTheme);
    this.themeConfig.customThemes = this.customThemes;
    
    await this.saveTheme(customTheme);
  }

  /**
   * Delete custom theme
   */
  public async deleteCustomTheme(themeId: string): Promise<void> {
    this.customThemes = this.customThemes.filter((t: any) => t.metadata.name !== themeId);
    this.themeConfig.customThemes = this.customThemes;
  }

  /**
   * Export theme as JSON
   */
  public exportTheme(): string {
    return JSON.stringify(this.currentTheme, null, 2);
  }

  /**
   * Import theme from JSON
   */
  public async importTheme(themeData: string): Promise<void> {
    try {
      const theme = JSON.parse(themeData) as Partial<TenantTheme>;
      const mergedTheme = this.mergeWithDefault(theme);
      await this.saveTheme(mergedTheme);
    } catch (error) {
      throw new Error('Invalid theme data');
    }
  }

  /**
   * Validate theme
   */
  public validateTheme(theme: Partial<TenantTheme>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!theme.primary?.main) errors.push('Primary color is required');
    if (!theme.secondary?.main) errors.push('Secondary color is required');
    if (!theme.accent?.main) errors.push('Accent color is required');

    // Validate color formats
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (theme.primary?.main && !colorRegex.test(theme.primary.main)) {
      errors.push('Primary color must be a valid hex color');
    }
    if (theme.secondary?.main && !colorRegex.test(theme.secondary.main)) {
      errors.push('Secondary color must be a valid hex color');
    }
    if (theme.accent?.main && !colorRegex.test(theme.accent.main)) {
      errors.push('Accent color must be a valid hex color');
    }

    // Validate custom CSS
    if (theme.customCSS) {
      try {
        // Basic CSS validation
        const style = document.createElement('style');
        style.textContent = theme.customCSS;
      } catch (error) {
        errors.push('Custom CSS contains invalid syntax');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get theme value by path
   */
  private getThemeValue(path: string): string | undefined {
    const keys = path.split('.');
    let value: any = this.currentTheme;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return typeof value === 'string' ? value : undefined;
  }

  /**
   * Merge theme with default theme
   */
  private mergeWithDefault(theme: Partial<TenantTheme>): TenantTheme {
    return this.deepMerge(DEFAULT_THEME, theme);
  }

  /**
   * Deep merge objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Reset to default theme
   */
  public async resetToDefault(): Promise<void> {
    this.currentTheme = DEFAULT_THEME as any;
    this.themeConfig.currentTheme = this.currentTheme;
    this.isDarkMode = false;
    this.themeConfig.isDarkMode = this.isDarkMode;
    
    this.applyThemeToDOM();
    await this.saveTheme(DEFAULT_THEME as any);
  }

  /**
   * Update branding
   */
  public async updateBranding(branding: Partial<TenantTheme['branding']>): Promise<void> {
    const updatedTheme = {
      ...this.currentTheme,
      branding: {
        ...this.currentTheme.branding,
        ...branding,
      },
    };

    await this.saveTheme(updatedTheme);
  }

  /**
   * Update custom CSS
   */
  public async updateCustomCSS(css: string): Promise<void> {
    const updatedTheme = {
      ...this.currentTheme,
      customCSS: css,
    };

    await this.saveTheme(updatedTheme);
  }
}

// Export singleton instance
export const themeService = ThemeService.getInstance();
