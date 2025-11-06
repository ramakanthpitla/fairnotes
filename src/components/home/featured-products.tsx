'use client';

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProductThumbnail } from '@/components/product/thumbnail';
import { useSession } from 'next-auth/react';

type Product = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  thumbnail: string | null;
  isFree: boolean;
  price?: number;
};

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { status } = useSession();

  useEffect(() => {
    async function fetchFeaturedProducts() {
      try {
        const response = await fetch('/api/products/featured');
        if (response.ok) {
          const data = await response.json();
          setProducts(data);
        }
      } catch (error) {
        console.error('Error fetching featured products:', error);
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
            <Link href="/browse">View All</Link>
          </Button>
        </div>
        
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow">
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
