import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const publicPaths = [
  '/',
  '/auth/signin',
  '/auth/error',
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/products',
  '/products/[id]',
  '/api/products',
  '/api/products/[id]'
];

const adminPaths = [
  '/admin',
  '/admin/'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPath = pathname.startsWith('/admin');
  
  // Allow public paths
  const isPublicPath = publicPaths.some(path => {
    if (path.includes('[') && path.includes(']')) {
      // Handle dynamic routes like '/products/[id]'
      const basePath = path.split('[')[0];
      return pathname.startsWith(basePath);
    }
    return pathname === path || pathname.startsWith(`${path}/`);
  });

  if (
    isPublicPath || 
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_next/static/')
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });

  // If no token, redirect to signin
  if (!token) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', encodeURI(request.url));
    return NextResponse.redirect(signInUrl);
  }

  // Check admin access
  if (isAdminPath && token.role !== 'ADMIN') {
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images/).*)',
  ],
};
