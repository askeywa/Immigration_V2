// frontend/src/pages/auth/Login.tsx
import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Users, FileText, Shield, Globe, ArrowRight, CheckCircle, Clock, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { preloadRoute } from '@/utils/preload';
import { useAuthStore } from '@/store/authStore';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantDomain, setTenantDomain] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{email?: string; password?: string; tenantDomain?: string}>({});
  
  const { login, user } = useAuthStore();
  

  // Preload likely next routes during idle time
  React.useEffect(() => {
    const schedule = (cb: () => void) => {
      if ('requestIdleCallback' in window) (window as any).requestIdleCallback(cb);
      else setTimeout(cb, 1);
    };
    schedule(() => {
      preloadRoute(() => import('@/pages/user/UserDashboard'));
      preloadRoute(() => import('@/pages/auth/Register'));
    });
  }, []);

  // Let TenantRouter handle redirects - don't redirect here
  // The App.tsx will render TenantRouter which will handle proper routing

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setError(null);
    setFieldErrors({});
    
    console.log('🔍 Form submitted with:', { email, password, tenantDomain });
    setIsLoggingIn(true);
    
    try {
      console.log('🔍 Calling login function...');
      await login(email, password, tenantDomain || '');
      console.log('✅ Login successful!');
      
      // Simple redirect after successful login
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        let redirectPath = '/dashboard';
        if (currentUser.role === 'super_admin') {
          redirectPath = '/super-admin';
        } else if (currentUser.role === 'admin' || currentUser.role === 'tenant_admin') {
          redirectPath = '/tenant/dashboard';
        }
        console.log('🔍 Redirecting to:', redirectPath);
        window.location.href = redirectPath;
      }
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      
      // Handle different types of errors
      if (error?.response?.data) {
        const { message, error: errorCode, details } = error.response.data;
        
        // Set the main error message
        setError(message || 'Login failed. Please try again.');
        
        // Handle field-specific errors based on error code
        switch (errorCode) {
          case 'INVALID_EMAIL_FORMAT':
            setFieldErrors({ email: 'Please enter a valid email address.' });
            break;
          case 'MISSING_CREDENTIALS':
            if (!email) setFieldErrors(prev => ({ ...prev, email: 'Email is required.' }));
            if (!password) setFieldErrors(prev => ({ ...prev, password: 'Password is required.' }));
            break;
          case 'INVALID_DOMAIN_FORMAT':
            setFieldErrors({ tenantDomain: 'Please enter a valid organization domain.' });
            break;
          case 'INPUT_TOO_LONG':
            if (email.length > 254) setFieldErrors(prev => ({ ...prev, email: 'Email is too long.' }));
            if (password.length > 128) setFieldErrors(prev => ({ ...prev, password: 'Password is too long.' }));
            break;
          case 'INVALID_CREDENTIALS':
            // Don't specify which field is wrong for security
            setError('The email or password you entered is incorrect. Please check your credentials and try again.');
            break;
          case 'ACCOUNT_SUSPENDED':
            setError('Your account has been temporarily suspended. Please contact support for assistance.');
            break;
          case 'SUBSCRIPTION_EXPIRED':
            setError('Your account subscription has expired. Please contact your administrator to renew access.');
            break;
          case 'ACCOUNT_NOT_CONFIGURED':
            setError('Your account is not properly configured. Please contact support for assistance.');
            break;
          case 'INVALID_TENANT_ACCESS':
            setError('You do not have access to this organization. Please verify you are logging into the correct portal.');
            break;
          default:
            setError(message || 'Unable to sign in at this time. Please try again or contact support if the problem persists.');
        }
      } else if (error?.message) {
        setError(error.message);
      } else {
        setError('Unable to sign in at this time. Please try again or contact support if the problem persists.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'about':
        return (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">About Immigration Portal</h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                A comprehensive digital platform designed to streamline and simplify the immigration application process.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/50 backdrop-blur-sm rounded-lg p-6 border border-gray-200">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <Globe className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Global Access</h3>
                </div>
                <p className="text-gray-600">
                  Access your immigration application from anywhere in the world, 24/7, through our secure web platform.
                </p>
              </div>
              
              <div className="bg-white/50 backdrop-blur-sm rounded-lg p-6 border border-gray-200">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                    <Shield className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Secure & Compliant</h3>
                </div>
                <p className="text-gray-600">
                  Built with enterprise-grade security and compliance standards to protect your sensitive information.
                </p>
              </div>
            </div>
          </motion.div>
        );

      case 'features':
        return (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Key Features</h2>
              <p className="text-lg text-gray-600">
                Everything you need for a smooth immigration journey
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">User Profile Management</h3>
                  <p className="text-gray-600 text-sm">Create and manage comprehensive immigration profiles with all required information.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Document Management</h3>
                  <p className="text-gray-600 text-sm">Upload, organize, and track all required documents in one secure location.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Application Tracking</h3>
                  <p className="text-gray-600 text-sm">Real-time updates on your application status and processing timeline.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Progress Analytics</h3>
                  <p className="text-gray-600 text-sm">Visual insights into your application progress and completion status.</p>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 'how-it-works':
        return (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">How It Works</h2>
              <p className="text-lg text-gray-600">
                Simple steps to get started with your immigration application
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Create Account</h3>
                  <p className="text-gray-600">Sign up with your email and create a secure account in minutes.</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Build Profile</h3>
                  <p className="text-gray-600">Complete your immigration profile with personal and professional information.</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Upload Documents</h3>
                  <p className="text-gray-600">Securely upload all required documents and certificates.</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  4
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Track Progress</h3>
                  <p className="text-gray-600">Monitor your application status and receive real-time updates.</p>
                </div>
              </div>
            </div>
          </motion.div>
        );

      default: // home
        return (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-800 mb-4">
                Welcome to Immigration Portal
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
                Your comprehensive digital solution for managing immigration applications with ease, security, and efficiency.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200 shadow-lg">
                <div className="flex items-center mb-4">
                  <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mr-4">
                    <Users className="w-7 h-7 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">For Applicants</h3>
                    <p className="text-gray-600 text-sm">Streamlined application process</p>
                  </div>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center text-gray-700">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    Easy profile creation and management
                  </li>
                  <li className="flex items-center text-gray-700">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    Secure document upload and storage
                  </li>
                  <li className="flex items-center text-gray-700">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    Real-time application tracking
                  </li>
                </ul>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200 shadow-lg">
                <div className="flex items-center mb-4">
                  <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                    <Shield className="w-7 h-7 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">For Administrators</h3>
                    <p className="text-gray-600 text-sm">Comprehensive management tools</p>
                  </div>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center text-gray-700">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    User management and oversight
                  </li>
                  <li className="flex items-center text-gray-700">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    Application review and processing
                  </li>
                  <li className="flex items-center text-gray-700">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    Advanced analytics and reporting
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="text-center">
              <Link
                to="/register"
                className="inline-flex items-center bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-medium"
              >
                Get Started Today
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-100 via-cream-50 to-red-50">
      {/* Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">I</span>
              </div>
              <span className="text-xl font-bold text-gray-800">Immigration Portal</span>
            </div>
            
            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => setActiveSection('home')}
                className={`text-sm font-medium transition-colors duration-200 ${
                  activeSection === 'home' 
                    ? 'text-red-600 border-b-2 border-red-600' 
                    : 'text-gray-600 hover:text-red-600'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => setActiveSection('about')}
                className={`text-sm font-medium transition-colors duration-200 ${
                  activeSection === 'about' 
                    ? 'text-red-600 border-b-2 border-red-600' 
                    : 'text-gray-600 hover:text-red-600'
                }`}
              >
                About
              </button>
              <button
                onClick={() => setActiveSection('features')}
                className={`text-sm font-medium transition-colors duration-200 ${
                  activeSection === 'features' 
                    ? 'text-red-600 border-b-2 border-red-600' 
                    : 'text-gray-600 hover:text-red-600'
                }`}
              >
                Features
              </button>
              <button
                onClick={() => setActiveSection('how-it-works')}
                className={`text-sm font-medium transition-colors duration-200 ${
                  activeSection === 'how-it-works' 
                    ? 'text-red-600 border-b-2 border-red-600' 
                    : 'text-gray-600 hover:text-red-600'
                }`}
              >
                How It Works
              </button>
            </div>
            
            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button className="text-gray-600 hover:text-red-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)]">
        {/* Left Side - Content */}
        <div className="flex-1 p-4 sm:p-8 lg:p-12 flex items-center">
          <div className="max-w-4xl w-full">
            {renderContent()}
          </div>
        </div>
        
        {/* Right Side - Login Form */}
        <div className="w-full lg:w-96 xl:w-[450px] bg-white/80 backdrop-blur-sm border-t lg:border-t-0 lg:border-l border-gray-200 p-4 sm:p-8 lg:p-12 flex items-center">
          <div className="w-full max-w-sm mx-auto lg:max-w-none lg:mx-0">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome Back</h2>
                <p className="text-gray-600">Sign in to your account</p>
              </div>
              
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`pl-10 ${fieldErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`pl-10 pr-10 ${fieldErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
                  )}
                </div>

                {/* Advanced Options Toggle */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    disabled={isLoggingIn}
                  >
                    {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                  </button>
                </div>

                {/* Tenant Domain Field (Advanced) */}
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div>
                      <label htmlFor="tenantDomain" className="block text-sm font-medium text-gray-700 mb-2">
                        Tenant Domain <span className="text-gray-500">(Optional)</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <Input
                          id="tenantDomain"
                          type="text"
                          value={tenantDomain}
                          onChange={(e) => setTenantDomain(e.target.value)}
                          className={`pl-10 ${fieldErrors.tenantDomain ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                          placeholder="e.g., companyname"
                          disabled={isLoggingIn}
                        />
                      </div>
                      {fieldErrors.tenantDomain && (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors.tenantDomain}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Specify a tenant domain if you belong to multiple organizations
                      </p>
                    </div>
                  </motion.div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                      Remember me
                    </label>
                  </div>

                  <div className="text-sm">
                    <Link
                      to="/forgot-password"
                      className="font-medium text-red-600 hover:text-red-500 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Signing in...
                    </div>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link
                    to="/register"
                    onMouseEnter={() => preloadRoute(() => import('@/pages/auth/Register'))}
                    className="font-medium text-red-600 hover:text-red-500 transition-colors"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;