// backend/src/routes/apiKeyRoutes.ts
import { Router } from 'express';
import {
  createApiKey,
  getApiKeys,
  getApiKeyById,
  updateApiKey,
  revokeApiKey,
  rotateApiKey,
  getApiKeyStats,
  getApiKeyUsageHistory,
  verifyApiKey
} from '../controllers/apiKeyController';
import { authenticate, authorize } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolution';
import { rowLevelSecurity } from '../middleware/rowLevelSecurity';

const router = Router();

// All routes require authentication and tenant context
router.use(resolveTenant, rowLevelSecurity, authenticate);

// API Key Management Routes (Admin only)
router.post('/', authorize('admin', 'super_admin'), createApiKey);
router.get('/', authorize('admin', 'super_admin'), getApiKeys);
router.get('/stats', authorize('admin', 'super_admin'), getApiKeyStats);

// Specific API Key Routes (Admin only)
router.get('/:keyId', authorize('admin', 'super_admin'), getApiKeyById);
router.put('/:keyId', authorize('admin', 'super_admin'), updateApiKey);
router.delete('/:keyId', authorize('admin', 'super_admin'), revokeApiKey);
router.post('/:keyId/rotate', authorize('admin', 'super_admin'), rotateApiKey);
router.get('/:keyId/usage', authorize('admin', 'super_admin'), getApiKeyUsageHistory);

// Public API Key Verification (for testing)
router.post('/verify', verifyApiKey);

export default router;
