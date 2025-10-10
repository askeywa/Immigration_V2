// frontend/src/components/PDFViewer.tsx
// Example of how to lazy load PDF.js only when needed

import React, { useState, useEffect } from 'react';

interface PDFViewerProps {
  file: string | File;
  fileUrl?: string;
  onLoad?: () => void;
  onClose?: () => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ file, fileUrl, onLoad, onClose }) => {
  const [pdfLib, setPdfLib] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Dynamically import PDF.js only when this component mounts
    const loadPDFLib = async () => {
      try {
        setLoading(true);
        console.log('📄 Loading PDF.js library...');
        
        // This will code-split PDF.js into a separate chunk
        const pdfjs = await import('pdfjs-dist');
        
        // Configure worker
        const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker?url');
        pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;
        
        if (isMounted) {
          setPdfLib(pdfjs);
          console.log('✅ PDF.js loaded successfully');
        }
      } catch (err) {
        console.error('❌ Failed to load PDF.js:', err);
        if (isMounted) {
          setError('Failed to load PDF viewer');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPDFLib();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PDF viewer...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-red-600">
          <p>{error}</p>
          {onClose && (
            <button onClick={onClose} className="mt-4 btn-secondary">
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  // Now use pdfLib to render the PDF
  return (
    <div className="pdf-viewer-container">
      {/* Your PDF rendering logic here */}
      <p>PDF loaded with {pdfLib ? 'PDF.js' : 'unknown library'}</p>
      {/* Actual PDF rendering implementation */}
    </div>
  );
};

// Lazy load the PDFViewer component itself
export default PDFViewer;


// ============================================
// USAGE EXAMPLE in your parent component:
// ============================================

/*
import React, { lazy, Suspense } from 'react';

// Lazy load the entire PDF viewer component
const PDFViewer = lazy(() => import('@/components/PDFViewer'));

function DocumentPage() {
  const [showPDF, setShowPDF] = useState(false);

  return (
    <div>
      <button onClick={() => setShowPDF(true)}>
        View PDF
      </button>

      {showPDF && (
        <Suspense fallback={
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          </div>
        }>
          <PDFViewer 
            fileUrl="/path/to/file.pdf" 
            onClose={() => setShowPDF(false)} 
          />
        </Suspense>
      )}
    </div>
  );
}
*/