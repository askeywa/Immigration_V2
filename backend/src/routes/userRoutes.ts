
// backend/src/routes/userRoutes.ts
import { Router } from 'express';
import { getUsers, getUserStats, getCurrentUser, updateUser, getUserById } from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorization';
import { resolveTenant } from '../middleware/tenantResolution';
import { rowLevelSecurity } from '../middleware/rowLevelSecurity';
import { createUserRateLimit, createTenantRateLimit } from '../middleware/rateLimiting';

const router = Router();

// All routes require authentication, tenant context, and rate limiting
router.use(resolveTenant, rowLevelSecurity, authenticate);

router.get('/me', createUserRateLimit(), getCurrentUser);
router.get('/', createUserRateLimit(), authorize(['admin', 'super_admin']), getUsers);
router.get('/stats', createTenantRateLimit(), authorize(['admin', 'super_admin']), getUserStats);
router.get('/:userId', createUserRateLimit(), authorize(['admin', 'super_admin']), getUserById);
router.put('/:userId', createUserRateLimit(), authorize(['admin', 'super_admin']), updateUser);

export default router;
