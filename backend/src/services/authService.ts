// backend/src/services/authService.ts
import { IUser } from '../models/User';
import { User } from '../models/User';
import { ITenant, Tenant } from '../models/Tenant';
import { ISubscription, Subscription } from '../models/Subscription';
import { ISubscriptionPlan, SubscriptionPlan } from '../models/SubscriptionPlan';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { validatePassword, validateEmail, validateName } from '../utils/validation';
import { AuthenticationError, ValidationError, ConflictError } from '../utils/errors';
import mongoose from 'mongoose';

export class AuthService {
  // Helper method to safely find subscription plan with timeout
  private static async findSubscriptionPlanWithTimeout(): Promise<any> {
    try {
      // Try to find trial plan first
      const trialPlan = await Promise.race([
        SubscriptionPlan.findOne({ name: 'trial', isActive: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Plan query timeout')), 5000))
      ]);
      if (trialPlan) return trialPlan;
    } catch (error) {
      console.log('⚠️ Trial plan query failed, trying fallback:', error instanceof Error ? error.message : String(error));
    }
    
    try {
      // Fallback: find any active plan
      return await Promise.race([
        SubscriptionPlan.findOne({ isActive: true }).sort({ createdAt: 1 }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Fallback plan query timeout')), 3000))
      ]);
    } catch (error) {
      console.log('⚠️ All plan queries failed:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  static generateToken(userId: string, tenantId?: string, role?: string): string {
    // Generate JWT token with tenant context
    const payload: any = { userId };
    
    if (tenantId) {
      (payload as any).tenantId = tenantId;
    }
    
    if (role) {
      (payload as any).role = role;
    }
    
    return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);
  }

  static async login(email: string, password: string, tenantDomain?: string, tenantId?: string): Promise<{ 
    user: IUser; 
    token: string; 
    tenant?: ITenant;
    subscription?: ISubscription;
  }> {
    try {
      console.log('🔍 AuthService.login called with:', { 
        email, 
        passwordLength: password?.length, 
        tenantDomain, 
        tenantId 
      });

      // SECURITY: Validate inputs
      if (!email || !password) {
        console.log('❌ Missing email or password');
        throw new AuthenticationError('Email and password are required');
      }

      if (typeof email !== 'string' || typeof password !== 'string') {
        console.log('❌ Invalid input types:', { emailType: typeof email, passwordType: typeof password });
        throw new AuthenticationError('Invalid input format');
      }

      console.log('🔍 Searching for user with email:', email);
      
      let user;
      try {
        // Find user by email with optimized query and shorter timeout
        user = await User.findOne({ email, isActive: true })
          .select('+password') // Include password field for comparison
          .maxTimeMS(5000); // Reduce timeout to 5 seconds
        
        // Populate tenantId only if it exists (not for super admins)
        if (user && user.tenantId) {
          await user.populate('tenantId');
        }
      } catch (dbError: any) {
        console.log('❌ Database query error:', dbError.message);
        if (dbError.name === 'MongoTimeoutError' || dbError.code === 50) {
          throw new AuthenticationError('Authentication service is temporarily unavailable. Please try again.');
        }
        throw new AuthenticationError('Invalid email or password');
      }
      
      if (!user) {
        console.log('❌ User not found for email:', email);
        throw new AuthenticationError('Invalid email or password');
      }

      console.log('✅ User found:', { 
        userId: user._id?.toString(), 
        email: user.email, 
        role: user.role, 
        isActive: user.isActive,
        isSuperAdmin: user.isSuperAdmin?.() || false
      });

      // Check if password matches using the model's comparePassword method
      console.log('🔍 Checking password...');
      const isPasswordValid = await user.comparePassword(password);
      
      if (!isPasswordValid) {
        console.log('❌ Password does not match for user:', user.email);
        throw new AuthenticationError('Invalid email or password');
      }

      console.log('✅ Password is valid for user:', user.email);

    // For super admins, no tenant validation needed
    if (user.isSuperAdmin()) {
      user.lastLogin = new Date();
      await user.save();
      
      const token = this.generateToken(user._id as string, undefined, user.role);
      return { user, token };
    }

    // For tenant users, validate tenant access
    if (!user.tenantId) {
      throw new AuthenticationError('User account is not properly configured');
    }

    const tenant = user.tenantId as unknown as ITenant;
    
    // If tenant domain is provided, validate it matches
    if (tenantDomain && tenant.domain !== tenantDomain) {
      throw new AuthenticationError('Invalid tenant access');
    }

    // Check if tenant is active (handle both Mongoose documents and plain objects)
    const isTenantActive = tenant.status === 'active' || tenant.status === 'trial';
    if (!isTenantActive) {
      throw new AuthenticationError('Account access is temporarily suspended');
    }

    // Get subscription information
    const subscription = await Subscription.findOne({ tenantId: tenant._id }).populate('planId');
    
    // Check subscription status
    if (subscription && !subscription.isActive()) {
      throw new AuthenticationError('Account subscription has expired. Please contact your administrator.');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = this.generateToken(user._id?.toString() || '', tenant._id?.toString() || '', user.role);
    return { user, token, tenant: tenant as ITenant, subscription: subscription || undefined };
      
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('Login failed due to system error');
    }
  }

  static async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: 'admin' | 'user' | 'super_admin';
    tenantId?: string;
    companyName?: string;
    domain?: string;
    mustChangePassword?: boolean; // NEW: Password change option
  }): Promise<{ user: IUser; token: string; tenant?: ITenant; subscription?: ISubscription }> {
    // Validate input data
    const emailValidation = validateEmail(userData.email);
    if (!emailValidation.isValid) {
      throw new ValidationError(emailValidation.error || 'Invalid email', 'email', userData.email);
    }
    
    const passwordValidation = validatePassword(userData.password);
    if (!passwordValidation.isValid) {
      throw new ValidationError(passwordValidation.error || 'Invalid password', 'password');
    }
    
    const firstNameValidation = validateName(userData.firstName);
    if (!firstNameValidation.isValid) {
      throw new ValidationError(firstNameValidation.error || 'Invalid first name', 'firstName', userData.firstName);
    }
    
    const lastNameValidation = validateName(userData.lastName);
    if (!lastNameValidation.isValid) {
      throw new ValidationError(lastNameValidation.error || 'Invalid last name', 'lastName', userData.lastName);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    let tenant: ITenant | undefined;
    let subscription: ISubscription | undefined;
    
    // Handle tenant creation for new RCIC registration
    if (userData.companyName && userData.domain && !userData.tenantId) {
      // Check if domain is already taken
      const existingTenant = await Tenant.findOne({ domain: userData.domain });
      if (existingTenant) {
        throw new ConflictError('Company domain already exists');
      }

      // Create new tenant with 7-day trial
      tenant = new Tenant({
        name: userData.companyName,
        domain: userData.domain,
        status: 'trial',
        contactInfo: {
          email: userData.email
        },
        settings: {
          maxUsers: 25, // Default trial limits
          maxAdmins: 2,
          features: ['basic']
        }
      });
      
      await tenant.save();

      // Create trial subscription
      const trialPlan = await this.findSubscriptionPlanWithTimeout();
      if (trialPlan) {
        subscription = new Subscription({
          tenantId: tenant._id,
          planId: trialPlan._id,
          status: 'trial',
          billing: {
            amount: 0,
            currency: 'USD',
            billingCycle: 'monthly'
          },
          usage: {
            currentUsers: 0,
            currentAdmins: 0
          }
        });
        
        await subscription.save();
      }
    } else if (!userData.tenantId && !userData.companyName && !userData.domain) {
      // For regular user registration without tenant info, create a default tenant
      // This handles the case where users register through the public registration form
      const defaultTenantName = `${userData.firstName} ${userData.lastName} - Personal Account`;
      const defaultDomain = `${userData.email.split('@')[0]}-${Date.now()}`;
      
      // Check if domain is already taken (very unlikely but safe)
      const existingTenant = await Tenant.findOne({ domain: defaultDomain });
      if (existingTenant) {
        // If domain exists, add timestamp to make it unique
        const uniqueDomain = `${defaultDomain}-${Date.now()}`;
        tenant = new Tenant({
          name: defaultTenantName,
          domain: uniqueDomain,
          status: 'trial',
          contactInfo: {
            email: userData.email
          },
          settings: {
            maxUsers: 5, // Personal account limits
            maxAdmins: 1,
            features: ['basic']
          }
        });
      } else {
        tenant = new Tenant({
          name: defaultTenantName,
          domain: defaultDomain,
          status: 'trial',
          contactInfo: {
            email: userData.email
          },
          settings: {
            maxUsers: 5, // Personal account limits
            maxAdmins: 1,
            features: ['basic']
          }
        });
      }
      
      await tenant.save();

      // Create trial subscription
      const trialPlan = await this.findSubscriptionPlanWithTimeout();
      if (trialPlan) {
        subscription = new Subscription({
          tenantId: tenant._id,
          planId: trialPlan._id,
          status: 'trial',
          billing: {
            amount: 0,
            currency: 'USD',
            billingCycle: 'monthly'
          },
          usage: {
            currentUsers: 0,
            currentAdmins: 0
          }
        });
        
        await subscription.save();
      }
    }
    
    // Create user
    const user = new User({
      ...userData,
      role: userData.role || 'user',
      tenantId: userData.tenantId ? new mongoose.Types.ObjectId(userData.tenantId) : tenant?._id,
      isActive: true,
      // Password change system fields
      mustChangePassword: userData.mustChangePassword || false,
      passwordChangeRequired: userData.mustChangePassword || false,
      isFirstLogin: true
    });
    
    // Save user with timeout protection
    await Promise.race([
      user.save(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('User save timeout')), 8000))
    ]);

    // Update subscription user count if tenant was created
    if (subscription) {
      subscription.usage.currentUsers = 1;
      subscription.usage.currentAdmins = user.role === 'admin' ? 1 : 0;
      await subscription.save();
    }
    
    const token = this.generateToken(
      user._id as string, 
      tenant?._id?.toString() || userData.tenantId, 
      user.role
    );
    
    return { user, token, tenant, subscription };
  }

  static async registerTenantUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: 'admin' | 'user';
    tenantId: string;
    mustChangePassword?: boolean; // NEW: Password change option
  }, createdBy: string): Promise<{ user: IUser; token: string }> {
    // Validate tenant exists and is active
    const tenant = await Tenant.findById(userData.tenantId);
    if (!tenant || (tenant.status !== 'active' && tenant.status !== 'trial')) {
      throw new ValidationError('Invalid or inactive tenant', 'tenantId', userData.tenantId);
    }

    // Check subscription limits
    const subscription = await Subscription.findOne({ tenantId: userData.tenantId }).populate('planId');
    if (subscription) {
      const plan = subscription.planId as any;
      
      // Check limits directly instead of using async methods to avoid hanging
      const canAddUser = (subscription.usage.currentUsers + 1) <= plan.limits.maxUsers;
      const canAddAdmin = userData.role === 'admin' ? (subscription.usage.currentAdmins + 1) <= plan.limits.maxAdmins : true;
      
      if (!canAddUser) {
        throw new ValidationError('User limit exceeded for current subscription plan');
      }
      
      if (!canAddAdmin) {
        throw new ValidationError('Admin limit exceeded for current subscription plan');
      }
    }

    // Register user with tenant
    console.log('🔍 AuthService: About to call this.register()');
    const result = await this.register({
      ...userData,
      tenantId: userData.tenantId
    });
    console.log('✅ AuthService: this.register() completed');

    // Update subscription usage
    if (subscription) {
      console.log('🔍 AuthService: About to update subscription usage');
      const updateFields: any = {
        'usage.currentUsers': subscription.usage.currentUsers + 1,
        'usage.currentAdmins': subscription.usage.currentAdmins + (userData.role === 'admin' ? 1 : 0),
        'usage.lastUpdated': new Date()
      };
      
      await Subscription.updateOne(
        { tenantId: new mongoose.Types.ObjectId(userData.tenantId) },
        updateFields
      );
      console.log('✅ AuthService: Subscription usage updated');
    }

    return { user: result.user, token: result.token };
  }

