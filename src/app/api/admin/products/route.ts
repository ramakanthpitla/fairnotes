import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession, requireAdmin } from '@/lib/auth-utils';
import { Product, ProductType, Prisma } from '@prisma/client';

// Extend the Prisma client to include the productPricing model
type ProductWithPricing = Prisma.ProductGetPayload<{
  include: { pricing: true };
}>;

interface CreateProductData {
  title: string;
  description: string;
  type: ProductType;
  fileUrl: string;
  thumbnail?: string | null;
  isActive?: boolean;
  pricing?: Array<{
    name: string;
    duration: number;
    price: number;
    isActive?: boolean;
  }>;
}

function unauthorized() {
  return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
}

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return unauthorized();
    }

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
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return unauthorized();
    }

    const body: CreateProductData = await request.json();
    const { 
      title, 
      description, 
      type, 
      fileUrl, 
      thumbnail = null, 
      isActive = true,
      pricing = []
    } = body;

    // Validate required fields
    if (!title || !description || !type || !fileUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, type, and fileUrl are required' },
        { status: 400 }
      );
    }

    // Validate pricing options if provided
    if (pricing && !Array.isArray(pricing)) {
      return NextResponse.json(
        { error: 'Pricing must be an array' },
        { status: 400 }
      );
    }

    // Create the product with its pricing options in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the product
      const product = await tx.product.create({
        data: {
          title,
          description,
          type,
          fileUrl,
          thumbnail,
          isActive,
          // Add required fields with default values
          sku: `SKU-${Date.now()}`,
          isFree: false,
        },
      });

      // If pricing options were provided, create them
      if (pricing && pricing.length > 0) {
        await tx.productPricing.createMany({
          data: pricing.map(p => ({
            productId: product.id,
            name: p.name,
            duration: p.duration,
            price: p.price,
            isActive: p.isActive !== false, // Default to true if not specified
          })),
        });
      }

      // Return the product with its pricing
      return tx.product.findUnique({
        where: { id: product.id },
        include: {
          pricing: {
            where: { isActive: true },
            orderBy: { duration: 'asc' },
          },
        },
      });
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
