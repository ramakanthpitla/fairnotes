import { NextResponse } from 'next/server';
import { verifyPayment, getPayment } from '@/lib/razorpay';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions as any) as { user?: { id: string; email: string } };
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { orderId, paymentId, signature } = await req.json();
    
    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Verify the payment signature
    const isValid = await verifyPayment(orderId, paymentId, signature);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Verify the payment with Razorpay
    const razorpayPayment = await getPayment(paymentId);
    if (!razorpayPayment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Find the payment in our database
    const dbPayment = await prisma.payment.findFirst({
      where: {
        orderId: orderId,
      },
      include: {
        purchase: {
          include: {
            product: true,
            user: true,
          },
        },
      },
    });

    if (!dbPayment?.purchase) {
      return NextResponse.json(
        { error: 'Purchase record not found' },
        { status: 404 }
      );
    }

    const purchase = dbPayment.purchase;

    // Update the purchase and payment status in a transaction
    await prisma.$transaction([
      // Update purchase status
      prisma.purchase.update({
        where: { id: purchase.id },
        data: {
          status: 'COMPLETED',
          expiresAt: new Date(Date.now() + purchase.product.duration * 24 * 60 * 60 * 1000),
        },
        include: {
          product: true,
          user: true,
        },
      }),
      // Update payment status
      prisma.payment.update({
        where: { id: dbPayment.id },
        data: {
          status: 'COMPLETED',
          paymentId: paymentId,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      payment: {
        id: razorpayPayment.id,
        amount: razorpayPayment.amount / 100, // Convert to rupees
        status: razorpayPayment.status,
        method: razorpayPayment.method,
      },
      purchase: {
        id: purchase.id,
        productId: purchase.productId,
        status: 'COMPLETED',
        product: {
          id: purchase.product.id,
          title: purchase.product.title,
          fileUrl: purchase.product.fileUrl,
          type: purchase.product.type,
        }
      },
    });
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
