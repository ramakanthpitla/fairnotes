'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ProductViewer } from '@/components/product/viewer';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Head from 'next/head';

interface Product {
  id: string;
  title: string;
  type: 'PDF' | 'VIDEO' | string;
  fileUrl: string;
  isFree: boolean;
}

export default function ProductViewPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPurchase, setHasPurchase] = useState(false);
  
  const productId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  // Add mobile screenshot protection
  useEffect(() => {
    // Disable screenshot on Android
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(meta);

    // Detect screenshot attempts on mobile
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('Screenshot attempt detected');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (meta.parentNode) {
        meta.parentNode.removeChild(meta);
      }
    };
  }, []);

  useEffect(() => {
    async function checkAccessAndFetchProduct() {
      try {
        if (status === 'loading') return;
        
        if (status === 'unauthenticated') {
          router.push(`/auth/signin?callbackUrl=/products/${productId}/view`);
          return;
        }

        if (!productId) {
          setError('Product ID is missing');
          setLoading(false);
          return;
        }

        // Fetch product details
        const productResponse = await fetch(`/api/products/${productId}`);
        if (!productResponse.ok) {
          throw new Error('Failed to fetch product');
        }

        const productData = await productResponse.json();
        setProduct(productData);

        // If product is free, allow access
        if (productData.isFree) {
          setHasPurchase(true);
          setLoading(false);
          return;
        }

        // Check if user has purchased this product and validity
        const purchaseResponse = await fetch('/api/check-purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: session?.user?.id,
            productId 
          }),
        });

        if (purchaseResponse.ok) {
          const purchaseData = await purchaseResponse.json();
          const { hasPurchased, expiresAt } = purchaseData;
          
          if (!hasPurchased) {
            setError('You need to purchase this product to view it');
            setHasPurchase(false);
          } else if (expiresAt) {
            // Check if purchase has expired
            const expiryDate = new Date(expiresAt);
            const now = new Date();
            
            if (expiryDate < now) {
              setError('Your access to this product has expired. Please purchase again to continue viewing.');
              setHasPurchase(false);
            } else {
              setHasPurchase(true);
            }
          } else {
            setHasPurchase(true);
          }
        } else {
          setError('Failed to verify purchase');
        }
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setLoading(false);
      }
    }

    checkAccessAndFetchProduct();
  }, [productId, status, session, router]);

  if (loading || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !hasPurchase) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-700 mb-6">
            {error || 'You need to purchase this product to view it.'}
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild variant="outline">
              <Link href="/browse">Browse Products</Link>
            </Button>
            <Button asChild>
              <Link href={`/products/${productId}`}>View Product</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Product not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen">
      <ProductViewer 
        product={{
          id: product.id,
          type: product.type as 'PDF' | 'VIDEO',
          title: product.title,
          fileUrl: product.fileUrl
        }} 
      />
    </div>
  );
}
