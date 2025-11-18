import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

// Types for the API response
type PurchaseResponse = {
  id: string;
  status: string;
  expiresAt: string;
  amount: number;
  accessType: 'PURCHASE' | 'CREDIT';
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

    const [rawPurchases, creditUsages] = await Promise.all([
      prisma.purchase.findMany({
        where: {
          userId: session.user.id,
          status: 'COMPLETED',
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.creditUsage.findMany({
        where: {
          userId: session.user.id,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const productIdSet = new Set<string>();

    for (const purchase of rawPurchases) {
      if (purchase.productId) {
        productIdSet.add(purchase.productId);
      }
    }

    for (const usage of creditUsages) {
      if (usage.productId) {
        productIdSet.add(usage.productId);
      }
    }

    const productIds = Array.from(productIdSet);

    // Fetch all products in one query (only if we have valid product IDs)
    const products = productIds.length > 0 ? await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true
      }
    }) : [];

    // Create a map for quick lookup
    const productMap = new Map(products.map(p => [p.id, p]));

    // Transform the data to match the expected format
    const formattedPurchases: PurchaseResponse[] = [];
    const now = new Date();

    for (const purchase of rawPurchases) {
      // Skip if product was deleted (productId is null)
      if (!purchase.productId) {
        console.log('Skipping purchase with deleted product:', purchase.id);
        continue;
      }
      
      const product = productMap.get(purchase.productId);
      
      // Skip if product is deleted, missing, or inactive
      if (!product) {
        console.log('Skipping purchase with deleted/inactive product:', purchase.id);
        continue;
      }
      
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
        accessType: 'PURCHASE',
        product: {
          id: product.id,
          title: product.title,
          description: product.description || '',
          fileUrl: product.fileUrl || '',
          type: product.type,
          thumbnail: product.thumbnail,
          isFree: product.isFree,
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

    for (const usage of creditUsages) {
      const product = productMap.get(usage.productId);

      if (!product) {
        console.log('Skipping credit access with deleted/inactive product:', usage.id);
        continue;
      }

      const status = usage.expiresAt < now ? 'CREDIT_EXPIRED' : 'CREDIT_ACTIVE';

      formattedPurchases.push({
        id: usage.id,
        status,
        expiresAt: usage.expiresAt.toISOString(),
        amount: 0,
        accessType: 'CREDIT',
        product: {
          id: product.id,
          title: product.title,
          description: product.description || '',
          fileUrl: product.fileUrl || '',
          type: product.type,
          thumbnail: product.thumbnail,
          isFree: product.isFree,
        },
        productPricing: null,
        purchaseId: usage.id,
      });
    }

    formattedPurchases.sort((a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime());

    return NextResponse.json(formattedPurchases);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchases' },
      { status: 500 }
    );
  }
}
