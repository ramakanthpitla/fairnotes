import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

function unauthorized() {
  return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
}

type PricingData = {
  name: string;
  duration: number;
  price: number;
  isActive?: boolean;
};

// Get all pricing options for a product
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ADMIN') return unauthorized();

  try {
    const pricing = await prisma.productPricing.findMany({
      where: { productId: params.id },
      orderBy: { duration: 'asc' },
    });
    
    return NextResponse.json({ pricing });
  } catch (error) {
    console.error('Error fetching pricing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing options' },
      { status: 500 }
    );
  }
}

// Create a new pricing option for a product
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ADMIN') return unauthorized();

  try {
    const body = await request.json();
    const { name, duration, price, isActive = true } = body as PricingData;

    if (!name || !duration || price === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, duration, and price are required' },
        { status: 400 }
      );
    }

    // Verify the product exists
    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const pricing = await prisma.productPricing.create({
      data: {
        productId: params.id,
        name,
        duration: Number(duration),
        price: Number(price),
        isActive: Boolean(isActive),
      },
    });

    return NextResponse.json({ pricing }, { status: 201 });
  } catch (error) {
    console.error('Error creating pricing option:', error);
    return NextResponse.json(
      { error: 'Failed to create pricing option' },
      { status: 500 }
    );
  }
}
