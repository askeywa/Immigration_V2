// frontend/src/services/cssInjectionService.ts

import { 
  CSSInjection,
  CSSInjectionConfig,
  CSSInjectionResult,
  CSSValidation,
  CSSValidationError,
  CSSValidationWarning,
  CSSValidationSuggestion,
  CSSPerformance,
  CSSCompatibility,
  CSSSecurity,
  CustomCSSRule,
  CSSVariable,
  CSSMediaQuery,
  CSSInjectionOptions,
  CSSTemplate,
  DEFAULT_CSS_CONFIG
} from '@/types/cssInjection.types';
import { tenantAwareApi } from './api';

export class CSSInjectionService {
  private static instance: CSSInjectionService;
  private config: CSSInjectionConfig;
  private injectedStyles: Map<string, HTMLStyleElement> = new Map();

  private constructor() {
    this.config = DEFAULT_CSS_CONFIG;
  }

  public static getInstance(): CSSInjectionService {
    if (!CSSInjectionService.instance) {
      CSSInjectionService.instance = new CSSInjectionService();
    }
    return CSSInjectionService.instance;
  }

  /**
   * Inject CSS into the document
   */
  public async injectCSS(
    css: string, 
    tenantId: string,
    options: CSSInjectionOptions = {}
  ): Promise<CSSInjectionResult> {
    try {
      // Validate CSS
      const validation = await this.validateCSS(css);
      if (!validation.isValid) {
        return {
          success: false,
          error: 'CSS validation failed',
          warnings: validation.warnings.map((w: any) => w.message),
          suggestions: validation.suggestions.map((s: any) => s.suggestion),
          performance: this.getDefaultPerformance(),
          compatibility: this.getDefaultCompatibility(),
          security: this.getDefaultSecurity(),
          validation,
        };
      }

      // Security scan
      const security = await this.analyzeSecurity(css);
      if (security.riskLevel === 'high') {
        return {
          success: false,
          error: 'CSS contains security risks',
          warnings: security.warnings,
          suggestions: ['Review and fix security issues before injecting'],
          performance: this.getDefaultPerformance(),
          compatibility: this.getDefaultCompatibility(),
          security,
          validation,
        };
      }

      // Performance analysis
      const performance = await this.analyzePerformance(css);

      // Compatibility analysis
      const compatibility = await this.analyzeCompatibility(css);

      // Minify CSS if enabled
      const processedCSS = options.enableMinification !== false 
        ? await this.minifyCSS(css)
        : css;

      // Create CSS injection record
      const cssInjection: CSSInjection = {
        id: this.generateId(),
        tenantId,
        name: options.name || 'Custom CSS',
        description: options.description,
        css: processedCSS,
        minifiedCss: options.enableMinification !== false ? processedCSS : undefined,
        rules: await this.parseCSS(processedCSS),
        variables: await this.extractVariables(processedCSS),
        mediaQueries: await this.extractMediaQueries(processedCSS),
        isActive: true,
        isGlobal: options.isGlobal || false,
        scope: options.scope,
        priority: options.priority || 0,
        version: 1,
        metadata: {
          fileSize: new Blob([processedCSS]).size,
          lineCount: processedCSS.split('\n').length,
          ruleCount: (await this.parseCSS(processedCSS)).length,
          variableCount: (await this.extractVariables(processedCSS)).length,
          mediaQueryCount: (await this.extractMediaQueries(processedCSS)).length,
          complexity: this.calculateComplexity(processedCSS),
          performance,
          compatibility,
          security,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'current-user',
        updatedBy: 'current-user',
      };

      // Save to backend
      const response = await tenantAwareApi.post('/css-injection', {
        cssInjection,
        options,
      }, {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to save CSS injection');
      }

      // Inject into DOM
      this.injectIntoDOM(cssInjection);

      return {
        success: true,
        css: cssInjection,
        warnings: validation.warnings.map((w: any) => w.message),
        suggestions: validation.suggestions.map((s: any) => s.suggestion),
        performance,
        compatibility,
        security,
        validation,
      };

    } catch (error) {
      console.error('CSS injection failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'CSS injection failed',
        warnings: [],
        suggestions: [],
        performance: this.getDefaultPerformance(),
        compatibility: this.getDefaultCompatibility(),
        security: this.getDefaultSecurity(),
        validation: {
          isValid: false,
          errors: [{ type: 'syntax', message: 'Injection failed', severity: 'error' }],
          warnings: [],
          suggestions: [],
        },
      };
    }
  }

  /**
   * Update existing CSS injection
   */
  public async updateCSS(
    id: string,
    css: string,
    tenantId: string,
    options: CSSInjectionOptions = {}
  ): Promise<CSSInjectionResult> {
    try {
      // Remove existing injection
      this.removeFromDOM(id);

      // Inject updated CSS
      return await this.injectCSS(css, tenantId, {
        ...options,
        name: options.name || `Updated CSS ${id}`,
      });
    } catch (error) {
      console.error('CSS update failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'CSS update failed',
        warnings: [],
        suggestions: [],
        performance: this.getDefaultPerformance(),
        compatibility: this.getDefaultCompatibility(),
        security: this.getDefaultSecurity(),
        validation: {
          isValid: false,
          errors: [{ type: 'syntax', message: 'Update failed', severity: 'error' }],
          warnings: [],
          suggestions: [],
        },
      };
    }
  }

  /**
   * Delete CSS injection
   */
  public async deleteCSS(id: string, tenantId: string): Promise<void> {
    try {
      // Remove from DOM
      this.removeFromDOM(id);

      // Delete from backend
      await tenantAwareApi.delete(`/api/css-injection/${id}`, {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });
    } catch (error) {
      console.error('CSS deletion failed:', error);
      throw error;
    }
  }

  /**
   * Toggle CSS injection
   */
  public async toggleCSS(id: string, tenantId: string): Promise<void> {
    try {
      const styleElement = this.injectedStyles.get(id);
      if (styleElement) {
        styleElement.disabled = !styleElement.disabled;
      }

      // Update backend
      await tenantAwareApi.patch(`/api/css-injection/${id}/toggle`, {}, {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });
    } catch (error) {
      console.error('CSS toggle failed:', error);
      throw error;
    }
  }

  /**
   * Get current CSS injections
   */
  public async getCurrentCSS(tenantId: string): Promise<CSSInjection[]> {
    try {
      const response = await tenantAwareApi.get('/css-injection', {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });

      return response.data.success ? response.data.cssInjections : [];
    } catch (error) {
      console.error('Failed to get current CSS:', error);
      return [];
    }
  }

  /**
   * Validate CSS
   */
  public async validateCSS(css: string): Promise<CSSValidation> {
    const errors: CSSValidationError[] = [];
    const warnings: CSSValidationWarning[] = [];
    const suggestions: CSSValidationSuggestion[] = [];

    try {
      // Basic syntax validation
      if (!css.trim()) {
        errors.push({
          type: 'syntax',
          message: 'CSS cannot be empty',
          severity: 'error',
        });
      }

      // Check for forbidden properties
      this.config.forbiddenProperties.forEach((prop: any) => {
        if (css.includes(prop)) {
          errors.push({
            type: 'property',
            message: `Forbidden property detected: ${prop}`,
            severity: 'error',
            property: prop,
          });
        }
      });

      // Check for forbidden selectors
      this.config.forbiddenSelectors.forEach((selector: any) => {
        if (css.includes(selector)) {
          errors.push({
            type: 'selector',
            message: `Forbidden selector detected: ${selector}`,
            severity: 'error',
            selector,
          });
        }
      });

      // Check for forbidden media queries
      this.config.forbiddenMediaQueries.forEach((mq: any) => {
        if (css.includes(mq)) {
          errors.push({
            type: 'media-query',
            message: `Forbidden media query detected: ${mq}`,
            severity: 'error',
          });
        }
      });

      // Check file size
      const fileSize = new Blob([css]).size;
      if (fileSize > this.config.maxFileSize) {
        errors.push({
          type: 'performance',
          message: `CSS file size exceeds maximum allowed size of ${this.config.maxFileSize} bytes`,
          severity: 'error',
        });
      }

      // Check rule count
      const ruleCount = (css.match(/\{[^}]*\}/g) || []).length;
      if (ruleCount > this.config.maxRules) {
        warnings.push({
          type: 'performance',
          message: `CSS contains ${ruleCount} rules, which may impact performance`,
          impact: 'medium',
        });
      }

      // Check for common issues
      if (css.includes('!important') && (css.match(/!important/g) || []).length > 10) {
        warnings.push({
          type: 'best-practice',
          message: 'Excessive use of !important may cause specificity issues',
          impact: 'medium',
        });
      }

      // Check for vendor prefixes
      const vendorPrefixes = css.match(/-webkit-|-moz-|-ms-|-o-/g);
      if (vendorPrefixes && vendorPrefixes.length > 20) {
        suggestions.push({
          type: 'optimization',
          message: 'Consider using autoprefixer to manage vendor prefixes',
          suggestion: 'Use a build tool like PostCSS with autoprefixer',
          impact: 'low',
        });
      }

      // Check for unused selectors
      const selectors = css.match(/[.#]?[a-zA-Z][a-zA-Z0-9_-]*(?=\s*\{)/g) || [];
      const uniqueSelectors = [...new Set(selectors)];
      if (uniqueSelectors.length > 100) {
        suggestions.push({
          type: 'optimization',
          message: 'Consider breaking down large CSS files into smaller modules',
          suggestion: 'Split CSS into logical components',
          impact: 'medium',
        });
      }

    } catch (error) {
      errors.push({
        type: 'syntax',
        message: 'CSS parsing error',
        severity: 'error',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Minify CSS
   */
  public async minifyCSS(css: string): Promise<string> {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/;\s*}/g, '}') // Remove semicolons before closing braces
      .replace(/\s*{\s*/g, '{') // Remove spaces around opening braces
      .replace(/;\s*/g, ';') // Remove spaces after semicolons
      .replace(/,\s*/g, ',') // Remove spaces after commas
      .replace(/:\s*/g, ':') // Remove spaces after colons
      .trim();
  }

  /**
   * Prettify CSS
   */
  public async prettifyCSS(css: string): Promise<string> {
    let pretty = css
      .replace(/\{/g, ' {\n  ')
      .replace(/;/g, ';\n  ')
      .replace(/\}/g, '\n}\n')
      .replace(/,\s*/g, ',\n  ');

    // Add proper indentation
    const lines = pretty.split('\n');
    let indentLevel = 0;
    
    return lines.map((line: any) => {
      if (line.includes('}')) indentLevel--;
      const indented = '  '.repeat(Math.max(0, indentLevel)) + line.trim();
      if (line.includes('{')) indentLevel++;
      return indented;
    }).join('\n');
  }

  /**
   * Parse CSS into rules
   */
  public async parseCSS(css: string): Promise<CustomCSSRule[]> {
    const rules: CustomCSSRule[] = [];
    
    try {
      // Simple CSS parser (in production, use a proper CSS parser)
      const ruleRegex = /([^{}]+)\{([^{}]+)\}/g;
      let match;
      let ruleId = 0;

      while ((match = ruleRegex.exec(css)) !== null) {
        const selector = match[1].trim();
        const properties = match[2].trim();
        
        const rule: CustomCSSRule = {
          id: `rule_${ruleId++}`,
          selector,
          properties: this.parseProperties(properties),
          priority: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        rules.push(rule);
      }
    } catch (error) {
      console.error('CSS parsing failed:', error);
    }

    return rules;
  }

  /**
   * Extract CSS variables
   */
  public async extractVariables(css: string): Promise<CSSVariable[]> {
    const variables: CSSVariable[] = [];
    const varRegex = /--([a-zA-Z][a-zA-Z0-9_-]*)\s*:\s*([^;]+);/g;
    let match;

    while ((match = varRegex.exec(css)) !== null) {
      const name = match[1];
      const value = match[2].trim();
      
      variables.push({
        name,
        value,
        type: this.detectVariableType(value),
        isOverride: false,
      });
    }

    return variables;
  }

  /**
   * Extract media queries
   */
  public async extractMediaQueries(css: string): Promise<CSSMediaQuery[]> {
    const mediaQueries: CSSMediaQuery[] = [];
    const mediaRegex = /@media\s+([^{]+)\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
    let match;
    let mqId = 0;

    while ((match = mediaRegex.exec(css)) !== null) {
      const condition = match[1].trim();
      const content = match[2].trim();
      
      mediaQueries.push({
        id: `mq_${mqId++}`,
        condition,
        rules: await this.parseCSS(content),
        priority: 0,
      });
    }

    return mediaQueries;
  }

  /**
   * Analyze CSS performance
   */
  public async analyzePerformance(css: string): Promise<CSSPerformance> {
    const startTime = performance.now();
    
    // Simulate CSS parsing and rendering
    const parseTime = performance.now() - startTime;
    
    // Calculate performance metrics
    const fileSize = new Blob([css]).size;
    const ruleCount = (css.match(/\{[^}]*\}/g) || []).length;
    const selectorCount = (css.match(/[.#]?[a-zA-Z][a-zA-Z0-9_-]*(?=\s*\{)/g) || []).length;
    
    // Estimate performance impact
    let optimizationLevel: CSSPerformance['optimizationLevel'] = 'none';
    if (fileSize < 10 * 1024 && ruleCount < 50) {
      optimizationLevel = 'basic';
    } else if (fileSize < 50 * 1024 && ruleCount < 200) {
      optimizationLevel = 'advanced';
    } else if (fileSize < 100 * 1024 && ruleCount < 500) {
      optimizationLevel = 'maximum';
    }

    return {
      loadTime: parseTime,
      parseTime,
      renderTime: parseTime * 2, // Estimate
      memoryUsage: fileSize * 2, // Estimate
      optimizationLevel,
    };
  }

  /**
   * Analyze CSS compatibility
   */
  public async analyzeCompatibility(css: string): Promise<CSSCompatibility> {
    const browsers: CSSCompatibility['browsers'] = [
      { browser: 'Chrome', version: '90+', support: 'full' },
      { browser: 'Firefox', version: '88+', support: 'full' },
      { browser: 'Safari', version: '14+', support: 'full' },
      { browser: 'Edge', version: '90+', support: 'full' },
    ];

    // Check for modern CSS features
    const hasGrid = css.includes('grid');
    const hasFlexbox = css.includes('flex');
    const hasCustomProperties = css.includes('--');
    const hasCalc = css.includes('calc(');
    const hasTransforms = css.includes('transform');

    // Update browser support based on features
    if (hasGrid) {
      browsers.find((b: any) => b.browser === 'Safari')!.support = 'partial';
      browsers.find((b: any) => b.browser === 'Safari')!.notes = 'Grid support in older versions may be limited';
    }

    return {
      browsers,
      mobileSupport: true,
      accessibilityCompliant: !css.includes('outline: none') && !css.includes('outline: 0'),
      rtlSupport: css.includes('direction') || css.includes('text-align'),
    };
  }

  /**
   * Analyze CSS security
   */
  public async analyzeSecurity(css: string): Promise<CSSSecurity> {
    const warnings: string[] = [];
    
    // Check for unsafe selectors
    const hasUnsafeSelectors = this.config.forbiddenSelectors.some((selector: any) => 
      css.includes(selector)
    );
    
    // Check for unsafe properties
    const hasUnsafeProperties = this.config.forbiddenProperties.some((prop: any) => 
      css.includes(prop)
    );
    
    // Check for external references
    const hasExternalReferences = css.includes('url(') && 
      (css.includes('http://') || css.includes('https://'));
    
    // Check for inline styles
    const hasInlineStyles = css.includes('style=');
    
    // Determine risk level
    let riskLevel: CSSSecurity['riskLevel'] = 'low';
    if (hasUnsafeSelectors || hasUnsafeProperties) {
      riskLevel = 'high';
      warnings.push('CSS contains potentially unsafe selectors or properties');
    } else if (hasExternalReferences) {
      riskLevel = 'medium';
      warnings.push('CSS contains external references that may pose security risks');
    }

    return {
      hasUnsafeSelectors,
      hasUnsafeProperties,
      hasExternalReferences,
      hasInlineStyles,
      riskLevel,
      warnings,
    };
  }

  /**
   * Inject CSS into DOM
   */
  private injectIntoDOM(cssInjection: CSSInjection): void {
    const styleElement = document.createElement('style');
    styleElement.id = `css-injection-${cssInjection.id}`;
    styleElement.type = 'text/css';
    styleElement.textContent = cssInjection.css;
    styleElement.setAttribute('data-tenant-id', cssInjection.tenantId);
    styleElement.setAttribute('data-priority', cssInjection.priority.toString());
    
    if (cssInjection.scope) {
      styleElement.setAttribute('data-scope', cssInjection.scope.type);
      if (cssInjection.scope.value) {
        styleElement.setAttribute('data-scope-value', cssInjection.scope.value);
      }
    }

    document.head.appendChild(styleElement);
    this.injectedStyles.set(cssInjection.id, styleElement);
  }

  /**
   * Remove CSS from DOM
   */
  private removeFromDOM(id: string): void {
    const styleElement = this.injectedStyles.get(id);
    if (styleElement) {
      document.head.removeChild(styleElement);
      this.injectedStyles.delete(id);
    }
  }

  /**
   * Parse CSS properties
   */
  private parseProperties(propertiesString: string): any[] {
    const properties: any[] = [];
    const propRegex = /([a-zA-Z-]+)\s*:\s*([^;]+);?/g;
    let match;

    while ((match = propRegex.exec(propertiesString)) !== null) {
      const name = match[1].trim();
      const value = match[2].trim();
      const important = value.includes('!important');
      
      properties.push({
        name,
        value: value.replace(/\s*!important\s*/, ''),
        important,
      });
    }

    return properties;
  }

  /**
   * Detect variable type
   */
  private detectVariableType(value: string): CSSVariable['type'] {
    if (value.startsWith('#')) return 'color';
    if (value.includes('px') || value.includes('em') || value.includes('rem')) return 'size';
    if (value.includes('font')) return 'font';
    if (value.includes('margin') || value.includes('padding')) return 'spacing';
    if (value.includes('border')) return 'border';
    if (value.includes('shadow')) return 'shadow';
    return 'custom';
  }

  /**
   * Calculate CSS complexity
   */
  private calculateComplexity(css: string): 'low' | 'medium' | 'high' {
    const ruleCount = (css.match(/\{[^}]*\}/g) || []).length;
    const selectorCount = (css.match(/[.#]?[a-zA-Z][a-zA-Z0-9_-]*(?=\s*\{)/g) || []).length;
    const mediaQueryCount = (css.match(/@media/g) || []).length;
    const variableCount = (css.match(/--/g) || []).length;

    const complexity = ruleCount + selectorCount + mediaQueryCount + variableCount;
    
    if (complexity < 50) return 'low';
    if (complexity < 200) return 'medium';
    return 'high';
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `css_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get default performance
   */
  private getDefaultPerformance(): CSSPerformance {
    return {
      loadTime: 0,
      parseTime: 0,
      renderTime: 0,
      memoryUsage: 0,
      optimizationLevel: 'none',
    };
  }

  /**
   * Get default compatibility
   */
  private getDefaultCompatibility(): CSSCompatibility {
    return {
      browsers: [],
      mobileSupport: true,
      accessibilityCompliant: true,
      rtlSupport: false,
    };
  }

  /**
   * Get default security
   */
  private getDefaultSecurity(): CSSSecurity {
    return {
      hasUnsafeSelectors: false,
      hasUnsafeProperties: false,
      hasExternalReferences: false,
      hasInlineStyles: false,
      riskLevel: 'low',
      warnings: [],
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<CSSInjectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): CSSInjectionConfig {
    return this.config;
  }

  /**
   * Clear all injected styles
   */
  public clearAll(): void {
    this.injectedStyles.forEach((_: any, id: any) => {
      this.removeFromDOM(id);
    });
  }
}

// Export singleton instance
export const cssInjectionService = CSSInjectionService.getInstance();
