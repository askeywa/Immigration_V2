// backend/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/config';
import { AppError, ErrorFactory } from '../utils/errors';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Convert to AppError if it's not already
  const appError = err instanceof AppError ? err : ErrorFactory.fromError(err);
  
  let statusCode = appError.statusCode;
  let message = appError.message;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  }

  // Mongoose duplicate key error
  if (err.name === 'MongoServerError' && (err as import('mongodb').MongoServerError).code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value';
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  // JWT expired error
  if (err.name === 'TokenExpiredError') {
    statusCode = 400;
    message = 'Token expired';
  }

  // Log error details for debugging (server-side only)
  const log = require('../utils/logger').log;
  
  // Special handling for the "Cannot read properties of undefined (reading 'length')" error
  if (err.message && err.message.includes("Cannot read properties of undefined (reading 'length')")) {
    log.error('🔍 DEBUGGING: Length Property Error Detected:', {
      message: err.message,
      fullStack: err.stack,
      name: err.name,
      timestamp: new Date().toISOString(),
      url: req.url,
      method: req.method,
      headers: req.headers,
      query: req.query,
      body: req.body,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  } else {
    log.error('Application Error:', {
      message: err.message,
      stack: err.stack,
      name: err.name,
      timestamp: new Date().toISOString(),
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    code: appError.code,
    // SECURITY: Never expose stack traces to client, even in development
    ...(config.NODE_ENV === 'development' && { 
      debug: {
        name: err.name,
        timestamp: new Date().toISOString()
      }
    }),
  });
};

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;
export const asyncHandler = (fn: AsyncRouteHandler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};