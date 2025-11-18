'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PDFSampleViewerProps {
  fileUrl: string;
  productId: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewPercentage?: number;
  pageCount?: number | null;
}

export function PDFSampleViewer({
  fileUrl,
  productId,
  title,
  open,
  onOpenChange,
  previewPercentage = 5,
  pageCount: propPageCount = null,
}: PDFSampleViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewPages, setPreviewPages] = useState<number | null>(null);
  const [actualPageCount, setActualPageCount] = useState<number | null>(propPageCount);
  const [retryToken, setRetryToken] = useState(0);
  const previousObjectUrl = useRef<string | null>(null);
  const componentMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      componentMountedRef.current = false;
      if (previousObjectUrl.current) {
        URL.revokeObjectURL(previousObjectUrl.current);
        previousObjectUrl.current = null;
      }
    };
  }, []);

  const cleanUpPreviewUrl = useCallback(() => {
    if (previousObjectUrl.current) {
      URL.revokeObjectURL(previousObjectUrl.current);
      previousObjectUrl.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setLoading(false);
      setError(null);
      setPreviewUrl(null);
      return;
    }

    let aborted = false;

    const loadPreview = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('[PDFSampleViewer] Starting preview load for product:', productId);

        // Inline fetch logic to avoid dependency issues
        if (!productId) {
          throw new Error('Missing product identifier for preview');
        }

        const url = `/api/products/${productId}/sample?previewPercentage=${previewPercentage}`;
        console.log('[PDFSampleViewer] Fetching preview from:', url);
        
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout
        
        try {
          const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            signal: controller.signal,
          });

          if (!response.ok) {
            // Try to parse error details from response
            let errorDetails = '';
            try {
              const errorData = await response.json();
              errorDetails = `${errorData.error}${errorData.details ? ': ' + errorData.details : ''}`;
            } catch (e) {
              errorDetails = response.statusText;
            }
            console.error('[PDFSampleViewer] API error:', { status: response.status, details: errorDetails });
            throw new Error(`Preview request failed: ${response.status} - ${errorDetails}`);
          }

          const totalPagesHeader = response.headers.get('x-total-pages');
          const previewPagesHeader = response.headers.get('x-preview-pages');

          const totalPages = totalPagesHeader ? parseInt(totalPagesHeader, 10) : null;
          const previewPages = previewPagesHeader ? parseInt(previewPagesHeader, 10) : null;

          console.log('[PDFSampleViewer] Preview headers:', { totalPages, previewPages });
          console.log('[PDFSampleViewer] About to read array buffer...');

          const arrayBuffer = await response.arrayBuffer();
          console.log('[PDFSampleViewer] Array buffer received, size:', arrayBuffer.byteLength);
          
        // Create blob properly and ensure URL doesn't get revoked
          const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
          console.log('[PDFSampleViewer] Blob created, size:', blob.size, 'type:', blob.type);
          
          // Create the object URL
          const objectUrl = URL.createObjectURL(blob);
          console.log('[PDFSampleViewer] Object URL created:', objectUrl);
          console.log('[PDFSampleViewer] URL protocol:', typeof window !== 'undefined' ? window.location.protocol : 'N/A');

          // Don't revoke the previous one yet, we'll do it when unmounting or when a new one is created
          if (previousObjectUrl.current && previousObjectUrl.current !== objectUrl) {
            console.log('[PDFSampleViewer] Revoking previous URL:', previousObjectUrl.current);
            URL.revokeObjectURL(previousObjectUrl.current);
          }

          previousObjectUrl.current = objectUrl;

          // Check if still mounted before updating state
          if (aborted || !componentMountedRef.current) {
            console.log('[PDFSampleViewer] Load cancelled or unmounted', { aborted, mounted: componentMountedRef.current });
            URL.revokeObjectURL(objectUrl);
            return;
          }

          console.log('[PDFSampleViewer] Preview loaded successfully');
          console.log('[PDFSampleViewer] About to set state with preview URL:', objectUrl);
          console.log('[PDFSampleViewer] Setting preview URL, total pages:', totalPages, 'preview pages:', previewPages);
          setPreviewUrl(objectUrl);
          setActualPageCount((current) => {
            console.log('[PDFSampleViewer] Setting actual page count from', current, 'to', totalPages);
            return current ?? totalPages ?? null;
          });
          setPreviewPages(previewPages ?? null);
          console.log('[PDFSampleViewer] State update calls completed');
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (err) {
        console.error('Error fetching PDF preview:', err);
        if (!aborted && componentMountedRef.current) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load PDF preview';
          console.log('[PDFSampleViewer] Setting error:', errorMessage);
          setError(errorMessage);
          setPreviewUrl(null);
        }
      } finally {
        if (!aborted && componentMountedRef.current) {
          setLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      aborted = true;
      cleanUpPreviewUrl();
    };
  }, [open, previewPercentage, productId, retryToken, cleanUpPreviewUrl]);

  useEffect(() => {
    if (propPageCount && !actualPageCount) {
      setActualPageCount(propPageCount);
    }
  }, [actualPageCount, propPageCount]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setRetryToken((token) => token + 1);
  };

  useEffect(() => {
    console.log('[PDFSampleViewer] State changed:', { loading, error, previewUrl: previewUrl ? 'set' : 'null', previewPages, open });
  }, [loading, error, previewUrl, previewPages, open]);

  const iframeSrc = useMemo(() => {
    if (!previewUrl) return '';
    return `${previewUrl}#toolbar=0&navpanes=0&view=FitH`;
  }, [previewUrl]);

  const previewSummary = useMemo(() => {
    if (previewPages && actualPageCount) {
      return `Showing first ${previewPages} ${previewPages === 1 ? 'page' : 'pages'} of ${actualPageCount}`;
    }
    if (previewPages) {
      return `Showing first ${previewPages} ${previewPages === 1 ? 'page' : 'pages'}`;
    }
    return 'Preparing preview...';
  }, [actualPageCount, previewPages]);

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
                {iframeSrc ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <iframe
                      key={iframeSrc}
                      src={iframeSrc}
                      title={`${title} - Sample Preview`}
                      className="w-full h-full border-0"
                      sandbox="allow-same-origin"
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
                {!loading && iframeSrc && (
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
                        {previewSummary} (preview limited to first 3 pages)
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
              
              <div className="px-6 py-3 border-t bg-gray-50">
                <p className="text-center text-sm text-muted-foreground">
                  This preview shows the first few pages (max 3). Purchase to view the full document{actualPageCount ? ` (${actualPageCount} pages)` : ''}.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
