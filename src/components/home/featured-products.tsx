'use client';

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProductThumbnail } from '@/components/product/thumbnail';
import { useSession } from 'next-auth/react';
import { Heart } from 'lucide-react';
import { useLikedProducts } from '@/components/providers/liked-products-provider';

type Product = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  thumbnail: string | null;
  isFree: boolean;
  price?: number | null;
};

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { status } = useSession();
  const { isLiked, toggleLike } = useLikedProducts();

  useEffect(() => {
    async function fetchFeaturedProducts() {
      try {
        console.log('[FeaturedProducts] Fetching products...');
        const response = await fetch('/api/products/featured');
        
        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('[FeaturedProducts] API error:', err);
          throw new Error(err?.error || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[FeaturedProducts] Received data:', data);
        
        if (!Array.isArray(data)) {
          console.error('[FeaturedProducts] Invalid data format:', data);
          throw new Error('Invalid response format');
        }
        
        setProducts(data);
        setError(null);
        console.log('[FeaturedProducts] Successfully loaded', data.length, 'products');
      } catch (error) {
        console.error('[FeaturedProducts] Error:', error);
        setError(error instanceof Error ? error.message : 'Failed to load products');
      } finally {
        setLoading(false);
      }
    }

    fetchFeaturedProducts();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-muted/50 rounded-lg aspect-[4/5] animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 font-medium">{error}</p>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (products.length === 0) {
    return null; // Don't show anything if no featured products
  }

  return (
    <section className="py-8
    ">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Featured Study Materials</h2>
          <Button variant="outline" asChild>
            <Link href={status === 'authenticated' ? '/browse' : '/auth/signin?callbackUrl=/browse'}>
              View All
            </Link>
          </Button>
        </div>
        
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow relative">
              <button
                type="button"
                onClick={() =>
                  toggleLike({
                    id: product.id,
                    sku: '',
                    title: product.title,
                    description: product.description,
                    type: (product.type as 'PDF' | 'VIDEO') || 'PDF',
                    thumbnail: product.thumbnail,
                    isFree: product.isFree,
                    price: product.price ?? undefined,
                    duration: undefined,
                  })
                }
                className="absolute top-1.5 right-1.5 z-10 inline-flex items-center justify-center rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                aria-label={isLiked(product.id) ? 'Remove from liked' : 'Add to liked'}
              >
                <Heart
                  className={`w-3.5 h-3.5 ${
                    isLiked(product.id) ? 'fill-red-500 text-red-500' : ''
                  }`}
                />
              </button>

              <div className="aspect-[4/3] bg-muted relative">
                <ProductThumbnail 
                  product={{
                    thumbnail: product.thumbnail,
                    title: product.title
                  }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-1 left-1">
                  {product.isFree ? (
                    <span className="bg-green-100 text-green-800 text-[10px] font-medium px-2 py-0.5 rounded-full">
                      Free
                    </span>
                  ) : (
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-medium px-2 py-0.5 rounded-full">
                      {product.price ? `₹${product.price}` : 'Paid'}
                    </span>
                  )}
                </div>
              </div>
              
              <CardContent className="p-3">
                <h3 className="font-medium text-sm line-clamp-2 h-10 leading-tight mb-1">
                  {product.title}
                </h3>
                <Button 
                  asChild 
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-8"
                >
                  <Link href={status === 'authenticated' ? `/products/${product.id}` : `/auth/signin?callbackUrl=/products/${product.id}`}>
                    {status === 'authenticated' ? 'View Details' : 'Sign In to View'}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
