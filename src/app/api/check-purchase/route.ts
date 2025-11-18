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

    const now = new Date();

    // Get the most recent completed purchase for this product
    const purchase = await prisma.purchase.findFirst({
      where: {
        userId,
        productId,
        status: 'COMPLETED',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const hasValidPurchase = purchase ? new Date(purchase.expiresAt) > now : false;

    // Check active credit-based access
    const creditAccess = await prisma.creditUsage.findFirst({
      where: {
        userId,
        productId,
        isActive: true,
        expiresAt: { gt: now },
      },
      orderBy: {
        expiresAt: 'desc',
      },
    });

    if (!hasValidPurchase && !creditAccess) {
      return NextResponse.json({
        hasPurchased: false,
        expiresAt: null,
        isValid: false,
      });
    }

    const effectiveExpiry = hasValidPurchase
      ? purchase!.expiresAt
      : creditAccess!.expiresAt;

    return NextResponse.json({
      hasPurchased: true,
      expiresAt: effectiveExpiry.toISOString(),
      isValid: effectiveExpiry > now,
    });
  } catch (error) {
    console.error('Error checking purchase status:', error);
    return NextResponse.json(
      { error: 'Failed to check purchase status' },
      { status: 500 }
    );
  }
}
