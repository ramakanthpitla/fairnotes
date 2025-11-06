'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { PDFSampleViewer } from './pdf-sample-viewer';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  duration: number;
  isActive: boolean;
}

export interface PaymentSectionProps {
  product: {
    id: string;
    title: string;
    description: string | null;
    price: number;
    type: string;
    thumbnail: string | null;
    duration: number;
    isFree: boolean;
    fileUrl: string;
    sku: string;
    isActive: boolean;
    pageCount?: number | null;
    pricingPlans?: PricingPlan[];
  };
  razorpayKey: string;
  selectedPlanId?: string | null;
  onPurchaseSuccess?: (paymentId: string) => void;
}

export function PaymentSection({ 
  product, 
  razorpayKey, 
  selectedPlanId,
  onPurchaseSuccess 
}: PaymentSectionProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isSampleOpen, setIsSampleOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSampleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (product.type === 'PDF' && product.fileUrl) {
      setIsSampleOpen(true);
    } else {
      // For non-PDF content, just scroll to the sample section
      scrollToSample(e);
    }
  };

  const handlePaymentSuccess = useCallback((paymentId: string) => {
    console.log('Payment successful:', paymentId);
    const selectedPlan = selectedPlanId ? product.pricingPlans?.find(p => p.id === selectedPlanId) : null;
    const amount = product.isFree ? 0 : (selectedPlan ? selectedPlan.price : product.price);
    
    const purchaseData = {
      id: product.id,
      description: `Purchase of ${product.title}${selectedPlan ? ` - ${selectedPlan.name}` : ''}`,
      amount: amount,
      currency: 'INR',
      notes: {
        planId: selectedPlanId || undefined,
        planName: selectedPlan?.name || undefined,
        planDuration: selectedPlan?.duration?.toString() || undefined,
      },
    };
    
    const filteredPurchaseData = JSON.parse(JSON.stringify(purchaseData, (key, value) => 
      value === undefined ? undefined : value
    ));
    
    localStorage.setItem('lastPurchasedProduct', JSON.stringify(filteredPurchaseData));
    
    if (onPurchaseSuccess) {
      onPurchaseSuccess(paymentId);
    }
    
    router.push(`/payment/success?payment_id=${paymentId}`);
  }, [selectedPlanId, product, onPurchaseSuccess, router]);

  const handleBuyNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!session) {
      router.push('/login?callbackUrl=' + encodeURIComponent(window.location.href));
      return;
    }

    if (product.pricingPlans?.length && !selectedPlanId) {
      toast.error('Please select a plan');
      return;
    }

    const selectedPlan = selectedPlanId 
      ? product.pricingPlans?.find(p => p.id === selectedPlanId)
      : null;

    try {
      setIsLoading(true);
      
      // Calculate the final price
      const price = selectedPlan ? selectedPlan.price : product.price;
      const amountInPaise = Math.round(price * 100);
      
      if (isNaN(amountInPaise) || amountInPaise <= 0) {
        throw new Error('Invalid product price. Please try again or contact support.');
      }

      // Create order on the server
      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          amount: amountInPaise,
          currency: 'INR',
          productName: product.title,
          productDescription: selectedPlan 
            ? `${product.title} - ${selectedPlan.name} Plan` 
            : product.description || product.title,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = errorText ? JSON.parse(errorText) : {};
        } catch (e) {
          console.error('Failed to parse error response:', errorText);
          throw new Error('Failed to process payment. Please try again.');
        }
        
        console.error('Order creation failed:', errorData);
        
        if (errorData.code === 'AUTH_REQUIRED') {
          router.push('/login?callbackUrl=' + encodeURIComponent(window.location.href));
          return;
        }
        
        if (errorData.code === 'ALREADY_PURCHASED') {
          toast.info('You already own this product');
          return;
        }
        
        if (errorData.code === 'INVALID_PRICE') {
          throw new Error('This product has an invalid price. Please contact support.');
        }
        
        throw new Error(errorData.message || errorData.error || 'Failed to create order. Please try again.');
      }

      const order = await response.json();
      
      // Initialize Razorpay
      if (!window.Razorpay) {
        throw new Error('Payment gateway failed to load. Please refresh the page and try again.');
      }

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'StudyMart',
        description: selectedPlan 
          ? `${product.title} - ${selectedPlan.name} Plan` 
          : product.description || product.title,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            if (response.razorpay_payment_id) {
              // Verify payment on the server
              const verifyResponse = await fetch('/api/razorpay/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderId: response.razorpay_order_id,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                }),
              });

              if (!verifyResponse.ok) {
                throw new Error('Payment verification failed');
              }

              handlePaymentSuccess(response.razorpay_payment_id);
            } else {
              throw new Error('Payment failed or was cancelled');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: session.user?.name || '',
          email: session.user?.email || '',
        },
        theme: {
          color: '#4f46e5',
        },
        modal: {
          ondismiss: () => {
            console.log('Payment modal dismissed');
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToSample = (e?: React.MouseEvent) => {
    e?.preventDefault();
    document.getElementById('sample-content')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Check if Razorpay key is provided
  if (!razorpayKey) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              Payment processing is currently unavailable. Please try again later or contact support.
            </p>
            <p className="mt-2 text-sm text-yellow-700">
              Error: Razorpay key is missing. Please set the NEXT_PUBLIC_RAZORPAY_KEY_ID environment variable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const selectedPlan = selectedPlanId ? product.pricingPlans?.find(p => p.id === selectedPlanId) : null;
  const amount = product.isFree ? 0 : (selectedPlan ? selectedPlan.price : product.price) * 100;

  return (
    <div className="flex flex-col sm:flex-row gap-3 pt-2">
      <div className="w-full">
        <Button 
          onClick={product.isFree ? () => onPurchaseSuccess?.('free') : handleBuyNow}
          className="w-full py-6 text-lg font-semibold"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : product.isFree ? (
            'Download Now'
          ) : selectedPlan ? (
            `Buy ${selectedPlan.name} Plan`
          ) : (
            'Buy Now'
          )}
        </Button>
        {!selectedPlanId && product.pricingPlans?.length && (
          <p className="mt-2 text-sm text-red-500 text-center">
            Please select a pricing plan
          </p>
        )}
        <Button
          variant="outline"
          className="w-full mt-2 rounded-md px-4 py-2.5 text-center font-medium hover:bg-muted transition-colors"
          onClick={handleSampleClick}
        >
          {product.type === 'PDF' ? 'Preview Sample' : 'Try sample'}
        </Button>
        {product.type === 'PDF' && product.fileUrl && (
          <PDFSampleViewer
            fileUrl={product.fileUrl}
            title={product.title}
            open={isSampleOpen}
            onOpenChange={setIsSampleOpen}
            previewPercentage={5}
            pageCount={product.pageCount}
          />
        )}
      </div>
    </div>
  );
}
