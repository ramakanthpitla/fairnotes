import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

// Types for the API response
type PurchaseResponse = {
  id: string;
  status: string;
  expiresAt: string;
  amount: number;
  product: {
    id: string;
    title: string;
    description: string;
    fileUrl: string;
    type: string;
    thumbnail: string | null;
    isFree: boolean;
  };
  productPricing: {
    id: string;
    name: string;
    price: number;
    duration: number;
  } | null;
  purchaseId: string;
};

export async function GET() {
  try {
    const session = await getAuthSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the user's purchases with product information
    const userWithPurchases = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        purchases: {
          where: { status: 'COMPLETED' },
          include: {
            product: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!userWithPurchases) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Transform the data to match the expected format
    const formattedPurchases: PurchaseResponse[] = [];

    for (const purchase of userWithPurchases.purchases) {
      if (!purchase.product) continue;
      
      // Get active pricing for the product
      const activePricing = await prisma.productPricing.findFirst({
        where: {
          productId: purchase.productId,
          isActive: true,
        },
        orderBy: {
          duration: 'asc', // Get the shortest duration first
        },
      });

      formattedPurchases.push({
        id: purchase.id,
        status: purchase.status,
        expiresAt: purchase.expiresAt.toISOString(),
        amount: purchase.amount,
        product: {
          id: purchase.product.id,
          title: purchase.product.title,
          description: purchase.product.description || '',
          fileUrl: purchase.product.fileUrl || '',
          type: purchase.product.type,
          thumbnail: purchase.product.thumbnail,
          isFree: purchase.product.isFree,
        },
        productPricing: activePricing ? {
          id: activePricing.id,
          name: activePricing.name,
          price: activePricing.price,
          duration: activePricing.duration,
        } : null,
        purchaseId: purchase.id,
      });
    }

    return NextResponse.json(formattedPurchases);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchases' },
      { status: 500 }
    );
  }
}
