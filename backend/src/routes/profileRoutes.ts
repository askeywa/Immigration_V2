// backend/src/routes/profileRoutes.ts
import { Router } from 'express';
import { 
  getProfile, 
  getProfileProgress, 
  updateProfile, 
  getAllProfiles, 
  getProfileById 
} from '../controllers/profileController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorization';
import { resolveTenant } from '../middleware/tenantResolution';
import { rowLevelSecurity } from '../middleware/rowLevelSecurity';
import { rateLimitMiddleware, burstProtectionLimit } from '../middleware/rateLimiting';
import { userCacheMiddleware } from '../middleware/cacheMiddleware';

const router = Router();

// All routes require authentication and tenant context
router.use(resolveTenant, rowLevelSecurity, authenticate);

// Cache middleware for user profile routes (3 minute cache)
const cacheFor3Min = userCacheMiddleware(3 * 60 * 1000);

// User profile routes with burst protection, rate limiting, and caching
router.get('/', burstProtectionLimit, rateLimitMiddleware, cacheFor3Min, getProfile);
router.get('/progress', burstProtectionLimit, rateLimitMiddleware, cacheFor3Min, getProfileProgress);
router.put('/', burstProtectionLimit, rateLimitMiddleware, updateProfile);

// Admin routes for managing all profiles (with caching)
router.get('/all', authorize(['admin', 'super_admin']), cacheFor3Min, getAllProfiles);
router.get('/:profileId', authorize(['admin', 'super_admin']), cacheFor3Min, getProfileById);

export default router;