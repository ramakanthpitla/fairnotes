import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST() {
  const session = await getServerSession(authOptions as any);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const now = new Date();
  const result = await prisma.user.updateMany({
    where: { OR: [{ createdAt: null as any }, { createdAt: undefined as any }] },
    data: { createdAt: now, updatedAt: now },
  });

  return NextResponse.json({ updatedCount: result.count });
}


