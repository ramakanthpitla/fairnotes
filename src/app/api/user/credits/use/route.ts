import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if ((user.credits || 0) <= 0) {
      return NextResponse.json({ error: 'INSUFFICIENT_CREDITS' }, { status: 400 });
    }

    const now = new Date();

    // If there is already an active credit access for this product, avoid double-spending
    const existingUsage = await prisma.creditUsage.findFirst({
      where: {
        userId: session.user.id,
        productId,
        isActive: true,
        expiresAt: { gt: now },
      },
    });

    if (existingUsage) {
      return NextResponse.json(
        {
          error: 'ALREADY_HAS_ACCESS',
          expiresAt: existingUsage.expiresAt,
        },
        { status: 400 },
      );
    }

    const expiresAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days

    const [updatedUser, usage] = await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: { credits: { decrement: 1 } },
        select: { credits: true },
      }),
      prisma.creditUsage.create({
        data: {
          userId: session.user.id,
          productId,
          creditsUsed: 1,
          expiresAt,
          isActive: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      remainingCredits: updatedUser.credits,
      expiresAt: usage.expiresAt,
    });
  } catch (error) {
    console.error('Error using credit:', error);
    return NextResponse.json({ error: 'Failed to use credit' }, { status: 500 });
  }
}
