import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query || query.trim().length === 0) {
      return NextResponse.json([]);
    }

    // Case-insensitive search across title, SKU, and description
    const searchQuery = query.trim();
    
    const products = await prisma.product.findMany({
      where: {
        AND: [
          { isActive: true }, // Only show active products to users
          {
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
        ],
      },
      include: {
        pricing: {
          where: { isActive: true },
          orderBy: { duration: 'asc' },
          take: 1, // Get cheapest option
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit results
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error searching products:', error);
    return NextResponse.json(
      { error: 'Failed to search products' },
      { status: 500 }
    );
  }
}
