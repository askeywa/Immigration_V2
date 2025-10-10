// backend/src/routes/themeRoutes.ts
import { Router } from 'express';
import { getCurrentTheme, saveTheme } from '../controllers/themeController';
import { authenticate } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolution';

const router = Router();

// Get current theme for tenant (no auth required - returns default theme)
router.get('/current', getCurrentTheme);

// Save theme for tenant (requires authentication)
router.post('/save', authenticate, resolveTenant, saveTheme);

export default router;
