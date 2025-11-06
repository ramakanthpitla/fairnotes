'use client';

import { useEffect, useState, useRef } from 'react';

type PDFPreviewProps = {
  fileUrl: string;
  title: string;
  previewPercentage?: number;
};

export function PDFPreview({ fileUrl, title, previewPercentage = 10 }: PDFPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState('600px');

  useEffect(() => {
    // Set a fixed height based on viewport
    const updateHeight = () => {
      if (typeof window !== 'undefined') {
        const height = Math.min(window.innerHeight * 0.7, 800); // Max 800px or 70% of viewport height
        setContainerHeight(`${height}px`);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  useEffect(() => {
    async function fetchPdfPreview() {
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error('Failed to load PDF');
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Set the preview URL with the #page=1&view=FitH parameter to show the first page
        // and the #toolbar=0&navpanes=0 parameters to hide the toolbar and navigation panes
        setPreviewUrl(`${url}#page=1&view=FitH&toolbar=0&navpanes=0`);
        
      } catch (err) {
        console.error('Error loading PDF preview:', err);
        setError('Failed to load PDF preview');
      } finally {
        setLoading(false);
      }
    }

    if (fileUrl) {
      fetchPdfPreview();
    }

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [fileUrl]);

  if (loading) {
    return (
      <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  if (!previewUrl) {
    return null;
  }

  return (
    <div className="w-full mt-4 border rounded-lg overflow-hidden">
      <div className="bg-gray-100 px-4 py-2 border-b">
        <h3 className="font-medium text-sm">Preview (First {previewPercentage}%)</h3>
      </div>
      
      <div 
        ref={containerRef}
        className="relative w-full overflow-hidden"
        style={{ 
          height: containerHeight,
          // This creates a container that shows 10% clearly and 90% blurred
          maskImage: 'linear-gradient(to bottom, black 0%, black 10%, transparent 20%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 10%, transparent 20%, transparent 100%)',
        }}
      >
        {/* PDF Content */}
        <div className="w-full h-full">
          <iframe
            src={previewUrl}
            title={`${title} - Preview`}
            className="w-full h-full border-0"
            style={{
              pointerEvents: 'none', // Disable all interactions
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 1
            }}
          />
        </div>
        
        {/* Blur overlay for the bottom 90% */}
        <div 
          className="absolute inset-0 backdrop-blur-md z-10"
          style={{
            // This creates a gradient that starts blurring after 10%
            maskImage: 'linear-gradient(to bottom, transparent 0%, transparent 10%, white 15%, white 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, transparent 10%, white 15%, white 100%)',
            pointerEvents: 'none',
          }}
        />
        
        {/* Semi-transparent overlay for the bottom 90% */}
        <div 
          className="absolute inset-0 bg-white/30 z-5"
          style={{
            // This creates a gradient that starts darkening after 10%
            maskImage: 'linear-gradient(to bottom, transparent 0%, transparent 10%, white 15%, white 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, transparent 10%, white 15%, white 100%)',
            pointerEvents: 'none',
          }}
        />
        
        {/* Watermark overlay */}
        <div 
          className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.03), rgba(0, 0, 0, 0.03) 10px, rgba(0, 0, 0, 0.05) 10px, rgba(0, 0, 0, 0.05) 20px)',
            opacity: 0.7,
            // Only apply to the bottom 90%
            maskImage: 'linear-gradient(to bottom, transparent 0%, transparent 10%, white 15%, white 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, transparent 10%, white 15%, white 100%)',
          }}
        >
          <div className="text-center text-gray-500 text-sm font-medium">
            Purchase to view full content
          </div>
        </div>
      </div>
    </div>
  );
}
