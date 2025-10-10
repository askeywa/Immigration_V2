
// backend/src/routes/authRoutes.ts
import { Router } from 'express';
import { 
  login, 
  register, 
  getUserPermissions, 
  getUserTenants, 
  switchTenant, 
  refreshToken 
} from '../controllers/authController';
import { validateLogin, validateRegister, validateLoginMiddleware, validateLoginDebug } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { resolveTenantEnhanced as resolveTenant } from '../middleware/enhancedTenantResolution';
import { rowLevelSecurity } from '../middleware/rowLevelSecurity';
import { authRateLimit, globalRateLimit } from '../middleware/rateLimiting';

const router = Router();

// Public routes with tenant resolution and rate limiting
router.post('/login', authRateLimit, resolveTenant, rowLevelSecurity, (req, res, next) => {
  console.log('🔍 LOGIN REQUEST DEBUG:');
  console.log('Content-Type:', req.get('content-type'));
  console.log('Body type:', typeof req.body);
  console.log('Body content:', req.body);
  console.log('Raw body length:', (req as any).rawBody?.length || 0);
  console.log('Raw body preview:', (req as any).rawBody?.substring(0, 100) || 'No raw body');
  
  // If body is empty or malformed, try to parse raw body
  if (!req.body || Object.keys(req.body).length === 0) {
    try {
      const rawBody = (req as any).rawBody;
      if (rawBody) {
        console.log('🔍 Attempting to parse raw body manually...');
        req.body = JSON.parse(rawBody);
        console.log('✅ Successfully parsed raw body:', req.body);
      }
    } catch (parseError: any) {
      console.log('❌ Failed to parse raw body:', parseError.message);
      return res.status(400).json({
        success: false,
        message: 'Invalid JSON format in request body',
        code: 'INVALID_JSON',
        debug: {
          rawBody: (req as any).rawBody?.substring(0, 200),
          contentType: req.get('content-type'),
          error: parseError.message
        }
      });
    }
  }
  
  next();
}, ...validateLoginDebug, login);
router.post('/register', authRateLimit, resolveTenant, rowLevelSecurity, ...validateRegister, register);

// Protected routes with authentication and rate limiting
router.get('/permissions', globalRateLimit, resolveTenant, rowLevelSecurity, authenticate, getUserPermissions);
router.get('/tenants', globalRateLimit, resolveTenant, rowLevelSecurity, authenticate, getUserTenants);
router.post('/switch-tenant', globalRateLimit, resolveTenant, rowLevelSecurity, authenticate, switchTenant);
router.post('/refresh', globalRateLimit, resolveTenant, rowLevelSecurity, authenticate, refreshToken);

export default router;
