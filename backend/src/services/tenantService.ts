// backend/src/services/tenantService.ts
import mongoose from 'mongoose';
import { Tenant, ITenant } from '../models/Tenant';
import { User } from '../models/User';
import { Subscription } from '../models/Subscription';
import { Profile } from '../models/Profile';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import bcrypt from 'bcryptjs';
import CloudflareService from './cloudflareService';
import { log } from '../utils/logger';
import { TenantValidationService, TenantCreationData } from '../utils/tenantValidation';

export class TenantService {
  static async getAllTenants(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    // Exclude cancelled/deleted tenants from the list
    const tenants = await Tenant.find({ status: { $ne: 'cancelled' } })
      .populate('subscription.planId', 'name displayName') // Only populate name and displayName
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Tenant.countDocuments({ status: { $ne: 'cancelled' } });
    
    return {
      tenants,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalTenants: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  static async getTenantById(tenantId: string): Promise<ITenant | null> {
    return Tenant.findById(tenantId)
      .populate('subscription.planId', 'name displayName') // Only populate name and displayName
      .lean() as unknown as ITenant | null;
  }

  static async getTenantStats(tenantId: string) {
    const userCount = await User.countDocuments({ tenantId, isActive: true });
    const adminCount = await User.countDocuments({ tenantId, role: 'admin', isActive: true });
    const profileCount = await Profile.countDocuments({ userId: { $in: await User.find({ tenantId }).select('_id') } });
    
    const subscription = await Subscription.findOne({ tenantId }).populate('planId');
    
    return {
      userCount,
      adminCount,
      profileCount,
      subscription: subscription ? {
        status: subscription.status,
        plan: subscription.planId,
        usage: subscription.usage,
        billing: subscription.billing
      } : null
    };
  }

  static async updateTenant(tenantId: string, updateData: Partial<ITenant>): Promise<ITenant | null> {
    // Filter out invalid fields to prevent validation errors
    const filteredUpdateData = { ...updateData };
    
    // Remove empty or invalid domain from update if present
    if (filteredUpdateData.domain !== undefined) {
      if (!filteredUpdateData.domain || filteredUpdateData.domain.trim() === '') {
        delete filteredUpdateData.domain; // Don't update domain if it's empty
      }
    }
    
    // Remove empty or invalid email from update if present
    if (filteredUpdateData.contactInfo?.email !== undefined) {
      if (!filteredUpdateData.contactInfo.email || filteredUpdateData.contactInfo.email.trim() === '') {
        if (filteredUpdateData.contactInfo) {
          // Use object destructuring to exclude email, but keep other properties
          const { email, ...contactInfoWithoutEmail } = filteredUpdateData.contactInfo;
          filteredUpdateData.contactInfo = contactInfoWithoutEmail as any;
        }
      }
    }
    
    return Tenant.findByIdAndUpdate(
      tenantId,
      { ...filteredUpdateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
  }

  static async suspendTenant(tenantId: string): Promise<boolean> {
    const result = await Tenant.findByIdAndUpdate(
      tenantId,
      { status: 'suspended', updatedAt: new Date() }
    );
    return !!result;
  }

  static async activateTenant(tenantId: string): Promise<boolean> {
    const result = await Tenant.findByIdAndUpdate(
      tenantId,
      { status: 'active', updatedAt: new Date() }
    );
    return !!result;
  }

  static async deleteTenant(tenantId: string): Promise<boolean> {
    // Soft delete - mark as cancelled
    const result = await Tenant.findByIdAndUpdate(
      tenantId,
      { status: 'cancelled', updatedAt: new Date() }
    );
    return !!result;
  }

  static async getTenantAnalytics() {
    // Exclude cancelled/deleted tenants from analytics
    const totalTenants = await Tenant.countDocuments({ status: { $ne: 'cancelled' } });
    const activeTenants = await Tenant.countDocuments({ status: 'active' });
    const trialTenants = await Tenant.countDocuments({ status: 'trial' });
    const suspendedTenants = await Tenant.countDocuments({ status: 'suspended' });
    const cancelledTenants = await Tenant.countDocuments({ status: 'cancelled' });

    // Get recent tenant registrations (last 30 days) - exclude cancelled
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentRegistrations = await Tenant.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      status: { $ne: 'cancelled' }
    });

    return {
      totalTenants,
      activeTenants,
      trialTenants,
      suspendedTenants,
      cancelledTenants,
      recentRegistrations
    };
  }

  static async getTenantUsers(tenantId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const users = await User.find({ tenantId })
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await User.countDocuments({ tenantId });
    
    return {
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  static async createTenant(tenantData: TenantCreationData) {
    // 1. Comprehensive validation before any database operations
    console.log('🔍 Starting tenant creation validation...');
    const validation = await TenantValidationService.validateTenantCreation(tenantData);
    
    if (!validation.isValid) {
      const errorMessage = validation.errors.join('; ');
      console.log('❌ Tenant creation validation failed:', validation);
      
      // Create a detailed error response
      const validationError = new Error(`Validation failed: ${errorMessage}`);
      (validationError as any).validation = validation;
      (validationError as any).statusCode = 400;
      throw validationError;
    }
    
    console.log('✅ Tenant creation validation passed');
    
    const session = await Tenant.startSession();
    
    try {
      console.log('🔍 Starting tenant creation with data:', {
        name: tenantData.name,
        domain: tenantData.domain,
        subscriptionPlan: tenantData.subscriptionPlan,
        adminEmail: tenantData.adminUser.email
      });

      return await session.withTransaction(async () => {
        // 1. Create the tenant
        console.log('📝 Step 1: Creating tenant...');
        const tenant = new Tenant({
          name: tenantData.name,
          domain: tenantData.domain.toLowerCase().replace(/[^a-zA-Z0-9.-]/g, ''), // Clean domain format
          status: 'trial', // Start with trial status
          settings: {
            maxUsers: 100,
            maxAdmins: 2,
            features: ['basic', 'advanced'] // Array of strings, not object
          },
          contactInfo: {
            email: tenantData.adminUser.email, // Use admin email as contact email
            phone: '', // Optional
            address: {
              street: '',
              city: '',
              state: '',
              zipCode: '',
              country: ''
            }
          }
        });

        await tenant.save({ session });
        console.log('✅ Step 1: Tenant created successfully with ID:', tenant._id);

        // 2. Get default subscription plan (or use provided one)
        console.log('📝 Step 2: Finding subscription plan...');
        let planId;
        if (tenantData.subscriptionPlan) {
          console.log('🔍 Looking for specific plan:', tenantData.subscriptionPlan);
          const plan = await SubscriptionPlan.findOne({ name: tenantData.subscriptionPlan });
          planId = plan?._id;
          console.log('📊 Found plan:', plan ? plan.displayName : 'NOT FOUND');
        } else {
          console.log('🔍 Looking for default plan...');
          // Get the first available plan as default
          const defaultPlan = await SubscriptionPlan.findOne().sort({ createdAt: 1 });
          planId = defaultPlan?._id;
          console.log('📊 Found default plan:', defaultPlan ? defaultPlan.displayName : 'NOT FOUND');
        }

        // 3. Create subscription for the tenant
        console.log('📝 Step 3: Creating subscription...');
        if (planId) {
          console.log('🔍 Creating subscription with plan ID:', planId);
          const subscription = new Subscription({
            tenantId: tenant._id,
            planId: planId,
            status: 'trial',
            billing: {
              amount: 0,
              currency: 'USD',
              billingCycle: 'monthly'
            },
            period: {
              startDate: new Date(),
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
              trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            },
            usage: {
              currentUsers: 1, // Admin user
              currentAdmins: 1,
              lastUpdated: new Date()
            }
          });

          await subscription.save({ session });
          console.log('✅ Step 3: Subscription created successfully with ID:', subscription._id);

          // Update tenant with subscription reference
          tenant.subscription = {
            planId: planId as mongoose.Types.ObjectId,
            status: 'trial',
            startDate: subscription.period.startDate,
            endDate: subscription.period.endDate
          };
          await tenant.save({ session });
        }

        // 4. Create admin user for the tenant
        console.log('📝 Step 4: Creating admin user...');
        const hashedPassword = await bcrypt.hash(tenantData.adminUser.password, 12);
        
        const adminUser = new User({
          firstName: tenantData.adminUser.firstName,
          lastName: tenantData.adminUser.lastName,
          email: tenantData.adminUser.email,
          password: hashedPassword,
          role: 'admin',
          tenantId: tenant._id,
          isActive: true,
          isEmailVerified: true,
          permissions: [
            'user.create',
            'user.read',
            'user.update',
            'user.delete',
            'profile.create',
            'profile.read',
            'profile.update',
            'profile.delete',
            'tenant.manage',
            'billing.view',
            'analytics.view',
            'reports.view'
          ]
        });

        await adminUser.save({ session });
        console.log('✅ Step 4: Admin user created successfully with ID:', adminUser._id);

        // 5. Setup Cloudflare DNS (if configured) - Skip in development for faster response
        console.log('📝 Step 5: Setting up Cloudflare DNS...');
        let dnsSetup = null;
        
        // Skip DNS setup in development to improve response time
        if (process.env.NODE_ENV === 'production' && process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ZONE_ID) {
          try {
            const cloudflareService = CloudflareService.getInstance();
            const isConnected = await cloudflareService.testConnection();
            
            if (isConnected) {
              // For tenant domains, we'll create a CNAME record pointing to our EC2
              const ec2PublicIp = process.env.EC2_PUBLIC_IP || '18.220.224.109';
              
              // Create CNAME record for tenant domain
              const dnsRecord = await cloudflareService.createDNSRecord({
                type: 'CNAME',
                name: tenantData.domain,
                content: `${process.env.EC2_PUBLIC_DNS || 'ec2-52-15-148-97.us-east-2.compute.amazonaws.com'}`,
                proxied: true,
                ttl: 1
              });
              
              dnsSetup = {
                success: true,
                recordId: dnsRecord.id,
                domain: tenantData.domain,
                target: dnsRecord.content
              };
              
              console.log('✅ Step 5: Cloudflare DNS setup successful');
              log.info('Tenant DNS configured', {
                tenantId: (tenant._id as any).toString(),
                domain: tenantData.domain,
                recordId: dnsRecord.id
              });
            } else {
              console.log('⚠️ Step 5: Cloudflare connection failed, skipping DNS setup');
              dnsSetup = { success: false, error: 'Cloudflare connection failed' };
            }
          } catch (dnsError) {
            console.error('❌ Step 5: DNS setup failed:', dnsError);
            dnsSetup = { 
              success: false, 
              error: dnsError instanceof Error ? dnsError.message : String(dnsError) 
            };
            // Don't fail tenant creation if DNS setup fails
            log.warning('DNS setup failed for tenant', {
              tenantId: (tenant._id as any).toString(),
              domain: tenantData.domain,
              error: dnsError instanceof Error ? dnsError.message : String(dnsError)
            });
          }
        } else {
          console.log('⚠️ Step 5: Skipping DNS setup in development mode');
          dnsSetup = { success: false, error: 'Skipped in development' };
        }

        return {
          tenant,
          adminUser: {
            id: adminUser._id,
            firstName: adminUser.firstName,
            lastName: adminUser.lastName,
            email: adminUser.email,
            role: adminUser.role
          },
          subscription: planId ? {
            planId,
            status: 'trial',
            isTrial: true,
            trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          } : null,
          dnsSetup
        };
      });
    } catch (error) {
      console.error('❌ Error in tenant creation:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        tenantData: {
          name: tenantData.name,
          domain: tenantData.domain,
          subscriptionPlan: tenantData.subscriptionPlan
        }
      });
      // Don't call abortTransaction() here as withTransaction handles it automatically
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get tenant by domain
   */
  static async getTenantByDomain(domain: string) {
    try {
      const tenant = await Tenant.findOne({ 
        domain: domain.toLowerCase(),
        status: { $in: ['active', 'trial'] }
      }).lean();
      
      return tenant;
    } catch (error) {
      console.error('Error getting tenant by domain:', error);
      throw error;
    }
  }
}