import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UsersList } from '@/components/admin/users-list';

async function backfillUsers() {
  'use server';
  await requireAdmin();
  const now = new Date();
  await prisma.user.updateMany({
    where: { OR: [{ createdAt: null as any }, { createdAt: undefined as any }] },
    data: { createdAt: now, updatedAt: now },
  });
}

export default async function AdminUsersPage() {
  await requireAdmin();

  // Ensure legacy users have dates set to avoid Prisma null errors
  const now = new Date();
  await prisma.user.updateMany({
    where: { OR: [{ createdAt: null as any }, { createdAt: undefined as any }] },
    data: { createdAt: now, updatedAt: now },
  });

  // Fetch all users
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const usersData = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: (user.createdAt || now).toISOString(),
  }));

  return (
    <div className="container mx-auto py-6 md:py-8 px-4">
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              User Management
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Manage user accounts and permissions
            </p>
          </div>
          <form action={backfillUsers}>
            <Button type="submit" variant="outline" className="admin-touch-button">
              Backfill Users
            </Button>
          </form>
        </div>
      </div>

      <UsersList initialUsers={usersData} />
    </div>
  );
}
