'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, BookOpen, BarChart2, Settings, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navigationLinks = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/users', label: 'Manage Users', icon: Users },
  { href: '/admin/submissions', label: 'User Submissions', icon: FileUp },
  { href: '/admin/products', label: 'Products', icon: BookOpen },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  const NavigationLinks = () => (
    <>
      {navigationLinks.map((link) => {
        const Icon = link.icon;
        const active = isActive(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 admin-touch-button',
              active
                ? 'admin-nav-link-active font-semibold'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            <Icon className={cn('h-5 w-5 flex-shrink-0', active && 'text-primary')} />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* Mobile Header - Simple, no hamburger menu */}
      <div className="md:hidden sticky top-0 z-40 flex h-14 items-center justify-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 shadow-sm">
        <Link href="/admin" className="flex items-center gap-2 font-semibold">
          <span className="text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            FairNotes
          </span>
          <span className="rounded-full admin-gradient-primary px-2.5 py-0.5 text-xs text-white font-semibold">
            Admin
          </span>
        </Link>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 shadow-lg">
        <div className="grid grid-cols-4 gap-1 p-2">
          {navigationLinks.slice(0, 4).map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2.5 transition-all duration-200 ${active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-primary' : ''}`} />
                <span className="text-[10px] font-medium leading-none">{link.label.split(' ')[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <div className="hidden md:block md:fixed md:inset-y-0 md:left-0 md:w-64 md:border-r md:bg-muted/40 md:z-30">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-16 items-center border-b px-4 bg-gradient-to-r from-muted/50 to-background">
            <Link href="/admin" className="flex items-center gap-2 font-semibold">
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                FairNotes
              </span>
              <span className="rounded-full admin-gradient-primary px-3 py-1 text-xs text-white font-semibold shadow-md">
                Admin
              </span>
            </Link>
          </div>

          <div className="flex-1 overflow-auto py-2">
            <nav className="grid items-start px-3 text-sm font-medium gap-1">
              <NavigationLinks />
            </nav>
          </div>

          <div className="mt-auto p-4 border-t">
            <Button variant="outline" className="w-full hover:bg-muted" asChild>
              <Link href="/dashboard">
                Back to User Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
