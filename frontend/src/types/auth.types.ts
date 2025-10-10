// frontend/src/types/auth.types.ts

// Tenant interface
export interface Tenant {
  _id: string;
  name: string;
  domain: string;
  status: 'active' | 'inactive' | 'suspended' | 'trial';
  contactInfo: {
    email: string;
    phone?: string;
    address?: string;
  };
  settings: {
    maxUsers: number;
    maxAdmins: number;
    features: string[];
    branding?: {
      logo?: string;
      primaryColor?: string;
      secondaryColor?: string;
      companyName?: string;
    };
  };
  trialEndDate?: string;
  createdAt: string;
  updatedAt: string;
}

// Subscription interface
export interface Subscription {
  _id: string;
  tenantId: string;
  planId: string | { displayName?: string; name?: string };
  status: 'active' | 'inactive' | 'cancelled' | 'past_due' | 'trial';
  startDate: string;
  endDate?: string;
  billing: {
    amount: number;
    currency: string;
    cycle: 'monthly' | 'annual' | 'one_time';
    nextBillingDate?: string;
  };
  usage: {
    currentUsers: number;
    currentAdmins: number;
    storageUsed: number;
    apiCallsThisMonth: number;
  };
}

// Enhanced User interface with tenant context
export interface User {
    _id: string;
    id?: string; // Alternative ID field
    email: string;
    firstName: string;
    lastName: string;
    name?: string; // Alternative name field
    role: 'admin' | 'user' | 'super_admin' | 'tenant_admin';
    tenantId?: string;
    isActive: boolean;
    phone?: string;
    status: 'active' | 'inactive' | 'pending' | 'suspended';
    lastLogin?: string;
    createdAt: string;
    updatedAt: string;
    profile?: {
      status: 'active' | 'pending' | 'completed' | 'rejected';
      avatar?: string;
      phoneNumber?: string;
      timezone?: string;
      language?: string;
    };
    permissions?: string[];
  }
  
  // Enhanced login request with optional tenant domain
  export interface LoginRequest {
    email: string;
    password: string;
    tenantDomain?: string;
  }

  // Enhanced login response with tenant and subscription data
  export interface LoginResponse {
    success: boolean;
    message: string;
    data: {
      user: User;
      token: string;
      tenant?: Tenant;
      subscription?: Subscription;
    };
  }

  // Enhanced register request for new RCIC registration
  export interface RegisterRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    companyName?: string;
    domain?: string;
    tenantId?: string;
  }

  // Enhanced register response with tenant data
  export interface RegisterResponse {
    success: boolean;
    message: string;
    data: {
      user: User;
      token: string;
      tenant?: Tenant;
      subscription?: Subscription;
    };
  }
  
  // Enhanced AuthState with tenant context
  export interface AuthState {
    user: User | null;
    tenant: Tenant | null;
    subscription: Subscription | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (email: string, password: string, tenantDomain?: string) => Promise<void>;
    register: (userData: RegisterRequest) => Promise<void>;
    logout: () => void;
    setUser: (user: User) => void;
    setTenant: (tenant: Tenant | null) => void;
    setSubscription: (subscription: Subscription | null) => void;
    setAuthData: (user: User, tenant: Tenant | null, subscription: Subscription | null, token: string) => void;
    switchTenant: (tenantId: string) => Promise<void>;
    hasPermission: (permission: string) => boolean;
    isSuperAdmin: () => boolean;
    isTenantAdmin: () => boolean;
  }
  