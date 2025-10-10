// frontend/src/services/superAdminApi.ts
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

// Super Admin API Configuration
const getSuperAdminApiUrl = () => {
  const isDevelopment = import.meta.env.MODE === 'development' || 
                       import.meta.env.DEV || 
                       (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));
  
  const apiUrl = isDevelopment ? 'http://localhost:5000/api' : 'https://ibuyscrap.ca/api';
  
  console.log('🔍 Super Admin API Configuration:', {
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'server-side',
    isDevelopment,
    apiUrl
  });
  
  return apiUrl;
};

// Create the super admin API instance
export const superAdminApi = axios.create({
  baseURL: getSuperAdminApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
superAdminApi.interceptors.request.use(
  (config: any) => {
    // Try to get token from authStore first
    let token = useAuthStore.getState().token;
    
    // Fallback to sessionStorage if authStore token is not available
    if (!token && typeof window !== 'undefined') {
      try {
        const authStorage = sessionStorage.getItem('auth-storage');
        if (authStorage) {
          const authData = JSON.parse(authStorage);
          token = authData?.state?.token;
        }
      } catch (error) {
        console.warn('Failed to get token from sessionStorage:', error);
      }
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
superAdminApi.interceptors.response.use(
  (response) => {
    if (response.status >= 200 && response.status < 300) {
      console.log('✅ API Success:', {
        status: response.status,
        url: response.config.url,
        method: response.config.method?.toUpperCase()
      });
    }
    return response;
  },
  (error: any) => {
    console.error('❌ API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      message: error.message,
      data: error.response?.data
    });
    
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default superAdminApi;
