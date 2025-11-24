import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Users, BookOpen, DollarSign, TrendingUp, Activity, FileCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

async function getStats() {
  const [usersCount, productsCount, submissionsCount, activeSubmissions] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.userSubmission.count(),
    prisma.userSubmission.count({ where: { status: 'PENDING' } }),
  ]);

  return {
    usersCount,
    productsCount,
    submissionsCount,
    activeSubmissions,
  };
}

export default async function AdminDashboard() {
  await requireAdmin();
  const stats = await getStats();

  const statCards = [
    {
      title: 'Total Users',
      value: stats.usersCount,
      icon: Users,
      gradient: 'admin-gradient-primary',
      iconColor: 'text-blue-500',
      link: '/admin/users',
    },
    {
      title: 'Total Products',
      value: stats.productsCount,
      icon: BookOpen,
      gradient: 'admin-gradient-success',
      iconColor: 'text-green-500',
      link: '/admin/products',
    },
    {
      title: 'Submissions',
      value: stats.submissionsCount,
      icon: FileCheck,
      gradient: 'admin-gradient-info',
      iconColor: 'text-indigo-500',
      link: '/admin/submissions',
    },
    {
      title: 'Pending Reviews',
      value: stats.activeSubmissions,
      icon: Activity,
      gradient: 'admin-gradient-warning',
      iconColor: 'text-amber-500',
      link: '/admin/submissions',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Admin Dashboard
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Welcome back! Here's what's happening with your platform.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link
              key={index}
              href={stat.link}
              className="admin-stat-card group cursor-pointer"
            >
              <div className="relative z-10 flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-3xl md:text-4xl font-bold">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${stat.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Button
            asChild
            className="h-auto py-4 flex-col gap-2 hover:scale-105 transition-transform admin-touch-button"
            variant="outline"
          >
            <Link href="/admin/products/new">
              <BookOpen className="h-5 w-5" />
              <span className="font-semibold text-sm">Add New Product</span>
            </Link>
          </Button>

          <Button
            asChild
            className="h-auto py-4 flex-col gap-2 hover:scale-105 transition-transform admin-touch-button"
            variant="outline"
          >
            <Link href="/admin/users">
              <Users className="h-5 w-5" />
              <span className="font-semibold text-sm">Manage Users</span>
            </Link>
          </Button>

          <Button
            asChild
            className="h-auto py-4 flex-col gap-2 hover:scale-105 transition-transform admin-touch-button relative"
            variant="outline"
          >
            <Link href="/admin/submissions">
              <FileCheck className="h-5 w-5" />
              <span className="font-semibold text-sm">Review Submissions</span>
              {stats.activeSubmissions > 0 && (
                <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {stats.activeSubmissions}
                </span>
              )}
            </Link>
          </Button>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Recent Activity
          </h2>
        </div>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>Activity tracking coming soon</p>
            <p className="text-xs mt-1">Recent user actions and system events will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
}
