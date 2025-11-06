import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user) {
    redirect('/auth/signin');
  }
  return session.user;
}
