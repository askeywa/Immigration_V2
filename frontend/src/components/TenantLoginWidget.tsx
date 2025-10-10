import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiConfig } from '@/config/api';

interface TenantLoginWidgetProps {
  apiBaseUrl?: string;
  branding?: {
    logo?: string;
    primaryColor?: string;
    companyName?: string;
  };
  onLoginSuccess?: (user: any) => void;
  onLoginError?: (error: string) => void;
  showRegister?: boolean;
  className?: string;
}

interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

const TenantLoginWidget: React.FC<TenantLoginWidgetProps> = ({
  apiBaseUrl,
  branding,
  onLoginSuccess,
  onLoginError,
  showRegister = true,
  className = ''
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [loginData, setLoginData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  
  const [registerData, setRegisterData] = useState<RegisterFormData>({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });

  // Get API base URL from current domain using dynamic configuration
  const getApiBaseUrl = () => {
    if (apiBaseUrl) return apiBaseUrl;
    
    const hostname = window.location.hostname;
    
    // Use dynamic configuration based on environment and domain
    return apiConfig.getTenantApiUrl(hostname);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${getApiBaseUrl()}/tenant/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Login successful!');
        if (onLoginSuccess) {
          onLoginSuccess(result.data);
        }
        // Redirect to tenant dashboard
        if (result.data.frontendUrl) {
          window.location.href = result.data.frontendUrl;
        }
      } else {
        setError(result.error || 'Login failed');
        if (onLoginError) {
          onLoginError(result.error || 'Login failed');
        }
      }
    } catch (err) {
      const errorMessage = 'Network error. Please try again.';
      setError(errorMessage);
      if (onLoginError) {
        onLoginError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${getApiBaseUrl()}/tenant/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Registration successful!');
        if (onLoginSuccess) {
          onLoginSuccess(result.data);
        }
        // Redirect to tenant dashboard
        if (result.data.frontendUrl) {
          window.location.href = result.data.frontendUrl;
        }
      } else {
        setError(result.error || 'Registration failed');
        if (onLoginError) {
          onLoginError(result.error || 'Registration failed');
        }
      }
    } catch (err) {
      const errorMessage = 'Network error. Please try again.';
      setError(errorMessage);
      if (onLoginError) {
        onLoginError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const primaryColor = branding?.primaryColor || '#3B82F6';
  const companyName = branding?.companyName || 'Immigration Portal';

  return (
    <div className={`tenant-login-widget ${className}`}>
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4" style={{ backgroundColor: primaryColor }}>
          <div className="flex items-center justify-center">
            {branding?.logo && (
              <img 
                src={branding.logo} 
                alt={companyName} 
                className="h-8 w-8 mr-3"
              />
            )}
            <h2 className="text-xl font-semibold text-white">
              {companyName}
            </h2>
          </div>
        </div>

        {/* Form Toggle */}
        <div className="px-6 py-4 border-b">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                isLogin 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Login
            </button>
            {showRegister && (
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  !isLogin 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Register
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="px-6 py-3 bg-red-50 border-l-4 border-red-400">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="px-6 py-3 bg-green-50 border-l-4 border-green-400">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        {/* Login Form */}
        {isLogin && (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleLogin}
            className="px-6 py-4 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 rounded-md text-white font-medium transition-colors"
              style={{ 
                backgroundColor: primaryColor,
                opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </motion.form>
        )}

        {/* Register Form */}
        {!isLogin && showRegister && (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleRegister}
            className="px-6 py-4 space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={registerData.firstName}
                  onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={registerData.lastName}
                  onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                minLength={8}
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 rounded-md text-white font-medium transition-colors"
              style={{ 
                backgroundColor: primaryColor,
                opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </motion.form>
        )}
      </div>
    </div>
  );
};

export default TenantLoginWidget;
