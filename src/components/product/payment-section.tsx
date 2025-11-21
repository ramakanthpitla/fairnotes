'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PDFSampleViewer } from './pdf-sample-viewer';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { CheckCircle } from 'lucide-react';

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
  isPurchased?: boolean;
}

export function PaymentSection({
  product,
  razorpayKey,
  selectedPlanId,
  onPurchaseSuccess,
  isPurchased = false
}: PaymentSectionProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isSampleOpen, setIsSampleOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const scrollToSample = (e: React.MouseEvent) => {
    e.preventDefault();
    const sampleSection = document.getElementById('sample-section');
    if (sampleSection) {
      sampleSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSampleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('[PaymentSection] View Sample clicked, product type:', product.type, 'has fileUrl:', !!product.fileUrl);
    if (product.type === 'PDF' && product.fileUrl) {
      console.log('[PaymentSection] Opening sample dialog');
      setIsSampleOpen(true);
    } else {
      // For non-PDF content, just scroll to the sample section
      scrollToSample(e);
    }
  };

  const handlePaymentSuccess = useCallback((paymentId: string) => {
    console.log('Payment successful:', paymentId);
    const selectedPlan = selectedPlanId ? product.pricingPlans?.find((p: PricingPlan) => p.id === selectedPlanId) : null;
    const amount = product.isFree ? 0 : (selectedPlan ? selectedPlan.price : 0);

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

    if (isLoading) return; // Prevent multiple clicks

    if (!session) {
      router.push('/login?callbackUrl=' + encodeURIComponent(window.location.href));
      return;
    }

    // Set cursor to wait
    document.body.style.cursor = 'wait';
    setIsLoading(true);

    if (product.pricingPlans?.length && !selectedPlanId) {
      toast.error('Please select a plan');
      setIsLoading(false);
      document.body.style.cursor = 'default';
      return;
    }

    const selectedPlan = selectedPlanId
      ? product.pricingPlans?.find((p: { id: string | null | undefined; }) => p.id === selectedPlanId)
      : null;

    try {
      // Calculate the final price with validation
      const price = selectedPlan ? selectedPlan.price : 0;

      // Validate price is a valid number
      if (price === undefined || price === null) {
        throw new Error('Price is not available for this product');
      }

      const priceNumber = Number(price);
      if (isNaN(priceNumber) || priceNumber < 0) {
        console.error('Invalid price:', { price, selectedPlan });
        throw new Error('Invalid product price. Please contact support.');
      }

      // For free products, handle directly without payment
      if (priceNumber === 0) {
        await handlePaymentSuccess('free');
        setIsLoading(false);
        return;
      }

      const amountInPaise = Math.round(priceNumber * 100);

      // Prepare the request data
      const requestData = {
        productId: product.id,
        amount: amountInPaise,
        currency: 'INR',
        productName: product.title,
        productDescription: selectedPlan
          ? `${product.title} - ${selectedPlan.name} Plan`
          : product.description || product.title,
        planId: selectedPlan?.id
      };

      console.log('Sending request to create order:', {
        ...requestData,
        amount: `${amountInPaise} (${priceNumber} in base units)`
      });

      // Create order on the server
      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        let errorData = {};
        try {
          const errorText = await response.text();
          console.log('Raw error response:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(Array.from(response.headers.entries())),
            body: errorText
          });
          errorData = errorText ? JSON.parse(errorText) : {};
        } catch (e) {
          console.error('Error parsing error response:', e);
          errorData = {};
        }

        // Handle 400 Bad Request specifically
        if (response.status === 400) {
          let errorMessage = 'Invalid request';

          if ((errorData as any).code === 'ALREADY_PURCHASED') {
            toast.info('You already own this product');
            setIsLoading(false);
            document.body.style.cursor = 'default';
            return;
          } else if ((errorData as any).code === 'PAYMENT_CANCELED') {
            toast.error('Payment was cancelled. Please try again.');
            setIsLoading(false);
            document.body.style.cursor = 'default';
            return;
          } else if ((errorData as any).code === 'NETWORK_ERROR') {
            toast.error('Network error. Please check your connection and try again.');
            setIsLoading(false);
            document.body.style.cursor = 'default';
            return;
          } else if ((errorData as any).code === 'INVALID_PRICE' || (errorData as any).code === 'AMOUNT_MISMATCH') {
            errorMessage = 'The product price is invalid. Please refresh the page and try again.';
          } else if ((errorData as any).message) {
            errorMessage = (errorData as any).message;
          } else if ((errorData as any).error) {
            errorMessage = (errorData as any).error;
          }

          console.error('Validation error:', errorMessage);
          toast.error(errorMessage);
          setIsLoading(false);
          document.body.style.cursor = 'default';
          return;
        }

        // For other error statuses
        const errorMessage = (errorData as any).message ||
          (errorData as any).error ||
          `Failed to create order (${response.status})`;

        toast.error(errorMessage);
        setIsLoading(false);
        document.body.style.cursor = 'default';
        return;
      }

      const order = await response.json();

      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        try {
          console.log('Loading Razorpay script...');
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => {
              console.log('Razorpay script loaded successfully');
              if (window.Razorpay) {
                console.log('Razorpay is available on window');
                resolve();
              } else {
                reject(new Error('Razorpay not available after script load'));
              }
            };
            script.onerror = (error) => {
              console.error('Script loading error:', error);
              reject(new Error('Failed to load payment gateway script'));
            };
            document.head.appendChild(script);
          });
        } catch (error) {
          console.error('Error loading Razorpay:', error);
          toast.error('Failed to load payment gateway. Please try again.');
          setIsLoading(false);
          return;
        }
      } else {
        console.log('Razorpay already loaded');
      }

      if (typeof window.Razorpay !== 'function') {
        // If Razorpay is not available, try loading it again
        try {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => {
              if (window.Razorpay) {
                console.log('Razorpay loaded successfully');
                resolve();
              } else {
                reject(new Error('Razorpay not available after loading'));
              }
            };
            script.onerror = () => reject(new Error('Failed to load Razorpay'));
            document.head.appendChild(script);
          });
        } catch (error) {
          console.error('Error loading Razorpay:', error);
          toast.error('Failed to load payment gateway. Please refresh and try again.');
          setIsLoading(false);
          document.body.style.cursor = 'default';
          return;
        }
      }

      const options: any = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'FairNotes',
        description: selectedPlan
          ? `${product.title} - ${selectedPlan.name} Plan`
          : product.description || product.title,
        order_id: order.id,
        theme: {
          color: '#4f46e5',
        },
        modal: {
          ondismiss: () => {
            console.log('Payment modal dismissed');
            setIsLoading(false);
            document.body.style.cursor = 'default';
          },
        },
        handler: function (response: any) {
          (async () => {
            try {
              if (response.razorpay_payment_id) {
                console.log('Payment successful, verifying...', response);
                // Verify payment on the server
                const verifyResponse = await fetch('/api/razorpay/verify-payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    orderId: response.razorpay_order_id,
                    paymentId: response.razorpay_payment_id,
                    signature: response.razorpay_signature,
                    productId: product.id,
                    planId: selectedPlan?.id,
                  }),
                });

                const result = await verifyResponse.json();

                if (!verifyResponse.ok) {
                  console.error('Payment verification failed:', result);
                  throw new Error(result.error || 'Payment verification failed');
                }

                console.log('Payment verified successfully');
                if (onPurchaseSuccess) {
                  onPurchaseSuccess(response.razorpay_payment_id);
                }

                // Redirect to success page
                router.push(`/payment/success?payment_id=${response.razorpay_payment_id}`);
              } else {
                console.error('No payment ID in response:', response);
                throw new Error('Payment was not completed');
              }
            } catch (error) {
              console.error('Payment verification error:', error);
              toast.error(error instanceof Error ? error.message : 'Payment verification failed. Please contact support.');
            } finally {
              setIsLoading(false);
              document.body.style.cursor = 'default';
            }
          })();
        },
        prefill: {
          name: (session && session.user && session.user.name) || 'Customer',
          email: (session && session.user && session.user.email) || '',
          contact: ''
        },
        notes: {
          address: 'FairNotes Digital Product',
          product_id: product.id,
          plan_id: selectedPlan?.id,
          user_id: (session && session.user && session.user.email) || 'unknown'
        }
      };

      // Add error handler for payment failures
      const rzp = new (window as any).Razorpay(options);

      rzp.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response.error);
        toast.error(`Payment failed: ${response.error?.description || 'Unknown error'}`);
        setIsLoading(false);
        document.body.style.cursor = 'default';
      });

      rzp.open();

      // Reset cursor after opening the modal
      document.body.style.cursor = 'default';
    } catch (error) {
      console.error('Error during payment:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred while processing your payment. Please try again.');
      setIsLoading(false);
      document.body.style.cursor = 'default';
    }
  };

  // Handle already purchased state
  if (isPurchased) {
    return (
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <div className="w-full">
          <Link href={`/products/${product.id}/view`} className="w-full">
            <Button
              className="w-full py-6 text-lg font-semibold bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              View Product
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check if Razorpay key is provided
  if (!razorpayKey) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              Payment gateway is not properly configured.
            </p>
            <p className="mt-2 text-sm text-yellow-700">
              Error: Razorpay key is missing. Please set the NEXT_PUBLIC_RAZORPAY_KEY_ID environment variable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const selectedPlan = selectedPlanId ? product.pricingPlans?.find((p: PricingPlan) => p.id === selectedPlanId) : null;
  const amount = product.isFree ? 0 : (selectedPlan ? selectedPlan.price : 0) * 100;

  // Check if the product is free
  const isFreeProduct = product.isFree || amount === 0;

  return (
    <div className="flex flex-col sm:flex-row gap-3 pt-2">
      <div className="w-full">
        <Button
          onClick={isFreeProduct ? () => onPurchaseSuccess?.('free') : handleBuyNow}
          className={`w-full py-6 text-lg font-semibold ${isLoading ? 'opacity-75' : ''} ${isFreeProduct ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary/90'}`}
          disabled={isLoading}
          style={{ cursor: isLoading ? 'wait' : 'pointer' }}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : isFreeProduct ? (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Get for Free
            </>
          ) : (
            `Buy Now for ₹${selectedPlan ? selectedPlan.price : 0}`
          )}
        </Button>
      </div>
      {product.type === 'PDF' && (
        <Button
          variant="outline"
          className="py-6 text-lg"
          onClick={handleSampleClick}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          View Sample
        </Button>
      )}

      {product.type === 'PDF' && product.fileUrl && (
        <PDFSampleViewer
          fileUrl={product.fileUrl}
          productId={product.id}
          title={product.title}
          open={isSampleOpen}
          onOpenChange={setIsSampleOpen}
          previewPercentage={5}
          pageCount={product.pageCount}
        />
      )}
    </div>
  );
}
