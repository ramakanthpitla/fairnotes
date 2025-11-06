'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { CheckCircle, FileText, Video } from 'lucide-react';
// Using inline thumbnail component instead of external file
const ProductThumbnail = ({ thumbnail, title, type }: { thumbnail: string | null; title: string; type: 'PDF' | 'VIDEO' }) => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted">
      {thumbnail ? (
        <img 
          src={thumbnail} 
          alt={title} 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="text-muted-foreground">
          {type === 'PDF' ? (
            <FileText className="w-12 h-12" />
          ) : (
            <Video className="w-12 h-12" />
          )}
        </div>
      )}
    </div>
  );
};

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  duration: number;
  isActive: boolean;
}

interface Product {
  id: string;
  sku: string;
  title: string;
  description: string | null;
  type: 'PDF' | 'VIDEO';
  thumbnail: string | null;
  isFree: boolean;
  pricingPlans?: PricingPlan[];
  price?: number; // For backward compatibility
  duration?: number; // For backward compatibility
  fileUrl?: string;
}

interface ProductCardProps {
  product: Product;
  isPurchased?: boolean;
  onPurchaseSuccess?: (paymentId: string) => void;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  duration: number;
  isActive: boolean;
}

export function ProductCard({ product, isPurchased = false, onPurchaseSuccess }: ProductCardProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(
    product.pricingPlans?.filter(plan => plan.isActive).length > 0 
      ? product.pricingPlans?.filter(plan => plan.isActive)[0].id 
      : null
  );
  
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

    // Calculate the final amount
    const amount = selectedPlan ? selectedPlan.price : (product.price || 0);
    const productDescription = selectedPlan 
      ? `${product.title} - ${selectedPlan.name} Plan` 
      : product.description || product.title;

    try {
      // Create order on the server
      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          amount: amount * 100, // Convert to paise
          currency: 'INR',
          productName: product.title,
          productDescription,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Order creation failed:', errorData);
        
        if (errorData.code === 'AUTH_REQUIRED') {
          router.push('/login?callbackUrl=' + encodeURIComponent(window.location.href));
          return;
        }
        
        if (errorData.code === 'ALREADY_PURCHASED') {
          toast.info('You already own this product');
          return;
        }
        
        throw new Error(errorData.message || errorData.error || 'Failed to create order');
      }

      const order = await response.json();
      console.log('Order created:', order);

      // Initialize Razorpay
      if (!window.Razorpay) {
        throw new Error('Payment gateway failed to load. Please refresh the page and try again.');
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
                }),
              });

              if (!verifyResponse.ok) {
                throw new Error('Payment verification failed');
              }

              toast.success('Payment successful!');
              onPurchaseSuccess?.(response.razorpay_payment_id);
              router.push(`/payment/success?payment_id=${response.razorpay_payment_id}`);
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
            const { hasPurchased } = await response.json();
            isPurchased = hasPurchased;
          }
        } catch (error) {
          console.error('Error checking purchase status:', error);
        }
      }
    }

    checkPurchaseStatus();
  }, [status, session, product.id, product.isFree]);

  const showBuyButton = !product.isFree && !isPurchased && selectedPlanId;
  const isFreeOrPurchased = product.isFree || isPurchased;

  return (
    <div className="rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow relative">
      <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
        {isPurchased && (
          <div className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
            <CheckCircle className="w-3 h-3 mr-1" />
            Purchased
          </div>
        )}
        {!isPurchased && product.isFree && (
          <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            Free
          </div>
        )}
        {(isPurchased || product.isFree) && (
          <div className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            Available
          </div>
        )}
      </div>
      
      <div className="aspect-[16/9] bg-muted relative overflow-hidden">
        <ProductThumbnail 
          thumbnail={product.thumbnail}
          title={product.title}
          type={product.type}
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
          <Link
            href={`/products/${product.id}${!isFreeOrPurchased && hasPricingPlans && selectedPlanId ? `?planId=${selectedPlanId}` : ''}`}
            className="flex-1 text-center rounded-md px-3 py-2 text-sm font-medium border border-primary text-primary hover:bg-primary/10 transition-colors"
          >
            {isFreeOrPurchased ? 'View' : 'Details'}
          </Link>
          {!isFreeOrPurchased && (
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
          )}
        </div>
      </div>
    </div>
  );
}


