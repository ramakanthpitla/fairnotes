'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type RazorpayButtonProps = {
  amount: number;
  currency?: string;
  productId: string;
  productName: string;
  productDescription?: string;
  className?: string;
  buttonText?: string;
  razorpayKey: string; // Add this line
  onSuccess?: (paymentId: string) => void;
  onError?: (error: any) => void;
  onClose?: () => void;
  disabled?: boolean;
};

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function RazorpayButton({
  amount,
  currency = 'INR',
  productId,
  productName,
  productDescription = 'Product Purchase',
  buttonText = 'Pay Now',
  razorpayKey,
  onSuccess,
  onError,
  onClose,
  className = '',
  disabled = false,
}: RazorpayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  // Check if Razorpay is already loaded
  useEffect(() => {
    const checkRazorpay = () => {
      if (window.Razorpay) {
        console.log('Razorpay already loaded');
        setScriptLoaded(true);
        return true;
      }
      return false;
    };

    // Try to load Razorpay
    const loadRazorpay = () => {
      if (checkRazorpay()) return;

      console.log('Loading Razorpay script...');
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        console.log('Razorpay script loaded successfully');
        setScriptLoaded(true);
      };
      script.onerror = (error) => {
        console.error('Failed to load Razorpay script:', error);
        setScriptLoaded(false);
      };
      document.body.appendChild(script);
    };

    loadRazorpay();

    // Set up polling to check if Razorpay is loaded
    const interval = setInterval(() => {
      if (checkRazorpay()) {
        clearInterval(interval);
      } else {
        console.log('Razorpay not loaded yet, checking again...');
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handlePayment = async () => {
    console.log('Payment button clicked');
    
    if (!session?.user) {
      toast.error('Please sign in to proceed with payment');
      router.push('/auth/signin');
      return;
    }

    setLoading(true);

    try {
      // 1. Create an order on the server
      console.log('Creating order...');
      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency,
          productId,
          productName,
          productDescription,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create order');
      }

      const order = await response.json();
      console.log('Order created:', order);

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please refresh the page and try again.');
      }

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: 'Study Mart',
        description: productDescription,
        order_id: order.id,
        handler: async function (response: any) {
          console.log('Payment successful:', response);
          try {
            const verifyResponse = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                amount,
                productId,
              }),
            });

            if (!verifyResponse.ok) {
              const error = await verifyResponse.json();
              throw new Error(error.message || 'Payment verification failed');
            }

            const result = await verifyResponse.json();
            console.log('Payment verified:', result);
            onSuccess?.(response.razorpay_payment_id);
            toast.success('Payment successful!');
          } catch (error) {
            console.error('Error verifying payment:', error);
            toast.error(error instanceof Error ? error.message : 'Payment verification failed');
            onError?.(error);
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: session.user.name || '',
          email: session.user.email || '',
        },
        theme: {
          color: '#4F46E5',
        },
        modal: {
          ondismiss: () => {
            console.log('Payment modal dismissed');
            setLoading(false);
            onClose?.();
          },
        },
      };

      console.log('Opening Razorpay with options:', options);
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response.error);
        toast.error(`Payment failed: ${response.error.description}`);
        onError?.(response.error);
        setLoading(false);
      });
      rzp.open();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Payment failed');
      onError?.(error);
      setLoading(false);
    }
  };

  const isButtonDisabled = disabled || loading || status === 'loading' || !scriptLoaded;

  console.log('Button state:', {
    isButtonDisabled,
    loading,
    status,
    scriptLoaded,
    disabled
  });

  return (
    <Button 
      onClick={handlePayment} 
      disabled={isButtonDisabled}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        buttonText
      )}
    </Button>
  );
}
