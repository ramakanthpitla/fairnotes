import { NextResponse } from 'next/server';
import { createPaymentIntent } from '@/lib/stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
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
