import Razorpay from 'razorpay';

if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
  throw new Error('NEXT_PUBLIC_RAZORPAY_KEY_ID is not set in environment variables');
}

if (!process.env.RAZORPAY_KEY_SECRET) {
  throw new Error('RAZORPAY_KEY_SECRET is not set in environment variables');
}

export const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
  entity: string;
  amount_paid: number;
  amount_due: number;
  attempts: number;
  notes: Record<string, any>;
  offer_id: string | null;
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  method: string;
  created_at: number;
}

export const createOrder = async (amount: number, currency: string = 'INR', receipt?: string): Promise<RazorpayOrder> => {
  const options = {
    amount: Math.round(amount * 100), // Convert to paise and round to nearest integer
    currency,
    receipt: receipt || `order_${Date.now()}`,
    payment_capture: 1, // Auto capture payment
    notes: {
      source: 'study-mart-web',
    },
  };
  const order = await razorpay.orders.create(options);
  // Ensure all required fields are present and have the correct types
  return {
    ...order,
    id: order.id,
    amount: Number(order.amount),
    currency: order.currency || 'INR',
    receipt: order.receipt || `order_${Date.now()}`,
    status: order.status || 'created',
    created_at: order.created_at ? Number(order.created_at) : Math.floor(Date.now() / 1000),
    entity: order.entity || 'order',
    amount_paid: order.amount_paid ? Number(order.amount_paid) : 0,
    amount_due: order.amount_due ? Number(order.amount_due) : 0,
    attempts: order.attempts || 0,
    notes: order.notes || { source: 'study-mart-web' },
    offer_id: order.offer_id || null,
  };
};

export const verifyPayment = async (orderId: string, paymentId: string, signature: string): Promise<boolean> => {
  const crypto = require('crypto');
  const text = orderId + '|' + paymentId;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(text)
    .digest('hex');
  
  return expectedSignature === signature;
};

export const getPayment = async (paymentId: string): Promise<RazorpayPayment | null> => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return {
      ...payment,
      amount: Number(payment.amount),
      created_at: payment.created_at ? Number(payment.created_at) : Date.now(),
    };
  } catch (error) {
    console.error('Error fetching payment:', error);
    return null;
  }
};
