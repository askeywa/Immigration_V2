// frontend/src/pages/auth/AuthCallback.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { motion } from 'framer-motion';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuthData } = useAuthStore();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [hasProcessed, setHasProcessed] = useState<boolean>(false);

  useEffect(() => {
    // Prevent multiple executions
    if (hasProcessed) {
      console.log('⏭️  AuthCallback already processed, skipping...');
      return;
    }
    
    const processAuthCallback = async () => {
      try {
        console.log('🔄 AuthCallback: Starting auth data processing...');
        console.log('🔍 Full URL:', window.location.href);
        console.log('🔍 Pathname:', window.location.pathname);
        console.log('🔍 Search:', window.location.search);
        console.log('🔍 Hash:', window.location.hash);
        setDebugInfo('Starting authentication data processing...');
        setHasProcessed(true);  // Mark as processed immediately
        
        // Get encoded auth data from URL
        const encodedData = searchParams.get('data');
        
        if (!encodedData) {
          const errorMsg = 'No authentication data found in URL';
          console.error('❌ AuthCallback:', errorMsg);
          setErrorMessage(errorMsg);
          setStatus('error');
          setDebugInfo(`Error: ${errorMsg}\nURL: ${window.location.href}`);
          
          // Redirect to login after showing error
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
          return;
        }

        console.log('✅ AuthCallback: Found encoded data in URL');
        setDebugInfo(`Found encoded data: ${encodedData.substring(0, 100)}...`);
        
        // Decode the auth data
        let authData;
        try {
          authData = JSON.parse(decodeURIComponent(encodedData));
          console.log('✅ AuthCallback: Successfully decoded auth data');
          setDebugInfo(`Decoded data keys: ${Object.keys(authData).join(', ')}`);
        } catch (decodeError) {
          const errorMsg = 'Failed to decode authentication data';
          console.error('❌ AuthCallback: Decode error:', decodeError);
          setErrorMessage(errorMsg);
          setStatus('error');
          setDebugInfo(`Decode error: ${decodeError}\nEncoded data: ${encodedData}`);
          
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
          return;
        }

        // Validate required fields
        const requiredFields = ['user', 'tenant', 'token'];
        const missingFields = requiredFields.filter(field => !authData[field]);
        
        if (missingFields.length > 0) {
          const errorMsg = `Missing required auth fields: ${missingFields.join(', ')}`;
          console.error('❌ AuthCallback:', errorMsg);
          setErrorMessage(errorMsg);
          setStatus('error');
          setDebugInfo(`Missing fields: ${missingFields.join(', ')}\nAvailable fields: ${Object.keys(authData).join(', ')}`);
          
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
          return;
        }

        console.log('✅ AuthCallback: Auth data validation passed');
        console.log('🔍 AuthCallback: User:', authData.user.email, authData.user.role);
        console.log('🔍 AuthCallback: Tenant:', authData.tenant.name, authData.tenant.domain);
        console.log('🔍 AuthCallback: Token length:', authData.token.length);
        
        setDebugInfo(`Validated data:\nUser: ${authData.user.email} (${authData.user.role})\nTenant: ${authData.tenant.name} (${authData.tenant.domain})\nToken: ${authData.token.length} chars`);

        // Store auth data using current auth store structure
        try {
          console.log('🔄 AuthCallback: Storing auth data in Zustand store...');
          
          // CRITICAL: Use setAuthData to set ALL state including isAuthenticated
          // Zustand persist middleware will automatically write to sessionStorage
          setAuthData(
            { ...authData.user, permissions: [] },
            authData.tenant || null,
            authData.subscription || null,
            authData.token
          );
          
          console.log('✅ AuthCallback: Auth data stored successfully in Zustand store');
          console.log('✅ AuthCallback: Token included in sessionStorage:', authData.token.substring(0, 20) + '...');
          
          // CRITICAL: Verify sessionStorage was actually written before redirecting
          await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for Zustand persist
          
          const verifyStorage = sessionStorage.getItem('auth-storage');
          if (verifyStorage) {
            const verified = JSON.parse(verifyStorage);
            console.log('✅ AuthCallback: Verified sessionStorage contains auth data:', {
              isAuthenticated: verified.state?.isAuthenticated,
              hasUser: !!verified.state?.user,
              hasToken: !!verified.state?.token
            });
          } else {
            console.error('❌ AuthCallback: sessionStorage verification failed - no data found!');
          }
          
          setStatus('success');
          setDebugInfo('Authentication data stored successfully!\nRedirecting to dashboard...');
          
          // Determine redirect path based on user role
          let redirectPath = '/dashboard';
          if (authData.user.role === 'super_admin') {
            redirectPath = '/super-admin';
          } else if (authData.user.role === 'admin' || authData.user.role === 'tenant_admin') {
            redirectPath = '/tenant/dashboard';
          }
          
          console.log('🔄 AuthCallback: Redirecting to:', redirectPath);
          
          // CRITICAL: Use window.location.replace for immediate redirect
          // SessionStorage is already written, no need for long delay
          setTimeout(() => {
            window.location.replace(redirectPath);
          }, 200); // Increased from 1500 to 2000ms
          
        } catch (storeError) {
          const errorMsg = 'Failed to store authentication data';
          console.error('❌ AuthCallback: Store error:', storeError);
          setErrorMessage(errorMsg);
          setStatus('error');
          setDebugInfo(`Store error: ${storeError}\nAuth data was valid but couldn't be stored`);
          
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
        }

      } catch (error) {
        const errorMsg = 'Unexpected error during authentication callback';
        console.error('❌ AuthCallback: Unexpected error:', error);
        setErrorMessage(errorMsg);
        setStatus('error');
        setDebugInfo(`Unexpected error: ${error}\nThis should not happen - please check console logs`);
        
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    processAuthCallback();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps  // Run only once on mount

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return '🔄';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '🔄';
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'processing':
        return 'Processing authentication...';
      case 'success':
        return 'Authentication successful! Redirecting...';
      case 'error':
        return `Authentication failed: ${errorMessage}`;
      default:
        return 'Processing...';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4"
      >
        <div className="text-center">
          <div className="text-4xl mb-4">
            {status === 'processing' && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                🔄
              </motion.div>
            )}
            {status === 'success' && '✅'}
            {status === 'error' && '❌'}
          </div>
          
          <h2 className={`text-xl font-semibold mb-2 ${getStatusColor()}`}>
            {getStatusMessage()}
          </h2>
          
          {status === 'error' && (
            <p className="text-sm text-gray-600 mb-4">
              You will be redirected to the login page shortly.
            </p>
          )}
          
          {status === 'success' && (
            <p className="text-sm text-gray-600 mb-4">
              Taking you to your dashboard...
            </p>
          )}
          
          {debugInfo && (
            <div className="mt-6 p-4 bg-gray-100 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Debug Information:</h3>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
                {debugInfo}
              </pre>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AuthCallback;
