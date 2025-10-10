// backend/src/utils/errors.ts

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;
  public readonly details?: any;

  constructor(message: string, statusCode: number = 500, code?: string, isOperational: boolean = true, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
    
    this.name = this.constructor.name;
  }
}

/**
 * Validation error class
 */
export class ValidationError extends AppError {
  public readonly field?: string;
  public readonly value?: any;

  constructor(message: string, field?: string, value?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
    this.value = value;
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

/**
 * Conflict error class
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

/**
 * Rate limit error class
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

/**
 * Database error class
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

/**
 * External service error class
 */
export class ExternalServiceError extends AppError {
  constructor(message: string = 'External service error') {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR');
  }
}

/**
 * Error factory for creating appropriate error types
 */
export class ErrorFactory {
  static validation(message: string, field?: string, value?: any): ValidationError {
    return new ValidationError(message, field, value);
  }

  static authentication(message: string = 'Authentication failed'): AuthenticationError {
    return new AuthenticationError(message);
  }

  static authorization(message: string = 'Access denied'): AuthorizationError {
    return new AuthorizationError(message);
  }

  static notFound(message: string = 'Resource not found'): NotFoundError {
    return new NotFoundError(message);
  }

  static conflict(message: string = 'Resource conflict'): ConflictError {
    return new ConflictError(message);
  }

  static rateLimit(message: string = 'Too many requests'): RateLimitError {
    return new RateLimitError(message);
  }

  static database(message: string = 'Database operation failed'): DatabaseError {
    return new DatabaseError(message);
  }

  static externalService(message: string = 'External service error'): ExternalServiceError {
    return new ExternalServiceError(message);
  }

  static fromError(error: any): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(error instanceof Error ? (error as any).message : String(error), 500, 'INTERNAL_ERROR');
    }

    return new AppError(String(error), 500, 'INTERNAL_ERROR');
  }
}
