import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        title: true,
        isActive: true,
        type: true,
        isFree: true,
        pageCount: true,
        createdAt: true,
        pricing: {
          where: { isActive: true },
          orderBy: { duration: 'asc' },
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
          },
        },
      },
      take: 10
    });
    
    return NextResponse.json({ 
      status: 'success',
      count: products.length,
      products,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Failed to fetch products',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
