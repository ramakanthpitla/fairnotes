import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('[API] Fetching featured products...');
    
    // Get 6 random active products with their pricing
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      include: {
        pricing: {
          where: { isActive: true },
          orderBy: { duration: 'asc' },
          take: 1
        }
      },
      take: 6,
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`[API] Found ${products.length} featured products`);
    
    // Return simplified format
    const formatted = products.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      type: p.type,
      thumbnail: p.thumbnail,
      isFree: p.isFree,
      price: p.pricing?.[0]?.price || null,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('[API] Error fetching featured products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured products', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
