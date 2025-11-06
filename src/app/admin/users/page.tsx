import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">Manage user accounts and permissions</p>
          </div>
          <form action={backfillUsers}>
            <Button type="submit" variant="outline">Backfill Users (fix createdAt)</Button>
          </form>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Users</h2>
            <Button asChild>
              <a href="/admin/users/new">Add New User</a>
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Joined</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
                          {user.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="ml-4">
                          <div className="font-medium">{user.name || 'Unnamed User'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm">{user.email}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <a href={`/admin/users/${user.id}`} className="text-primary hover:text-primary/80">
                        Edit
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
