import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { paymentId: string } }
) {
  // Ensure params is properly awaited
  const { paymentId } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // paymentId is already extracted from params above
    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    // Find the payment and include the related product and purchase
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        purchase: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Verify the payment belongs to the current user
    if (payment.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // If payment is already captured, return the product details
    if (payment.status === 'CAPTURED') {
      return NextResponse.json({
        success: true,
        payment: {
          id: payment.id,
          status: payment.status,
          amount: payment.amount,
          createdAt: payment.createdAt,
        },
        product: payment.purchase?.product,
        productId: payment.purchase?.productId,
      });
    }

    // If payment is not captured but exists, verify with Razorpay
    const paymentWithRazorpayId = payment as any & { razorpayPaymentId?: string };
    if (paymentWithRazorpayId.razorpayPaymentId) {
      // In a real app, you would verify with Razorpay's API here
      // For now, we'll just mark it as captured if it exists
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'CAPTURED' },
      });

      // Also update the purchase status
      if (payment.purchaseId) {
        await prisma.purchase.update({
          where: { id: payment.purchaseId },
          data: { status: 'COMPLETED' },
        });
      }

      return NextResponse.json({
        success: true,
        payment: {
          id: payment.id,
          status: 'CAPTURED',
          amount: payment.amount,
          createdAt: payment.createdAt,
        },
        product: payment.purchase?.product,
        productId: payment.purchase?.productId,
      });
    }

    // If we get here, the payment exists but couldn't be verified
    return NextResponse.json(
      { error: 'Payment verification failed' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to verify payment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