  // Get user's tenants (for users who belong to multiple tenants)
  static async getUserTenants(userId: string): Promise<ITenant[]> {
    try {
      const user = await User.findById(userId).populate('tenantId');
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      // For now, return single tenant (can be extended for multi-tenant users)
      if (user.tenantId) {
        const tenant = await Tenant.findById(user.tenantId);
        return tenant ? [tenant] : [];
      }

      return [];
    } catch (error) {
      throw new AuthenticationError('Failed to get user tenants');
    }
  }

  // Switch tenant context
  static async switchTenant(userId: string, tenantId: string): Promise<{ 
    user: IUser; 
    token: string; 
    tenant?: ITenant;
    subscription?: ISubscription;
  }> {
    try {
      const user = await User.findById(userId).populate('tenantId');
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      // Check if user has access to the requested tenant
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new AuthenticationError('Tenant not found');
      }

      // For super admins, allow switching to any tenant
      if (!user.isSuperAdmin() && user.tenantId?.toString() !== tenantId) {
        throw new AuthenticationError('Access denied to this tenant');
      }

      // Check if tenant is active
      if (tenant.status !== 'active' && tenant.status !== 'trial') {
        throw new AuthenticationError('Tenant account is suspended');
      }

      // Get subscription information
      const subscription = await Subscription.findOne({ tenantId }).populate('planId');
      
      // Check subscription status
      if (subscription && !subscription.isActive()) {
        throw new AuthenticationError('Tenant subscription has expired');
      }

      // Update user's current tenant context
      user.tenantId = new mongoose.Types.ObjectId(tenantId);
      user.lastLogin = new Date();
      await user.save();

      const token = this.generateToken(user._id as string, tenantId, user.role);
      return { user, token, tenant, subscription: subscription || undefined };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('Failed to switch tenant');
    }
  }

  // Refresh token with current tenant context
  static async refreshToken(userId: string, tenantId?: string): Promise<{ 
    token: string; 
    tenant?: ITenant;
    subscription?: ISubscription;
  }> {
    try {
      const user = await User.findById(userId).populate('tenantId');
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      let tenant: ITenant | undefined;
      let subscription: ISubscription | undefined;

      // For tenant users, get tenant and subscription info
      if (user.tenantId && (tenantId || user.tenantId.toString())) {
        const currentTenantId = tenantId || user.tenantId.toString();
        tenant = await Tenant.findById(currentTenantId) || undefined;
        
        if (tenant) {
          subscription = await Subscription.findOne({ tenantId: currentTenantId }).populate('planId') as ISubscription;
        }
      }

      const token = this.generateToken(user._id as string, tenantId || user.tenantId?.toString(), user.role);
      return { token, tenant, subscription };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('Failed to refresh token');
    }
  }
}