import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { userId, productId } = await request.json();

    if (!userId || !productId) {
      return NextResponse.json(
        { error: 'User ID and Product ID are required' },
        { status: 400 }
      );
    }

    const purchase = await prisma.purchase.findFirst({
      where: {
        userId,
        productId,
        status: 'COMPLETED',
        expiresAt: {
          gte: new Date()
        }
      }
    });

    return NextResponse.json({
      hasPurchased: !!purchase
    });
  } catch (error) {
    console.error('Error checking purchase status:', error);
    return NextResponse.json(
      { error: 'Failed to check purchase status' },
      { status: 500 }
    );
  }
}
