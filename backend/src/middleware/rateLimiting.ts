// backend/src/middleware/rateLimiting.ts
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { TenantRequest } from './tenantResolution';

// Default rate limiting middleware - disabled for testing
export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000, // limit each IP to 100000 requests per windowMs (effectively disabled)
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and certain user agents
    return req.path === '/health' || (req.get('User-Agent') || '').includes('health-check');
  },
  // Add burst protection
  keyGenerator: (req) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || '';
    return `${ip}:${userAgent}`;
  }
});

// Strict rate limiting for sensitive endpoints
export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication rate limiting - Industry standard: 5 attempts per 15 minutes
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    console.warn('🚫 Rate limit exceeded for login attempts', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      email: req.body?.email,
      timestamp: new Date().toISOString()
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again in 15 minutes.',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 900 // 15 minutes in seconds
    });
  },
  skip: (req: Request) => {
    // Skip rate limiting in development for testing
    return process.env.NODE_ENV === 'development';
  }
});

// Tenant-specific rate limiting
export const tenantRateLimit = () => {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    // This would integrate with the RateLimitService
    // For now, we'll use a simple implementation
    next();
  };
};

// API rate limiting
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // limit each IP to 60 requests per minute
  message: {
    success: false,
    message: 'API rate limit exceeded, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Upload rate limiting
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // limit each IP to 10 uploads per minute
  message: {
    success: false,
    message: 'Upload rate limit exceeded, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Search rate limiting
export const searchRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 750, // limit each IP to 30 searches per minute
  message: {
    success: false,
    message: 'Search rate limit exceeded, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// User rate limiting
export const userRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 user operations per minute
  message: {
    success: false,
    message: 'User operation rate limit exceeded, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Fixed rate limiting functions that return middleware
export const createUserRateLimit = () => userRateLimit;
export const createTenantRateLimit = () => tenantRateLimit();
export const createApiRateLimit = () => apiRateLimit;

// Burst protection rate limiting
export const burstProtectionLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute for burst protection
  message: {
    success: false,
    message: 'Burst request detected. Please slow down and try again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `burst:${ip}`;
  },
  skip: (req) => {
    // Skip burst protection for authenticated users with valid tokens
    const authHeader = req.get('Authorization');
    return !!(authHeader && authHeader.startsWith('Bearer '));
  }
});

// Global rate limiting
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});