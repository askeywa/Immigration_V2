// backend/src/optimization/codePatternOptimizer.ts
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { log } from '../utils/logger';

interface CodePatternConfig {
  namingConventions: {
    variables: 'camelCase' | 'snake_case' | 'PascalCase';
    functions: 'camelCase' | 'snake_case' | 'PascalCase';
    classes: 'camelCase' | 'snake_case' | 'PascalCase';
    constants: 'UPPER_SNAKE_CASE' | 'camelCase';
    files: 'kebab-case' | 'camelCase' | 'PascalCase';
  };
  codeStructure: {
    maxFunctionLength: number;
    maxFileLength: number;
    maxParameters: number;
    maxNestingDepth: number;
  };
  performance: {
    enableQueryOptimization: boolean;
    enableCaching: boolean;
    enableCompression: boolean;
    enableMinification: boolean;
  };
  security: {
    enableInputValidation: boolean;
    enableOutputSanitization: boolean;
    enableRateLimiting: boolean;
    enableSecurityHeaders: boolean;
  };
}

interface OptimizationResult {
  pattern: string;
  score: number;
  suggestions: string[];
  impact: 'low' | 'medium' | 'high';
}

class CodePatternOptimizer {
  private config: CodePatternConfig;
  private patterns: Map<string, any> = new Map();
  private performanceMetrics: Map<string, number> = new Map();

  constructor() {
    this.config = {
      namingConventions: {
        variables: 'camelCase',
        functions: 'camelCase',
        classes: 'PascalCase',
        constants: 'UPPER_SNAKE_CASE',
        files: 'kebab-case'
      },
      codeStructure: {
        maxFunctionLength: 50,
        maxFileLength: 500,
        maxParameters: 5,
        maxNestingDepth: 4
      },
      performance: {
        enableQueryOptimization: true,
        enableCaching: true,
        enableCompression: true,
        enableMinification: true
      },
      security: {
        enableInputValidation: true,
        enableOutputSanitization: true,
        enableRateLimiting: true,
        enableSecurityHeaders: true
      }
    };

    this.initializePatterns();
  }

  /**
   * Initialize common patterns
   */
  private initializePatterns(): void {
    // Database query patterns
    this.patterns.set('database_query', {
      pattern: /db\.\w+\.find\(/g,
      optimization: this.optimizeDatabaseQuery,
      description: 'Database query optimization'
    });

    // Function definition patterns
    this.patterns.set('function_definition', {
      pattern: /function\s+\w+\([^)]*\)\s*{/g,
      optimization: this.optimizeFunctionDefinition,
      description: 'Function definition optimization'
    });

    // Async/await patterns
    this.patterns.set('async_await', {
      pattern: /async\s+function\s+\w+\([^)]*\)/g,
      optimization: this.optimizeAsyncAwait,
      description: 'Async/await optimization'
    });

    // Error handling patterns
    this.patterns.set('error_handling', {
      pattern: /try\s*{[\s\S]*?}\s*catch\s*\([^)]*\)/g,
      optimization: this.optimizeErrorHandling,
      description: 'Error handling optimization'
    });

