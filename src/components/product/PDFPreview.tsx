'use client';

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Button } from '@/components/ui/button';

// Configure PDF.js worker with error handling
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  } catch (error) {
    console.error('Failed to load PDF.js worker:', error);
  }
}

interface PDFPreviewProps {
  fileUrl: string;
  title: string;
  onLoadSuccess?: (numPages: number) => void;
  onLoadError?: (error: Error) => void;
  className?: string;
}

export default function PDFPreview({ 
  fileUrl, 
  title, 
  onLoadSuccess, 
  onLoadError,
  className = ''
}: PDFPreviewProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber] = useState(1); // Show only first page
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfLoadError, setPdfLoadError] = useState<Error | null>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    console.log('PDF loaded successfully. Number of pages:', numPages);
    setNumPages(numPages);
    setIsLoading(false);
    setPdfLoadError(null);
    setError(null);
    if (onLoadSuccess) onLoadSuccess(numPages);
  }

  function onDocumentLoadError(error: Error) {
    console.error('Error loading PDF:', error);
    const errorMsg = `Failed to load PDF: ${error.message || 'Unknown error'}`;
    setError(errorMsg);
    setPdfLoadError(error);
    setIsLoading(false);
    if (onLoadError) onLoadError(error);
  }

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
  };

  if (!fileUrl) {
    return <div className="p-4 text-center text-gray-500">No PDF file provided</div>;
  }

  // Log the file URL for debugging
  useEffect(() => {
    console.log('PDF URL:', fileUrl);
    
    // Test if the URL is accessible
    if (fileUrl) {
      fetch(fileUrl, { method: 'HEAD' })
        .then(response => {
          console.log('PDF URL status:', response.status);
          console.log('Content-Type:', response.headers.get('Content-Type'));
        })
        .catch(err => {
          console.error('Failed to access PDF URL:', err);
        });
    }
  }, [fileUrl]);

  return (
    <div className={`relative ${className}`}>
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
            <div className="text-muted-foreground">Loading preview...</div>
          </div>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-white/80 z-10">
          <p className="text-red-500 mb-4">{error}</p>
          {pdfLoadError && (
            <div className="bg-red-50 p-3 rounded-md text-sm text-red-700 mb-4 text-left max-w-md">
              <p className="font-medium">Error Details:</p>
              <pre className="whitespace-pre-wrap break-words">
                {pdfLoadError.message || 'No error details available'}
              </pre>
            </div>
          )}
          <Button onClick={handleRetry} variant="outline" size="sm" className="mt-2">
            Retry
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            If the issue persists, please check the browser console for more details.
          </p>
        </div>
      )}
      
      {/* PDF Document */}
      <Document
        file={fileUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading={
          <div className="flex flex-col items-center justify-center h-full space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-sm text-gray-500">Loading PDF preview...</p>
            <p className="text-xs text-gray-400">This may take a moment</p>
          </div>
        }
        error={
          <div className="p-4 text-center text-red-500">
            <p>Failed to load PDF.</p>
            <p className="text-sm mt-1">Please check the file URL and try again.</p>
          </div>
        }
        className="w-full h-full"
        noData={
          <div className="p-4 text-center text-yellow-600">
            <p>No PDF data received.</p>
            <p className="text-sm mt-1">The file might be empty or corrupted.</p>
          </div>
        }
      >
        {numPages && (
          <Page 
            pageNumber={pageNumber} 
            width={600}
            className="border rounded-md shadow-sm"
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        )}
      </Document>
      
      {/* Page count info */}
      {numPages !== null && (
        <div className="mt-2 text-sm text-center text-gray-500">
          Page {pageNumber} of {numPages} (sample preview)
        </div>
      )}
    </div>
  );
}
