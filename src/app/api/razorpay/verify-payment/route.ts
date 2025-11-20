import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
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
    const purchase = payment.purchaseId
      ? await prisma.purchase.findUnique({
          where: { id: payment.purchaseId }
        })
      : null;

    if (!purchase) {
      throw new Error('Purchase not found');
    }

    // Get the pricing plan to determine duration
    const pricingPlan = purchase.productPricingId
      ? await prisma.productPricing.findUnique({
          where: { id: purchase.productPricingId }
        })
      : null;

    // Calculate expiry date based on plan duration or default to 30 days
    const durationInDays = pricingPlan?.duration || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationInDays);

    const updatePromises: Prisma.PrismaPromise<unknown>[] = [
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
    ];

    if (purchase.productId) {
      updatePromises.push(
        prisma.product.update({
          where: { id: purchase.productId },
          data: {
            // Prisma types may lag immediately after schema changes, so cast
            purchaseCount: {
              increment: 1
            }
          } as unknown as Prisma.ProductUncheckedUpdateInput
        })
      );
    }

    await Promise.all(updatePromises);

    // Get product details for response
    const product = purchase.productId
      ? await prisma.product.findUnique({
          where: { id: purchase.productId }
        })
      : null;

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
