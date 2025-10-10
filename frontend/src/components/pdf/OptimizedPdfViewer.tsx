// Optimized PDF viewer with lazy loading
import React, { Suspense, lazy, useState } from 'react';

// Lazy load PDF.js components
const LazyPdfViewer = lazy(() => import('./PdfViewer'));

interface OptimizedPdfViewerProps {
  file: File | string;
  className?: string;
  onLoad?: () => void;
}

export const OptimizedPdfViewer: React.FC<OptimizedPdfViewerProps> = ({ 
  file, 
  className = "w-full h-64",
  onLoad 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  // Only load PDF viewer when component becomes visible
  const handleIntersection = (entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && !isVisible) {
      setIsVisible(true);
    }
  };

  // Use Intersection Observer to lazy load
  React.useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.1,
      rootMargin: '50px'
    });

    const element = document.getElementById('pdf-container');
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div id="pdf-container" className={className}>
      {isVisible ? (
        <Suspense fallback={
          <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Loading PDF viewer...</p>
            </div>
          </div>
        }>
          <LazyPdfViewer file={file} onLoad={onLoad} />
        </Suspense>
      ) : (
        <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="w-8 h-8 bg-gray-300 rounded mx-auto mb-2"></div>
            <p className="text-gray-600">PDF will load when visible</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Preload PDF.js for critical components
export const preloadPdfJs = () => {
  import('pdfjs-dist');
};
