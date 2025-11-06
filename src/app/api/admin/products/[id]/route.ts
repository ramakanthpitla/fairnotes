import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { UserSession } from '@/lib/auth-utils';

function unauthorized() {
  return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
}

interface ProductUpdateData {
  title?: string;
  description?: string;
  type?: string;
  fileUrl?: string;
  thumbnail?: string | null;
  isActive?: boolean;
  pricing?: Array<{
    id?: string;
    name: string;
    duration: number;
    price: number;
    isActive?: boolean;
  }>;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = (await getServerSession(authOptions)) as UserSession | null;
  if (!session?.user || session.user.role !== 'ADMIN') return unauthorized();

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      pricing: {
        where: { isActive: true },
        orderBy: { duration: 'asc' },
      },
    },
  });

  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = (await getServerSession(authOptions)) as UserSession | null;
  if (!session?.user || session.user.role !== 'ADMIN') return unauthorized();

  const body = (await request.json()) as ProductUpdateData;
  const { 
    title, 
    description, 
    type, 
    fileUrl, 
    thumbnail, 
    isActive,
    pricing = []
  } = body;

  try {
    // Start a transaction
    const [updatedProduct] = await prisma.$transaction([
      // Update the product
      prisma.product.update({
        where: { id: params.id },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(type !== undefined && { type }),
          ...(fileUrl !== undefined && { fileUrl }),
          ...(thumbnail !== undefined && { thumbnail }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        },
        include: {
          pricing: {
            where: { isActive: true },
            orderBy: { duration: 'asc' },
          },
        },
      }),
    ]);

    return NextResponse.json({ product: updatedProduct });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = (await getServerSession(authOptions)) as UserSession | null;
  if (!session?.user || session.user.role !== 'ADMIN') return unauthorized();

  try {
    // Check if there are any purchases for this product
    const purchaseCount = await prisma.purchase.count({
      where: { productId: params.id },
    });

    if (purchaseCount > 0) {
      // Instead of deleting, mark as inactive
      const updated = await prisma.product.update({
        where: { id: params.id },
        data: { isActive: false },
      });
      return NextResponse.json({ 
        product: updated,
        message: 'Product has been deactivated instead of deleted due to existing purchases.' 
      });
    }

    // If no purchases, delete the product and its pricing options
    await prisma.$transaction([
      prisma.productPricing.deleteMany({
        where: { productId: params.id },
      }),
      prisma.product.delete({
        where: { id: params.id },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
