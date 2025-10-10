// backend/src/utils/sanitization.ts
import { Request, Response, NextFunction } from 'express';
// Simple HTML sanitization without external dependencies

export interface SanitizedRequest extends Request {
  sanitizedBody?: any;
  sanitizedQuery?: any;
  sanitizedParams?: any;
}

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHTML(input: string): string {
  if (typeof input !== 'string') return input;
  
  // Simple HTML sanitization - remove dangerous tags and attributes
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/vbscript:/gi, '') // Remove vbscript: URLs
    .replace(/data:/gi, '') // Remove data: URLs
    .replace(/<[^>]*>/g, ''); // Remove all remaining HTML tags
}

/**
 * Sanitize object properties recursively
 */
export function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeHTML(obj);
  }
  
  if (Array.isArray(obj)) {
    return (obj as any).map((item: any) => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip sensitive fields that shouldn't be sanitized
      if (key === 'password' || key === 'token' || key === 'secret') {
        (sanitized as any)[key] = value;
      } else {
        (sanitized as any)[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Sanitize request body middleware
 */
export function sanitizeRequestBody(req: SanitizedRequest, res: Response, next: NextFunction) {
  if ((req as any).body && typeof (req as any).body === 'object') {
    (req as any).sanitizedBody = sanitizeObject((req as any).body);
    (req as any).body = (req as any).sanitizedBody;
  }
  next();
}

/**
 * Sanitize request query middleware
 */
export function sanitizeRequestQuery(req: SanitizedRequest, res: Response, next: NextFunction) {
  if ((req as any).query && typeof (req as any).query === 'object') {
    (req as any).sanitizedQuery = sanitizeObject((req as any).query);
    (req as any).query = (req as any).sanitizedQuery;
  }
  next();
}

/**
 * Sanitize request params middleware
 */
export function sanitizeRequestParams(req: SanitizedRequest, res: Response, next: NextFunction) {
  if ((req as any).params && typeof (req as any).params === 'object') {
    (req as any).sanitizedParams = sanitizeObject((req as any).params);
    (req as any).params = (req as any).sanitizedParams;
  }
  next();
}

/**
 * Complete request sanitization middleware
 */
export function sanitizeRequest(req: SanitizedRequest, res: Response, next: NextFunction) {
  sanitizeRequestBody(req, res, () => {
    sanitizeRequestQuery(req, res, () => {
      sanitizeRequestParams(req, res, next);
    });
  });
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') return '';
  
  // Basic email validation and sanitization
  const sanitized = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }
  
  return sanitized;
}

/**
 * Validate and sanitize MongoDB ObjectId
 */
export function sanitizeObjectId(id: string): string {
  if (typeof id !== 'string') return '';
  
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  if (!objectIdRegex.test(id)) {
    throw new Error('Invalid ObjectId format');
  }
  
  return id.toLowerCase();
}

/**
 * Validate and sanitize pagination parameters
 */
export function sanitizePagination(page?: string | number, limit?: string | number): { page: number; limit: number } {
  const pageNum = typeof page === 'string' ? parseInt(page, 10) : (page || 1);
  const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : (limit || 10);
  
  if (isNaN(pageNum) || pageNum < 1) {
    throw new Error('Invalid page number');
  }
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    throw new Error('Invalid limit - must be between 1 and 100');
  }
  
  return { page: pageNum, limit: limitNum };
}
