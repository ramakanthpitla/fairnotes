'use client';

import Link from 'next/link';
import { Home, Users, BookOpen, BarChart2, Settings, FileUp, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useState } from 'react';

export function Sidebar() {
  const [open, setOpen] = useState(false);

  const NavigationLinks = () => (
    <>
      <Link
        href="/admin"
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
        onClick={() => setOpen(false)}
      >
        <Home className="h-4 w-4" />
        Dashboard
      </Link>

      <Link
        href="/admin/users"
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
        onClick={() => setOpen(false)}
      >
        <Users className="h-4 w-4" />
        Manage Users
      </Link>

      <Link
        href="/admin/submissions"
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
        onClick={() => setOpen(false)}
      >
        <FileUp className="h-4 w-4" />
        User Submissions
      </Link>

      <Link
        href="/admin/products"
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
        onClick={() => setOpen(false)}
      >
        <BookOpen className="h-4 w-4" />
        Products
      </Link>

      <Link
        href="/admin/analytics"
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
        onClick={() => setOpen(false)}
      >
        <BarChart2 className="h-4 w-4" />
        Analytics
      </Link>

      <Link
        href="/admin/settings"
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
        onClick={() => setOpen(false)}
      >
        <Settings className="h-4 w-4" />
        Settings
      </Link>
    </>
  );

  return (
    <>
      {/* Mobile Header with Hamburger Menu */}
      <div className="md:hidden sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <span className="text-xl">FairNotes</span>
                <span className="rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
                  Admin
                </span>
              </SheetTitle>
            </SheetHeader>
            <nav className="grid gap-2 mt-6 text-sm font-medium">
              <NavigationLinks />
            </nav>
            <div className="mt-auto pt-6">
              <Button variant="outline" className="w-full" asChild onClick={() => setOpen(false)}>
                <Link href="/dashboard">
                  Back to User Dashboard
                </Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <Link href="/admin" className="flex items-center gap-2 font-semibold">
          <span className="text-xl">FairNotes</span>
          <span className="rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
            Admin
          </span>
        </Link>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden border-r bg-muted/40 md:block w-64">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4">
            <Link href="/admin" className="flex items-center gap-2 font-semibold">
              <span className="text-xl">FairNotes</span>
              <span className="rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
                Admin
              </span>
            </Link>
          </div>

          <div className="flex-1 overflow-auto py-2">
            <nav className="grid items-start px-4 text-sm font-medium">
              <NavigationLinks />
            </nav>
          </div>

          <div className="mt-auto p-4">
            <Button variant="outline" className="w-full" asChild>
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
