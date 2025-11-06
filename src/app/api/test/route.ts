import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const productCount = await prisma.product.count();
    return NextResponse.json({ 
      status: 'success', 
      productCount,
      message: 'API is working correctly',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
