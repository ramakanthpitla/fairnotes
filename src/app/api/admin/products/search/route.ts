import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { enrichProductsWithMetrics } from '@/lib/admin/product-metrics';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query || query.trim().length === 0) {
      // Return all products if no query
      const products = await prisma.product.findMany({
        orderBy: { createdAt: 'desc' },
      });

      const enriched = await enrichProductsWithMetrics(products);

      return NextResponse.json(enriched);
    }

    // Case-insensitive search across title, SKU, and description
    const searchQuery = query.trim();
    
    const products = await prisma.product.findMany({
      where: {
        OR: [
          {
            title: {
              contains: searchQuery,
              mode: 'insensitive',
            },
          },
          {
            sku: {
              contains: searchQuery,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: searchQuery,
              mode: 'insensitive',
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = await enrichProductsWithMetrics(products);

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error searching products:', error);
    return NextResponse.json(
      { error: 'Failed to search products' },
      { status: 500 }
    );
  }
}
