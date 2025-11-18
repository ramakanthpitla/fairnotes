import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

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
        include: {
          pricing: {
            where: { isActive: true },
            orderBy: { duration: 'asc' },
          },
        },
      });

      return NextResponse.json(products);
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
      include: {
        pricing: {
          where: { isActive: true },
          orderBy: { duration: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
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
