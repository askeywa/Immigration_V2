// Enterprise-grade Logging Utility
// Provides structured logging with different levels, context, and performance tracking

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  userId?: string;
  tenantId?: string;
  requestId?: string;
  duration?: number;
  error?: Error;
}

class EnterpriseLogger {
  private currentLevel: LogLevel = LogLevel.INFO;
  private maxEntries: number = 1000;
  private logEntries: LogEntry[] = [];
  private performanceMetrics: Map<string, number> = new Map();

  constructor() {
    // Set log level based on environment
    if (process.env.NODE_ENV === 'development') {
      this.currentLevel = LogLevel.DEBUG;
    } else if (process.env.NODE_ENV === 'production') {
      this.currentLevel = LogLevel.WARN;
    }
  }

  /**
   * Set the logging level
   */
  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return level <= this.currentLevel;
  }

  /**
   * Format log entry for console output
   */
  private formatLogEntry(entry: LogEntry): string {
    const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
    const levelName = levelNames[entry.level];
    
    let formatted = `[${entry.timestamp}] ${levelName}: ${entry.message}`;
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      formatted += ` | Context: ${JSON.stringify(entry.context)}`;
    }
    
    if (entry.userId) {
      formatted += ` | User: ${entry.userId}`;
    }
    
    if (entry.tenantId) {
      formatted += ` | Tenant: ${entry.tenantId}`;
    }
    
    if (entry.requestId) {
      formatted += ` | Request: ${entry.requestId}`;
    }
    
    if (entry.duration) {
      formatted += ` | Duration: ${entry.duration}ms`;
    }
    
    return formatted;
  }

  /**
   * Add log entry to storage
   */
  private addLogEntry(entry: LogEntry): void {
    this.logEntries.push(entry);
    
    // Keep only the most recent entries
    if (this.logEntries.length > this.maxEntries) {
      this.logEntries = this.logEntries.slice(-this.maxEntries);
    }
  }

  /**
   * Output log to console with appropriate method
   */
  private outputLog(entry: LogEntry): void {
    const formatted = this.formatLogEntry(entry);
    
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(formatted);
        if (entry.error) {
          console.error(entry.error);
        }
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
    }
  }

  /**
   * Create a log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      userId: context?.userId,
      tenantId: context?.tenantId,
      requestId: context?.requestId,
      duration: context?.duration
    };
  }

  /**
   * Log an error
   */
  error(message: string, context?: Record<string, any>, error?: Error): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error);
    this.addLogEntry(entry);
    this.outputLog(entry);
  }

  /**
   * Log a warning
   */
  warn(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const entry = this.createLogEntry(LogLevel.WARN, message, context);
    this.addLogEntry(entry);
    this.outputLog(entry);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const entry = this.createLogEntry(LogLevel.INFO, message, context);
    this.addLogEntry(entry);
    this.outputLog(entry);
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
    this.addLogEntry(entry);
    this.outputLog(entry);
  }

  /**
   * Start performance timing
   */
  time(label: string): void {
    this.performanceMetrics.set(label, Date.now());
  }

  /**
   * End performance timing and log duration
   */
  timeEnd(label: string, message?: string): void {
    const startTime = this.performanceMetrics.get(label);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.performanceMetrics.delete(label);
      
      const logMessage = message || `Performance: ${label}`;
      this.info(logMessage, { duration, label });
    }
  }

  /**
   * Get recent log entries
   */
  getRecentEntries(count: number = 100): LogEntry[] {
    return this.logEntries.slice(-count);
  }

  /**
   * Get log entries by level
   */
  getEntriesByLevel(level: LogLevel): LogEntry[] {
    return this.logEntries.filter(entry => entry.level === level);
  }

  /**
   * Get error entries
   */
  getErrors(): LogEntry[] {
    return this.getEntriesByLevel(LogLevel.ERROR);
  }

  /**
   * Get warning entries
   */
  getWarnings(): LogEntry[] {
    return this.getEntriesByLevel(LogLevel.WARN);
  }

  /**
   * Clear all log entries
   */
  clear(): void {
    this.logEntries = [];
    this.performanceMetrics.clear();
  }

  /**
   * Get logging statistics
   */
  getStats(): {
    totalEntries: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    debugCount: number;
    recentErrorRate: number;
  } {
    const total = this.logEntries.length;
    const recentEntries = this.logEntries.slice(-100); // Last 100 entries
    const recentErrors = recentEntries.filter(e => e.level === LogLevel.ERROR).length;
    
    return {
      totalEntries: total,
      errorCount: this.getEntriesByLevel(LogLevel.ERROR).length,
      warningCount: this.getEntriesByLevel(LogLevel.WARN).length,
      infoCount: this.getEntriesByLevel(LogLevel.INFO).length,
      debugCount: this.getEntriesByLevel(LogLevel.DEBUG).length,
      recentErrorRate: recentEntries.length > 0 ? (recentErrors / recentEntries.length) * 100 : 0
    };
  }

  /**
   * Export logs for analysis
   */
  exportLogs(): string {
    return JSON.stringify(this.logEntries, null, 2);
  }

  /**
   * Health check for logging system
   */
  healthCheck(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    errorRate: number;
    memoryUsage: number;
    recentErrors: number;
  } {
    const stats = this.getStats();
    const recentErrors = this.logEntries
      .filter(e => e.level === LogLevel.ERROR)
      .filter(e => {
        const entryTime = new Date(e.timestamp).getTime();
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        return entryTime > oneHourAgo;
      }).length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (recentErrors > 10) {
      status = 'unhealthy';
    } else if (recentErrors > 5 || stats.recentErrorRate > 10) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      status,
      errorRate: stats.recentErrorRate,
      memoryUsage: this.logEntries.length / this.maxEntries,
      recentErrors
    };
  }
}

// Export singleton instance
export const log = new EnterpriseLogger();

// Export the class for testing
export { EnterpriseLogger };