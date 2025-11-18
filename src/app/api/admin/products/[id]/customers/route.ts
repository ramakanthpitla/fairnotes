import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { UserSession } from '@/lib/auth-utils';

function unauthorized() {
  return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = (await getServerSession(authOptions)) as UserSession | null;
  if (!session?.user || session.user.role !== 'ADMIN') return unauthorized();

  try {
    const { id } = await params;

    // Get all purchases for this product with user details
    const purchases = await prisma.purchase.findMany({
      where: {
        productId: id,
        status: 'COMPLETED',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        productPricing: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform to include active status
    const customers = purchases.map((purchase) => {
      const isActive = new Date(purchase.expiresAt) > new Date();
      return {
        purchaseId: purchase.id,
        customerId: purchase.user.id,
        customerName: purchase.user.name,
        customerEmail: purchase.user.email,
        plan: purchase.productPricing?.name || 'N/A',
        price: purchase.amount,
        duration: purchase.productPricing?.duration || 0,
        purchaseDate: purchase.createdAt.toISOString(),
        expiresAt: purchase.expiresAt.toISOString(),
        isActive,
        status: purchase.status,
      };
    });

    // Separate active and expired
    const activeCustomers = customers.filter((c) => c.isActive);
    const expiredCustomers = customers.filter((c) => !c.isActive);

    return NextResponse.json({
      active: activeCustomers,
      expired: expiredCustomers,
      total: customers.length,
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}
