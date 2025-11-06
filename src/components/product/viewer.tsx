'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, Download } from 'lucide-react';

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
        setError(err?.message || 'Failed to load content');
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

  const handleDownload = () => {
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `product-${productId}`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

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
      <div className="fixed inset-0 w-full h-full">
        <iframe
          ref={iframeRef}
          src={`${url}#toolbar=1&navpanes=1&view=FitH`}
          title={`PDF Viewer - ${product.title}`}
          className="w-full h-full border-0"
          allowFullScreen
          loading="eager"
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full rounded-lg border bg-background overflow-hidden shadow-lg">
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
        className="w-full h-[60vh] sm:h-[70vh] md:h-[80vh] min-h-[300px] sm:min-h-[400px] bg-black" 
        preload="metadata"
      >
        <source src={url} type="video/mp4" />
        <source src={url} type="video/webm" />
        <p>Your browser does not support the video tag.</p>
      </video>
    </div>
  );
}

