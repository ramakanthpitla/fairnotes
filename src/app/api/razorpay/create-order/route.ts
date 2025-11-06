import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
};

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function POST(request: Request) {
  console.log('Received request to create order');
  
  try {
    // Verify session
    const session = await getServerSession(authOptions);
    console.log('Session:', session ? 'Valid' : 'Invalid');
    
    if (!session?.user?.email) {
      console.error('No valid session found');
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }
    
    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body', code: 'INVALID_BODY' },
        { status: 400 }
      );
    }
    
    const { productId } = requestBody;
    if (!productId) {
      console.error('No productId provided in request');
      return NextResponse.json(
        { 
          error: 'Product ID is required',
          code: 'PRODUCT_ID_REQUIRED',
          receivedData: requestBody 
        },
        { status: 400 }
      );
    }

    // Get product details
    console.log(`Fetching product with ID: ${productId}`);
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      console.error(`Product not found with ID: ${productId}`);
      return NextResponse.json(
        { 
          error: 'Product not found',
          code: 'PRODUCT_NOT_FOUND',
          productId 
        },
        { status: 404 }
      );
    }
    
    console.log('Found product:', JSON.stringify({
      id: product.id,
      title: product.title,
      price: product.price,
      type: product.type
    }, null, 2));

    // Check if user already has access to this product
    console.log('Checking for existing purchases...');
    const existingPurchase = await prisma.purchase.findFirst({
      where: {
        userId: session.user.id,
        productId: product.id,
        status: 'COMPLETED',
        expiresAt: { gte: new Date() }
      },
    });

    if (existingPurchase) {
      console.log('User already has an active purchase for this product');
      return NextResponse.json(
        { 
          error: 'You already have access to this product',
          code: 'ALREADY_PURCHASED',
          purchaseId: existingPurchase.id
        },
        { status: 400 }
      );
    }

    // Validate product price
    const amount = Number(product.price);
    if (isNaN(amount) || amount <= 0) {
      console.error('Invalid product price:', product.price);
      return NextResponse.json(
        { 
          error: 'Invalid product price',
          code: 'INVALID_PRICE',
          price: product.price
        },
        { status: 400 }
      );
    }

    // Validate product duration
    const defaultDurationDays = 30; // Default to 30 days if duration is not provided
    const durationInDays = Number(product.duration) || defaultDurationDays;
    
    if (isNaN(durationInDays) || durationInDays <= 0) {
      console.error('Invalid product duration:', product.duration);
      return NextResponse.json(
        { 
          error: 'Invalid product duration',
          code: 'INVALID_DURATION',
          duration: product.duration
        },
        { status: 400 }
      );
    }

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationInDays);

    console.log('Creating purchase with:', {
      userId: session.user.id,
      productId: product.id,
      amount,
      durationInDays,
      expiresAt
    });

    // Create purchase record
    const purchase = await prisma.purchase.create({
      data: {
        userId: session.user.id,
        productId: product.id,
        amount: amount, // Ensure amount is a valid number
        status: 'PENDING',
        expiresAt: expiresAt,
      },
    });

    // Create Razorpay order
    console.log('Creating Razorpay order...');
    
    // Ensure price is a valid number
    const amountInPaise = Math.round(Number(product.price) * 100);
    if (isNaN(amountInPaise) || amountInPaise <= 0) {
      console.error('Invalid product price:', product.price);
      return NextResponse.json(
        { 
          error: 'Invalid product price',
          code: 'INVALID_PRICE',
          price: product.price
        },
        { status: 400 }
      );
    }
    
    const orderOptions = {
      amount: amountInPaise, // Amount in paise
      currency: 'INR' as const,
      receipt: `order_${purchase.id}`,
      payment_capture: 1 as const,
      notes: {
        purchaseId: purchase.id,
        productId: product.id,
        userId: session.user.id,
      },
    };

    console.log('Sending request to Razorpay with options:', JSON.stringify({
      ...orderOptions,
      key_id: '***' // Don't log the actual key
    }, null, 2));
    
    let order;
    try {
      order = await razorpay.orders.create(orderOptions) as RazorpayOrder;
      console.log('Razorpay order created:', JSON.stringify({
        id: order.id,
        amount: order.amount,
        status: order.status
      }, null, 2));
    } catch (razorpayError) {
      console.error('Razorpay API Error:', razorpayError);
      throw new Error(`Razorpay error: ${razorpayError instanceof Error ? razorpayError.message : 'Unknown error'}`);
    }

    // Create payment record with a default paymentId
    await prisma.payment.create({
      data: {
        paymentId: `pay_${Date.now()}`, // Temporary ID, will be updated after payment
        orderId: order.id,
        amount: order.amount / 100, // Convert back to rupees
        currency: order.currency,
        status: 'CREATED',
        userId: session.user.id,
        purchaseId: purchase.id,
      },
    });

    const responseData = {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      purchaseId: purchase.id,
    };
    
    console.log('Sending success response:', JSON.stringify(responseData, null, 2));
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in create-order endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      { 
        error: 'Failed to create order',
        message: errorMessage,
        code: 'INTERNAL_SERVER_ERROR',
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}
