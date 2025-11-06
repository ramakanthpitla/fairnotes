import { NextResponse } from 'next/server';
import { createPaymentIntent } from '@/lib/stripe';
import { auth } from '@clerk/nextjs';

export async function POST(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { amount, productId } = await request.json();

    if (!amount || !productId) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const paymentIntent = await createPaymentIntent(amount, {
      userId,
      productId,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
