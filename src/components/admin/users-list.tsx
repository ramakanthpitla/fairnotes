'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Mail, Calendar, Shield } from 'lucide-react';
import Link from 'next/link';

type User = {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    createdAt: string;
};

type UsersListProps = {
    initialUsers: User[];
};

export function UsersList({ initialUsers }: UsersListProps) {
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredUsers = users.filter((user) => {
        const query = searchQuery.toLowerCase();
        return (
            user.name?.toLowerCase().includes(query) ||
            user.email?.toLowerCase().includes(query) ||
            user.role.toLowerCase().includes(query)
        );
    });

    const getRoleColor = (role: string) => {
        return role === 'ADMIN' ? 'badge-gradient-danger' : 'badge-gradient-info';
    };

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Search by name, email, or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Mobile Card List */}
            <div className="mobile-card-list">
                {filteredUsers.length === 0 ? (
                    <div className="admin-user-card text-center py-8">
                        <p className="text-muted-foreground">
                            {searchQuery ? 'No users found matching your search.' : 'No users found.'}
                        </p>
                    </div>
                ) : (
                    filteredUsers.map((user) => (
                        <div key={user.id} className="admin-user-card space-y-3">
                            {/* User Header */}
                            <div className="flex items-start gap-3">
                                <div className="h-14 w-14 flex-shrink-0 rounded-full admin-gradient-primary flex items-center justify-center shadow-md">
                                    <span className="text-white font-bold text-xl">
                                        {user.name?.charAt(0).toUpperCase() || 'U'}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-lg leading-tight">
                                        {user.name || 'Unnamed User'}
                                    </h3>
                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1.5">
                                        <Mail className="h-4 w-4" />
                                        <span className="truncate">{user.email}</span>
                                    </div>
                                </div>
                                <Badge className={`${getRoleColor(user.role)} text-xs px-2.5 py-1`}>
                                    {user.role}
                                </Badge>
                            </div>

                            {/* User Info */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2.5">
                                <Calendar className="h-4 w-4" />
                                <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2 border-t">
                                <Button
                                    variant="outline"
                                    size="default"
                                    className="flex-1 admin-touch-button text-sm h-11"
                                    asChild
                                >
                                    <Link href={`/admin/users/${user.id}`}>
                                        Edit User
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Desktop Table */}
            <div className="desktop-table">
                <div className="rounded-lg border bg-card">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold">Users ({filteredUsers.length})</h2>
                            <Button asChild className="admin-touch-button">
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
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-muted/50 smooth-transition">
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 flex-shrink-0 rounded-full admin-gradient-primary flex items-center justify-center shadow-md">
                                                        <span className="text-white font-semibold">
                                                            {user.name?.charAt(0).toUpperCase() || 'U'}
                                                        </span>
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
                                                <Badge className={getRoleColor(user.role)}>
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
                                    {filteredUsers.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">
                                                {searchQuery ? 'No users found matching your search.' : 'No users found.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
