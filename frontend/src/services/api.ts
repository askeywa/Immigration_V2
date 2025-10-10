// frontend/src/services/api.ts
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { apiConfig } from '@/config/api';
// Temporarily disabled problematic interceptor
// import { tenantApiInterceptor, tenantApi } from './tenantApiInterceptor';

// Get API URL dynamically
const getApiUrl = () => {
  const isDevelopment = import.meta.env.MODE === 'development' || 
                       import.meta.env.DEV || 
                       (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));
  
  const apiUrl = isDevelopment ? 'http://localhost:5000/api/v1' : 'https://ibuyscrap.ca/api/v1';
  
  console.log('🔍 API Configuration:', {
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'server-side',
    isDevelopment,
    apiUrl
  });
  
  return apiUrl;
};

// Create the base API instance
export const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and tenant headers
api.interceptors.request.use(
  (config: any) => {
    // Try to get token from authStore first
    let token = useAuthStore.getState().token;
    let tenantDomain = null;
    
    // Fallback to sessionStorage if authStore token is not available (SECURITY: Use sessionStorage)
    if (!token && typeof window !== 'undefined') {
      try {
        const authStorage = sessionStorage.getItem('auth-storage');
        if (authStorage) {
          const authData = JSON.parse(authStorage);
          token = authData?.state?.token;
          tenantDomain = authData?.state?.tenant?.domain;
        }
      } catch (error) {
        console.warn('Failed to get token from sessionStorage:', error);
      }
    } else {
      // Get tenant domain from authStore if available
      const authState = useAuthStore.getState();
      tenantDomain = authState.tenant?.domain;
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add tenant domain headers for tenant-specific API calls
    if (tenantDomain && config.url?.includes('/tenant/')) {
      config.headers['X-Tenant-Domain'] = tenantDomain;
      config.headers['X-Original-Host'] = tenantDomain;
    }
    
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: any) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

// Export basic API as tenant-aware API (temporarily)
export { api as tenantAwareApi };

export const profileService = {
  getProfileByUserId: async (userId: string) => api.get(`/profiles/${userId}`).then(r => r.data),
};

export const fileService = {
  upload: async (
    payload: { title: string; section?: string; partName?: string; file: File },
    onProgress?: (percent: number) => void
  ) => {
    const base64 = await new Promise<string>((resolve: any, reject: any) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(payload.file);
    });
    const body = { title: payload.title, section: payload.section, partName: payload.partName, fileName: payload.file.name, mimeType: payload.file.type, base64 };
    return api.post('/files/upload', body, {
      onUploadProgress: (evt: any) => {
        if (!evt.total) return;
        const percent = Math.round((evt.loaded * 100) / evt.total);
        onProgress?.(percent);
      }
    }).then(r => r.data);
  },
  listMine: async () => api.get('/files').then(r => r.data),
  listByUser: async (userId: string) => api.get(`/files/user/${userId}`).then(r => r.data),
  downloadUrl: (id: string) => `${getApiUrl()}/files/download/${id}`,
  delete: async (id: string) => api.delete(`/files/${id}`).then(r => r.data),
  download: async (id: string, suggestedName?: string) => {
    const res = await api.get(`/files/download/${id}`, { responseType: 'blob' });
    const blob = res.data as Blob;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedName || 'download';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
  rename: async (id: string, title: string) => api.patch(`/files/${id}`, { title }).then(r => r.data),
};