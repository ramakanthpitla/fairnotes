'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogIn, LogOut, LayoutDashboard, Home, Upload, BookOpen, Heart, User as UserIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

type UserNavProps = {
  mode?: 'mobile' | 'desktop';
};

export function UserNav({ mode = 'desktop' }: UserNavProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [hash, setHash] = useState('');
  const user = session?.user;
  const isLoading = status === 'loading';
  
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateHash = () => {
      setHash(window.location.hash);
    };

    updateHash();
    window.addEventListener('hashchange', updateHash);

    return () => {
      window.removeEventListener('hashchange', updateHash);
    };
  }, []);
  
  // Toggle between dashboard and home based on current path
  const isDashboard = pathname === '/dashboard';
  const navLink = isDashboard ? '/' : '/dashboard';
  const navTitle = isDashboard ? 'Home' : 'Dashboard';
  const NavIcon = isDashboard ? Home : LayoutDashboard;

  const isHomeActive = pathname === '/';
  const isDashboardActive = pathname?.startsWith('/dashboard');
  const isPrimaryActive = isHomeActive || isDashboardActive;
  const isLikedActive = pathname?.startsWith('/dashboard#liked');
  const isBrowseActive = pathname?.startsWith('/browse');
  const isContributeActive = pathname?.startsWith('/contribute');

  if (isLoading) {
    return null;
  }

  // Mobile mode: bottom horizontal navigation bar
  if (mode === 'mobile') {
    return (
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md md:hidden">
        <div className="grid grid-cols-4 gap-2 rounded-full border border-primary/20 bg-background/95 backdrop-blur shadow-lg p-2">
          <Link
            href="/"
            className={`flex flex-col items-center justify-center gap-1 py-2 rounded-full transition-colors ${
              pathname === '/' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>

          <Link
            href="/browse"
            className={`flex flex-col items-center justify-center gap-1 py-2 rounded-full transition-colors ${
              pathname?.startsWith('/browse') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <BookOpen className="h-5 w-5" />
            <span className="text-[10px] font-medium">Browse</span>
          </Link>

          {user ? (
            <Link
              href="/dashboard"
              className={`flex flex-col items-center justify-center gap-1 py-2 rounded-full transition-colors ${
                pathname?.startsWith('/dashboard') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span className="text-[10px] font-medium">Dashboard</span>
            </Link>
          ) : (
            <button
              onClick={() => signIn('google')}
              className="flex flex-col items-center justify-center gap-1 py-2 rounded-full text-muted-foreground hover:bg-muted transition-colors"
            >
              <LogIn className="h-5 w-5" />
              <span className="text-[10px] font-medium">Sign in</span>
            </button>
          )}

          {user ? (
            <button
              onClick={() => signOut()}
              className="flex flex-col items-center justify-center gap-1 py-2 rounded-full text-muted-foreground hover:bg-muted transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-[10px] font-medium">Sign out</span>
            </button>
          ) : (
            <Link
              href="/contribute"
              className={`flex flex-col items-center justify-center gap-1 py-2 rounded-full transition-colors ${
                pathname?.startsWith('/contribute') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Upload className="h-5 w-5" />
              <span className="text-[10px] font-medium">Contribute</span>
            </Link>
          )}
        </div>
      </nav>
    );
  }

  // Desktop mode: keep existing fixed left-side icons
  return (
    <>
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-4">
        {/* Dashboard/Home Toggle Icon - Left Middle */}
        <div className="relative group">
          <div
            className={`rounded-full p-[2px] ${
              isPrimaryActive
                ? 'bg-gradient-to-tr from-emerald-400 via-emerald-500 to-emerald-600 shadow-lg'
                : ''
            }`}
          >
            <Link 
              href={navLink} 
              className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-md cursor-pointer"
            >
              <NavIcon className="h-5 w-5" />
            </Link>
          </div>
          <span className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 rounded bg-black/80 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {navTitle}
          </span>
        </div>

        {/* Liked List Icon */}
        <div className="relative group">
          <div
            className={`rounded-full p-[2px] ${
              isLikedActive
                ? 'bg-gradient-to-tr from-emerald-400 via-emerald-500 to-emerald-600 shadow-lg'
                : ''
            }`}
          >
            <Link
              href="/dashboard#liked"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-background text-foreground border border-primary/30 hover:bg-primary/10 transition-colors shadow-sm cursor-pointer"
            >
              <Heart className="h-5 w-5" />
            </Link>
          </div>
          <span className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 rounded bg-black/80 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Liked List
          </span>
        </div>

        {/* Browse All Materials Icon */}
        <div className="relative group">
          <div
            className={`rounded-full p-[2px] ${
              isBrowseActive
                ? 'bg-gradient-to-tr from-emerald-400 via-emerald-500 to-emerald-600 shadow-lg'
                : ''
            }`}
          >
            <Link
              href="/browse"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-background text-foreground border border-primary/30 hover:bg-primary/10 transition-colors shadow-sm cursor-pointer"
            >
              <BookOpen className="h-5 w-5" />
            </Link>
          </div>
          <span className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 rounded bg-black/80 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Browse All Materials
          </span>
        </div>

        {/* Contribute & Earn Icon (only when logged in) */}
        {user && (
          <div className="relative group">
            <div
              className={`rounded-full p-[2px] ${
                isContributeActive
                  ? 'bg-gradient-to-tr from-emerald-400 via-emerald-500 to-emerald-600 shadow-lg'
                  : ''
              }`}
            >
              <Link
                href="/contribute"
                className="flex items-center justify-center w-10 h-10 rounded-full bg-background text-foreground border border-primary/30 hover:bg-primary/10 transition-colors shadow-sm cursor-pointer"
              >
                <Upload className="h-5 w-5" />
              </Link>
            </div>
            <span className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 rounded bg-black/80 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Contribute & Earn
            </span>
          </div>
        )}

        {/* Profile Dropdown / Sign-in - Left Middle */}
        <div>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="relative group">
                  <Button 
                    variant="ghost" 
                    className="relative h-10 w-10 rounded-full p-0 cursor-pointer"
                  >
                    <Avatar className="h-10 w-10 border-2 border-primary">
                      <AvatarImage src={user.image || ''} alt={user.name || 'User'} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                  <span className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 rounded bg-black/80 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {user.name || 'Account'}
                  </span>
                </div>
              </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <div className="flex flex-col space-y-1 p-2">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard" className="w-full cursor-pointer">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/contribute" className="w-full cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                Contribute & Earn
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => signOut()}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        ) : (
          <div className="relative group">
            <Button 
              onClick={() => signIn('google')}
              variant="outline" 
              className="h-10 w-10 rounded-full p-0 cursor-pointer"
            >
              <LogIn className="h-5 w-5" />
            </Button>
            <span className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 rounded bg-black/80 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Sign in
            </span>
          </div>
        )}
        </div>
      </div>
    </>
  );
}
