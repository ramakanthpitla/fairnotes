import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { orderId, paymentId, signature, amount, productId } = await request.json();

    // Verify the payment signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isSignatureValid = generatedSignature === signature;

    if (!isSignatureValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Get user ID from session
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // First, find the pending payment
    const payment = await prisma.payment.findFirst({
      where: {
        orderId: orderId,
        status: 'CREATED',
        purchase: {
          userId: user.id,
          productId: productId,
          status: 'PENDING'
        }
      },
      include: {
        purchase: true
      }
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'No matching pending payment found' },
        { status: 404 }
      );
    }

    // Get the purchase and pricing plan to calculate expiry
    const purchase = await prisma.purchase.findUnique({
      where: { id: payment.purchaseId || undefined }
    });

    if (!purchase) {
      throw new Error('Purchase not found');
    }

    // Get the pricing plan to determine duration
    const pricingPlan = await prisma.productPricing.findUnique({
      where: { id: purchase.productPricingId }
    });

    // Calculate expiry date based on plan duration or default to 30 days
    const durationInDays = pricingPlan?.duration || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationInDays);

    // Update the purchase and payment status to COMPLETED
    await Promise.all([
      prisma.purchase.update({
        where: { id: purchase.id },
        data: {
          status: 'COMPLETED',
          expiresAt: expiresAt
        }
      }),
      
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          paymentId: paymentId,
          updatedAt: new Date()
        }
      })
    ]);

    // Get product details for response
    const product = await prisma.product.findUnique({
      where: { id: purchase.productId }
    });

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      purchase: {
        id: purchase.id,
        productId: purchase.productId,
        productTitle: product?.title || 'Unknown Product',
        expiresAt: expiresAt
      },
      paymentId,
      orderId,
      productId
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
