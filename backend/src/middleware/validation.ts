// backend/src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';

export const validateRequest = (validations: any[] = []) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Run validations if provided
      for (const validation of validations) {
        await validation.run(req);
      }
      
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return (res as any).status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Common validation rules
export const validateObjectId = (field: string = 'id') => {
  return param(field).isMongoId().withMessage('Invalid ID format');
};

export const validateEmail = (field: string = 'email') => {
  return body(field).isEmail().normalizeEmail().withMessage('Invalid email format');
};

export const validatePassword = (field: string = 'password') => {
  return body(field)
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
};

export const validateTenantName = (field: string = 'name') => {
  return body(field)
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Tenant name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Tenant name can only contain letters, numbers, spaces, hyphens, and underscores');
};

export const validateSubdomain = (field: string = 'subdomain') => {
  return body(field)
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Subdomain must be between 3 and 30 characters')
    .matches(/^[a-z0-9\-]+$/)
    .withMessage('Subdomain can only contain lowercase letters, numbers, and hyphens')
    .not()
    .matches(/^\-|\-$/)
    .withMessage('Subdomain cannot start or end with a hyphen');
};

export const validateDomain = (field: string = 'domain') => {
  return body(field)
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Domain must be between 3 and 255 characters')
    .matches(/^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/)
    .withMessage('Invalid domain format');
};

export const validatePhoneNumber = (field: string = 'phoneNumber') => {
  return body(field)
    .optional()
    .trim()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Invalid phone number format');
};

export const validateURL = (field: string = 'url') => {
  return body(field)
    .optional()
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('Invalid URL format');
};

export const validatePagination = () => {
  return [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('sortBy')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Sort field must be between 1 and 50 characters'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be either "asc" or "desc"')
  ];
};

export const validateDateRange = () => {
  return [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
  ];
};

export const validateFileUpload = (field: string = 'file') => {
  return body(field)
    .custom((value, { req }) => {
      if (!(req as any).file) {
        throw new Error('File is required');
      }
      
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes((req as any).file.mimetype)) {
        throw new Error('Invalid file type. Only JPEG, PNG, GIF, and PDF files are allowed');
      }
      
      const maxSize = 5 * 1024 * 1024; // 5MB
      if ((req as any).file.size > maxSize) {
        throw new Error('File size too large. Maximum size is 5MB');
      }
      
      return true;
    });
};

// Validation middleware factory
export const createValidationMiddleware = (validations: any[]) => {
  return [
    ...validations,
    validateRequest(validations)
  ];
};

// Common validation schemas - FIXED FOR TENANT LOGIN
// Remove validateRequest() from the array
export const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .trim()
    .notEmpty().withMessage('Password is required')
    .isString().withMessage('Password must be a string')
];

// Create a separate middleware that combines validation + error handling
export const validateLoginMiddleware = [
  ...validateLogin,
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: errors.array().map(err => ({
          field: (err as any).param,
          message: err.msg,
          value: (err as any).value
        }))
      });
    }
    next();
  }
];

// Debug version for troubleshooting
export const validateLoginDebug = [
  (req: Request, res: Response, next: NextFunction) => {
    console.log('🔍 Validation Debug - Request Body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 Validation Debug - Headers:', {
      'content-type': req.get('content-type'),
      'x-tenant-domain': req.get('x-tenant-domain'),
      'x-original-host': req.get('x-original-host')
    });
    next();
  },
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address'),
  body('password')
    .trim()
    .notEmpty().withMessage('Password is required'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    console.log('🔍 Validation Errors:', errors.array());
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        code: 'VALIDATION_ERROR',
        errors: errors.array(),
        receivedBody: req.body
      });
    }
    next();
  }
];

export const validateRegister = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  validateRequest()
];

// Helper function to create validation middleware with proper typing
export const createValidation = (validations: any[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return (res as any).status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    next();
  };
};