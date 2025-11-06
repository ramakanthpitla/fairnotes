import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

// Disable body parsing since we need the raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(readable: any) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: Request) {
  try {
    // Get the raw body
    const rawBody = await getRawBody(req.body);
    const body = JSON.parse(rawBody.toString());
    
    // Get the signature from headers
    const headersList = headers();
    const signature = headersList.get('x-razorpay-signature');
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 400 }
      );
    }

    // Verify the webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const { event, payload } = body;
    console.log(`Received webhook event: ${event}`, payload);

    // Handle different event types
    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(payload.payment.entity);
        break;
      case 'payment.failed':
        await handlePaymentFailed(payload.payment.entity);
        break;
      case 'order.paid':
        await handleOrderPaid(payload.order.entity);
        break;
      default:
        console.log(`Unhandled event type: ${event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentCaptured(payment: any) {
  const { id: paymentId, order_id: orderId } = payment;
  
  await prisma.payment.updateMany({
    where: { razorpayOrderId: orderId },
    data: {
      status: 'CAPTURED',
      razorpayPaymentId: paymentId,
      capturedAt: new Date(),
    },
  });

  // Update the purchase status
  await prisma.purchase.updateMany({
    where: {
      payment: {
        razorpayOrderId: orderId,
      },
    },
    data: {
      status: 'COMPLETED',
    },
  });
}

async function handlePaymentFailed(payment: any) {
  const { id: paymentId, order_id: orderId, error } = payment;
  
  await prisma.payment.updateMany({
    where: { razorpayOrderId: orderId },
    data: {
      status: 'FAILED',
      error: error?.description || 'Payment failed',
      failedAt: new Date(),
    },
  });

  // Update the purchase status
  await prisma.purchase.updateMany({
    where: {
      payment: {
        razorpayOrderId: orderId,
      },
    },
    data: {
      status: 'FAILED',
    },
  });
}

async function handleOrderPaid(order: any) {
  // This is a fallback in case payment.captured webhook is missed
  if (order.status === 'paid') {
    await prisma.payment.updateMany({
      where: { razorpayOrderId: order.id },
      data: {
        status: 'CAPTURED',
        capturedAt: new Date(),
      },
    });

    // Update the purchase status
    await prisma.purchase.updateMany({
      where: {
        payment: {
          razorpayOrderId: order.id,
        },
      },
      data: {
        status: 'COMPLETED',
      },
    });
  }
}
