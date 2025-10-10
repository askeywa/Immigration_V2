// backend/src/config/config.ts
// Load environment variables if not already loaded
if (!process.env.JWT_SECRET && !process.env.MONGODB_URI) {
  try {
    require('dotenv').config({ path: './.env' });
  } catch (error) {
    // dotenv already loaded or not available
  }
}

export const config = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '5000', 10),
    mongoUri: process.env.MONGODB_URI || process.env.MONGO_URI || (
      process.env.NODE_ENV === 'production' 
        ? 'mongodb+srv://immigration_db_user:ImmigrationDB2024@rcicdb.npymiqt.mongodb.net/productionDB?retryWrites=true&w=majority&appName=RCICDB'
        : 'mongodb+srv://immigration_db_user:ImmigrationDB2024@rcicdb.npymiqt.mongodb.net/localDB?retryWrites=true&w=majority&appName=RCICDB'
    ),
    jwtSecret: (() => {
      if (!process.env.JWT_SECRET) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('JWT_SECRET must be set in production environment');
        }
        console.warn('⚠️  JWT_SECRET not set, using development secret. Set JWT_SECRET in production!');
        return 'dev-secret-change-in-production';
      }
      return process.env.JWT_SECRET;
    })(),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    
    // Dynamic domain based on environment
    mainDomain: process.env.MAIN_DOMAIN || (
      process.env.NODE_ENV === 'production' 
        ? 'sehwagimmigration.com' 
        : 'localhost'
    ),
    
    // Super admin domains - environment aware
    allowedSuperAdminDomains: (() => {
      const envDomains = process.env.ALLOWED_SUPER_ADMIN_DOMAINS;
      if (envDomains) {
        return envDomains.split(',').map(d => d.trim()).filter(d => d.length > 0);
      }
      
      // Default based on environment
      return process.env.NODE_ENV === 'production'
        ? ['ibuyscrap.ca', 'www.ibuyscrap.ca']
        : ['localhost', 'localhost:5174', 'localhost:5000'];
    })(),
    
    // Dynamic Frontend URL Configuration
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5174',
    superAdminFrontendUrl: process.env.SUPER_ADMIN_FRONTEND_URL || 'http://localhost:5174',
    tenantFrontendUrlTemplate: process.env.TENANT_FRONTEND_URL_TEMPLATE || 'https://{domain}',
    
    // Enhanced Frontend URL Helper Functions
    getFrontendUrl: (domain?: string) => {
      const isDevelopment = process.env.NODE_ENV !== 'production';
      
      console.log('🔍 getFrontendUrl called with domain:', domain);
      console.log('🔍 NODE_ENV:', process.env.NODE_ENV);
      console.log('🔍 isDevelopment:', isDevelopment);
      
      if (isDevelopment) {
        const devUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
        console.log('🔍 Returning dev URL:', devUrl);
        return devUrl;
      }
      
      // Production logic - ALL dashboards (super admin and tenant) are hosted on ibuyscrap.ca
      // The tenant login pages are on their own domains, but after login they redirect to ibuyscrap.ca
      const isSuperAdmin = domain && ['ibuyscrap.ca', 'www.ibuyscrap.ca'].includes(domain);
      console.log('🔍 isSuperAdmin:', isSuperAdmin);
      
      if (isSuperAdmin) {
        const superAdminUrl = 'https://ibuyscrap.ca/super-admin';
        console.log('🔍 Returning super admin URL:', superAdminUrl);
        return superAdminUrl;
      }
      
      // For tenant logins from custom domains (like honeynwild.com), 
      // redirect to the tenant dashboard on ibuyscrap.ca
      if (domain && !['ibuyscrap.ca', 'www.ibuyscrap.ca'].includes(domain)) {
        const tenantUrl = 'https://ibuyscrap.ca/tenant/dashboard';
        console.log('🔍 Returning tenant URL:', tenantUrl);
        return tenantUrl;
      }
      
      // Default fallback
      const fallbackUrl = process.env.FRONTEND_URL || 'https://ibuyscrap.ca';
      console.log('🔍 Returning fallback URL:', fallbackUrl);
      return fallbackUrl;
    },
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '500', 10), // 500 requests per 15 minutes (reasonable for development)
    
    // Domain Configuration
    superAdminDomain: process.env.SUPER_ADMIN_DOMAIN || 'ibuyscrap.ca',
    tenantDomainPrefix: process.env.TENANT_DOMAIN_PREFIX || 'immigration-portal',
    apiDomain: process.env.API_BASE_URL || 'localhost:5000',
    
    // EC2 Instance Configuration
    ec2PublicIp: process.env.EC2_PUBLIC_IP || '18.220.224.109',
    ec2PrivateIp: process.env.EC2_PRIVATE_IP || '172.31.40.28',
    ec2PublicDns: process.env.EC2_PUBLIC_DNS || 'ec2-18-220-224-109.us-east-2.compute.amazonaws.com',
    
    // Tenant API Configuration - Using /immigration-portal/ path
    tenantApiBaseUrl: process.env.TENANT_API_BASE_URL || 'https://{domain}/immigration-portal',
    tenantApiVersion: process.env.TENANT_API_VERSION || 'v1',
    
    // Get tenant-specific API URL with /immigration-portal/ path
    getTenantApiUrl: (domain?: string) => {
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (isDevelopment) {
        return `http://localhost:5000/api/v1`;
      }
      
      if (domain) {
        // For tenant domains, use the tenant's domain with /immigration-portal/ path
        return `https://${domain}/immigration-portal/api/v1`;
      }
      
      // Fallback to EC2 IP
      const ec2Ip = process.env.EC2_PUBLIC_IP || '18.220.224.109';
      return `http://${ec2Ip}:5000/api/v1`;
    },
    
    // Get EC2-based API URL for tenant domains with /immigration-portal/ path
    getTenantApiUrlByDomain: (domain?: string) => {
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (isDevelopment) {
        return `http://localhost:5000/api/v1`;
      }
      
      if (domain) {
        // For tenant domains, use the tenant's domain with /immigration-portal/ path
        return `https://${domain}/immigration-portal/api/v1`;
      }
      
      // Fallback to EC2 IP
      const ec2Ip = process.env.EC2_PUBLIC_IP || '18.220.224.109';
      return `http://${ec2Ip}:5000/api/v1`;
    },
    
    
    // App Configuration
    appName: process.env.APP_NAME || 'Immigration Portal',
    
    allowStartWithoutDb: (() => {
      if (process.env.ALLOW_START_WITHOUT_DB !== undefined) {
        return process.env.ALLOW_START_WITHOUT_DB === 'true';
      }
      return (process.env.NODE_ENV !== 'production');
    })(),
    
    // Redis Configuration
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    redisEnabled: process.env.REDIS_ENABLED === 'true',
  };

