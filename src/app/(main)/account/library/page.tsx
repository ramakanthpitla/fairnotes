'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Download, FileText, Loader2, Clock, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ProductThumbnail } from '@/components/product/thumbnail';

interface PurchasedProduct {
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
}

export default function LibraryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [purchases, setPurchases] = useState<PurchasedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/account/library');
      return;
    }

    if (status === 'authenticated') {
      fetchPurchases();
    }
  }, [status, router]);

  const fetchPurchases = async () => {
    try {
      const response = await fetch('/api/user/purchases');
      if (!response.ok) {
        throw new Error('Failed to fetch purchases');
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
      
      setPurchases(transformedData);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch purchases:', error);
      setError(error instanceof Error ? error.message : 'Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  // Don't render content if not authenticated (redirect is in progress)
  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => fetchPurchases()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Library</h1>
        <p className="text-gray-600 mt-2">Access all your purchased study materials</p>
      </div>

      {purchases.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No purchases yet</h3>
          <p className="mt-1 text-gray-500">Your purchased materials will appear here.</p>
          <div className="mt-6">
            <Button asChild>
              <Link href="/browse">Browse Products</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {purchases.map((product) => {
            const isExpired = new Date(product.expiresAt) < new Date();
            const formattedExpiry = format(new Date(product.expiresAt), 'MMM d, yyyy');
            const price = product.productPricing?.price || 0;
            const isCreditAccess = product.accessType === 'CREDIT';
            
            return (
              <div key={product.purchaseId} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow bg-card">
                {/* Thumbnail */}
                <div className="aspect-[4/3] bg-muted relative">
                  <ProductThumbnail 
                    product={{
                      thumbnail: product.thumbnail,
                      title: product.title
                    }}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Expiry Overlay */}
                  {isExpired && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <div className="text-center">
                        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                        <span className="bg-red-500 text-white text-sm font-medium px-3 py-1 rounded-full">
                          Expired
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-2 left-2">
                    {!isExpired ? (
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">
                        Expired
                      </span>
                    )}
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className="bg-black/70 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase">
                      {isCreditAccess ? 'Credit' : product.isFree ? 'Free' : 'Paid'}
                    </span>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-4 flex flex-col">
                  <h3 className="font-semibold text-base line-clamp-2 h-12 leading-tight mb-2" title={product.title}>
                    {product.title}
                  </h3>
                  
                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <span className="capitalize">{product.type?.toLowerCase() || 'unknown'}</span>
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>{isExpired ? 'Expired' : `Exp ${formattedExpiry}`}</span>
                    </div>
                  </div>

                  <div className="mb-3 text-xs text-muted-foreground">
                    Access via <span className="font-medium text-foreground">{isCreditAccess ? 'Credits' : 'Purchase'}</span>
                    {isCreditAccess && ' (1 credit)'}
                  </div>
                  
                  {/* Plan Info */}
                  {product.productPricing && (
                    <div className="mb-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Plan:</span>
                        <span className="font-medium">{product.productPricing.name}</span>
                      </div>
                      {!product.isFree && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Price:</span>
                          <span className="font-medium">₹{price}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="mt-auto space-y-2">
                    {isExpired ? (
                      <Button 
                        asChild 
                        variant="default"
                        size="sm"
                        className="w-full"
                      >
                        <Link href={`/products/${product.id}`}>
                          Purchase Again
                        </Link>
                      </Button>
                    ) : (
                      <Button 
                        asChild 
                        variant="default"
                        size="sm"
                        className="w-full"
                      >
                        <Link href={`/products/${product.id}/view`}>
                          View Content
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
