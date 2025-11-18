import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { deleteFileFromS3 } from '@/lib/s3';
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
  { params }: { params: Promise<{ id: string }> }
) {
  const session = (await getServerSession(authOptions)) as UserSession | null;
  if (!session?.user || session.user.role !== 'ADMIN') return unauthorized();

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  const session = (await getServerSession(authOptions)) as UserSession | null;
  if (!session?.user || session.user.role !== 'ADMIN') return unauthorized();

  const { id } = await params;
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
        where: { id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  const session = (await getServerSession(authOptions)) as UserSession | null;
  if (!session?.user || session.user.role !== 'ADMIN') return unauthorized();

  try {
    const { id } = await params;
    
    // Get product details before deletion to access file URLs
    const product = await prisma.product.findUnique({
      where: { id },
      select: { fileUrl: true, thumbnail: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // Force delete the product even with purchases
    // Purchase records will remain but productId will be set to null
    await prisma.$transaction([
      // First, update all purchases to set productId to null
      prisma.purchase.updateMany({
        where: { productId: id },
        data: { productId: null as any },
      }),
      // Then, delete all pricing plans
      prisma.productPricing.deleteMany({
        where: { productId: id },
      }),
      // Finally, delete the product
      prisma.product.delete({
        where: { id: id },
      }),
    ]);

    // Delete files from S3 after successful database deletion
    const filesToDelete = [product.fileUrl, product.thumbnail].filter(Boolean) as string[];
    if (filesToDelete.length > 0) {
      try {
        await Promise.all(filesToDelete.map(url => deleteFileFromS3(url)));
        console.log('Successfully deleted files from S3:', filesToDelete);
      } catch (s3Error) {
        // Log but don't fail the request - database deletion was successful
        console.error('Error deleting files from S3:', s3Error);
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Product and associated files deleted successfully. Customer purchase records have been preserved.'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product. Please try again.' },
      { status: 500 }
    );
  }
}
