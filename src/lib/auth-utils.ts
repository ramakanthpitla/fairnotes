import { DefaultSession, DefaultUser, getServerSession as getNextAuthServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'ADMIN' | 'USER';
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    role: 'ADMIN' | 'USER';
    name?: string | null;
    email?: string | null;
    image?: string | null;
  }
}

// Extend the JWT types
declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
  }
}

// Our custom session type for type safety
export interface UserSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: 'ADMIN' | 'USER';
  };
}

// Helper function to get the current user (client-side)
export async function getCurrentUser() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect('/auth/signin');
  }
  return session.user;
}

// Helper function to get the auth session (server-side)
export async function getServerSession() {
  return (await getNextAuthServerSession(authOptions)) as UserSession | null;
}

// Middleware to protect API routes
export async function requireAuth(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }
  return session;
}

// Middleware to check if user is admin
export async function requireAdmin(request: NextRequest) {
  const session = await requireAuth(request);
  if (session instanceof NextResponse) return session;
  
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Not authorized' },
      { status: 403 }
    );
  }
  return session;
}

// Helper to check if user is admin
export async function isAdmin() {
  const session = await getServerSession();
  return session?.user.role === 'ADMIN';
}

// Helper function to get the session (compatibility with older code)
export async function getSession() {
  return await getServerSession();
}
