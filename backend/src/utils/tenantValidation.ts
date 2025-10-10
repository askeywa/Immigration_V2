// backend/src/utils/tenantValidation.ts
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  fieldErrors: {
    name?: string[];
    domain?: string[];
    adminUser?: {
      firstName?: string[];
      lastName?: string[];
      email?: string[];
      password?: string[];
    };
  };
}

export interface TenantCreationData {
  name: string;
  domain: string;
  description?: string;
  adminUser: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  };
  subscriptionPlan?: string;
}

export class TenantValidationService {
  /**
   * Comprehensive validation for tenant creation data
   */
  static async validateTenantCreation(data: TenantCreationData): Promise<ValidationResult> {
    const errors: string[] = [];
    const fieldErrors: ValidationResult['fieldErrors'] = {
      adminUser: {}
    };

    // 1. Validate tenant name
    const nameValidation = this.validateTenantName(data.name);
    if (!nameValidation.isValid) {
      errors.push(...nameValidation.errors);
      fieldErrors.name = nameValidation.errors;
    }

    // 2. Validate domain
    const domainValidation = await this.validateDomain(data.domain);
    if (!domainValidation.isValid) {
      errors.push(...domainValidation.errors);
      fieldErrors.domain = domainValidation.errors;
    }

    // 3. Validate admin user data
    const adminValidation = await this.validateAdminUser(data.adminUser);
    if (!adminValidation.isValid) {
      errors.push(...adminValidation.errors);
      fieldErrors.adminUser = adminValidation.fieldErrors;
    }

    return {
      isValid: errors.length === 0,
      errors,
      fieldErrors
    };
  }

