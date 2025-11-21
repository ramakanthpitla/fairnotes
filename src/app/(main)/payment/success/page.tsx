'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, FileDown, Eye, ArrowLeft, ShoppingBag, Download } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

interface Product {
  id: string;
  title: string;
  fileUrl: string;
  type: string;
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentId = searchParams.get('payment_id');
  const { data: session } = useSession();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!paymentId) {
        setStatus('error');
        setMessage('No payment ID provided');
        return;
      }

      // For test payments, we'll simulate a successful verification
      if (paymentId.startsWith('pay_')) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Try to get product details from local storage
        const lastProduct = JSON.parse(localStorage.getItem('lastViewedProduct') || 'null');

        if (lastProduct) {
          setStatus('success');
          setMessage('Test payment successful! This was a test transaction.');
          setProduct({
            id: lastProduct.id,
            title: lastProduct.title,
            fileUrl: lastProduct.fileUrl || `/api/products/${lastProduct.id}/view`,
            type: lastProduct.type || 'PDF'
          });

          // Add to user's library in local storage for demo purposes
          if (session?.user?.email) {
            const userLibrary = JSON.parse(localStorage.getItem(`user_${session.user.email}_library`) || '[]');
            if (!userLibrary.some((p: any) => p.id === lastProduct.id)) {
              userLibrary.push({
                id: lastProduct.id,
                title: lastProduct.title,
                fileUrl: lastProduct.fileUrl || `/api/products/${lastProduct.id}/view`,
                type: lastProduct.type || 'PDF',
                purchasedAt: new Date().toISOString()
              });
              localStorage.setItem(`user_${session.user.email}_library`, JSON.stringify(userLibrary));
            }
          }
        } else {
          setStatus('success');
          setMessage('Test payment successful! Redirecting to browse...');
          setTimeout(() => router.push('/browse'), 2000);
        }
        return;
      }

      // For real payments, verify with the server
      try {
        const response = await fetch(`/api/payments/${paymentId}/verify`);
        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage('Payment verified successfully!');

          if (data.purchase?.product) {
            setProduct({
              id: data.purchase.product.id,
              title: data.purchase.product.title,
              fileUrl: data.purchase.product.fileUrl || `/api/products/${data.purchase.product.id}/view`,
              type: data.purchase.product.type
            });
          }
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to verify payment');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('error');
        setMessage(
          error instanceof Error
            ? error.message
            : 'An error occurred while verifying your payment. Please check your purchases.'
        );
      }
    };

    verifyPayment();
  }, [paymentId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
              <h2 className="mt-6 text-2xl font-bold text-gray-900">Processing Your Payment</h2>
              <p className="mt-2 text-gray-600">Please wait while we verify your payment...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="mt-3 text-2xl font-bold text-gray-900">Payment Successful!</h2>
              <p className="mt-2 text-green-600">Thank you for your purchase!</p>

              {product && (
                <div className="mt-6 p-6 bg-gray-50 rounded-lg text-left">
                  <h3 className="text-lg font-medium text-gray-900">{product.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Your {product.type.toLowerCase()} is ready to download
                  </p>

                  <div className="mt-6">
                    <a
                      href={product.fileUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Download className="-ml-1 mr-2 h-5 w-5" />
                      Download {product.type}
                    </a>

                    <div className="mt-4 text-center">
                      <p className="text-xs text-gray-500">
                        Having trouble?{' '}
                        <a href="/contact" className="font-medium text-indigo-600 hover:text-indigo-500">
                          Contact support
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
                <Link href="/browse">
                  <Button variant="outline" className="w-full sm:w-auto">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Continue Browsing
                  </Button>
                </Link>
                <Link href="/account/library">
                  <Button className="w-full sm:w-auto">
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    View My Library
                  </Button>
                </Link>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="mt-3 text-2xl font-bold text-gray-900">Payment Verification Failed</h2>
              <p className="mt-2 text-red-600">{message}</p>

              <div className="mt-8">
                <Link href="/account/purchases">
                  <Button variant="outline">
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    View My Purchases
                  </Button>
                </Link>
              </div>
            </>
          )}

          {status !== 'success' && status !== 'error' && (
            <p className="mt-4 text-sm text-gray-600">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
              <h2 className="mt-6 text-2xl font-bold text-gray-900">Loading...</h2>
              <p className="mt-2 text-gray-600">Please wait...</p>
            </div>
          </div>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
