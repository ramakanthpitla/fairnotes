'use client';

import { useEffect, useState } from 'react';

interface ProductThumbnailProps {
  product: {
    thumbnail: string | null;
    title: string;
  };
  className?: string;
}

export function ProductThumbnail({ product, className = '' }: ProductThumbnailProps) {
  const [imageUrl, setImageUrl] = useState<string>('/window.svg');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const src = product.thumbnail;

  useEffect(() => {
    if (!src) {
      setImageUrl('/window.svg');
      setIsLoading(false);
      return;
    }

    // If it's already a local path or data URL, use it directly
    if (src.startsWith('/') || src.startsWith('data:') || src.startsWith('http://localhost') || src.startsWith('blob:')) {
      setImageUrl(src);
      setIsLoading(false);
      return;
    }

    // For S3 URLs, fetch presigned URL with caching
    async function fetchPresignedUrl() {
      setIsLoading(true);
      setError(null);

      try {
        // Check cache first
        const cacheKey = `thumb_${btoa(encodeURIComponent(src || ''))}`;
        const cached = sessionStorage.getItem(cacheKey);

        if (cached) {
          try {
            const cachedData = JSON.parse(cached);
            // Use cached URL if it's less than 50 minutes old (presigned URLs last 1 hour)
            if (Date.now() - cachedData.timestamp < 50 * 60 * 1000) {
              console.log('[Thumbnail] Using cached URL');
              setImageUrl(cachedData.url);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.warn('[Thumbnail] Failed to parse cached data:', e);
            sessionStorage.removeItem(cacheKey);
          }
        }

        try {
          console.log('[Thumbnail] Fetching presigned URL for:', src);
          const res = await fetch(`/api/thumbnails?url=${encodeURIComponent(src || '')}`, {
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });

          if (!res.ok) {
            console.warn(`[Thumbnail] API returned ${res.status}: ${res.statusText}`);
            throw new Error(`Failed to fetch thumbnail: ${res.statusText}`);
          }

          const data = await res.json();
          if (!data.url) {
            console.warn('[Thumbnail] Invalid response from API:', data);
            throw new Error('Invalid response from thumbnail API');
          }

          console.log('[Thumbnail] Successfully fetched presigned URL');

          // Verify the URL is valid before using it
          const img = new Image();
          img.src = data.url;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error('Failed to load image'));
            setTimeout(() => reject(new Error('Image load timeout')), 5000);
          });

          // If we get here, the image loaded successfully
          setImageUrl(data.url);

          // Cache the URL
          sessionStorage.setItem(cacheKey, JSON.stringify({
            url: data.url,
            timestamp: Date.now()
          }));
        } catch (err) {
          console.warn('[Thumbnail] Error in thumbnail processing:', err);
          // Use a default image that's guaranteed to work
          const defaultImage = '/window.svg';
          setImageUrl(defaultImage);

          // Update cache with default image to prevent repeated failed requests
          sessionStorage.setItem(cacheKey, JSON.stringify({
            url: defaultImage,
            timestamp: Date.now(),
            isFallback: true
          }));

          // Don't rethrow, we've handled the error
          return;
        }

      } catch (err) {
        console.error('[Thumbnail] Error loading thumbnail:', err);
        setError(err instanceof Error ? err : new Error('Failed to load thumbnail'));
        // Use a default image that's guaranteed to work
        setImageUrl('/window.svg');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPresignedUrl();
  }, [src]);

  // Use a default image if there was an error or no image URL
  const displayUrl = error ? '/window.svg' : imageUrl;

  return (
    <div className={`w-full h-full relative ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={product.title}
        className={`object-cover w-full h-full transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'
          } ${className}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setImageUrl('/window.svg');
          setIsLoading(false);
        }}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-muted/50 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}

