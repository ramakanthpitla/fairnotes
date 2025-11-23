import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { deleteFileFromS3 } from '@/lib/s3';
import { UserSession } from '@/lib/auth-utils';
import { getAuthSession } from '@/lib/auth';

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
  const session = await getAuthSession();
  
  if (!session?.user) {
    console.error('DELETE [id]: No session or user found');
    return NextResponse.json(
      { error: 'Unauthorized - No session' },
      { status: 401 }
    );
  }
  
  if (session.user.role !== 'ADMIN') {
    console.error(`DELETE [id]: User role is '${session.user.role}', not 'ADMIN'`);
    return NextResponse.json(
      { error: 'Unauthorized - Admin access required' },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    console.log(`DELETE [id]: Starting product deletion for ID: ${id}, User: ${session.user.email}`);
    
    // Get product details before deletion to access file URLs
    const product = await prisma.product.findUnique({
      where: { id },
      select: { fileUrl: true, thumbnail: true },
    });

    if (!product) {
      console.log(`DELETE [id]: Product not found for ID: ${id}`);
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // Force delete the product even with purchases
    // Must delete in correct order due to relations:
    // 1. ProductView records (required relation to Product)
    // 2. Purchase records (optional relation to Product)
    // 3. ProductPricing records (cascade on delete)
    // 4. Product itself
    await prisma.$transaction(async (tx) => {
      // Delete all ProductView records for this product
      await tx.productView.deleteMany({
        where: { productId: id },
      });
      
      // Update all purchases to set productId to null (optional relation)
      await tx.purchase.updateMany({
        where: { productId: id },
        data: { productId: null as any },
      });
      
      // Delete all pricing plans (has cascade on delete in schema)
      await tx.productPricing.deleteMany({
        where: { productId: id },
      });
      
      // Finally, delete the product
      await tx.product.delete({
        where: { id: id },
      });
    });

    console.log(`DELETE [id]: Product ${id} deleted successfully from database`);

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
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    console.error('DELETE [id] Error:', error);
    return NextResponse.json(
      { error: `Failed to delete product: ${errorMessage}` },
      { status: 500 }
    );
  }
}
