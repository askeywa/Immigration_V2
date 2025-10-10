import { Response, Request, NextFunction } from 'express';

/**
 * Standard API Response Interface
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code?: string;
    details?: any;
    stack?: string;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: PaginationMeta;
    performance?: PerformanceMeta;
  };
}

/**
 * Pagination metadata interface
 */
export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Performance metadata interface
 */
export interface PerformanceMeta {
  executionTime: number;
  queryCount?: number;
  cacheHits?: number;
}

/**
 * Success response builder
 */
export const successResponse = <T>(
  message: string = 'Success',
  data?: T,
  meta?: Partial<ApiResponse['meta']>
): ApiResponse<T> => {
  return {
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
};

/**
 * Error response builder
 */
export const errorResponse = (
  message: string = 'An error occurred',
  details?: string | unknown,
  code?: string,
  stack?: string
): ApiResponse => {
  const response: ApiResponse = {
    success: false,
    message,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  if (details || code || stack) {
    response.error = {
      ...(code && { code }),
      ...(details !== undefined && { details }),
      ...(stack && process.env.NODE_ENV === 'development' && { stack }),
    };
  }

  return response;
};

/**
 * Paginated response builder
 */
export const paginatedResponse = <T>(
  data: T[],
  totalItems: number,
  currentPage: number,
  itemsPerPage: number,
  message: string = 'Data retrieved successfully'
): ApiResponse<T[]> => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginationMeta: PaginationMeta = {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };

  return successResponse(message, data, { pagination: paginationMeta });
};

/**
 * Created response (201)
 */
export const createdResponse = <T>(
  res: Response,
  message: string = 'Resource created successfully',
  data?: T,
  meta?: Partial<ApiResponse['meta']>
): Response => {
  return (res as any).status(201).json(successResponse(message, data, meta));
};

/**
 * OK response (200)
 */
export const okResponse = <T>(
  res: Response,
  message: string = 'Success',
  data?: T,
  meta?: Partial<ApiResponse['meta']>
): Response => {
  return (res as any).status(200).json(successResponse(message, data, meta));
};

/**
 * No content response (204)
 */
export const noContentResponse = (res: Response): Response => {
  return (res as any).status(204).send();
};

/**
 * Bad request response (400)
 */
export const badRequestResponse = (
  res: Response,
  message: string = 'Bad request',
  details?: any
): Response => {
  return (res as any).status(400).json(errorResponse(message, details, 'BAD_REQUEST'));
};

/**
 * Unauthorized response (401)
 */
export const unauthorizedResponse = (
  res: Response,
  message: string = 'Unauthorized access'
): Response => {
  return (res as any).status(401).json(errorResponse(message, null, 'UNAUTHORIZED'));
};

/**
 * Forbidden response (403)
 */
export const forbiddenResponse = (
  res: Response,
  message: string = 'Access forbidden'
): Response => {
  return (res as any).status(403).json(errorResponse(message, null, 'FORBIDDEN'));
};

/**
 * Not found response (404)
 */
export const notFoundResponse = (
  res: Response,
  message: string = 'Resource not found'
): Response => {
  return (res as any).status(404).json(errorResponse(message, null, 'NOT_FOUND'));
};

/**
 * Conflict response (409)
 */
export const conflictResponse = (
  res: Response,
  message: string = 'Resource conflict',
  details?: any
): Response => {
  return (res as any).status(409).json(errorResponse(message, details, 'CONFLICT'));
};

/**
 * Unprocessable entity response (422)
 */
export const unprocessableEntityResponse = (
  res: Response,
  message: string = 'Unprocessable entity',
  details?: any
): Response => {
  return (res as any).status(422).json(errorResponse(message, details, 'UNPROCESSABLE_ENTITY'));
};

/**
 * Too many requests response (429)
 */
export const tooManyRequestsResponse = (
  res: Response,
  message: string = 'Too many requests'
): Response => {
  return (res as any).status(429).json(errorResponse(message, null, 'TOO_MANY_REQUESTS'));
};

/**
 * Internal server error response (500)
 */
export const internalServerErrorResponse = (
  res: Response,
  message: string = 'Internal server error',
  error?: Error
): Response => {
  return (res as any).status(500).json(errorResponse(
    message, 
    error?.message, 
    'INTERNAL_SERVER_ERROR',
    error?.stack
  ));
};

/**
 * Service unavailable response (503)
 */
export const serviceUnavailableResponse = (
  res: Response,
  message: string = 'Service unavailable'
): Response => {
  return (res as any).status(503).json(errorResponse(message, null, 'SERVICE_UNAVAILABLE'));
};

/**
 * Paginated response helper with Express Response
 */
export const sendPaginatedResponse = <T>(
  res: Response,
  data: T[],
  totalItems: number,
  currentPage: number,
  itemsPerPage: number,
  message?: string
): Response => {
  return (res as any).status(200).json(
    paginatedResponse(data, totalItems, currentPage, itemsPerPage, message)
  );
};

/**
 * Handle async route errors
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Response helper class for consistent API responses
 */
export class ResponseHelper {
  private res: Response;
  private startTime?: number;

  constructor(res: Response, startTime?: number) {
    this.res = res;
    this.startTime = startTime;
  }

  /**
   * Calculate performance metrics
   */
  private getPerformanceMeta(): PerformanceMeta | undefined {
    if (!this.startTime) return undefined;

    return {
      executionTime: Date.now() - this.startTime,
    };
  }

  /**
   * Send success response
   */
  success<T>(message: string, data?: T, statusCode: number = 200): Response {
    const meta = {
      performance: this.getPerformanceMeta(),
    };

    return (this as any).res.status(statusCode).json(successResponse(message, data, meta));
  }

  /**
   * Send error response
   */
  error(message: string, statusCode: number = 500, details?: any, code?: string): Response {
    return (this as any).res.status(statusCode).json(errorResponse(message, details, code));
  }

  /**
   * Send created response
   */
  created<T>(message: string, data?: T): Response {
    return this.success(message, data, 201);
  }

  /**
   * Send no content response
   */
  noContent(): Response {
    return (this as any).res.status(204).send();
  }

  /**
   * Send paginated response
   */
  paginated<T>(
    data: T[],
    totalItems: number,
    currentPage: number,
    itemsPerPage: number,
    message?: string
  ): Response {
    const response = paginatedResponse(data, totalItems, currentPage, itemsPerPage, message);
    
    // Add performance metadata
    if (this.startTime) {
      response.meta!.performance = this.getPerformanceMeta();
    }

    return (this as any).res.status(200).json(response);
  }

  /**
   * Send validation error response
   */
  validationError(errors: any[]): Response {
    return (this as any).res.status(400).json(errorResponse(
      'Validation failed',
      { errors },
      'VALIDATION_ERROR'
    ));
  }
}

/**
 * Create response helper instance
 */
export const createResponseHelper = (res: Response, startTime?: number): ResponseHelper => {
  return new ResponseHelper(res, startTime);
};

/**
 * Standard HTTP status codes
 */
export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // Redirection
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,

  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Error codes for consistent error handling
 */
export const ERROR_CODES = {
  // Authentication & Authorization
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  ACCESS_DENIED: 'ACCESS_DENIED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_VALUE: 'INVALID_VALUE',

  // Resource Management
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  RESOURCE_LOCKED: 'RESOURCE_LOCKED',

  // Business Logic
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  FEATURE_DISABLED: 'FEATURE_DISABLED',

  // System
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  MAINTENANCE_MODE: 'MAINTENANCE_MODE',

  // File Operations
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
} as const;

/**
 * Success message templates
 */
export const SUCCESS_MESSAGES = {
  // Authentication
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  REGISTRATION_SUCCESS: 'Registration completed successfully',
  PASSWORD_RESET_SUCCESS: 'Password reset successfully',
  EMAIL_VERIFIED: 'Email verified successfully',

  // User Management
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  PASSWORD_CHANGED: 'Password changed successfully',

  // General Operations
  DATA_RETRIEVED: 'Data retrieved successfully',
  OPERATION_COMPLETED: 'Operation completed successfully',
  SETTINGS_SAVED: 'Settings saved successfully',
  FILE_UPLOADED: 'File uploaded successfully',
  EMAIL_SENT: 'Email sent successfully',

  // Immigration Specific
  PROFILE_CREATED: 'Immigration profile created successfully',
  STATUS_UPDATED: 'Status updated successfully',
  DOCUMENT_UPLOADED: 'Document uploaded successfully',
  APPLICATION_SUBMITTED: 'Application submitted successfully',
} as const;

/**
 * Error message templates
 */
export const ERROR_MESSAGES = {
  // Authentication
  INVALID_CREDENTIALS: 'Invalid email or password',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'You do not have permission to access this resource',
  TOKEN_EXPIRED: 'Your session has expired. Please login again',

  // Validation
  VALIDATION_FAILED: 'Please check your input and try again',
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PASSWORD: 'Password does not meet requirements',

  // Resource Management
  NOT_FOUND: 'The requested resource was not found',
  ALREADY_EXISTS: 'A resource with this information already exists',
  CONFLICT: 'This operation conflicts with the current state',

  // System
  INTERNAL_ERROR: 'An internal server error occurred',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable',
  RATE_LIMIT: 'Too many requests. Please try again later',
  MAINTENANCE: 'The system is currently under maintenance',

  // File Operations
  FILE_TOO_LARGE: 'File size exceeds the maximum allowed limit',
  INVALID_FILE_TYPE: 'This file type is not supported',
  UPLOAD_FAILED: 'File upload failed. Please try again',
} as const;

/**
 * Express middleware to add response helpers
 */
export const responseMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Add response helper methods to res object
  (res as any).success = function<T>(message: string, data?: T, statusCode: number = 200) {
    return this.status(statusCode).json(successResponse(message, data, {
      performance: { executionTime: Date.now() - startTime }
    }));
  };

  (res as any).error = function(message: string, statusCode: number = 500, details?: any, code?: string) {
    return this.status(statusCode).json(errorResponse(message, details, code));
  };

  (res as any).paginated = function<T>(
    data: T[],
    totalItems: number,
    currentPage: number,
    itemsPerPage: number,
    message?: string
  ) {
    const response = paginatedResponse(data, totalItems, currentPage, itemsPerPage, message);
    response.meta!.performance = { executionTime: Date.now() - startTime };
    return this.status(200).json(response);
  };

  next();
};

// Extend Express Response interface
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Response {
      success<T>(message: string, data?: T, statusCode?: number): Response;
      error(message: string, statusCode?: number, details?: any, code?: string): Response;
      paginated<T>(
        data: T[],
        totalItems: number,
        currentPage: number,
        itemsPerPage: number,
        message?: string
      ): Response;
    }
  }
}