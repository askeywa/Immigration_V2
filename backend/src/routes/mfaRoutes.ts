// backend/src/routes/mfaRoutes.ts
import { Router } from 'express';
import {
  getMFAStatus,
  getMFASettings,
  setupTOTP,
  verifyTOTP,
  setupSMS,
  verifySMS,
  setupEmail,
  verifyEmail,
  verifyMFA,
  disableMFA,
  updateMFAPolicy,
  generateBackupCodes,
  needsMFASetup
} from '../controllers/mfaController';
import { authenticate, authorize } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolution';
import { rowLevelSecurity } from '../middleware/rowLevelSecurity';

const router = Router();

// All routes require authentication and tenant context
router.use(resolveTenant, rowLevelSecurity, authenticate);

// MFA Status and Settings
router.get('/status', getMFAStatus);
router.get('/settings', getMFASettings);
router.get('/needs-setup', needsMFASetup);

// TOTP (Time-based One-Time Password) routes
router.post('/totp/setup', setupTOTP);
router.post('/totp/verify', verifyTOTP);

// SMS Verification routes
router.post('/sms/setup', setupSMS);
router.post('/sms/verify', verifySMS);

// Email Verification routes
router.post('/email/setup', setupEmail);
router.post('/email/verify', verifyEmail);

// General MFA routes
router.post('/verify', verifyMFA);
router.delete('/disable', disableMFA);

// Backup codes
router.post('/backup-codes/generate', generateBackupCodes);

// Admin routes
router.put('/policy', authorize('admin', 'super_admin'), updateMFAPolicy);

export default router;
