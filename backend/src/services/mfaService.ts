// backend/src/services/mfaService.ts
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { MFASettings, IMFASettings } from '../models/MFASettings';
import { User } from '../models/User';
import { AppError } from '../utils/errors';
import { config } from '../config/config';
import mongoose from 'mongoose';

export interface MFASetupResult {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

export interface MFAVerificationResult {
  success: boolean;
  method: 'totp' | 'sms' | 'email' | 'backup_code';
  requiresBackup?: boolean;
}

export class MFAService {
  /**
   * Get or create MFA settings for a user
   */
  static async getMFASettings(userId: string, tenantId: string): Promise<IMFASettings> {
    try {
      let settings = await MFASettings.findByUserAndTenant(userId, tenantId);
      
      if (!settings) {
        // Get user role to determine default MFA requirements
        const user = await User.findById(userId).select('role');
        if (!user) {
          throw new AppError('User not found', 404);
        }
        
        settings = await MFASettings.createDefault(userId, tenantId, user.role);
      }
      
      return settings;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get MFA settings', 500);
    }
  }

  /**
   * Setup TOTP for a user
   */
  static async setupTOTP(userId: string, tenantId: string): Promise<MFASetupResult> {
    try {
      const settings = await this.getMFASettings(userId, tenantId);
      
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `${config.appName} (${userId})`,
        issuer: config.appName,
        length: 32
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      // Generate backup codes
      const backupCodes = settings.generateBackupCodes(10);

      // Save secret to database (but don't enable yet)
      settings.totp.secret = secret.base32;
      await settings.save();

      return {
        secret: secret.base32,
        qrCodeUrl,
        backupCodes,
        manualEntryKey: secret.base32
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to setup TOTP', 500);
    }
  }

  /**
   * Verify and enable TOTP
   */
  static async verifyAndEnableTOTP(userId: string, tenantId: string, token: string): Promise<boolean> {
    try {
      const settings = await this.getMFASettings(userId, tenantId);
      
      if (!settings.totp.secret) {
        throw new AppError('TOTP not setup. Please setup TOTP first.', 400);
      }

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: settings.totp.secret,
        encoding: 'base32',
        token,
        window: 2 // Allow 2 time steps tolerance
      });

      if (verified) {
        settings.totp.enabled = true;
        settings.totp.lastUsed = new Date();
        await settings.save();
        return true;
      }

      return false;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to verify TOTP', 500);
    }
  }

  /**
   * Verify TOTP token
   */
  static async verifyTOTP(userId: string, tenantId: string, token: string): Promise<boolean> {
    try {
      const settings = await this.getMFASettings(userId, tenantId);
      
      if (!settings.totp.enabled || !settings.totp.secret) {
        throw new AppError('TOTP not enabled', 400);
      }

      // Check if account is locked
      if (settings.isLocked()) {
        throw new AppError('Account is temporarily locked due to too many failed attempts', 423);
      }

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: settings.totp.secret,
        encoding: 'base32',
        token,
        window: 2
      });

