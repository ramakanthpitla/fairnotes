import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import type { User } from 'next-auth';

declare module 'next-auth' {
  interface User {
    role?: string;
  }
}

export async function auth() {
  return getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth/signin');
  }
  return user as User & { role?: string };
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== 'ADMIN') {
    redirect('/auth/signin');
  }
  return user;
}

// For API routes and server components
export const getAuthSession = auth;
