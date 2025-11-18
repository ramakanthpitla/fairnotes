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

// Initialize Razorpay with proper type checking
const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function POST(request: Request) {
  console.log('Received request to create order');
  
  try {
    // Verify session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.error('No valid session found');
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Parse request body with validation
    let requestBody;
    try {
      requestBody = await request.json();
      console.log('Request body received:', {
        ...requestBody,
        amount: requestBody.amount ? '***' : 'missing',
        hasPlanId: !!requestBody.planId
      });

      // Validate required fields
      if (!requestBody.productId) {
        throw new Error('Product ID is required');
      }
      
      if (typeof requestBody.amount !== 'number' || requestBody.amount <= 0) {
        throw new Error('Valid amount is required');
      }
    } catch (error) {
      console.error('Error processing request:', error);
      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'Invalid request',
          code: 'INVALID_REQUEST',
          details: error instanceof Error ? error.stack : undefined
        },
        { status: 400 }
      );
    }
    
    const { productId, amount, planId } = requestBody;
    
    // Validate required fields
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required', code: 'MISSING_PRODUCT_ID' },
        { status: 400 }
      );
    }
    
    // Convert amount to number and validate
    const amountNumber = Number(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      console.error('Invalid amount:', { amount, amountNumber });
      return NextResponse.json(
        { error: 'Invalid amount', code: 'INVALID_AMOUNT' },
        { status: 400 }
      );
    }
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

    // Get product details first
    console.log(`Fetching product with ID: ${productId}`);
    
    const product = await prisma.product.findUnique({
      where: { id: productId }
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
    
    // If planId was provided, verify it exists and get its details
    let selectedPlan = null;
    if (planId) {
      try {
        selectedPlan = await prisma.productPricing.findFirst({
          where: { 
            id: planId,
            productId: productId,
            isActive: true
          }
        });

        if (!selectedPlan) {
          console.error(`Plan not found or inactive: ${planId}`);
          return NextResponse.json(
            { error: 'Selected plan not found or inactive', code: 'PLAN_NOT_FOUND' },
            { status: 404 }
          );
        }

        // Verify the amount matches the plan price (converted to paise)
        const expectedAmount = Math.round(selectedPlan.price * 100);
        if (amountNumber !== expectedAmount) {
          console.error('Amount mismatch:', { 
            expected: expectedAmount, 
            received: amountNumber,
            planPrice: selectedPlan.price
          });
          return NextResponse.json(
            { 
              error: 'Amount does not match the selected plan price', 
              code: 'AMOUNT_MISMATCH',
              expectedAmount: expectedAmount,
              receivedAmount: amountNumber
            },
            { status: 400 }
          );
        }
      } catch (error) {
        console.error('Error fetching plan details:', error);
        return NextResponse.json(
          { 
            error: 'Error validating plan details', 
            code: 'PLAN_VALIDATION_ERROR',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        );
      }
      
      if (!selectedPlan) {
        return NextResponse.json(
          { 
            error: 'Pricing plan not found or is not active',
            code: 'PLAN_NOT_FOUND',
            planId
          },
          { status: 404 }
        );
      }
      
      // Verify the provided amount matches the plan price
      const planAmount = Math.round(selectedPlan.price * 100);
      if (planAmount !== amountNumber) {
        console.error('Amount mismatch:', { planAmount, amountNumber });
        return NextResponse.json(
          { 
            error: 'Amount does not match the selected plan',
            code: 'AMOUNT_MISMATCH',
            expectedAmount: planAmount,
            providedAmount: amountNumber
          },
          { status: 400 }
        );
      }
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

    // For paid products, a pricing plan must be selected
    if (amountNumber > 0 && !selectedPlan) {
      console.error('No pricing plan selected for paid product');
      return NextResponse.json(
        { 
          error: 'A pricing plan must be selected for this product',
          code: 'PLAN_REQUIRED'
        },
        { status: 400 }
      );
    }

    // Calculate duration - use plan duration if available, otherwise default to 30 days
    const defaultDurationDays = 30;
    let durationInDays = selectedPlan?.duration || defaultDurationDays;
    
    // Ensure duration is a valid number
    durationInDays = Math.max(1, Math.floor(Number(durationInDays)) || defaultDurationDays);
    
    // Ensure duration is valid
    if (isNaN(durationInDays) || durationInDays <= 0) {
      console.error('Invalid duration:', durationInDays);
      durationInDays = defaultDurationDays; // Fallback to default
    }

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationInDays);

    console.log('Creating purchase with:', {
      userId: session.user.id,
      productId: product.id,
      planId,
      amount: amountNumber,
      durationInDays,
      expiresAt: expiresAt.toISOString()
    });

    // For free products, get or create a default pricing plan
    let pricingPlanId = selectedPlan?.id;
    if (!pricingPlanId) {
      // Get the first available pricing plan for the product
      const defaultPlan = await prisma.productPricing.findFirst({
        where: {
          productId: product.id,
          isActive: true
        },
        orderBy: {
          price: 'asc' // Get the cheapest plan
        }
      });
      
      if (!defaultPlan) {
        console.error('No pricing plan found for product:', product.id);
        return NextResponse.json(
          { 
            error: 'No pricing plan available for this product',
            code: 'NO_PRICING_PLAN'
          },
          { status: 400 }
        );
      }
      
      pricingPlanId = defaultPlan.id;
      durationInDays = defaultPlan.duration;
    }
    
    // Create purchase record
    const purchase = await prisma.purchase.create({
      data: {
        userId: session.user.id,
        productId: product.id,
        productPricingId: pricingPlanId,
        amount: amountNumber / 100, // Store in base currency (e.g., INR)
        status: 'PENDING',
        expiresAt: expiresAt,
      },
    });

    // For free products, return success immediately
    if (amountNumber === 0) {
      // Update purchase status to COMPLETED for free products
      await prisma.purchase.update({
        where: { id: purchase.id },
        data: { status: 'COMPLETED' }
      });
      
      return NextResponse.json({
        id: 'free-purchase',
        amount: 0,
        currency: 'INR',
        status: 'created',
        purchaseId: purchase.id
      });
    }

    // Create Razorpay order for paid products
    console.log('Creating Razorpay order...');
    
    const orderOptions = {
      amount: amountNumber, // Already in paise from the client
      currency: 'INR' as const,
      receipt: `order_${purchase.id}`,
      payment_capture: 1 as const,
      notes: {
        purchaseId: purchase.id,
        productId: product.id,
        planId: planId || '',
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
