'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTransition } from 'react';

interface DeleteProductButtonProps {
    productId: string;
    productTitle: string;
    onDelete: () => Promise<void>;
}

export function DeleteProductButton({ productId, productTitle, onDelete }: DeleteProductButtonProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        const confirmed = window.confirm(
            `Are you sure you want to permanently delete "${productTitle}"?\n\nThis action cannot be undone. The product will be completely removed.`
        );

        if (!confirmed) {
            return;
        }

        setIsDeleting(true);

        try {
            startTransition(async () => {
                await onDelete();
                router.push('/admin/products');
                router.refresh();
            });
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Failed to delete product. Please try again.');
            setIsDeleting(false);
        }
    };

    return (
        <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending || isDeleting}
        >
            {isPending || isDeleting ? 'Deleting...' : 'Delete Product'}
        </Button>
    );
}
