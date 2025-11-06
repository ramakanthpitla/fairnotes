'use server';

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function signInWithGoogle() {
  const { signIn } = await import('@/lib/auth');
  return signIn('google', { redirectTo: '/dashboard' });
}

export async function signOut() {
  const { signOut } = await import('@/lib/auth');
  await signOut({ redirectTo: '/' });
}

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user) {
    redirect('/auth/signin');
  }
  return session.user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if ((user as any).role !== 'ADMIN') {
    redirect('/unauthorized');
  }
  return user;
}
