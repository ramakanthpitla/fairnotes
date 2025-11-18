'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import ProductDetailContent from './product-detail-content';

// Define types for our product and pricing
interface PricingPlan {
  id: string;
  name: string;
  price: number;
  duration: number;
  isActive: boolean;
}

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  type: 'PDF' | 'VIDEO' | string;
  thumbnail: string | null;
  duration: number;
  isFree: boolean;
  fileUrl: string;
  sku: string;
  isActive: boolean;
  pricing: PricingPlan[];
}

// Loading component to show while the product is being fetched
function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

export default function ProductDetailPage() {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPurchased, setIsPurchased] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const planId = searchParams?.get('planId') || null;
  const productId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        if (!productId) {
          setError('Product ID is missing');
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch product');
        }

        const data = await response.json();
        setProduct(data);
        
        // Check if user has purchased this product
        if (!data.isFree) {
          try {
            const purchaseResponse = await fetch('/api/check-purchase', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId }),
            });
            
            if (purchaseResponse.ok) {
              const { hasPurchased } = await purchaseResponse.json();
              setIsPurchased(hasPurchased);
            }
          } catch (err) {
            console.error('Error checking purchase status:', err);
          }
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Failed to load product. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Product not found</h1>
          <p className="mt-2">The requested product could not be found.</p>
        </div>
      </div>
    );
  }

  // Prepare the product data with required fields
  const productData = {
    ...product,
    // Ensure all required fields are included
    price: product.pricing?.[0]?.price || 0,
    duration: product.pricing?.[0]?.duration || 0,
    // Make sure pricing is always an array
    pricing: product.pricing || []
  };

  const initialPlanId = planId || (product?.pricing?.[0]?.id || null);

  return (
    <div className="container mx-auto py-8 px-4">
      {product && (
        <ProductDetailContent 
          product={productData} 
          initialPlanId={initialPlanId}
          isPurchased={isPurchased}
        />
      )}
    </div>
  );
}
