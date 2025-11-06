'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getPdfPageCount } from '@/lib/pdf-utils';

// Client-side only component to handle PDF viewing
const PDFViewerContent = ({ fileUrl, previewPercentage, propPageCount, onLoad, onError }: {
  fileUrl: string;
  previewPercentage: number;
  propPageCount: number | null;
  onLoad: (pages: number, totalPages: number) => void;
  onError: (error: string) => void;
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const loadPdfInfo = async () => {
      if (!fileUrl) return;
      
      try {
        const count = await getPdfPageCount(fileUrl);
        if (!isMounted.current) return;
        
        const pagesToShow = Math.min(5, Math.max(1, Math.ceil(count * (previewPercentage / 100))));
        onLoad(pagesToShow, count);
      } catch (error) {
        console.error('Error loading PDF:', error);
        if (isMounted.current) {
          onError('Failed to load PDF preview');
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    loadPdfInfo();
  }, [fileUrl, previewPercentage, onLoad, onError]);

  // This component doesn't render anything visible
  // It just handles the PDF loading and calls the provided callbacks
  return null;
};

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [pagesToShow, setPagesToShow] = useState(1);
  const [actualPageCount, setActualPageCount] = useState<number | null>(propPageCount);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handlePdfLoad = (pages: number, totalPages: number) => {
    if (!isMounted.current) return;
    
    setPagesToShow(pages);
    setActualPageCount(totalPages);
    
    // Create the preview URL with the first few pages
    const previewUrl = `${fileUrl}#page=1-${pages}&toolbar=0&navpanes=0&view=FitH`;
    setPreviewUrl(previewUrl);
    
    setLoading(false);
  };

  const handlePdfError = (errorMsg: string) => {
    if (!isMounted.current) return;
    
    console.error('PDF Error:', errorMsg);
    setError(errorMsg);
    setLoading(false);
  };
  
  // Initialize with prop page count if available
  useEffect(() => {
    if (propPageCount && !actualPageCount) {
      setActualPageCount(propPageCount);
      const pages = Math.min(5, Math.max(1, Math.ceil(propPageCount * ((previewPercentage || 5) / 100))));
      setPagesToShow(pages);
      setPreviewUrl(`${fileUrl}#page=1-${pages}&toolbar=0&navpanes=0&view=FitH`);
    }
  }, [propPageCount, previewPercentage, fileUrl]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // Force re-render to retry loading
    setPreviewUrl(prev => `${prev}${prev.includes('?') ? '&' : '?'}retry=${Date.now()}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="px-6 pt-6 pb-2">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Sample Preview: {title}</span>
              {actualPageCount !== null && (
                <span className="text-sm font-normal text-muted-foreground">
                  {actualPageCount} {actualPageCount === 1 ? 'page' : 'pages'}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={handleRetry} variant="outline">
                Try Again
              </Button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="relative flex-1 bg-gray-100">
                {previewUrl ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <iframe
                      key={previewUrl}
                      src={previewUrl}
                      title={`${title} - Sample Preview`}
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-same-origin"
                      onError={() => handlePdfError('Failed to load PDF preview')}
                      onLoad={() => setLoading(false)}
                    />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="animate-pulse text-muted-foreground">
                      Loading preview...
                    </div>
                  </div>
                )}
                
                {/* Preview Overlay */}
                {!loading && previewUrl && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center p-6 max-w-md bg-white/90 rounded-lg border border-gray-200 shadow-lg">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 mb-3">
                        <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Sample Preview</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Showing {pagesToShow} of {actualPageCount || '...'} pages ({previewPercentage}% preview)
                      </p>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenChange(false);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 pointer-events-auto"
                      >
                        View Purchase Options
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <PDFViewerContent 
                fileUrl={fileUrl}
                previewPercentage={previewPercentage}
                propPageCount={propPageCount}
                onLoad={handlePdfLoad}
                onError={handlePdfError}
              />
              
              <div className="px-6 py-3 border-t bg-gray-50">
                <p className="text-center text-sm text-muted-foreground">
                  This is a preview. Purchase to view the full document{actualPageCount ? ` (${actualPageCount} pages)` : ''}.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
