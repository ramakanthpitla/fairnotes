'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { ProductThumbnail } from '@/components/product/thumbnail';
import { CheckCircle, Clock, Heart } from 'lucide-react';
import { useLikedProducts } from '@/components/providers/liked-products-provider';

type Product = {
  id: string;
  title: string;
  description: string | null;
  type?: string;
  fileUrl: string;
  thumbnail: string | null;
  isFree: boolean;
  expiresAt: string;
  purchaseId: string;
  status: string;
  accessType: 'PURCHASE' | 'CREDIT';
  amount?: number;
  productPricing: {
    id: string;
    name: string;
    price: number;
    duration: number;
  } | null;
};

export function PurchasedProducts({ userId }: { userId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isLiked, toggleLike } = useLikedProducts();

  useEffect(() => {
    async function fetchPurchasedProducts() {
      try {
        const response = await fetch('/api/user/purchases');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch purchased products');
        }
        const data = await response.json();
        
        // Transform the API response to match component structure
        const transformedData = data.map((item: any) => ({
          ...item.product,
          purchaseId: item.purchaseId,
          status: item.status,
          expiresAt: item.expiresAt,
          productPricing: item.productPricing,
          accessType: item.accessType,
          amount: item.amount,
        }));
        
        setProducts(transformedData);
        setError(null);
      } catch (error) {
        console.error('Error fetching purchased products:', error);
        setError(error instanceof Error ? error.message : 'Failed to load purchased products');
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchPurchasedProducts();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse p-4">
            <div className="h-6 w-3/4 rounded bg-muted mb-4"></div>
            <div className="h-4 w-full rounded bg-muted mb-2"></div>
            <div className="h-4 w-1/2 rounded bg-muted"></div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-600">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (products.length === 0 && !loading) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">You haven't purchased any materials yet</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/browse">Browse Materials</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {products.map((product) => {
        const isExpired = new Date(product.expiresAt) < new Date();
        const formattedExpiry = format(new Date(product.expiresAt), 'MMM d');
        const price = product.productPricing?.price || 0;
        const isCreditAccess = product.accessType === 'CREDIT';
        const likedPayload = {
          id: product.id,
          sku: '',
          title: product.title,
          description: product.description,
          type: (product.type as 'PDF' | 'VIDEO') || 'PDF',
          thumbnail: product.thumbnail,
          isFree: product.isFree,
          price,
          duration: product.productPricing?.duration,
        } as const;
        
        return (
          <Card key={product.purchaseId} className="flex flex-col overflow-hidden hover:shadow-lg transition-all duration-200 hover:scale-105 relative">
            <button
              type="button"
              onClick={() => toggleLike(likedPayload)}
              className="absolute top-1.5 right-1.5 z-10 inline-flex items-center justify-center rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
              aria-label={isLiked(product.id) ? 'Remove from liked' : 'Add to liked'}
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  isLiked(product.id) ? 'fill-red-500 text-red-500' : ''
                }`}
              />
            </button>

            <div className="aspect-[3/4] bg-muted relative">
              <ProductThumbnail 
                product={{
                  thumbnail: product.thumbnail,
                  title: product.title
                }}
                className="w-full h-full object-cover"
              />
              
              {isExpired && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <span className="bg-red-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                    EXPIRED
                  </span>
                </div>
              )}
              
              <div className="absolute top-1.5 left-1.5">
                {isCreditAccess ? (
                  <span className="bg-emerald-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow">
                    CREDIT
                  </span>
                ) : !product.isFree ? (
                  <span className="bg-blue-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow">
                    PAID
                  </span>
                ) : (
                  <span className="bg-green-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow">
                    FREE
                  </span>
                )}
              </div>

              {product.type && (
                <div className="absolute top-1.5 right-1.5">
                  <span className="bg-black/70 text-white text-[9px] font-medium px-1.5 py-0.5 rounded">
                    {product.type.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            
            <div className="p-2 flex flex-col gap-1.5">
              <h3 className="font-semibold text-xs line-clamp-2 leading-tight min-h-[2rem]" title={product.title}>
                {product.title}
              </h3>
              
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <div className="flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{isExpired ? 'Expired' : formattedExpiry}</span>
                </div>
                {!isCreditAccess && !product.isFree && price > 0 && (
                  <span className="font-semibold text-primary">₹{price}</span>
                )}
              </div>
              {isCreditAccess && (
                <div className="text-[10px] text-muted-foreground">
                  Access via Credits (1 credit)
                </div>
              )}
              
              <Button 
                asChild 
                variant={isExpired ? 'outline' : 'default'}
                size="sm"
                className="w-full h-7 text-[11px] mt-0.5"
              >
                <Link href={isExpired ? `/products/${product.id}` : `/products/${product.id}/view`}>
                  {isExpired ? 'Renew' : 'View'}
                </Link>
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
