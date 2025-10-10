// Optimized motion components with lazy loading
import React, { Suspense, lazy } from 'react';

// Lazy load framer-motion components
const LazyMotion = lazy(() => import('framer-motion').then(m => ({ default: m.motion.div })));
const LazyAnimatePresence = lazy(() => import('framer-motion').then(m => ({ default: m.AnimatePresence })));

// Optimized motion div with fallback
export const MotionDiv: React.FC<any> = ({ children, ...props }) => {
  return (
    <Suspense fallback={<div {...props}>{children}</div>}>
      <LazyMotion {...props}>
        {children}
      </LazyMotion>
    </Suspense>
  );
};

// Optimized AnimatePresence with fallback
export const OptimizedAnimatePresence: React.FC<any> = ({ children, ...props }) => {
  return (
    <Suspense fallback={<>{children}</>}>
      <LazyAnimatePresence {...props}>
        {children}
      </LazyAnimatePresence>
    </Suspense>
  );
};

// Preload framer-motion for critical components
export const preloadMotion = () => {
  import('framer-motion');
};
