import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { deleteFileFromS3 } from '@/lib/s3';

export async function DELETE(request: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id');

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // First, get the product to retrieve file URLs
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        fileUrl: true,
        thumbnail: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Delete the product (cascade will handle related records)
    await prisma.product.delete({
      where: { id: productId },
    });

    // Delete files from S3 (non-blocking, don't fail the request if S3 delete fails)
    const deletePromises: Promise<boolean>[] = [];

    if (product.fileUrl) {
      deletePromises.push(
        deleteFileFromS3(product.fileUrl).catch(err => {
          console.error('Failed to delete product file from S3:', err);
          return false;
        })
      );
    }

    if (product.thumbnail) {
      deletePromises.push(
        deleteFileFromS3(product.thumbnail).catch(err => {
          console.error('Failed to delete thumbnail from S3:', err);
          return false;
        })
      );
    }

    // Wait for S3 deletions but don't block the response
    if (deletePromises.length > 0) {
      Promise.all(deletePromises).then(results => {
        const successCount = results.filter(r => r).length;
        console.log(`Deleted ${successCount}/${results.length} files from S3 for product ${productId}`);
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
