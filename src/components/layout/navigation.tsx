'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';
import { UserNav } from './user-nav';

export function Navigation() {
  const pathname = usePathname();
  const isPdfViewer = pathname?.startsWith('/products/');
  
  if (isPdfViewer) {
    return null;
  }
  
  return (
    <>
      <div className="fixed top-4 left-4 z-50">
        <Link 
          href="/dashboard" 
          className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-md"
          title="Dashboard"
        >
          <LayoutDashboard className="h-5 w-5" />
        </Link>
      </div>
      <div className="fixed top-4 right-4 z-50">
        <UserNav />
      </div>
    </>
  );
}