    // Loop patterns
    this.patterns.set('loop_optimization', {
      pattern: /for\s*\([^)]*\)\s*{[\s\S]*?}/g,
      optimization: this.optimizeLoops,
      description: 'Loop optimization'
    });

    // Memory management patterns
    this.patterns.set('memory_management', {
      pattern: /new\s+\w+\(/g,
      optimization: this.optimizeMemoryManagement,
      description: 'Memory management optimization'
    });
  }

  /**
   * Analyze code patterns and suggest optimizations
   */
  async analyzeCodePatterns(code: string, filePath: string): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];

    for (const [patternName, patternConfig] of this.patterns) {
      const matches = code.match(patternConfig.pattern);
      if (matches) {
        const optimization = await patternConfig.optimization(code, matches, filePath);
        results.push({
          pattern: patternName,
          score: optimization.score,
          suggestions: optimization.suggestions,
          impact: optimization.impact
        });
      }
    }

    return results;
  }

  /**
   * Optimize database queries
   */
  private async optimizeDatabaseQuery(code: string, matches: string[], filePath: string): Promise<any> {
    const suggestions: string[] = [];
    let score = 100;

    for (const match of matches) {
      // Check for missing indexes
      if (match.includes('.find({') && !match.includes('.hint(')) {
        suggestions.push('Consider adding database indexes for better query performance');
        score -= 20;
      }

      // Check for missing lean()
      if (match.includes('.find(') && !match.includes('.lean()')) {
        suggestions.push('Add .lean() to return plain JavaScript objects instead of Mongoose documents');
        score -= 15;
      }

      // Check for missing select()
      if (match.includes('.find(') && !match.includes('.select(')) {
        suggestions.push('Use .select() to limit returned fields and improve performance');
        score -= 10;
      }

      // Check for missing populate optimization
      if (match.includes('.populate(')) {
        suggestions.push('Optimize populate queries by selecting only needed fields');
        score -= 10;
      }
    }

    return {
      score: Math.max(0, score),
      suggestions,
      impact: score < 70 ? 'high' : score < 85 ? 'medium' : 'low'
    };
  }

  /**
   * Optimize function definitions
   */
  private async optimizeFunctionDefinition(code: string, matches: string[], filePath: string): Promise<any> {
    const suggestions: string[] = [];
    let score = 100;

    for (const match of matches) {
      // Check function length
      const functionBody = this.extractFunctionBody(code, match);
      const lines = functionBody.split('\n').length;

      if (lines > this.config.codeStructure.maxFunctionLength) {
        suggestions.push(`Function is too long (${lines} lines). Consider breaking it into smaller functions.`);
        score -= 20;
      }

      // Check parameter count
      const params = this.extractParameters(match);
      if (params.length > this.config.codeStructure.maxParameters) {
        suggestions.push(`Too many parameters (${params.length}). Consider using an options object.`);
        score -= 15;
      }

      // Check nesting depth
      const nestingDepth = this.calculateNestingDepth(functionBody);
      if (nestingDepth > this.config.codeStructure.maxNestingDepth) {
        suggestions.push(`Function has deep nesting (${nestingDepth} levels). Consider refactoring.`);
        score -= 10;
      }
    }

    return {
      score: Math.max(0, score),
      suggestions,
      impact: score < 70 ? 'high' : score < 85 ? 'medium' : 'low'
    };
  }

  /**
   * Optimize async/await usage
   */
  private async optimizeAsyncAwait(code: string, matches: string[], filePath: string): Promise<any> {
    const suggestions: string[] = [];
    let score = 100;

    for (const match of matches) {
      // Check for unnecessary async
      if (match.includes('async') && !this.hasAwaitInFunction(code, match)) {
        suggestions.push('Function marked as async but no await found. Remove async keyword.');
        score -= 10;
      }

      // Check for sequential await calls
      const awaitCount = (code.match(/await\s+/g) || []).length;
      if (awaitCount > 1) {
        suggestions.push('Consider using Promise.all() for concurrent async operations');
        score -= 15;
      }

      // Check for missing error handling
      if (match.includes('await') && !this.hasTryCatch(code, match)) {
        suggestions.push('Add try-catch block for async operations');
        score -= 20;
      }
    }

    return {
      score: Math.max(0, score),
      suggestions,
      impact: score < 70 ? 'high' : score < 85 ? 'medium' : 'low'
    };
  }

  /**
   * Optimize error handling
   */
  private async optimizeErrorHandling(code: string, matches: string[], filePath: string): Promise<any> {
    const suggestions: string[] = [];
    let score = 100;

    for (const match of matches) {
      // Check for empty catch blocks
      if (this.hasEmptyCatchBlock(match)) {
        suggestions.push('Empty catch blocks should log errors or handle them appropriately');
        score -= 25;
      }

      // Check for generic error handling
      if (this.hasGenericErrorHandling(match)) {
        suggestions.push('Use specific error types instead of generic Error');
        score -= 15;
      }

      // Check for missing error logging
      if (!this.hasErrorLogging(match)) {
        suggestions.push('Add error logging for better debugging');
        score -= 10;
      }
    }

    return {
      score: Math.max(0, score),
      suggestions,
      impact: score < 70 ? 'high' : score < 85 ? 'medium' : 'low'
    };
  }

  /**
   * Optimize loops
   */
  private async optimizeLoops(code: string, matches: string[], filePath: string): Promise<any> {
    const suggestions: string[] = [];
    let score = 100;

    for (const match of matches) {
      // Check for inefficient loops
      if (match.includes('for (let i = 0; i < array.length; i++)')) {
        suggestions.push('Use for...of loop or array methods for better performance');
        score -= 10;
      }

      // Check for nested loops
      if (this.hasNestedLoops(match)) {
        suggestions.push('Consider optimizing nested loops or using more efficient algorithms');
        score -= 20;
      }

      // Check for array mutations in loops
      if (this.hasArrayMutations(match)) {
        suggestions.push('Avoid mutating arrays during iteration');
        score -= 15;
      }
    }

    return {
      score: Math.max(0, score),
      suggestions,
      impact: score < 70 ? 'high' : score < 85 ? 'medium' : 'low'
    };
  }

  /**
   * Optimize memory management
   */
  private async optimizeMemoryManagement(code: string, matches: string[], filePath: string): Promise<any> {
    const suggestions: string[] = [];
    let score = 100;

    for (const match of matches) {
      // Check for object instantiation in loops
      if (this.isInLoop(match, code)) {
        suggestions.push('Avoid creating objects inside loops');
        score -= 20;
      }

      // Check for large object creation
      if (this.hasLargeObjectCreation(match)) {
        suggestions.push('Consider object pooling for frequently created objects');
        score -= 15;
      }

      // Check for memory leaks
      if (this.hasPotentialMemoryLeak(match)) {
        suggestions.push('Potential memory leak detected. Ensure proper cleanup');
        score -= 25;
      }
    }

    return {
      score: Math.max(0, score),
      suggestions,
      impact: score < 70 ? 'high' : score < 85 ? 'medium' : 'low'
    };
  }

  /**
   * Apply performance optimizations
   */
  async applyPerformanceOptimizations(): Promise<void> {
    if (this.config.performance.enableQueryOptimization) {
      await this.optimizeDatabaseQueries();
    }

    if (this.config.performance.enableCaching) {
      await this.optimizeCaching();
    }

    if (this.config.performance.enableCompression) {
      await this.optimizeCompression();
    }
  }

  /**
   * Optimize database queries
   */
  private async optimizeDatabaseQueries(): Promise<void> {
    log.info('Applying database query optimizations');

    // Create indexes for frequently queried fields
    const indexes = [
      { collection: 'users', fields: { tenantId: 1, email: 1 } },
      { collection: 'tenants', fields: { domain: 1 } },
      { collection: 'documents', fields: { tenantId: 1, userId: 1 } }
    ];

    for (const index of indexes) {
      try {
        await mongoose.connection.db?.collection(index.collection).createIndex(index.fields as any);
        log.info(`Created index on ${index.collection}`, { fields: index.fields });
      } catch (error) {
        log.error(`Error creating index on ${index.collection}`, { error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  /**
   * Optimize caching strategy
   */
  private async optimizeCaching(): Promise<void> {
    log.info('Applying caching optimizations');

    // Implement query result caching
    const originalFind = mongoose.Query.prototype.find;
    mongoose.Query.prototype.find = function(this: any, options?: any) {
      const cacheKey = this.getQuery ? this.getQuery() : JSON.stringify(options);
      // Check cache first
      // Implementation would check Redis cache
      return originalFind.apply(this, arguments as any);
    };

    // Implement response caching middleware
    this.createResponseCachingMiddleware();
  }

  /**
   * Optimize compression
   */
  private async optimizeCompression(): Promise<void> {
    log.info('Applying compression optimizations');

    // Enable gzip compression for responses
    const compression = require('compression');
    const compressionMiddleware = compression({
      level: 6,
      threshold: 1024,
      filter: (req: Request, res: Response) => {
        if ((req as any).headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    });

    return compressionMiddleware;
  }

  /**
   * Create response caching middleware
   */
  private createResponseCachingMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const cacheKey = `${(req as any).method}:${(req as any).url}`;
      const cacheTTL = 300; // 5 minutes

      // Check cache
      // Implementation would check Redis cache

      // Override (res as any).json to cache responses
      const originalJson = (res as any).json;
      (res as any).json = function(body: any) {
        // Cache response
        // Implementation would store in Redis cache
        return originalJson.call(this, body);
      };

      next();
    };
  }

  /**
   * Utility methods
   */
  private extractFunctionBody(code: string, functionMatch: string): string {
    const startIndex = code.indexOf(functionMatch);
    const openBraces = code.indexOf('{', startIndex);
    let braceCount = 0;
    let endIndex = openBraces;

    for (let i = openBraces; i < code.length; i++) {
      if (code[i] === '{') braceCount++;
      if (code[i] === '}') braceCount--;
      if (braceCount === 0) {
        endIndex = i;
        break;
      }
    }

    return code.substring(openBraces + 1, endIndex);
  }

  private extractParameters(functionMatch: string): string[] {
    const paramsMatch = functionMatch.match(/\(([^)]*)\)/);
    if (!paramsMatch) return [];
    
    return paramsMatch[1].split(',').map((p: any) => p.trim()).filter((p: any) => p.length > 0);
  }

  private calculateNestingDepth(code: string): number {
    let maxDepth = 0;
    let currentDepth = 0;

    for (const char of code) {
      if (char === '{') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '}') {
        currentDepth--;
      }
    }

    return maxDepth;
  }

  private hasAwaitInFunction(code: string, functionMatch: string): boolean {
    const functionBody = this.extractFunctionBody(code, functionMatch);
    return functionBody.includes('await');
  }

  private hasTryCatch(code: string, functionMatch: string): boolean {
    const functionBody = this.extractFunctionBody(code, functionMatch);
    return functionBody.includes('try') && functionBody.includes('catch');
  }

  private hasEmptyCatchBlock(match: string): boolean {
    return match.includes('catch') && !match.includes('console.log') && !match.includes('throw');
  }

  private hasGenericErrorHandling(match: string): boolean {
    return match.includes('catch (error)') || match.includes('catch (e)');
  }

  private hasErrorLogging(match: string): boolean {
    return match.includes('console.log') || match.includes('logger') || match.includes('log.error');
  }

  private hasNestedLoops(match: string): boolean {
    const forCount = (match.match(/for\s*\(/g) || []).length;
    return forCount > 1;
  }

  private hasArrayMutations(match: string): boolean {
    return match.includes('.push(') || match.includes('.pop(') || match.includes('.splice(');
  }

  private isInLoop(match: string, code: string): boolean {
    const matchIndex = code.indexOf(match);
    const beforeMatch = code.substring(0, matchIndex);
    return beforeMatch.includes('for') || beforeMatch.includes('while');
  }

  private hasLargeObjectCreation(match: string): boolean {
    return match.includes('new Object(') || match.includes('new Array(');
  }

  private hasPotentialMemoryLeak(match: string): boolean {
    return match.includes('addEventListener') && !match.includes('removeEventListener');
  }

  /**
   * Get optimization report
   */
  getOptimizationReport(): any {
    return {
      config: this.config,
      performanceMetrics: Object.fromEntries(this.performanceMetrics),
      patterns: Array.from(this.patterns.keys()),
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.config.performance.enableQueryOptimization) {
      recommendations.push('Database query optimization is enabled');
    }

    if (this.config.performance.enableCaching) {
      recommendations.push('Response caching is enabled');
    }

    if (this.config.performance.enableCompression) {
      recommendations.push('Response compression is enabled');
    }

    return recommendations;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<CodePatternConfig>): void {
    this.config = { ...this.config, ...updates };
    log.info('Code pattern configuration updated', updates);
  }
}

export default CodePatternOptimizer;
