import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

function unauthorized() {
  return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
}

type PricingUpdateData = {
  name?: string;
  duration?: number;
  price?: number;
  isActive?: boolean;
};

// Update a pricing option
export async function PUT(
  request: Request,
  { params }: { params: { id: string; pricingId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ADMIN') return unauthorized();

  try {
    const body = await request.json();
    const { name, duration, price, isActive } = body as PricingUpdateData;

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (duration !== undefined) updateData.duration = Number(duration);
    if (price !== undefined) updateData.price = Number(price);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    // Verify the pricing option belongs to the product
    const existingPricing = await prisma.productPricing.findFirst({
      where: { 
        id: params.pricingId,
        productId: params.id 
      },
    });

    if (!existingPricing) {
      return NextResponse.json(
        { error: 'Pricing option not found for this product' },
        { status: 404 }
      );
    }

    const pricing = await prisma.productPricing.update({
      where: { 
        id: params.pricingId,
        productId: params.id 
      },
      data: updateData,
    });

    return NextResponse.json({ pricing });
  } catch (error) {
    console.error('Error updating pricing option:', error);
    return NextResponse.json(
      { error: 'Failed to update pricing option' },
      { status: 500 }
    );
  }
}

// Delete a pricing option
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; pricingId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ADMIN') return unauthorized();

  try {
    // Verify the pricing option exists and belongs to the product
    const existingPricing = await prisma.productPricing.findFirst({
      where: { 
        id: params.pricingId,
        productId: params.id 
      },
    });

    if (!existingPricing) {
      return NextResponse.json(
        { error: 'Pricing option not found for this product' },
        { status: 404 }
      );
    }

    // Check if there are any purchases with this pricing option
    const purchaseCount = await prisma.purchase.count({
      where: { 
        productPricingId: params.pricingId 
      },
    });

    if (purchaseCount > 0) {
      // Instead of deleting, mark as inactive
      const updated = await prisma.productPricing.update({
        where: { 
          id: params.pricingId,
          productId: params.id 
        },
        data: { isActive: false },
      });

      return NextResponse.json({ 
        pricing: updated,
        message: 'Pricing option has been deactivated instead of deleted due to existing purchases.'
      });
    }

    // If no purchases, delete the pricing option
    await prisma.productPricing.delete({
      where: { 
        id: params.pricingId,
        productId: params.id 
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting pricing option:', error);
    return NextResponse.json(
      { error: 'Failed to delete pricing option' },
      { status: 500 }
    );
  }
}
