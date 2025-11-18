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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewPages, setPreviewPages] = useState<number | null>(null);
  const [actualPageCount, setActualPageCount] = useState<number | null>(propPageCount);

  // No cleanup needed for data URLs

  // Load preview when dialog opens
  useEffect(() => {
    if (!open) {
      return;
    }

    let isMounted = true;

    const fetchPreview = async () => {
      try {
        setLoading(true);
        setError(null);
        setPreviewUrl(null);

        const url = `/api/products/${productId}/sample?previewPercentage=${previewPercentage}`;
        console.log('[PDF Preview] Fetching from:', url);

        // Start loading immediately - don't wait for full response
        setPreviewUrl('loaded');
        
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
        });

        console.log('[PDF Preview] Response received:', {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          ok: response.ok,
        });

        if (!response.ok) {
          let errorMsg = `HTTP ${response.status}`;
          try {
            const data = await response.json();
            errorMsg = data.error || errorMsg;
          } catch (e) {
            console.warn('[PDF Preview] Could not parse error response as JSON');
          }
          setPreviewUrl(null);
          throw new Error(errorMsg);
        }

        // Get headers
        const totalPagesStr = response.headers.get('x-total-pages');
        const previewPagesStr = response.headers.get('x-preview-pages');
        
        const totalPages = totalPagesStr ? parseInt(totalPagesStr, 10) : null;
        const previewPageCount = previewPagesStr ? parseInt(previewPagesStr, 10) : null;

        console.log('[PDF Preview] Headers:', { totalPages, previewPageCount });

        if (!isMounted) return;

        // Update page info
        setPreviewPages(previewPageCount);
        setActualPageCount(totalPages);
        console.log('[PDF Preview] Preview started loading');
      } catch (err) {
        console.error('[PDF Preview] Error:', err);
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to load preview';
          console.error('[PDF Preview] Setting error message:', msg);
          setError(msg);
        }
      }
    };

    fetchPreview();

    return () => {
      isMounted = false;
    };
  }, [open, productId, previewPercentage]);

  const pdfUrl = useMemo(() => {
    // Use the API endpoint directly instead of data URL
    // This avoids Brave browser blocking data URLs
    return `/api/products/${productId}/sample?previewPercentage=${previewPercentage}`;
  }, [productId, previewPercentage]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setPreviewUrl(null);
    // Trigger refetch by toggling open state
    onOpenChange(false);
    setTimeout(() => onOpenChange(true), 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] h-[95vh] max-w-7xl flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2 border-b flex-shrink-0">
          <DialogTitle className="flex justify-between items-center">
            <span>Sample Preview: {title}</span>
            {actualPageCount && (
              <span className="text-xs font-normal text-gray-500">
                {actualPageCount} pages total
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col bg-gray-100 relative min-h-0">
          {error ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-4">
              <div className="text-center">
                <p className="text-red-600 font-medium mb-2">Preview Error</p>
                <p className="text-sm text-gray-600 mb-4">{error}</p>
              </div>
              <Button onClick={handleRetry} variant="outline">
                Try Again
              </Button>
            </div>
          ) : (
            <>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 bg-white/80 backdrop-blur-sm z-50">
                  <div className="text-center">
                    <div className="inline-block animate-spin mb-4">
                      <svg className="w-16 h-16 text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.1" />
                        <path
                          fill="currentColor"
                          d="M12 2a10 10 0 0 1 10 10h-2a8 8 0 0 0-8-8V2z"
                        />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-gray-700 mb-1">Loading Preview...</p>
                    <p className="text-sm text-gray-500">Generating sample pages...</p>
                  </div>
                </div>
              )}
              {previewUrl && (
                <>
                  <iframe
                    src={pdfUrl}
                    className="flex-1 w-full border-0 bg-white"
                    title={`${title} - Sample`}
                    onLoad={() => {
                      console.log('[PDF Preview] iframe loaded successfully');
                      setLoading(false);
                    }}
                    onError={() => {
                      console.error('[PDF Preview] iframe load error');
                      setError('Failed to load preview in PDF viewer');
                    }}
                  />
                  {previewPages && actualPageCount && (
                    <div className="px-6 py-3 border-t bg-white flex justify-between items-center flex-shrink-0">
                      <p className="text-xs text-gray-600">
                        📄 Preview: First <span className="font-semibold">{previewPages}</span> page{previewPages !== 1 ? 's' : ''} of <span className="font-semibold">{actualPageCount}</span> pages
                      </p>
                      <p className="text-xs text-blue-600 font-medium">Sample Only - Purchase to view full document</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
