// frontend/src/pages/user/UserDashboard.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, 
  FileText, 
  Clock, 
  AlertCircle,
  ArrowRight,
  Upload,
  MessageSquare,
  Calculator,
  Bell,
  Settings
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardHeader } from '@/components/common';
import { useAuthStore } from '@/store/authStore';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: 'red' | 'blue' | 'green' | 'purple';
  badge?: string;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ 
  title, 
  description, 
  icon: Icon, 
  href, 
  color,
  badge 
}) => {
  const colorClasses = {
    red: 'from-red-50 to-red-100 border-red-200 hover:from-red-100 hover:to-red-200',
    blue: 'from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200',
    green: 'from-green-50 to-green-100 border-green-200 hover:from-green-100 hover:to-green-200',
    purple: 'from-purple-50 to-purple-100 border-purple-200 hover:from-purple-100 hover:to-purple-200'
  };

  const iconColors = {
    red: 'text-red-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600'
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link to={href} className="block">
        <Card className={`p-6 bg-gradient-to-br ${colorClasses[color]} border transition-all duration-200 hover:shadow-md cursor-pointer`}>
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-lg bg-white/50 ${iconColors[color]}`}>
              <Icon className="h-6 w-6" />
            </div>
            {badge && (
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                color === 'red' ? 'bg-red-600 text-white' :
                color === 'blue' ? 'bg-blue-600 text-white' :
                color === 'green' ? 'bg-green-600 text-white' :
                'bg-purple-600 text-white'
              }`}>
                {badge}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600 mb-4">{description}</p>
          <div className="flex items-center text-sm font-medium text-gray-700">
            <span>Get started</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </div>
        </Card>
      </Link>
    </motion.div>
  );
};

const UserDashboard: React.FC = () => {
  // Fix: Proper state management to prevent isLoadingProgress error
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Fix: Prevent duplicate API calls with refs
  const hasFetched = useRef(false);
  const abortController = useRef<AbortController | null>(null);
  const isMounted = useRef(true);
  
  const { user, token, isAuthenticated } = useAuthStore();

  // Fix: Implement proper data fetching with cleanup - use direct approach
  useEffect(() => {
    const fetchDashboardData = async () => {
      // Prevent duplicate calls
      if (hasFetched.current || !isAuthenticated || !isMounted.current) return;
      
      try {
        setIsLoadingProgress(true);
        setError(null);
        hasFetched.current = true;
        
        // Get token from sessionStorage (where Zustand persist stores it)
        const authStorage = sessionStorage.getItem('auth-storage');
        let currentToken = null;
        if (authStorage) {
          try {
            const parsed = JSON.parse(authStorage);
            currentToken = parsed.state?.token;
          } catch (error) {
            console.error('Failed to parse auth storage:', error);
          }
        }
        
        const headers = {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        };

        // Fetch dashboard data with proper error handling
        // Note: Removed /api/users/me call as user data is already available in AuthStore
        console.log('🔍 UserDashboard: Making API calls...');
        
        // Make API calls without AbortController to avoid signal issues
        const [progressResponse, profileResponse] = await Promise.all([
          fetch('/api/profiles/progress', { 
            headers
          }),
          fetch('/api/profiles', { 
            headers
          })
        ]);

        console.log('🔍 UserDashboard: API responses received:', {
          progressStatus: progressResponse.status,
          profileStatus: profileResponse.status,
          progressOk: progressResponse.ok,
          profileOk: profileResponse.ok
        });

        if (!progressResponse.ok || !profileResponse.ok) {
          console.error('❌ UserDashboard: API calls failed:', {
            progressStatus: progressResponse.status,
            profileStatus: profileResponse.status
          });
          throw new Error('Failed to fetch dashboard data');
        }

        const [progressData, profileData] = await Promise.all([
          progressResponse.json(),
          profileResponse.json()
        ]);

        console.log('🔍 UserDashboard: Data parsed:', {
          progressData: !!progressData,
          profileData: !!profileData
        });

        // Update state regardless of mount status to ensure loading state is cleared
        console.log('🔍 UserDashboard: Setting dashboard data and clearing loading state');
        setDashboardData({
          progress: progressData.data || { completionPercentage: 0, completedSections: 0, totalSections: 10 },
          profile: profileData.data || null,
          user: user // Use user data from AuthStore instead of API call
        });

      } catch (error: any) {
        if (isMounted.current) {
          console.error('❌ UserDashboard: Dashboard fetch error:', error);
          setError(error.message);
        }
      } finally {
        // Always clear loading state to prevent stuck loading spinner
        console.log('🔍 UserDashboard: Clearing loading state');
        setIsLoadingProgress(false);
      }
    };

    if (isAuthenticated && !hasFetched.current) {
      fetchDashboardData();
    }

    // Cleanup function - no longer needed without AbortController
    return () => {
      // Cleanup handled by component unmount
    };
  }, [isAuthenticated]); // Only depend on isAuthenticated to prevent infinite loops

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Fix: Proper loading and error states
  if (isLoadingProgress) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
        <p className="text-red-800">Error loading dashboard: {error}</p>
        <Button 
          onClick={() => {
            hasFetched.current = false;
            setError(null);
            // Trigger a re-render by updating a state
            setIsLoadingProgress(true);
            setTimeout(() => {
              setIsLoadingProgress(false);
            }, 100);
          }}
          className="mt-2"
          variant="destructive"
        >
          Retry
        </Button>
      </div>
    );
  }

  const quickActions = [
    {
      title: 'Complete Profile',
      description: 'Finish setting up your immigration profile to get personalized recommendations.',
      icon: User,
      href: '/profile/assessment',
      color: 'red' as const,
      badge: 'Required'
    },
    {
      title: 'CRS Score Calculator',
      description: 'Calculate and save your Express Entry CRS score with live breakdown.',
      icon: Calculator,
      href: '/crs',
      color: 'green' as const,
      badge: 'New'
    },
    {
      title: 'Upload Documents',
      description: 'Upload and manage your immigration documents securely.',
      icon: Upload,
      href: '/documents',
      color: 'blue' as const
    },
    {
      title: 'Track Application',
      description: 'Monitor the progress of your immigration applications.',
      icon: Clock,
      href: '/documents/checklist',
      color: 'purple' as const
    }
  ];

  return (
    <div className="p-6 bg-cream-50 min-h-screen">
      {/* Header */}
      <DashboardHeader
        title={`Welcome back, ${user?.firstName || user?.name}! 👋`}
        subtitle="Your immigration journey continues here. Complete your profile and upload documents to get started."
        showRefresh={false}
        showLogout={false}
        showProfile={true}
        showNotifications={false}
        showSettings={false}
      />


      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <QuickActionCard {...action} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-center p-4 bg-gray-50 rounded-lg">
            <div className="p-2 bg-blue-100 rounded-lg mr-4">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">Profile Assessment Started</h3>
              <p className="text-sm text-gray-600">Complete your personal information section</p>
            </div>
            <span className="text-sm text-gray-500">2 days ago</span>
          </div>
          
          <div className="flex items-center p-4 bg-gray-50 rounded-lg">
            <div className="p-2 bg-green-100 rounded-lg mr-4">
              <Calculator className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">CRS Score Calculated</h3>
              <p className="text-sm text-gray-600">Your current score: 420 points</p>
            </div>
            <span className="text-sm text-gray-500">1 week ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;