      if (verified) {
        settings.resetFailedAttempts();
        settings.totp.lastUsed = new Date();
        settings.lastLogin = new Date();
        await settings.save();
        return true;
      } else {
        settings.incrementFailedAttempts();
        await settings.save();
        return false;
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to verify TOTP', 500);
    }
  }

  /**
   * Verify backup code
   */
  static async verifyBackupCode(userId: string, tenantId: string, code: string): Promise<boolean> {
    try {
      const settings = await this.getMFASettings(userId, tenantId);
      
      // Check if account is locked
      if (settings.isLocked()) {
        throw new AppError('Account is temporarily locked due to too many failed attempts', 423);
      }

      const verified = settings.verifyBackupCode(code);
      
      if (verified) {
        settings.resetFailedAttempts();
        settings.lastLogin = new Date();
        await settings.save();
        return true;
      } else {
        settings.incrementFailedAttempts();
        await settings.save();
        return false;
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to verify backup code', 500);
    }
  }

  /**
   * Setup SMS verification
   */
  static async setupSMS(userId: string, tenantId: string, phoneNumber: string): Promise<void> {
    try {
      const settings = await this.getMFASettings(userId, tenantId);
      
      // TODO: Send verification SMS using Twilio
      // For now, just save the phone number
      settings.sms.phoneNumber = phoneNumber;
      settings.sms.enabled = true;
      await settings.save();
      
      // In production, you would send an SMS here
      console.log(`SMS verification code would be sent to ${phoneNumber}`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to setup SMS verification', 500);
    }
  }

  /**
   * Verify SMS code
   */
  static async verifySMS(userId: string, tenantId: string, code: string): Promise<boolean> {
    try {
      const settings = await this.getMFASettings(userId, tenantId);
      
      if (!settings.sms.enabled) {
        throw new AppError('SMS verification not enabled', 400);
      }

      // Check if account is locked
      if (settings.isLocked()) {
        throw new AppError('Account is temporarily locked due to too many failed attempts', 423);
      }

      // TODO: Verify SMS code with Twilio
      // For now, accept any 6-digit code as valid
      const isValid = /^\d{6}$/.test(code);
      
      if (isValid) {
        settings.resetFailedAttempts();
        settings.sms.verified = true;
        settings.sms.lastVerification = new Date();
        settings.lastLogin = new Date();
        await settings.save();
        return true;
      } else {
        settings.incrementFailedAttempts();
        await settings.save();
        return false;
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to verify SMS code', 500);
    }
  }

  /**
   * Setup email verification
   */
  static async setupEmail(userId: string, tenantId: string): Promise<void> {
    try {
      const settings = await this.getMFASettings(userId, tenantId);
      
      settings.email.enabled = true;
      await settings.save();
      
      // TODO: Send verification email
      console.log('Email verification would be sent to user');
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to setup email verification', 500);
    }
  }

  /**
   * Verify email code
   */
  static async verifyEmail(userId: string, tenantId: string, code: string): Promise<boolean> {
    try {
      const settings = await this.getMFASettings(userId, tenantId);
      
      if (!settings.email.enabled) {
        throw new AppError('Email verification not enabled', 400);
      }

      // Check if account is locked
      if (settings.isLocked()) {
        throw new AppError('Account is temporarily locked due to too many failed attempts', 423);
      }

      // TODO: Verify email code
      // For now, accept any 6-digit code as valid
      const isValid = /^\d{6}$/.test(code);
      
      if (isValid) {
        settings.resetFailedAttempts();
        settings.email.lastVerification = new Date();
        settings.lastLogin = new Date();
        await settings.save();
        return true;
      } else {
        settings.incrementFailedAttempts();
        await settings.save();
        return false;
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to verify email code', 500);
    }
  }

  /**
   * Verify MFA using any available method
   */
  static async verifyMFA(userId: string, tenantId: string, method: 'totp' | 'sms' | 'email' | 'backup_code', code: string): Promise<MFAVerificationResult> {
    try {
      const settings = await this.getMFASettings(userId, tenantId);
      
      // Check if MFA is required
      if (!settings.isMFARequired()) {
        return { success: true, method: 'totp' };
      }

      // Check if user has any MFA method enabled
      if (!settings.hasMFAMethodEnabled()) {
        throw new AppError('No MFA method enabled. Please setup MFA first.', 400);
      }

      let success = false;
      let requiresBackup = false;

      switch (method) {
        case 'totp':
          success = await this.verifyTOTP(userId, tenantId, code);
          break;
        case 'sms':
          success = await this.verifySMS(userId, tenantId, code);
          break;
        case 'email':
          success = await this.verifyEmail(userId, tenantId, code);
          break;
        case 'backup_code':
          success = await this.verifyBackupCode(userId, tenantId, code);
          requiresBackup = true;
          break;
        default:
          throw new AppError('Invalid MFA method', 400);
      }

      return {
        success,
        method,
        requiresBackup
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to verify MFA', 500);
    }
  }

  /**
   * Disable MFA for a user
   */
  static async disableMFA(userId: string, tenantId: string, method: 'totp' | 'sms' | 'email'): Promise<void> {
    try {
      const settings = await this.getMFASettings(userId, tenantId);
      
      switch (method) {
        case 'totp':
          settings.totp.enabled = false;
          settings.totp.secret = undefined;
          settings.totp.backupCodes = [];
          break;
        case 'sms':
          settings.sms.enabled = false;
          settings.sms.phoneNumber = undefined;
          settings.sms.verified = false;
          break;
        case 'email':
          settings.email.enabled = false;
          break;
      }
      
      await settings.save();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to disable MFA', 500);
    }
  }

  /**
   * Update MFA policy for a user
   */
  static async updateMFAPolicy(userId: string, tenantId: string, policy: {
    required?: boolean;
    methods?: ('totp' | 'sms' | 'email')[];
    gracePeriod?: number;
    maxAttempts?: number;
    lockoutDuration?: number;
  }): Promise<void> {
    try {
      const settings = await this.getMFASettings(userId, tenantId);
      
      if (policy.required !== undefined) {
        settings.policy.required = policy.required;
      }
      if (policy.methods) {
        settings.policy.methods = policy.methods;
      }
      if (policy.gracePeriod !== undefined) {
        settings.policy.gracePeriod = policy.gracePeriod;
      }
      if (policy.maxAttempts !== undefined) {
        settings.policy.maxAttempts = policy.maxAttempts;
      }
      if (policy.lockoutDuration !== undefined) {
        settings.policy.lockoutDuration = policy.lockoutDuration;
      }
      
      await settings.save();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update MFA policy', 500);
    }
  }

  /**
   * Get MFA status for a user
   */
  static async getMFAStatus(userId: string, tenantId: string): Promise<{
    isRequired: boolean;
    isEnabled: boolean;
    availableMethods: string[];
    gracePeriodExpired: boolean;
    isLocked: boolean;
    lockoutUntil?: Date;
  }> {
    try {
      const settings = await this.getMFASettings(userId, tenantId);
      
      return {
        isRequired: settings.isMFARequired(),
        isEnabled: settings.hasMFAMethodEnabled(),
        availableMethods: settings.getAvailableMethods(),
        gracePeriodExpired: settings.isMFARequired() && settings.createdAt && 
          new Date() > new Date(settings.createdAt.getTime() + settings.policy.gracePeriod * 24 * 60 * 60 * 1000),
        isLocked: settings.isLocked(),
        lockoutUntil: settings.lockedUntil
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get MFA status', 500);
    }
  }

  /**
   * Generate new backup codes
   */
  static async generateNewBackupCodes(userId: string, tenantId: string): Promise<string[]> {
    try {
      const settings = await this.getMFASettings(userId, tenantId);
      
      if (!settings.totp.enabled) {
        throw new AppError('TOTP must be enabled to generate backup codes', 400);
      }
      
      const newCodes = settings.generateBackupCodes(10);
      await settings.save();
      
      return newCodes;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to generate backup codes', 500);
    }
  }

  /**
   * Check if user needs to setup MFA
   */
  static async needsMFASetup(userId: string, tenantId: string): Promise<boolean> {
    try {
      const settings = await this.getMFASettings(userId, tenantId);
      
      return settings.isMFARequired() && !settings.hasMFAMethodEnabled();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to check MFA setup status', 500);
    }
  }
}
