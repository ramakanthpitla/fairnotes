'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2 } from 'lucide-react';

type Props = {
  product: {
    id: string;
    type: 'PDF' | 'VIDEO' | string;
    title: string;
    fileUrl?: string;
  };
  productId?: string;
  type?: 'PDF' | 'VIDEO';
};

export function ProductViewer({ product, productId: propProductId, type: propType }: Props) {
  // Use props or fall back to product properties
  const productId = propProductId || product?.id;
  const type = propType || product?.type as 'PDF' | 'VIDEO';
  
  if (!productId || !type) {
    return <div>Error: Missing product ID or type</div>;
  }
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    async function fetchUrl() {
      try {
        if (!navigator.onLine) {
          setError('No internet connection. Please check your network.');
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/products/${productId}/view`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to load');
        }
        const { url: presignedUrl } = await res.json();
        setUrl(presignedUrl);
        
        // No longer auto-enter fullscreen for PDFs
        if (type === 'PDF') {
          setLoading(false);
        }
      } catch (err: any) {
        if (!navigator.onLine) {
          setError('No internet connection. Please check your network.');
        } else {
          setError(err?.message || 'Failed to load content');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchUrl();
  }, [productId, type]);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Screenshot and print protection for PDFs
  useEffect(() => {
    if (type !== 'PDF') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent PrintScreen, Ctrl+P, Cmd+P, Ctrl+S, Cmd+S
      if (
        e.key === 'PrintScreen' ||
        (e.key === 'p' && (e.ctrlKey || e.metaKey)) ||
        (e.key === 's' && (e.ctrlKey || e.metaKey))
      ) {
        e.preventDefault();
        alert('Printing and saving is disabled for this content.');
        return false;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyDown);
    };
  }, [type]);

  if (loading) {
    return (
      <div className="w-full h-[60vh] sm:h-[70vh] md:h-[80vh] min-h-[400px] sm:min-h-[500px] md:min-h-[600px] rounded-lg border flex items-center justify-center bg-muted">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-muted-foreground">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className="w-full h-[60vh] sm:h-[70vh] md:h-[80vh] min-h-[400px] sm:min-h-[500px] md:min-h-[600px] rounded-lg border flex items-center justify-center bg-destructive/10">
        <div className="text-center p-4 sm:p-6">
          <p className="text-sm sm:text-base text-destructive font-medium mb-2">Error loading content</p>
          <p className="text-xs sm:text-sm text-muted-foreground">{error || 'Failed to load content'}</p>
        </div>
      </div>
    );
  }

  if (type === 'PDF') {
    return (
      <div 
          className="fixed inset-0 w-full h-full select-none" 
          onContextMenu={(e) => e.preventDefault()}
          style={{ 
            userSelect: 'none', 
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
          }}
        >
          <style jsx global>{`
            /* Enhanced screenshot protection */
            body {
              -webkit-user-select: none;
              -moz-user-select: none;
              -ms-user-select: none;
              user-select: none;
              -webkit-touch-callout: none;
            }
            
            /* Mobile screenshot protection */
            * {
              -webkit-user-select: none;
              -webkit-touch-callout: none;
              -moz-user-select: none;
              -ms-user-select: none;
              user-select: none;
            }
            
            /* Prevent text selection in PDF iframe */
            iframe {
              pointer-events: auto !important;
              -webkit-user-select: none;
              user-select: none;
            }

            /* Hide content when using screen capture tools */
            @media print {
              body {
                display: none !important;
              }
            }

            /* Hide PDF toolbar completely */
            iframe::-webkit-scrollbar {
              display: none;
            }

            /* Block download and print button overlays */
            .pdf-button-blocker {
              position: fixed;
              background: transparent;
              z-index: 9999;
              cursor: not-allowed;
            }
          `}</style>
          
          {/* Blocking overlays for download and print buttons in Chrome PDF viewer */}
          {/* Top-right download button */}
          <div
            className="pdf-button-blocker"
            style={{
              top: '8px',
              right: '8px',
              width: '48px',
              height: '48px',
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              alert('Download is disabled for content protection');
            }}
            title="Download disabled"
          />
          
          {/* Top-right print button */}
          <div
            className="pdf-button-blocker"
            style={{
              top: '8px',
              right: '64px',
              width: '48px',
              height: '48px',
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              alert('Print is disabled for content protection');
            }}
            title="Print disabled"
          />
          
          {/* Additional blocking for Firefox PDF viewer buttons */}
          <div
            className="pdf-button-blocker"
            style={{
              top: '0',
              right: '0',
              width: '150px',
              height: '60px',
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
          
          {/* PDF Iframe - restored with toolbar visible but buttons blocked */}
          <div className="w-full h-full overflow-auto flex items-start justify-center" style={{ background: '#525252' }}>
            <iframe
              ref={iframeRef}
              src={`${url}#toolbar=1&navpanes=0&scrollbar=1&statusbar=0&messages=0&view=FitH&pagemode=none`}
              title={`PDF Viewer - ${product.title}`}
              className="border-0"
              loading="eager"
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              onPaste={(e) => e.preventDefault()}
              style={{
                pointerEvents: 'auto',
                border: 'none',
                width: '100%',
                height: '100vh',
                minWidth: '100%',
                minHeight: '100vh',
              }}
            />
          </div>
        </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="w-full rounded-lg border bg-background overflow-hidden shadow-lg select-none"
      onContextMenu={(e) => e.preventDefault()}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <div className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 border-b gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-medium">Video Player</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          className="h-7 sm:h-8 px-2 sm:px-3"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Exit</span>
            </>
          ) : (
            <>
              <Maximize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Fullscreen</span>
            </>
          )}
        </Button>
      </div>
      <video 
        controls 
        controlsList="nodownload nofullscreen"
        disablePictureInPicture
        className="w-full h-[60vh] sm:h-[70vh] md:h-[80vh] min-h-[300px] sm:min-h-[400px] bg-black" 
        preload="metadata"
        onContextMenu={(e) => e.preventDefault()}
      >
        <source src={url} type="video/mp4" />
        <source src={url} type="video/webm" />
        <p>Your browser does not support the video tag.</p>
      </video>
    </div>
  );
}

