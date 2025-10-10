// Frontend API Configuration
export const apiConfig = {
  // Base API URL - uses environment variables
  baseUrl: import.meta.env.VITE_API_BASE_URL || (() => {
    const isDevelopment = import.meta.env.MODE === 'development' || 
                         import.meta.env.DEV || 
                         window.location.hostname === 'localhost' ||
                         window.location.hostname === '127.0.0.1';
    return isDevelopment ? 'http://localhost:5000/api' : 'https://ibuyscrap.ca/api';
  })(),
  
  // Super Admin API URL
  superAdminApiUrl: import.meta.env.VITE_SUPER_ADMIN_API_URL || (() => {
    const isDevelopment = import.meta.env.MODE === 'development' || 
                         import.meta.env.DEV || 
                         window.location.hostname === 'localhost' ||
                         window.location.hostname === '127.0.0.1';
    return isDevelopment ? 'http://localhost:5000/api' : 'https://ibuyscrap.ca/api';
  })(),
  
  // Tenant API URL template
  tenantApiUrlTemplate: import.meta.env.VITE_TENANT_API_URL_TEMPLATE || 'https://{domain}',
  
  // EC2 Configuration
  ec2PublicIp: import.meta.env.VITE_EC2_PUBLIC_IP || '18.220.224.109',
  ec2PublicDns: import.meta.env.VITE_EC2_PUBLIC_DNS || 'ec2-18-220-224-109.us-east-2.compute.amazonaws.com',
  
  // Get API URL based on environment and domain
  getApiUrl: (domain?: string) => {
    const isDevelopment = import.meta.env.MODE === 'development' || 
                         import.meta.env.DEV || 
                         window.location.hostname === 'localhost' ||
                         window.location.hostname === '127.0.0.1';
    
    if (isDevelopment) {
      return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    }
    
    // For production, use the current domain (ibuyscrap.ca) for super admin
    return 'https://ibuyscrap.ca/api';
  },
  
  // Get tenant-specific API URL with /immigration-portal/ path
  getTenantApiUrl: (domain: string) => {
    const isDevelopment = import.meta.env.MODE === 'development' || 
                         import.meta.env.DEV || 
                         window.location.hostname === 'localhost' ||
                         window.location.hostname === '127.0.0.1';
    
    if (isDevelopment) {
      return 'http://localhost:5000/api/v1';
    }
    
    // For production, use tenant domain with /immigration-portal/ path
    return `https://${domain}/immigration-portal/api/v1`;
  },
  
  // Get super admin API URL
  getSuperAdminApiUrl: () => {
    const isDevelopment = import.meta.env.MODE === 'development' || 
                         import.meta.env.DEV || 
                         window.location.hostname === 'localhost' ||
                         window.location.hostname === '127.0.0.1';
    
    if (isDevelopment) {
      return 'http://localhost:5000/api';
    }
    
    // For production, use the domain
    return 'https://ibuyscrap.ca/api';
  }
};

export default apiConfig;
