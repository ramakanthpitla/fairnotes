'use client';

import { useLikedProducts } from '@/components/providers/liked-products-provider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ProductThumbnail } from '@/components/product/thumbnail';
import { HeartOff } from 'lucide-react';

export function LikedProductsSection() {
  const { liked, toggleLike } = useLikedProducts();

  if (!liked.length) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <p className="text-muted-foreground mb-3">
          You haven't liked any materials yet.
        </p>
        <Button variant="outline" asChild>
          <Link href="/browse">Browse Materials</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {liked.map((product) => (
        <Card
          key={product.id}
          className="flex flex-col overflow-hidden hover:shadow-lg transition-all duration-200 hover:scale-105 relative"
        >
          <button
            type="button"
            onClick={() => toggleLike(product)}
            className="absolute top-1.5 right-1.5 z-10 inline-flex items-center justify-center rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
            aria-label="Remove from liked"
          >
            <HeartOff className="w-3.5 h-3.5" />
          </button>

          <div className="aspect-[3/4] bg-muted relative">
            <ProductThumbnail
              product={{
                thumbnail: product.thumbnail,
                title: product.title,
              }}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-1.5 left-1.5">
              <span className="bg-black/70 text-white text-[9px] font-medium px-1.5 py-0.5 rounded">
                {product.type}
              </span>
            </div>
          </div>

          <div className="p-2 flex flex-col gap-1.5">
            <h3
              className="font-semibold text-xs line-clamp-2 leading-tight min-h-[2rem]"
              title={product.title}
            >
              {product.title}
            </h3>

            <Button
              asChild
              size="sm"
              className="w-full h-7 text-[11px] mt-0.5"
            >
              <Link href={`/products/${product.id}`}>View Details</Link>
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
