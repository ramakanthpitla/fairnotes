import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { PurchasedProducts } from '@/components/dashboard/purchased-products';
import { LikedProductsSection } from '@/components/dashboard/liked-products';

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const isAdmin = session.user?.role === 'ADMIN';

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold leading-tight">
              <span className="block">Welcome back,</span>
              <span className="block">
                {session.user?.name || 'User'}
                {isAdmin && (
                  <span className="ml-2 align-middle rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800">
                    Admin
                  </span>
                )}
                !
              </span>
            </h1>
            <p className="text-muted-foreground mt-1">
              {isAdmin ? 'Manage your platform and view insights' : "Here's what you're learning"}
            </p>
          </div>
          <Button variant="outline" asChild>
            <a href="/api/auth/signout?callbackUrl=/">Sign out</a>
          </Button>
        </div>
      </div>

      {isAdmin && (
        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">Admin Dashboard</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link 
              href="/admin/users"
              className="rounded-lg border bg-card p-6 transition-colors hover:bg-muted/50"
            >
              <h3 className="mb-2 text-lg font-medium">Manage Users</h3>
              <p className="text-sm text-muted-foreground">View and manage user accounts and permissions</p>
            </Link>
            
            <Link 
              href="/admin/products"
              className="rounded-lg border bg-card p-6 transition-colors hover:bg-muted/50"
            >
              <h3 className="mb-2 text-lg font-medium">Manage Products</h3>
              <p className="text-sm text-muted-foreground">Add, edit, or remove study materials</p>
            </Link>
            
            <Link 
              href="/admin/analytics"
              className="rounded-lg border bg-card p-6 transition-colors hover:bg-muted/50"
            >
              <h3 className="mb-2 text-lg font-medium">View Analytics</h3>
              <p className="text-sm text-muted-foreground">Platform statistics and user insights</p>
            </Link>
          </div>
        </div>
      )}

      {!isAdmin && (
        <div className="grid gap-6">
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">My Library</h2>
                <p className="text-muted-foreground">Access your purchased study materials</p>
              </div>
              <Button asChild>
                <Link href="/browse">Browse Materials</Link>
              </Button>
            </div>

            <div className="mt-6">
              <PurchasedProducts userId={session.user.id} />
            </div>
          </div>

          <div id="liked" className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Liked List</h2>
                <p className="text-muted-foreground text-sm">
                  Quickly access materials you have saved.
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/browse">Browse More</Link>
              </Button>
            </div>

            <LikedProductsSection />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-4 text-lg font-medium">Continue Learning</h3>
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-muted-foreground">No recent activity</p>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-4 text-lg font-medium">Your Progress</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Courses Started</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Materials Completed</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Study Time</span>
                  <span className="font-medium">0h 0m</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
