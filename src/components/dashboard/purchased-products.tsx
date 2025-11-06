'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { ProductThumbnail } from '@/components/product/thumbnail';
import { CheckCircle, Clock } from 'lucide-react';

type Product = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  fileUrl: string;
  thumbnail: string | null;
  isFree: boolean;
  expiresAt: string;
  purchaseId: string;
  status: string;
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

  useEffect(() => {
    async function fetchPurchasedProducts() {
      try {
        const response = await fetch('/api/user/purchases');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch purchased products');
        }
        const data = await response.json();
        setProducts(data);
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
          <Link href="/products">Browse Materials</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => {
        const isExpired = new Date(product.expiresAt) < new Date();
        const formattedExpiry = format(new Date(product.expiresAt), 'MMM d, yyyy');
        const price = product.productPricing?.price || 0;
        
        return (
          <Card key={product.purchaseId} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow h-full">
            <div className="aspect-[4/3] bg-muted relative">
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <ProductThumbnail 
                  product={{
                    thumbnail: product.thumbnail,
                    title: product.title
                  }}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {isExpired && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                    Expired
                  </span>
                </div>
              )}
              
              <div className="absolute top-2 left-2">
                {!product.isFree ? (
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                    Purchased
                  </span>
                ) : (
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
                    Free
                  </span>
                )}
              </div>
            </div>
            
            <div className="p-4 flex flex-col flex-1">
              <h3 className="font-medium text-sm line-clamp-2 h-10 leading-tight mb-2" title={product.title}>
                {product.title}
              </h3>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <span className="capitalize">{product.type.toLowerCase()}</span>
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>{isExpired ? 'Expired' : `Exp ${formattedExpiry}`}</span>
                </div>
              </div>
              
              {!product.isFree && (
                <div className="mb-3 text-sm">
                  <span className="text-muted-foreground">Price: </span>
                  <span className="font-medium">₹{price || 'N/A'}</span>
                </div>
              )}
              
              <div className="mt-auto">
                <Button 
                  asChild 
                  variant={isExpired ? 'outline' : 'default'}
                  size="sm"
                  className="w-full"
                >
                  <Link href={`/products/${product.id}`}>
                    {isExpired ? 'View Details' : 'View Content'}
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
