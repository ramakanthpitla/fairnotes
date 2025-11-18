import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  const checks: Record<string, any> = {};

  // Check environment variables
  checks.env = {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET',
    DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
  };

  // Check database connection
  try {
    await prisma.$connect();
    const productCount = await prisma.product.count();
    checks.database = {
      status: 'connected',
      productCount,
    };
  } catch (error: any) {
    checks.database = {
      status: 'error',
      message: error.message,
    };
  }

  // Check session
  try {
    const session = await getServerSession(authOptions);
    checks.session = session ? {
      userId: session.user?.id,
      email: session.user?.email,
      role: session.user?.role,
    } : 'No active session';
  } catch (error: any) {
    checks.session = {
      status: 'error',
      message: error.message,
    };
  }

  // Check products API
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      take: 3,
      select: {
        id: true,
        title: true,
        isFree: true,
      }
    });
    checks.products = {
      status: 'ok',
      count: products.length,
      sample: products,
    };
  } catch (error: any) {
    checks.products = {
      status: 'error',
      message: error.message,
    };
  }

  return NextResponse.json(checks, { status: 200 });
}
