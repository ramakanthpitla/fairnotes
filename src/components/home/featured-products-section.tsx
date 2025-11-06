'use client';

import dynamic from 'next/dynamic';

const FeaturedProducts = dynamic(
  () => import('@/components/home/featured-products').then(mod => mod.FeaturedProducts),
  { 
    ssr: false, 
    loading: () => <div className="h-64 flex items-center justify-center">Loading...</div> 
  }
);

export function FeaturedProductsSection() {
  return <FeaturedProducts />;
}
