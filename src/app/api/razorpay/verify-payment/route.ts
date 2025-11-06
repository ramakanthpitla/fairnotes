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

    // Use a transaction to ensure both updates succeed or fail together
    await prisma.$transaction([
      // Update the purchase status to COMPLETED if purchaseId exists
      ...(payment.purchaseId ? [prisma.purchase.update({
        where: { id: payment.purchaseId },
        data: {
          status: 'COMPLETED',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        }
      })] : []),
      
      // Update the payment status
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          paymentId: paymentId,
          updatedAt: new Date(),
          // Ensure purchaseId is set if it wasn't set before
          ...(!payment.purchaseId && {
            purchase: {
              connect: {
                id: (await prisma.purchase.findFirst({
                  where: {
                    userId: user.id,
                    productId: productId,
                    status: 'PENDING'
                  },
                  select: { id: true }
                }))?.id
              }
            }
          })
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
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
