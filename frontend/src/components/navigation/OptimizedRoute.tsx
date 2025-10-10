// Optimized route component with better loading states
import React, { Suspense, lazy, useState, useEffect } from 'react';

interface OptimizedRouteProps {
  component: () => Promise<{ default: React.ComponentType<any> }>;
  fallback?: React.ReactNode;
  preload?: boolean;
}

// Enhanced loading component with progress indication
const EnhancedLoadingSpinner: React.FC<{ message?: string }> = ({ 
  message = "Loading page..." 
}) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
    <div className="relative">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
    </div>
    <p className="mt-4 text-gray-600 text-center max-w-sm">{message}</p>
    <div className="mt-2 w-48 bg-gray-200 rounded-full h-1">
      <div className="bg-blue-600 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
    </div>
  </div>
);

// Optimized route component
export const OptimizedRoute: React.FC<OptimizedRouteProps> = ({ 
  component, 
  fallback,
  preload = false 
}) => {
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [preloadError, setPreloadError] = useState<string | null>(null);

  // Preload component if requested
  useEffect(() => {
    if (preload && !isPreloaded) {
      component()
        .then(() => {
          setIsPreloaded(true);
          console.log('✅ Component preloaded successfully');
        })
        .catch((error) => {
          setPreloadError(error.message);
          console.warn('⚠️ Component preload failed:', error);
        });
    }
  }, [component, preload, isPreloaded]);

  // Show preload status if preloading
  if (preload && !isPreloaded && !preloadError) {
    return <EnhancedLoadingSpinner message="Preloading page..." />;
  }

  if (preloadError) {
    console.warn('Preload failed, falling back to lazy loading:', preloadError);
  }

  const LazyComponent = lazy(component);

  return (
    <Suspense fallback={fallback || <EnhancedLoadingSpinner />}>
      <LazyComponent />
    </Suspense>
  );
};

// Route preloader hook
export const useRoutePreloader = () => {
  const [preloadedRoutes, setPreloadedRoutes] = useState<Set<string>>(new Set());

  const preloadRoute = async (routeName: string, component: () => Promise<any>) => {
    if (preloadedRoutes.has(routeName)) {
      return; // Already preloaded
    }

    try {
      await component();
      setPreloadedRoutes(prev => new Set([...prev, routeName]));
      console.log(`✅ Route preloaded: ${routeName}`);
    } catch (error) {
      console.warn(`⚠️ Failed to preload route ${routeName}:`, error);
    }
  };

  return { preloadedRoutes, preloadRoute };
};