  /**
   * Validate tenant name
   */
  static validateTenantName(name: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!name || typeof name !== 'string') {
      errors.push('Tenant name is required');
    } else {
      const trimmedName = name.trim();
      
      if (trimmedName.length < 2) {
        errors.push('Tenant name must be at least 2 characters long');
      }
      
      if (trimmedName.length > 100) {
        errors.push('Tenant name must be less than 100 characters');
      }
      
      if (!/^[a-zA-Z0-9\s\-_&.]+$/.test(trimmedName)) {
        errors.push('Tenant name can only contain letters, numbers, spaces, hyphens, underscores, ampersands, and periods');
      }
      
      if (/^\s|\s$/.test(name)) {
        errors.push('Tenant name cannot start or end with spaces');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate domain format and check for duplicates
   */
  static async validateDomain(domain: string): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!domain || typeof domain !== 'string') {
      errors.push('Domain is required');
    } else {
      const trimmedDomain = domain.trim().toLowerCase();
      
      // Basic format validation
      if (trimmedDomain.length < 3) {
        errors.push('Domain must be at least 3 characters long');
      }
      
      if (trimmedDomain.length > 255) {
        errors.push('Domain must be less than 255 characters');
      }
      
      // Domain format validation
      const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!domainRegex.test(trimmedDomain)) {
        errors.push('Domain format is invalid. Use format like: example.com or subdomain.example.com');
      }
      
      // Check for reserved domains (only critical system domains)
      const reservedDomains = [
        'localhost', '127.0.0.1', '0.0.0.0',
        'admin', 'api', 'www', 'mail', 'ftp',
        'login', 'auth', 'secure', 'ssl', 'https', 'http'
      ];
      
      const domainParts = trimmedDomain.split('.');
      const firstPart = domainParts[0];
      
      if (reservedDomains.includes(firstPart)) {
        errors.push(`Domain cannot start with reserved word: ${firstPart}`);
      }
      
      // Check for duplicate domain
      if (errors.length === 0) {
        try {
          const existingTenant = await Tenant.findOne({ domain: trimmedDomain });
          if (existingTenant) {
            errors.push(`Domain "${trimmedDomain}" is already registered to tenant "${existingTenant.name}"`);
          }
        } catch (error) {
          console.error('Error checking domain uniqueness:', error);
          errors.push('Unable to verify domain availability. Please try again.');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate admin user data
   */
  static async validateAdminUser(adminUser: TenantCreationData['adminUser']): Promise<{
    isValid: boolean;
    errors: string[];
    fieldErrors: {
      firstName?: string[];
      lastName?: string[];
      email?: string[];
      password?: string[];
    };
  }> {
    const errors: string[] = [];
    const fieldErrors: {
      firstName?: string[];
      lastName?: string[];
      email?: string[];
      password?: string[];
    } = {};

    // Validate first name
    const firstNameValidation = this.validateName(adminUser.firstName, 'First name');
    if (!firstNameValidation.isValid) {
      errors.push(...firstNameValidation.errors);
      fieldErrors.firstName = firstNameValidation.errors;
    }

    // Validate last name (optional)
    if (adminUser.lastName && adminUser.lastName.trim()) {
      const lastNameValidation = this.validateName(adminUser.lastName, 'Last name');
      if (!lastNameValidation.isValid) {
        errors.push(...lastNameValidation.errors);
        fieldErrors.lastName = lastNameValidation.errors;
      }
    }

    // Validate email
    const emailValidation = await this.validateEmail(adminUser.email);
    if (!emailValidation.isValid) {
      errors.push(...emailValidation.errors);
      fieldErrors.email = emailValidation.errors;
    }

    // Validate password
    const passwordValidation = this.validatePassword(adminUser.password);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
      fieldErrors.password = passwordValidation.errors;
    }

    return {
      isValid: errors.length === 0,
      errors,
      fieldErrors
    };
  }

  /**
   * Validate name fields (first name, last name)
   */
  static validateName(name: string, fieldName: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!name || typeof name !== 'string') {
      errors.push(`${fieldName} is required`);
    } else {
      const trimmedName = name.trim();
      
      if (trimmedName.length < 1) {
        errors.push(`${fieldName} cannot be empty`);
      }
      
      if (trimmedName.length > 50) {
        errors.push(`${fieldName} must be less than 50 characters`);
      }
      
      if (!/^[a-zA-Z\s\-'\.]+$/.test(trimmedName)) {
        errors.push(`${fieldName} can only contain letters, spaces, hyphens, apostrophes, and periods`);
      }
      
      if (/^\s|\s$/.test(name)) {
        errors.push(`${fieldName} cannot start or end with spaces`);
      }
      
      if (/^['\.]|['\.]$/.test(trimmedName)) {
        errors.push(`${fieldName} cannot start or end with apostrophes or periods`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate email format and check for duplicates
   */
  static async validateEmail(email: string): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!email || typeof email !== 'string') {
      errors.push('Email address is required');
    } else {
      const trimmedEmail = email.trim().toLowerCase();
      
      if (trimmedEmail.length === 0) {
        errors.push('Email address cannot be empty');
      }
      
      if (trimmedEmail.length > 254) {
        errors.push('Email address must be less than 254 characters');
      }
      
      // Email format validation
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!emailRegex.test(trimmedEmail)) {
        errors.push('Please enter a valid email address (e.g., user@example.com)');
      }
      
      // Check for common email mistakes
      if (trimmedEmail.includes('..')) {
        errors.push('Email address cannot contain consecutive dots');
      }
      
      if (trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) {
        errors.push('Email address cannot start or end with a dot');
      }
      
      if (trimmedEmail.includes('@.') || trimmedEmail.includes('.@')) {
        errors.push('Email address has invalid dot placement');
      }
      
      // Check for duplicate email
      if (errors.length === 0) {
        try {
          const existingUser = await User.findOne({ email: trimmedEmail });
          if (existingUser) {
            errors.push(`Email address "${trimmedEmail}" is already registered`);
          }
        } catch (error) {
          console.error('Error checking email uniqueness:', error);
          errors.push('Unable to verify email availability. Please try again.');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!password || typeof password !== 'string') {
      errors.push('Password is required');
    } else {
      if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
      }
      
      if (password.length > 128) {
        errors.push('Password must be less than 128 characters');
      }
      
      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
      }
      
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
      }
      
      if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
      }
      
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
      }
      
      // Check for common weak passwords
      const commonPasswords = [
        'password', '123456', '123456789', 'qwerty', 'abc123',
        'password123', 'admin', 'letmein', 'welcome', 'monkey',
        '1234567890', 'password1', 'qwerty123', 'dragon', 'master'
      ];
      
      if (commonPasswords.includes(password.toLowerCase())) {
        errors.push('Password is too common. Please choose a more secure password');
      }
      
      // Check for repeated characters
      if (/(.)\1{2,}/.test(password)) {
        errors.push('Password cannot contain more than 2 consecutive identical characters');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if tenant already exists by name
   */
  static async checkTenantExists(name: string, domain: string): Promise<{
    exists: boolean;
    conflicts: {
      name?: string;
      domain?: string;
    };
  }> {
    const conflicts: { name?: string; domain?: string } = {};

    try {
      // Check by name
      const existingByName = await Tenant.findOne({ 
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
      });
      if (existingByName) {
        conflicts.name = existingByName.name;
      }

      // Check by domain
      const existingByDomain = await Tenant.findOne({ 
        domain: domain.trim().toLowerCase() 
      });
      if (existingByDomain) {
        conflicts.domain = existingByDomain.domain;
      }

      return {
        exists: Object.keys(conflicts).length > 0,
        conflicts
      };
    } catch (error) {
      console.error('Error checking tenant existence:', error);
      return {
        exists: false,
        conflicts: {}
      };
    }
  }
}
