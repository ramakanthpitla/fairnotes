import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get 6 random active products with their pricing
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        pricing: {
          some: { isActive: true }
        }
      },
      include: {
        pricing: {
          where: { isActive: true },
          orderBy: { duration: 'asc' },
          take: 1 // Get the first pricing option (e.g., shortest duration)
        }
      },
      take: 6,
      orderBy: {
        createdAt: 'desc' // You might want to implement a better way to get featured products
      }
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching featured products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured products' },
      { status: 500 }
    );
  }
}
