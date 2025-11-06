import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Define the shape of our pricing plan
type PricingPlan = {
  id: string;
  name: string;
  price: number;
  duration: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Define the shape of our product response
type ProductResponse = {
  id: string;
  sku: string;
  title: string;
  description: string | null;
  type: string;
  thumbnail: string | null;
  fileUrl: string;
  pageCount: number | null;
  isFree: boolean;
  isActive: boolean;
  pricing: Array<{
    id: string;
    name: string;
    price: number;
    duration: number;
    isActive: boolean;
  }>;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // First get the product with its pricing
    const product = await prisma.product.findUnique({
      where: { 
        id,
        isActive: true
      },
      include: {
        pricing: {
          where: { isActive: true },
          orderBy: { duration: 'asc' },
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
            isActive: true
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Extract pricing plans from the product
    const pricingPlans = product.pricing || [];

    // Prepare the response data
    const responseData: ProductResponse = {
      id: product.id,
      sku: product.sku,
      title: product.title,
      description: product.description,
      type: product.type,
      thumbnail: product.thumbnail,
      fileUrl: product.fileUrl,
      pageCount: product.pageCount,
      isFree: product.isFree,
      isActive: product.isActive,
      pricing: pricingPlans.map((plan: any) => ({
        ...plan,
        price: Number(plan.price),
        duration: Number(plan.duration)
      }))
    };
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
