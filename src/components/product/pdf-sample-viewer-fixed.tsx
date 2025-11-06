'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import dynamic from 'next/dynamic';

// Dynamically import the PDFPreview component with no SSR
const PDFPreview = dynamic(
  () => import('./PDFPreview').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    ),
  }
);

interface PDFSampleViewerProps {
  fileUrl: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewPercentage?: number;
  pageCount?: number | null;
}

export function PDFSampleViewer({
  fileUrl,
  title,
  open,
  onOpenChange,
  previewPercentage = 5,
  pageCount: propPageCount = null,
}: PDFSampleViewerProps) {
  const [pageCount, setPageCount] = useState<number | null>(propPageCount);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleLoadSuccess = (numPages: number) => {
    console.log(`PDF loaded successfully with ${numPages} pages`);
    if (isMounted.current) {
      setPageCount(numPages);
      setIsLoading(false);
      setError(null);
    }
  };

  const handleLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    if (isMounted.current) {
      setError(`Failed to load PDF: ${error.message || 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    console.log('Retrying PDF load...');
    setError(null);
    setIsLoading(true);
    setRetryCount(prev => prev + 1); // Force re-render and retry
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="px-6 pt-6 pb-2">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Sample Preview: {title}</span>
              {pageCount !== null && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col min-h-[500px] bg-gray-50">
          <div className="flex-1 relative">
            <PDFPreview 
              key={`${fileUrl}-${retryCount}`} // Force re-mount on retry
              fileUrl={fileUrl}
              title={title}
              onLoadSuccess={handleLoadSuccess}
              onLoadError={handleLoadError}
              className="absolute inset-0"
            />
          </div>
          
          {/* Additional info */}
          <div className="p-4 text-center text-sm text-muted-foreground border-t bg-white">
            {pageCount !== null ? (
              <p className="font-medium">
                Showing first page of {pageCount} {pageCount === 1 ? 'page' : 'pages'} (sample preview)
              </p>
            ) : (
              <p className="font-medium">Loading document information...</p>
            )}
            <p className="mt-1 text-sm">Purchase to view the full document</p>
            
            {error && (
              <div className="mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRetry}
                  className="text-xs"
                >
                  Retry Loading
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
