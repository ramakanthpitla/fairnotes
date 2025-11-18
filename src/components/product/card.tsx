'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { CheckCircle, Heart, HeartOff } from 'lucide-react';
import { ProductThumbnail } from '@/components/product/thumbnail';
import { useLikedProducts } from '@/components/providers/liked-products-provider';

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  duration: number;
  isActive: boolean;
  productId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Product {
  id: string;
  sku: string;
  title: string;
  description: string | null;
  type: 'PDF' | 'VIDEO';
  thumbnail: string | null;
  isFree: boolean;
  pricingPlans: PricingPlan[]; // Required field
  price?: number; // For backward compatibility
  duration?: number; // For backward compatibility
  fileUrl?: string;
}

interface ProductCardProps {
  product: Product;
  isPurchased?: boolean;
  onPurchaseSuccess?: (paymentId: string) => void;
}

// Using PricingPlan interface for plan data

export function ProductCard({ product, isPurchased: initialIsPurchased = false, onPurchaseSuccess }: ProductCardProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { liked, isLiked, toggleLike } = useLikedProducts();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(
    product.pricingPlans?.filter(plan => plan.isActive).length > 0 
      ? product.pricingPlans?.filter(plan => plan.isActive)[0].id 
      : null
  );
  const [loading, setLoading] = useState(false);
  const [isPurchased, setIsPurchased] = useState(initialIsPurchased);
  const [purchaseExpired, setPurchaseExpired] = useState(false);
  
  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => {
        console.error('Failed to load Razorpay script');
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const handleBuyNow = async () => {
    if (!session) {
      router.push('/login?callbackUrl=' + encodeURIComponent(window.location.href));
      return;
    }

    // Validate plan selection for paid products
    if (!product.isFree && !selectedPlanId) {
      toast.error('Please select a pricing plan');
      return;
    }

    setLoading(true);
    
    try {
      // Calculate amount based on selected plan
      const selectedPlan = product.pricingPlans?.find(plan => plan.id === selectedPlanId);
      
      if (!selectedPlan && !product.isFree) {
        throw new Error('Please select a pricing plan');
      }
      
      const amount = selectedPlan?.price || 0;
      const amountInPaise = Math.round(amount * 100); // Convert to paise and ensure it's an integer
      
      if (!product.isFree && (isNaN(amount) || amount <= 0)) {
        throw new Error('Invalid product price');
      }

      const productDescription = selectedPlan 
        ? `${product.title} - ${selectedPlan.name}` 
        : product.title;

      console.log('Creating order with:', {
        productId: product.id,
        amount: amountInPaise,
        productName: product.title
      });

      // Create order on the server
      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          planId: selectedPlan?.id,
          amount: amountInPaise,
          currency: 'INR',
          productName: product.title,
          productDescription,
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          const errorText = await response.text();
          errorData = errorText ? JSON.parse(errorText) : {};
          console.error('Order creation failed with status:', response.status, errorData);
          
          if (errorData.code === 'AUTH_REQUIRED') {
            router.push('/login?callbackUrl=' + encodeURIComponent(window.location.href));
            return;
          }
          
          if (errorData.code === 'ALREADY_PURCHASED') {
            toast.info('You already own this product');
            return;
          }
          
          if (errorData.code === 'INVALID_PRICE') {
            toast.error('The product price is invalid. Please refresh the page and try again.');
            return;
          }
          
          throw new Error(errorData.message || errorData.error || 'Failed to create order');
        } catch (e) {
          console.error('Error processing error response:', e);
          throw new Error(`Failed to process order: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }

      const order = await response.json();
      console.log('Order created:', order);

      // Load Razorpay script if not already loaded
      const razorpayLoaded = await loadRazorpay();
      if (!razorpayLoaded) {
        throw new Error('Payment gateway failed to load. Please check your internet connection and refresh the page.');
      }

      if (!window.Razorpay) {
        throw new Error('Payment gateway is not available. Please try again later.');
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'StudyMart',
        description: productDescription,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            if (response.razorpay_payment_id) {
              // Verify payment on the server
              const verifyResponse = await fetch('/api/razorpay/verify-payment', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  orderId: response.razorpay_order_id,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                  productId: product.id,
                  planId: selectedPlan?.id,
                }),
              });

              if (!verifyResponse.ok) {
                throw new Error('Payment verification failed');
              }

              toast.success('Payment successful!');
              setLoading(false);
              onPurchaseSuccess?.(response.razorpay_payment_id);
              router.push(`/payment/success?payment_id=${response.razorpay_payment_id}`);
            } else {
              throw new Error('Payment failed or was cancelled');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed. Please contact support.');
            setLoading(false);
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
            setLoading(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Payment failed. Please try again.');
      setLoading(false);
    } finally {
      // Reset loading after a brief delay if Razorpay opened successfully
      // This is to prevent the button from flickering
      setTimeout(() => {
        if (!loading) return; // Already reset
        setLoading(false);
      }, 1000);
    }
  };
  
  // For backward compatibility with products that don't have pricing plans yet
  const activePlans = product.pricingPlans?.filter(plan => plan.isActive) || [];
  const hasPricingPlans = activePlans.length > 0;
  const selectedPlan = selectedPlanId ? activePlans.find(p => p.id === selectedPlanId) : null;

  useEffect(() => {
    async function checkPurchaseStatus() {
      if (status === 'authenticated' && !product.isFree) {
        try {
          const response = await fetch('/api/check-purchase', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              userId: session?.user?.id, 
              productId: product.id 
            }),
          });
          
          if (response.ok) {
            const { hasPurchased, isValid, expiresAt } = await response.json();
            setIsPurchased(hasPurchased);
            // Check if purchase has expired
            if (hasPurchased && expiresAt) {
              const expired = new Date(expiresAt) < new Date();
              setPurchaseExpired(expired);
            }
          }
        } catch (error) {
          console.error('Error checking purchase status:', error);
        }
      }
    }

    checkPurchaseStatus();
  }, [status, session, product.id, product.isFree]);

  const showBuyButton = !product.isFree && !isPurchased && selectedPlanId;
  // Only show as purchased if it's actually valid (not expired)
  const isValidPurchase = isPurchased && !purchaseExpired;
  const isFreeOrPurchased = product.isFree || isValidPurchase;
  const likedProductPayload = {
    id: product.id,
    sku: product.sku,
    title: product.title,
    description: product.description,
    type: product.type,
    thumbnail: product.thumbnail,
    isFree: product.isFree,
    price: product.price,
    duration: product.duration,
  } as const;

  return (
    <div className="rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow relative">
      <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-10">
        <button
          type="button"
          onClick={() => toggleLike(likedProductPayload)}
          className="inline-flex items-center justify-center rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
          aria-label={isLiked(product.id) ? 'Remove from liked' : 'Add to liked'}
        >
          {isLiked(product.id) ? (
            <Heart className="w-4 h-4 fill-red-500 text-red-500" />
          ) : (
            <Heart className="w-4 h-4" />
          )}
        </button>
        {isValidPurchase && (
          <div className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
            <CheckCircle className="w-3 h-3 mr-1" />
            Purchased
          </div>
        )}
        {purchaseExpired && isPurchased && (
          <div className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            Expired
          </div>
        )}
        {!isPurchased && product.isFree && (
          <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            Free
          </div>
        )}
        {(isValidPurchase || product.isFree) && (
          <div className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            Available
          </div>
        )}
      </div>
      
      <div className="aspect-[16/9] bg-muted relative overflow-hidden">
        <ProductThumbnail 
          product={{
            thumbnail: product.thumbnail,
            title: product.title,
          }}
          className="w-full h-full"
        />
      </div>
      
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold line-clamp-1 pr-2">{product.title}</h3>
          <span className="text-xs rounded-full bg-muted px-2 py-1 whitespace-nowrap">
            {product.type}
          </span>
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
        <div className="text-xs text-muted-foreground">SKU: {product.sku}</div>
        
        {!isFreeOrPurchased && (
          <div className="space-y-2">
            {hasPricingPlans ? (
              <div className="grid grid-cols-2 gap-2">
                {activePlans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`text-left p-2 rounded-md border ${
                      selectedPlanId === plan.id
                        ? 'border-primary bg-primary/10'
                        : 'border-muted hover:bg-muted/50'
                    } transition-colors`}
                  >
                    <div className="font-medium">{plan.name}</div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold">₹{plan.price}</span>
                      <span className="text-xs text-muted-foreground">
                        {plan.duration} day{plan.duration !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  {product.isFree ? 'Free' : `₹${product.price || 0}`}
                </span>
                {!product.isFree && product.duration && (
                  <span className="text-sm text-gray-500">
                    / {product.duration} day{product.duration !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between pt-2">
          <div className="text-lg font-semibold">
            {isFreeOrPurchased 
              ? (product.isFree ? 'Free' : 'Available')
              : selectedPlan
                ? `₹${selectedPlan.price}`
                : 'Select a plan'}
          </div>
          {selectedPlan && (
            <div className="text-xs text-muted-foreground">
              {selectedPlan.duration} day{selectedPlan.duration !== 1 ? 's' : ''}
            </div>
          )}
        </div>
        
        <div className="flex gap-2 mt-4">
          {isFreeOrPurchased ? (
            <Link
              href={`/products/${product.id}/view`}
              className="flex-1 text-center rounded-md px-3 py-2 text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              View Content
            </Link>
          ) : (
            <>
              <Link
                href={`/products/${product.id}${hasPricingPlans && selectedPlanId ? `?planId=${selectedPlanId}` : ''}`}
                className="flex-1 text-center rounded-md px-3 py-2 text-sm font-medium border border-primary text-primary hover:bg-primary/10 transition-colors"
              >
                Details
              </Link>
              <button
                onClick={handleBuyNow}
                disabled={hasPricingPlans && !selectedPlanId}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                  hasPricingPlans && !selectedPlanId 
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } shadow-sm transition-colors`}
              >
                {hasPricingPlans ? (selectedPlanId ? 'Buy Now' : 'Select Plan') : 'Buy Now'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


