'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/admin/sidebar';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      // Redirect to sign-in if not authenticated
      router.push('/auth/signin?callbackUrl=/admin');
      return;
    }

    if (session.user?.role !== 'ADMIN') {
      // Redirect to home if not an admin
      router.push('/');
      return;
    }

    // If we get here, user is authenticated and is an admin
    setIsAuthorized(true);
  }, [session, status, router]);

  if (status === 'loading' || !isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-background md:ml-64 pb-20 md:pb-0">
        <main className="container mx-auto py-8 px-4">
          {children}
        </main>
      </div>
    </>
  );
}
