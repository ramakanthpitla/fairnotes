'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ProductViewer } from '@/components/product/viewer';
import Image from 'next/image';
import Link from 'next/link';
import { PaymentSection } from '@/components/product/payment-section';
import { ProductThumbnail } from '@/components/product/thumbnail';

// Define the checkPurchaseStatus function
async function checkPurchaseStatus(userId: string, productId: string): Promise<{ hasPurchased: boolean }> {
  const response = await fetch('/api/check-purchase', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, productId }),
  });

  if (!response.ok) {
    throw new Error('Failed to check purchase status');
  }

  return response.json();
}

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  duration: number;
  isActive: boolean;
}

interface ProductDetailContentProps {
  product: {
    id: string;
    title: string;
    description: string | null;
    type: 'PDF' | 'VIDEO' | string;
    thumbnail: string | null;
    sku: string;
    isFree: boolean;
    fileUrl: string;
    pageCount?: number | null;
    isActive: boolean;
    pricing: PricingPlan[];
  };
  initialPlanId?: string | null;
}

export default function ProductDetailContent({ product, initialPlanId = null }: ProductDetailContentProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(initialPlanId || null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Update selected plan when initialPlanId changes
  useEffect(() => {
    if (initialPlanId) {
      setSelectedPlanId(initialPlanId);
    } else if (product.pricing?.length > 0) {
      setSelectedPlanId(product.pricing[0].id);
    }
  }, [initialPlanId, product.pricing]);

  const handlePurchase = async () => {
    if (!selectedPlanId) {
      toast.error('Please select a plan');
      return;
    }

    if (!session?.user?.email) {
      router.push(`/auth/signin?callbackUrl=/products/${product.id}`);
      return;
    }

    try {
      setIsPurchasing(true);
      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          planId: selectedPlanId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const data = await response.json();
      const { order, key } = data;

      const options = {
        key,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: product.title,
        description: `Plan: ${product.pricing.find(p => p.id === selectedPlanId)?.name || ''}`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            const verifyResponse = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                orderId: order.id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                planId: selectedPlanId,
              }),
            });

            const verifyData = await verifyResponse.json();
            if (verifyResponse.ok) {
              toast.success('Payment successful!');
              router.push('/purchases');
            } else {
              throw new Error(verifyData.error || 'Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: session.user?.name || 'Customer',
          email: session.user?.email || '',
          contact: '',
        },
        theme: {
          color: '#3399cc',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      rzp.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response.error);
        toast.error('Payment failed. Please try again.');
      });
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to initiate payment. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const selectedPlan = product.pricing?.find(p => p.id === selectedPlanId) || product.pricing?.[0] || null;
  const hasPricing = product.pricing && product.pricing.length > 0;

  useEffect(() => {
    async function verifyPurchase() {
      try {
        if (status === 'authenticated' && session?.user?.id) {
          const { hasPurchased } = await checkPurchaseStatus(session.user.id, product.id);
          setIsPurchased(hasPurchased);
        }
      } catch (error) {
        console.error('Error verifying purchase:', error);
      } finally {
        setIsLoading(false);
      }
    }

    verifyPurchase();
  }, [status, session, product.id]);

  // Show loading state while checking purchase status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If product is free or already purchased, show the viewer
  if (product?.isFree || isPurchased) {
    return (
      <div className="container mx-auto py-8">
        <ProductViewer product={{
          id: product.id,
          type: product.type as 'PDF' | 'VIDEO',
          title: product.title,
          fileUrl: product.fileUrl
        }} />
      </div>
    );
  }

  // If user is not logged in, show login prompt
  if (status === 'unauthenticated') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-4">{product.title}</h1>
          <p className="text-gray-700 mb-6">Please sign in to purchase this product.</p>
          <Button asChild>
            <Link href={`/auth/signin?callbackUrl=/products/${product.id}`}>
              Sign In to Purchase
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Show payment section for paid products
  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Thumbnail and PDF Preview Column - takes 5/12 of the width on medium screens and up */}
        <div className="md:col-span-5 space-y-4">
          <div className="sticky top-4 space-y-4">
            <ProductThumbnail 
              product={{
                thumbnail: product.thumbnail || '/placeholder.svg',
                title: product.title
              }}
              className="w-full rounded-lg shadow-md"
            />
          </div>
        </div>
        
        {/* Details Column - takes 7/12 of the width on medium screens and up */}
        <div className="md:col-span-7">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              {product.type === 'PDF' && (
                <div className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  <span>{product.pageCount || '...'} {product.pageCount === 1 ? 'page' : 'pages'}</span>
                </div>
              )}
              {product.type === 'VIDEO' && (
                <div className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                  </svg>
                  <span>Video</span>
                </div>
              )}
            </div>
            <div className="prose prose-sm text-muted-foreground">
              {product.description || 'No description available'}
            </div>
          </div>
          
          {product.pricing && product.pricing.length > 0 ? (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Pricing Plans</h2>
              <div className="space-y-2">
                {product.pricing.map((plan) => (
                  <div 
                    key={plan.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedPlanId === plan.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {plan.duration} days access
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{plan.price.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedPlan && (
                <div className="mt-6">
                  <PaymentSection 
                    product={{
                      id: product.id,
                      title: product.title,
                      description: product.description,
                      price: selectedPlan.price,
                      type: product.type,
                      thumbnail: product.thumbnail,
                      duration: selectedPlan.duration,
                      isFree: product.isFree,
                      fileUrl: product.fileUrl,
                      sku: product.sku,
                      isActive: product.isActive,
                      pageCount: product.pageCount,
                      pricingPlans: product.pricing
                    }}
                    razorpayKey={process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || ''}
                    selectedPlanId={selectedPlan.id}
                    onPurchaseSuccess={() => setIsPurchased(true)}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    No pricing plans available for this product. Please contact support.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
