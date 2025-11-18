'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserNav } from './user-nav';
import { SearchBar } from './search-bar';

export function Navigation() {
  const pathname = usePathname();
  const isPdfViewer = pathname?.startsWith('/products/') && pathname.includes('/view');
  
  if (isPdfViewer) {
    return null;
  }
  
  return (
    <>
      {/* Mobile: centered search bar without hamburger */}
      <div className="fixed top-4 left-0 right-0 z-50 px-4 md:hidden">
        <div className="mx-auto max-w-md">
          <SearchBar />
        </div>
      </div>

      {/* Desktop: centered search bar with left-side icons */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 hidden md:block">
        <SearchBar />
      </div>
      <div className="hidden md:block">
        <UserNav mode="desktop" />
      </div>

      {/* Mobile bottom navigation */}
      <UserNav mode="mobile" />
    </>
  );
}
